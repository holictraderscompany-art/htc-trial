import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { createContentHandler } from '../src/server/content-release.js';

const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const stamp = '2026-10-09T01:00:00.123456Z';
const row = (n, state = 'RELEASED', category = 'INFORMATION') => ({
  id: id(n), category, title: `Trial ${n}`, body: 'Trial discovery.', state, created_at: stamp,
  updated_at: stamp, released_at: state === 'DRAFT' ? null : stamp, founder_id: 'synthetic-private-identity',
});
const safe = c => Object.fromEntries(['id', 'category', 'title', 'body'].map(k => [k, c[k]]));
const encode = (position, category = null) => Buffer.from(JSON.stringify({ v: 1, ...position, category })).toString('base64url');
const position = n => ({ created_at: stamp, id: id(n) });
function harness(records = [row(1), row(2, 'DRAFT'), row(3, 'WITHDRAWN')], options = {}) {
  const calls = [];
  const fetchImpl = async (url, settings) => {
    calls.push({ url, settings });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: id(900), is_anonymous: false });
    if (url.endsWith('/rpc/is_founder')) return Response.json(options.founder ?? true);
    if (url.endsWith('/rpc/manage_trial_content')) {
      const p = JSON.parse(settings.body).payload;
      const c = records.find(c => c.id === p.id);
      if (!c) return Response.json(null);
      if (p.action === 'update') Object.assign(c, { category: p.category, title: p.title, body: p.body, state: 'DRAFT', released_at: null });
      if (p.action === 'release') Object.assign(c, { state: 'RELEASED', released_at: stamp });
      if (p.action === 'withdraw') c.state = 'WITHDRAWN';
      return Response.json(c);
    }
    // Controlled upstream fixtures model the SQL contract; they do not execute Postgres.
    const released = () => records.filter(c => c.state === 'RELEASED').sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id.localeCompare(b.id));
    if (url.endsWith('/rpc/read_released_content')) {
      const { content_id } = JSON.parse(settings.body);
      return Response.json(released().filter(c => !content_id || c.id === content_id).slice(0, 100).map(safe));
    }
    if (url.endsWith('/rpc/read_released_content_page')) {
      if (Object.hasOwn(options, 'pageResult')) return Response.json(options.pageResult);
      const p = JSON.parse(settings.body);
      const eligible = released().filter(c => (!p.category_filter || c.category === p.category_filter) &&
        (!p.after_created_at || c.created_at < p.after_created_at || (c.created_at === p.after_created_at && c.id > p.after_id)));
      const page = eligible.slice(0, p.page_size);
      return Response.json({ items: page.map(c => ({ ...c })), next_position: eligible.length > p.page_size ?
        { created_at: page.at(-1).created_at, id: page.at(-1).id } : null });
    }
    if (url.endsWith('/rpc/read_released_content_assets')) {
      options.beforeAssets?.(records);
      const { content_ids } = JSON.parse(settings.body);
      return Response.json(options.assetRows ?? released().filter(c => content_ids.includes(c.id)).map(c => ({
        content_id: c.id, assets: (options.assets ?? []).filter(a => a.status === 'READY').map(a => ({ ...a })),
      })));
    }
    throw Error('Unexpected upstream request');
  };
  const dependencies = { env, fetchImpl };
  const publicHandler = createContentHandler('public', dependencies);
  const founderHandler = createContentHandler('founder', dependencies);
  return { calls, records,
    read: (query = '?paged=1', token = null) => publicHandler(new Request('https://htc.test/api/content' + query,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })),
    manage: p => founderHandler(new Request('https://htc.test/api/content/manage', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-session' }, body: JSON.stringify(p) })),
  };
}

test('T09 public page returns RELEASED only and projects the established four fields', async () => {
  const h = harness(); const response = await h.read();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { items: [safe(row(1))], next_cursor: null });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(JSON.parse(h.calls[0].settings.body), { page_size: 20, category_filter: null, after_created_at: null, after_id: null });
});
test('T09 released UUID detail keeps the existing safe contract', async () => {
  const response = await harness().read('?id=' + id(1));
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).data, safe(row(1)));
});
for (const [label, n] of [['DRAFT', 2], ['WITHDRAWN', 3], ['nonexistent', 99]]) {
  test(`T09 ${label} detail uses the same unavailable response`, async () => {
    const response = await harness().read('?id=' + id(n));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
  });
}
test('T09 invalid identifier is rejected without an upstream lookup', async () => {
  const h = harness(); assert.equal((await h.read('?id=not-a-uuid')).status, 400); assert.equal(h.calls.length, 0);
});
test('T09 ordering retains newest creation first and ascending UUID ties', async () => {
  const records = [row(4), { ...row(3), created_at: '2026-10-10T01:00:00.000000Z' }, row(1)];
  const response = await harness(records).read();
  assert.deepEqual((await response.json()).data.items.map(c => c.id), [id(3), id(1), id(4)]);
});
test('T09 cursor continuation covers tied timestamps without duplicates and ends deterministically', async () => {
  const h = harness([row(5), row(3), row(1), row(4), row(2)]);
  const seen = []; let cursor = null;
  for (let page = 0; page < 3; page++) {
    const response = await h.read('?paged=1&limit=2' + (cursor ? '&cursor=' + cursor : ''));
    assert.equal(response.status, 200); const { data } = await response.json();
    seen.push(...data.items.map(c => c.id)); cursor = data.next_cursor;
  }
  assert.deepEqual(seen, [1, 2, 3, 4, 5].map(id)); assert.equal(cursor, null);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(JSON.parse(h.calls[1].settings.body), { page_size: 2, category_filter: null, after_created_at: stamp, after_id: id(2) });
});
test('T09 page size 100 is allowed; 101 is rejected before querying', async () => {
  const h = harness(Array.from({ length: 101 }, (_, i) => row(i + 1)));
  const response = await h.read('?paged=1&limit=100');
  const { data } = await response.json(); assert.equal(data.items.length, 100); assert.ok(data.next_cursor);
  const bad = harness(); assert.equal((await bad.read('?paged=1&limit=101')).status, 400); assert.equal(bad.calls.length, 0);
});
test('T09 invalid pagination syntax is rejected rather than coerced', async () => {
  for (const limit of ['', '0', '-1', '1.5', '01', '1e2', ' 20', 'Infinity', '1000']) {
    const h = harness(); assert.equal((await h.read('?paged=1&limit=' + encodeURIComponent(limit))).status, 400); assert.equal(h.calls.length, 0);
  }
});
test('T09 malformed, oversized, noncanonical and structurally invalid cursors never query', async () => {
  for (const cursor of ['', 'bad!', 'x'.repeat(513), encode(position(1)) + '=',
    Buffer.from('{}').toString('base64url'), encode({ ...position(1), created_at: '2026-02-30T00:00:00Z' }),
    encode({ ...position(1), created_at: '2026-10-09T01:00:00.1234567Z' }), encode({ ...position(1), id: '../path' }),
    Buffer.from(JSON.stringify({ v: 2, ...position(1), category: null })).toString('base64url')]) {
    const h = harness(); assert.equal((await h.read('?paged=1&cursor=' + encodeURIComponent(cursor))).status, 400); assert.equal(h.calls.length, 0);
  }
});
test('T09 cursor is bound to the existing category filter', async () => {
  const h = harness([row(1), row(2), row(3, 'RELEASED', 'EDITORIAL')]);
  const first = await (await h.read('?paged=1&limit=1&category=INFORMATION')).json();
  const next = await h.read('?paged=1&limit=1&category=INFORMATION&cursor=' + first.data.next_cursor);
  assert.deepEqual((await next.json()).data.items.map(c => c.id), [id(2)]);
  const before = h.calls.length;
  assert.equal((await h.read('?paged=1&category=EDITORIAL&cursor=' + first.data.next_cursor)).status, 400);
  assert.equal(h.calls.length, before);
});
test('T09 invalid/unknown filters, search and mixed contracts are rejected', async () => {
  for (const query of ['?paged=0', '?paged=1&paged=1', '?paged=1&limit=1&limit=2', '?paged=1&id=' + id(1),
    '?paged=1&category=', '?paged=1&category=information', '?paged=1&category=INFORMATION%27%20or%20true',
    '?paged=1&search=Trial', '?paged=1&assets=0', '?category=INFORMATION', '?cursor=anything']) {
    const h = harness(); assert.equal((await h.read(query)).status, 400); assert.equal(h.calls.length, 0);
  }
});
test('T09 anonymous, USER and Founder public callers receive identical nonprivileged results', async () => {
  const h = harness();
  for (const token of [null, 'synthetic-user-session', 'synthetic-founder-session']) {
    assert.deepEqual((await (await h.read('?paged=1', token)).json()).data.items, [safe(row(1))]);
  }
  assert.equal(h.calls.every(c => !Object.hasOwn(c.settings.headers, 'Authorization')), true);
  assert.equal(h.calls.some(c => c.url.includes('/auth/') || c.url.includes('is_founder')), false);
});
test('T09 preserves Founder management and USER mutation denial', async () => {
  const h = harness();
  for (const payload of [{ action: 'read', id: id(1) }, { action: 'update', id: id(1), category: 'INFORMATION', title: 'Edited', body: 'Trial.' },
    { action: 'release', id: id(1) }, { action: 'withdraw', id: id(1) }]) assert.equal((await h.manage(payload)).status, 200);
  assert.equal(h.calls.filter(c => c.url.endsWith('/rpc/manage_trial_content')).every(c => c.settings.headers.Authorization === 'Bearer synthetic-session'), true);
  assert.equal(h.calls.some(c => c.url.endsWith('/rpc/read_released_content_page')), false);
  const user = harness(undefined, { founder: false }); assert.equal((await user.manage({ action: 'release', id: id(1) })).status, 403);
  assert.equal(user.calls.some(c => c.url.endsWith('/rpc/manage_trial_content')), false);
});
test('T09 reuses one metadata batch and excludes non-READY assets without private paths', async () => {
  const ready = { id: id(500), role: 'PRIMARY', mime_type: 'image/png', width: null, height: null, duration_seconds: null };
  const h = harness([row(1)], { assets: [{ ...ready, status: 'READY', storage_path: 'private/path', token: 'synthetic-private-token' },
    { ...ready, id: id(501), status: 'PENDING' }, { ...ready, id: id(502), status: 'DELETING' }] });
  const response = await h.read('?paged=1&assets=1');
  assert.deepEqual((await response.json()).data, { items: [{ ...safe(row(1)), assets: [ready] }], next_cursor: null });
  assert.equal(h.calls.length, 2); assert.equal(h.calls.some(c => c.url.includes('/storage/')), false);
  assert.equal(h.calls.every(c => !Object.hasOwn(c.settings.headers, 'Authorization')), true);
});
test('T09 unexpectedly returned non-READY metadata fails closed', async () => {
  for (const status of ['PENDING', 'DELETING']) {
    const h = harness([row(1)], { assetRows: [{ content_id: id(1), assets: [{ id: id(500), role: 'PRIMARY', mime_type: 'image/png', width: null, height: null, duration_seconds: null, status }] }] });
    assert.equal((await h.read('?paged=1&assets=1')).status, 500);
  }
});
test('T09 current lifecycle state is consulted again after edit and withdrawal', async () => {
  const h = harness(); assert.equal((await (await h.read()).json()).data.items.length, 1);
  await h.manage({ action: 'update', id: id(1), category: 'INFORMATION', title: 'Edited', body: 'Trial.' });
  assert.deepEqual((await (await h.read()).json()).data.items, []);
  await h.manage({ action: 'release', id: id(1) });
  assert.equal((await (await h.read()).json()).data.items.length, 1);
  await h.manage({ action: 'withdraw', id: id(1) });
  assert.deepEqual((await (await h.read()).json()).data.items, []);
});
test('T09 withdrawal between page and metadata preserves continuation even when a page becomes empty', async () => {
  const h = harness([row(1), row(2)], { beforeAssets: records => { records[0].state = 'WITHDRAWN'; } });
  const response = await h.read('?paged=1&limit=1&assets=1');
  const { data } = await response.json(); assert.deepEqual(data.items, []); assert.ok(data.next_cursor);
  const next = await h.read('?paged=1&limit=1&assets=1&cursor=' + data.next_cursor);
  assert.deepEqual((await next.json()).data.items.map(c => c.id), [id(2)]);
});
test('T09 invalid upstream page shapes and continuation boundaries are redacted', async () => {
  for (const pageResult of [null, [], { items: [row(1)], next_position: undefined },
    { items: [row(1), row(1)], next_position: null }, { items: [row(2, 'DRAFT')], next_position: null },
    { items: [row(1)], next_position: position(9) }, { items: [row(1)], next_position: { ...position(1), created_at: 'invalid' } }]) {
    const response = await harness(undefined, { pageResult }).read('?paged=1&limit=1');
    assert.equal(response.status, 500); assert.equal((await response.text()).includes('synthetic-private'), false);
  }
});
test('T09 preserves microsecond precision and rejects a cursor that does not advance', async () => {
  const requestCursor = encode(position(1));
  const nextPosition = { ...position(2), created_at: '2026-10-09T01:00:00.123455Z' };
  const h = harness(undefined, { pageResult: { items: [row(2)], next_position: nextPosition } });
  const response = await h.read('?paged=1&limit=1&cursor=' + requestCursor);
  const { data } = await response.json();
  assert.equal(JSON.parse(Buffer.from(data.next_cursor, 'base64url').toString()).created_at, nextPosition.created_at);
  const stuck = harness(undefined, { pageResult: { items: [row(1)], next_position: position(1) } });
  assert.equal((await stuck.read('?paged=1&limit=1&cursor=' + requestCursor)).status, 500);
});
test('T09 SQL contract adds only bounded RELEASED discovery and its matching index', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261009100000_public_content_discovery.sql', import.meta.url), 'utf8');
  assert.match(sql, /page_size not between 1 and 100/);
  assert.match(sql, /c.state='RELEASED'/);
  assert.match(sql, /order by c.created_at desc,c.id asc limit page_size\+1/);
  assert.match(sql, /c.created_at < after_created_at/); assert.match(sql, /c.id > after_id/);
  assert.match(sql, /category_filter is null or c.category=category_filter/);
  assert.match(sql, /security definer set search_path = ''/);
  assert.match(sql, /revoke all on function public.read_released_content_page/);
  assert.match(sql, /to anon,authenticated/);
  assert.match(sql, /on public.trial_content\(created_at desc, id asc\) where state = 'RELEASED'/);
  assert.doesNotMatch(sql, /create table|alter table|create policy|storage\.|create or replace|drop |delete |update /i);
});
