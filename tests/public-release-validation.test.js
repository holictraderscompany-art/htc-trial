import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContentHandler } from '../src/server/content-release.js';
import { createContentAssetHandler } from '../src/server/content-assets.js';
import { createAssetHandler } from '../src/server/media-assets.js';
import { discoveryContent, detailContent } from '../src/server/public-experience.js';
import { ContentArticle, ContentList } from '../src/components/content-views.js';
import { continuationPath } from '../src/public/content-presentation.js';

const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const stamp = '2026-10-10T00:00:00.000001Z';
const row = n => ({ id: id(n), category: 'INFORMATION', title: `Controlled validation ${n}`, body: 'Local test text.', state: 'RELEASED', created_at: stamp, updated_at: stamp, released_at: stamp });
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

// Local transport fixtures model the already-reviewed SQL contract. They do not
// execute Postgres or substitute for the prior remote migration/runtime evidence.
function fixture({ count = 1, founder = true, assetStatus = 'READY', race = false } = {}) {
  const records = Array.from({ length: count }, (_, n) => row(n + 1));
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: id(900), is_anonymous: false });
    if (url.endsWith('/rpc/is_founder')) return Response.json(founder);
    const p = options.body ? JSON.parse(options.body) : {};
    if (url.endsWith('/rpc/manage_trial_content')) {
      const record = records.find(r => r.id === p.payload.id);
      if (!record) return Response.json(null);
      if (p.payload.action === 'update') Object.assign(record, p.payload, { state: 'DRAFT', released_at: null });
      if (p.payload.action === 'release') Object.assign(record, { state: 'RELEASED', released_at: stamp });
      if (p.payload.action === 'withdraw') record.state = 'WITHDRAWN';
      return Response.json(record);
    }
    const released = records.filter(r => r.state === 'RELEASED');
    if (url.endsWith('/rpc/read_released_content')) return Response.json(released.filter(r => !p.content_id || r.id === p.content_id));
    if (url.endsWith('/rpc/read_released_content_page')) {
      const eligible = released.filter(r => (!p.category_filter || r.category === p.category_filter) && (!p.after_id || r.id > p.after_id));
      const items = eligible.slice(0, p.page_size);
      return Response.json({ items, next_position: eligible.length > items.length ? { created_at: stamp, id: items.at(-1).id } : null });
    }
    if (url.endsWith('/rpc/read_released_content_assets')) {
      if (race) records[0].state = 'WITHDRAWN';
      return Response.json(records.filter(r => r.state === 'RELEASED' && p.content_ids.includes(r.id)).map(r => ({ content_id: r.id, assets: [{
        id: id(500), role: 'PRIMARY', mime_type: 'video/mp4', width: 1920, height: 1080, duration_seconds: 20,
        status: assetStatus, storage_path: 'private-validation-path', token: 'synthetic-private-value',
      }] })));
    }
    throw Error('Unexpected local transport request');
  };
  const dependencies = { env, fetchImpl };
  return { calls, records, dependencies, public: { handler: createContentHandler('public', dependencies) },
    manage: payload => createContentHandler('founder', dependencies)(new Request('https://htc.test/api/content/manage', {
      method: 'POST', headers: { Authorization: 'Bearer synthetic-founder', 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })) };
}

test('T11 lifecycle changes immediately reach discovery, detail and rendered media', async () => {
  const f = fixture();
  const read = () => detailContent(id(1), f.public);
  assert.match(render(ContentArticle, { item: (await read()).data }), /MP4 video/);
  assert.equal((await f.manage({ action: 'update', id: id(1), category: 'INFORMATION', title: 'Reviewed edit', body: 'Edited local text.' })).status, 200);
  assert.equal((await read()).status, 404);
  assert.match(render(ContentList, { items: (await discoveryContent({}, f.public)).data.items }), /No content available/);
  assert.equal((await f.manage({ action: 'release', id: id(1) })).status, 200);
  assert.match(render(ContentArticle, { item: (await read()).data }), /Reviewed edit/);
  assert.equal((await f.manage({ action: 'withdraw', id: id(1) })).status, 200);
  assert.equal((await read()).status, 404);
  assert.deepEqual((await discoveryContent({}, f.public)).data.items, []);
});

test('T11 withdrawal between content and metadata removes the rendered record', async () => {
  const f = fixture({ race: true });
  assert.deepEqual(await detailContent(id(1), f.public), { status: 404, data: null });
  assert.deepEqual((await discoveryContent({}, f.public)).data.items, []);
});

test('T11 presentation pagination walks real T09 cursors without duplicates', async () => {
  const f = fixture({ count: 13 });
  const first = await discoveryContent({ category: 'INFORMATION' }, f.public);
  assert.equal(first.data.items.length, 12);
  const continuation = new URL(continuationPath(first.data.next_cursor, 'INFORMATION'), 'https://htc.test');
  const second = await discoveryContent(Object.fromEntries(continuation.searchParams), f.public);
  assert.deepEqual([...first.data.items, ...second.data.items].map(r => r.id), Array.from({ length: 13 }, (_, n) => id(n + 1)));
  assert.equal(second.data.next_cursor, null);
  assert.match(render(ContentList, { items: second.data.items }), new RegExp(`/content/${id(13)}`));
  assert.equal(f.calls.length, 4); // One page read and one metadata batch per page.
});

test('T11 expanded detail strips private fields before rendering without binary requests', async () => {
  const f = fixture();
  const result = await detailContent(id(1), f.public);
  const rendered = render(ContentArticle, { item: result.data });
  assert.doesNotMatch(JSON.stringify(result) + rendered, /private-validation-path|synthetic-private-value|released_at|storage_path|<video|<audio|<img|download=/);
  assert.ok(f.calls.every(c => c.options.cache === 'no-store' && !c.options.headers.Authorization));
  assert.equal(f.calls.some(c => c.url.includes('/storage/')), false);
});

for (const status of ['PENDING', 'DELETING']) test(`T11 ${status} metadata fails closed before public rendering`, async () => {
  const f = fixture({ assetStatus: status });
  assert.deepEqual(await detailContent(id(1), f.public), { status: 500, data: null });
  assert.deepEqual(await discoveryContent({}, f.public), { status: 500, data: null });
});

test('T11 USER and anonymous requests cannot reach any Group 02 mutation/binary handler', async () => {
  const f = fixture({ founder: false });
  const handlers = [createContentHandler('founder', f.dependencies), createContentAssetHandler(f.dependencies), createAssetHandler(f.dependencies)];
  for (const handler of handlers) {
    for (const token of [null, 'synthetic-user']) {
      const start = f.calls.length;
      const response = await handler(new Request('https://htc.test/api/manage', { method: 'POST', headers: {
        'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }, body: JSON.stringify({ action: 'read', id: id(1) }) }));
      assert.equal(response.status, token ? 403 : 401);
      assert.ok(f.calls.slice(start).every(c => c.url.endsWith('/auth/v1/user') || c.url.endsWith('/rpc/is_founder')));
    }
  }
});

test('T11 allowed Founder management keeps the explicit bearer boundary', async () => {
  const f = fixture();
  assert.equal((await f.manage({ action: 'read', id: id(1) })).status, 200);
  assert.equal(f.calls.at(-1).options.headers.Authorization, 'Bearer synthetic-founder');
  assert.equal(f.calls.at(-1).url.endsWith('/rpc/manage_trial_content'), true);
});
