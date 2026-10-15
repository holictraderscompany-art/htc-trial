import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createFounderContentHandler } from '../src/server/founder-content.js';
import { createContentHandler } from '../src/server/content-release.js';
import Workspace from '../src/components/founder-content-workspace.js';

const id = '00000000-0000-4000-8000-000000000010';
const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' };
const row = { id, category: 'EDITORIAL', title: 'Trial draft', body: 'Plain text', state: 'DRAFT',
  created_at: '2026-10-11T00:00:00Z', updated_at: '2026-10-11T00:00:00Z', released_at: null };
const editable = { id, category: row.category, title: row.title, body: row.body };
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function request(payload, { method = 'POST', origin = 'https://htc.test', cookie = 'htc_trial_session=synthetic-founder', query = '', raw, headers = {} } = {}) {
  return new Request(`https://htc.test/api/founder/content${query}`, { method,
    headers: { 'Content-Type': 'application/json', ...(origin === null ? {} : { Origin: origin }), ...(cookie === null ? {} : { Cookie: cookie }), ...headers },
    ...(method === 'POST' ? { body: raw ?? JSON.stringify(payload) } : {}),
  });
}
function fixture({ founder = true, user = { id }, authStatus = 200, result = row, rows = [], failAt } = {}) {
  const calls = [];
  const handler = createFounderContentHandler({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (failAt && url.endsWith(failAt)) throw Error('private-secret-error');
    if (url.endsWith('/auth/v1/user')) return Response.json(user, { status: authStatus });
    if (url.endsWith('/is_founder')) return Response.json(founder);
    if (url.endsWith('/list_trial_content_for_founder')) return Response.json(rows);
    if (url.endsWith('/update_trial_content_draft')) return Response.json(result);
    if (url.endsWith('/manage_trial_content')) return Response.json(result);
    throw Error('Unexpected network request');
  } });
  return { handler, calls };
}

test('T13 method, Origin and ambiguous/missing cookies fail before transport', async () => {
  for (const [options, status] of [[{ method: 'GET' }, 405], [{ origin: null }, 403], [{ origin: 'https://evil.test' }, 403],
    [{ cookie: null }, 401], [{ cookie: 'htc_trial_session=a; htc_trial_session=b' }, 401]]) {
    const f = fixture();
    const response = await f.handler(request({ action: 'list', cursor: null }, options));
    assert.equal(response.status, status);
    assert.equal(f.calls.length, 0);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('T13 USER, expired, anonymous and spoofed claims cannot access any operation', async () => {
  for (const options of [{ founder: false }, { founder: 'true' }, { founder: 1 }, { authStatus: 401 }, { user: { id, is_anonymous: true } },
    { founder: false, user: { id, email: 'holictraderscompany@gmail.com', user_metadata: { role: 'FOUNDER' } } }]) {
    for (const action of ['list', 'read', 'create', 'update']) {
      const f = fixture(options);
      const response = await f.handler(request({ action, ...editable }, { headers: { Authorization: 'Bearer spoofed', 'X-Role': 'FOUNDER' } }));
      assert.ok([401, 403].includes(response.status));
      assert.ok(f.calls.every(c => c.url.endsWith('/user') || c.url.endsWith('/is_founder')));
      assert.ok(f.calls.every(c => c.options.headers.Authorization === 'Bearer synthetic-founder'));
      assert.doesNotMatch(await response.text(), /Trial draft|Plain text|synthetic|email/);
    }
  }
});
test('T13 each operation reauthorizes; upstream failures are redacted and never retried', async () => {
  const f = fixture({ failAt: '/is_founder' });
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await f.handler(request({ action: 'read', id }));
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /private-secret-error|Trial draft/);
  }
  assert.equal(f.calls.length, 4);
});
test('T13 list projects fields and provides bounded UUID keyset pagination', async () => {
  const rows = Array.from({ length: 51 }, (_, i) => ({ ...row, id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, secret: 'hidden' }));
  const f = fixture({ rows });
  const response = await f.handler(request({ action: 'list', cursor: null }));
  const data = (await response.json()).data;
  assert.equal(data.items.length, 50);
  assert.equal(data.next_cursor, rows[49].id);
  assert.ok(data.items.every(item => !Object.hasOwn(item, 'secret')));
  assert.deepEqual(JSON.parse(f.calls[2].options.body), { after_id: null });
  const next = fixture({ rows: [rows[50]] });
  assert.equal((await (await next.handler(request({ action: 'list', cursor: rows[49].id }))).json()).data.next_cursor, null);
});
test('T13 malformed, duplicate and non-advancing upstream list rows fail closed', async () => {
  for (const rows of [[row, row], [{ ...row, state: 'UNKNOWN' }], [{ ...row, title: '<script>' }], [{ ...row, released_at: 'invalid' }], {}, Array(52).fill(row)]) {
    assert.equal((await fixture({ rows }).handler(request({ action: 'list', cursor: null }))).status, 500);
  }
  assert.equal((await fixture({ rows: [row] }).handler(request({ action: 'list', cursor: id }))).status, 500);
});
test('T13 creates only DRAFT using existing create contract and normalizes text', async () => {
  const f = fixture();
  const response = await f.handler(request({ action: 'create', category: row.category, title: '  Trial draft  ', body: ' Plain text ' }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, row);
  assert.deepEqual(JSON.parse(f.calls[2].options.body), { payload: { action: 'create', category: row.category, title: row.title, body: row.body } });
  assert.equal((await fixture({ result: { ...row, state: 'RELEASED', released_at: row.updated_at } }).handler(request({ action: 'create', category: row.category, title: row.title, body: row.body }))).status, 500);
});
test('T13 saves exclusively through atomic draft RPC, never legacy update', async () => {
  const f = fixture({ result: { outcome: 'saved', content: { ...row, secret: 'hidden' } } });
  const response = await f.handler(request({ action: 'update', ...editable }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, row);
  assert.ok(f.calls[2].url.endsWith('/update_trial_content_draft'));
  assert.deepEqual(JSON.parse(f.calls[2].options.body), { payload: editable });
  assert.ok(!f.calls.some(c => c.url.endsWith('/manage_trial_content')));
});
test('T13 non-DRAFT conflict, missing record and invalid save responses fail safely', async () => {
  for (const [result, status] of [[{ outcome: 'not_draft' }, 409], [{ outcome: 'not_found' }, 404], [null, 500],
    [{ outcome: 'saved', content: { ...row, state: 'RELEASED', released_at: row.updated_at } }, 500],
    [{ outcome: 'saved', content: { ...row, id: '00000000-0000-4000-8000-000000000099' } }, 500]]) {
    const response = await fixture({ result }).handler(request({ action: 'update', ...editable }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('T13 existing states can be read but unexpected identifiers are rejected', async () => {
  for (const state of ['DRAFT', 'RELEASED', 'WITHDRAWN']) {
    const result = { ...row, state, released_at: state === 'DRAFT' ? null : row.updated_at };
    const f = fixture({ result });
    assert.deepEqual((await (await f.handler(request({ action: 'read', id }))).json()).data, result);
    assert.deepEqual(JSON.parse(f.calls[2].options.body), { payload: { action: 'read', id } });
  }
  assert.equal((await fixture({ result: null }).handler(request({ action: 'read', id }))).status, 404);
});
test('T13 rejects publishing, identity/status fields and malformed/oversized input', async () => {
  const bad = [null, [], {}, { action: 'release', id }, { action: 'withdraw', id }, { action: 'delete', id },
    { action: 'update', ...editable, state: 'RELEASED' }, { action: 'create', ...editable },
    { action: 'read', id, role: 'FOUNDER' }, { action: 'list', cursor: null, select: '*' }, { action: 'list', cursor: 'invalid' },
    { action: 'update', ...editable, category: 'LESSON' }, { action: 'update', ...editable, title: ' ' },
    { action: 'update', ...editable, body: '<script>' }, { action: 'update', ...editable, body: 'x'.repeat(8001) }];
  for (const payload of bad) {
    const f = fixture();
    assert.equal((await f.handler(request(payload))).status, 400);
    assert.equal(f.calls.length, 2);
  }
  for (const options of [{ raw: 'bad JSON' }, { raw: 'x'.repeat(32769) }, { query: '?role=FOUNDER' }, { headers: { 'Content-Type': 'text/plain' } }]) {
    const f = fixture();
    assert.equal((await f.handler(request({ action: 'read', id }, options))).status, 400);
    assert.equal(f.calls.length, 2);
  }
});
test('T13 leaves existing bearer-only management and public projection unchanged', async () => {
  const response = await createContentHandler('founder', { env, fetchImpl: async () => { throw Error('Must not fetch'); } })(request({ action: 'update', ...editable }));
  assert.equal(response.status, 401);
  const publicHandler = createContentHandler('public', { env, fetchImpl: async () => Response.json([{ id, category: row.category, title: row.title, body: row.body }]) });
  const publicResult = await (await publicHandler(new Request('https://htc.test/api/content'))).json();
  assert.deepEqual(Object.keys(publicResult.data[0]), ['id', 'category', 'title', 'body']);
});
test('T13 SQL listing is narrow, Founder-authorized and does not modify protected contracts (static)', () => {
  const sql = source('supabase/migrations/20261011100000_founder_content_list.sql');
  assert.match(sql, /stable security definer\s+set search_path = ''/);
  assert.match(sql, /auth\.uid\(\) is null or public\.is_founder\(\) is distinct from true/);
  assert.match(sql, /order by c.id limit 51/);
  assert.match(sql, /revoke all on function .* from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function .* to authenticated;/);
  assert.doesNotMatch(sql, /(?:alter|drop)\s+(?:table|policy)|\b(?:insert|update|delete|commit)\b/i);
});
test('T13 workspace begins with no private data and has an independent page guard (static/SSR)', () => {
  const html = renderToStaticMarkup(h(Workspace));
  assert.match(html, /Content workspace|Loading content/);
  assert.doesNotMatch(html, /Trial draft|Plain text|Save draft|<iframe|<video|<audio/);
  const page = source('src/app/founder/content/page.js');
  assert.match(page, /getFounderAccess\(\)/);
  assert.match(page, /if \(state !== 'founder'\) return null/);
  assert.match(page, /force-dynamic/);
  const ui = source('src/components/founder-content-workspace.js');
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML|localStorage|sb_secret|Bearer|holictraderscompany@gmail.com/);
});
