import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContentAssetHandler } from '../src/server/content-assets.js';
import { createContentHandler } from '../src/server/content-release.js';

const contentId = '11111111-1111-4111-8111-111111111111';
const assetId = '22222222-2222-4222-8222-222222222222';
const relationId = '33333333-3333-4333-8333-333333333333';
const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const relation = { id: relationId, content_id: contentId, asset_id: assetId, role: 'PRIMARY', created_at: '2026-10-09T00:00:00Z' };
const content = { id: contentId, category: 'INFORMATION', title: 'Trial', body: 'Trial content.' };
const metadata = { id: assetId, role: 'PRIMARY', mime_type: 'image/png', width: null, height: null, duration_seconds: null };
const attach = { action: 'attach', content_id: contentId, asset_id: assetId, role: 'PRIMARY' };
function management(options = {}) {
  const calls = [];
  const fetchImpl = async (url, settings) => {
    calls.push({ url, settings });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: contentId, is_anonymous: options.anonymous ?? false });
    if (url.endsWith('/rpc/is_founder')) return Response.json(options.founder ?? true);
    if (url.endsWith('/rpc/manage_trial_content_asset')) return Response.json(Object.hasOwn(options, 'result') ? options.result : relation, { status: options.status ?? 200 });
    throw Error('Unexpected call');
  };
  const handler = createContentAssetHandler({ env, fetchImpl });
  return { calls, invoke: (payload, token = 'test-session', overrides = {}) => handler(new Request('https://htc.test/api/content/assets/manage', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload), ...overrides,
  })) };
}
function publicRead(options = {}) {
  const calls = [];
  const fetchImpl = async (url, settings) => {
    calls.push({ url, settings });
    if (url.endsWith('/rpc/read_released_content')) return Response.json(options.contentRows ?? [content]);
    if (url.endsWith('/rpc/read_released_content_assets')) return Response.json(options.assetRows ?? [{ content_id: contentId, assets: [metadata] }], { status: options.status ?? 200 });
    throw Error('Unexpected call');
  };
  const handler = createContentHandler('public', { env, fetchImpl });
  return { calls, invoke: (query = '?id=' + contentId + '&assets=1', token = 'ignored-caller-token') => handler(new Request('https://htc.test/api/content' + query, { headers: { Authorization: 'Bearer ' + token } })) };
}
test('Founder attach forwards exact validated payload and keeps original session', async () => {
  const h = management(); const r = await h.invoke(attach);
  assert.equal(r.status, 200); assert.deepEqual((await r.json()).data, relation);
  assert.deepEqual(JSON.parse(h.calls.at(-1).settings.body), { payload: attach });
  assert.equal(h.calls.at(-1).settings.headers.Authorization, 'Bearer test-session');
});
test('Founder detach returns relation; missing content/asset/relation yields 404', async () => {
  const p = { action: 'detach', content_id: contentId, asset_id: assetId };
  assert.equal((await management().invoke(p)).status, 200);
  assert.equal((await management({ result: null }).invoke(p)).status, 404);
});
test('Founder list projects only safe relation fields', async () => {
  const h = management({ result: { content_id: contentId, relations: [{ ...relation, secret: 'not-public' }] } });
  const r = await h.invoke({ action: 'list', content_id: contentId });
  assert.equal(r.status, 200); assert.deepEqual((await r.json()).data.relations, [relation]);
});
test('USER and anonymous cannot attach/detach/list and never reach mutation RPC', async () => {
  for (const p of [attach, { action: 'detach', content_id: contentId, asset_id: assetId }, { action: 'list', content_id: contentId }]) {
    for (const [options, token, expected] of [[{ founder: false }, 'test-session', 403], [{ anonymous: true }, 'test-session', 401], [{}, null, 401]]) {
      const h = management(options); assert.equal((await h.invoke(p, token)).status, expected);
      assert.equal(h.calls.some(c => c.url.includes('manage_trial_content_asset')), false);
    }
  }
});
test('invalid role, identifiers, arbitrary paths and client authorization claims are rejected', async () => {
  for (const change of [{ role: 'GALLERY' }, { asset_id: '../private' }, { content_id: 'bad' }, { role: null }, { email: 'founder' }, { storage_path: 'private' }, { action: 'toString' }]) {
    const h = management(); assert.equal((await h.invoke({ ...attach, ...change })).status, 400); assert.equal(h.calls.length, 2);
  }
});
test('invalid/oversized management JSON and wrong method fail closed', async () => {
  for (const body of ['{', 'x'.repeat(2049), 'null']) assert.equal((await management().invoke(attach, 'test-session', { body })).status, 400);
  assert.equal((await management().invoke(attach, 'test-session', { method: 'PUT' })).status, 405);
});
test('database rejections are controlled without leaking private messages', async () => {
  const h = management({ status: 400, result: { message: 'private SQL details' } });
  const r = await h.invoke(attach); assert.equal(r.status, 500); assert.equal((await r.text()).includes('private SQL'), false);
});
test('unexpected cross-content relations and duplicate management rows fail closed', async () => {
  assert.equal((await management({ result: { ...relation, content_id: assetId } }).invoke(attach)).status, 500);
  assert.equal((await management({ result: { ...relation, role: 'ATTACHMENT' } }).invoke(attach)).status, 500);
  assert.equal((await management({ result: { content_id: contentId, relations: [relation, relation] } }).invoke({ action: 'list', content_id: contentId })).status, 500);
});
test('RELEASED READY metadata resolves safely without paths or binary credentials', async () => {
  const h = publicRead({ assetRows: [{ content_id: contentId, assets: [{ ...metadata, storage_path: 'private', download: 'private', status: 'READY' }] }] });
  const r = await h.invoke(); assert.equal(r.status, 200); assert.deepEqual((await r.json()).data, { ...content, assets: [metadata] });
  assert.equal(h.calls.every(c => !Object.hasOwn(c.settings.headers, 'Authorization')), true);
  assert.equal(h.calls.some(c => c.url.includes('/storage/')), false);
});
for (const mime_type of ['image/png', 'video/mp4', 'audio/mpeg', 'application/pdf']) test(`READY ${mime_type} metadata resolves`, async () => {
  const r = await publicRead({ assetRows: [{ content_id: contentId, assets: [{ ...metadata, mime_type }] }] }).invoke();
  assert.equal(r.status, 200); assert.equal((await r.json()).data.assets[0].mime_type, mime_type);
});
test('DRAFT/WITHDRAWN content exposes no metadata; concurrent edit/withdrawal fails closed', async () => {
  for (const state of ['DRAFT', 'WITHDRAWN']) {
    const h = publicRead({ contentRows: [] }); assert.equal((await h.invoke()).status, 404); assert.equal(h.calls.length, 1);
    assert.equal((await publicRead({ contentRows: [{ ...content, state }] }).invoke()).status, 500);
  }
  assert.equal((await publicRead({ assetRows: [] }).invoke()).status, 404);
  assert.deepEqual((await (await publicRead({ assetRows: [] }).invoke('?assets=1')).json()).data, []);
});
test('PENDING/DELETING upstream metadata is never exposed; missing objects yield empty assets', async () => {
  for (const status of ['PENDING', 'DELETING']) assert.equal((await publicRead({ assetRows: [{ content_id: contentId, assets: [{ ...metadata, status }] }] }).invoke()).status, 500);
  const r = await publicRead({ assetRows: [{ content_id: contentId, assets: [] }] }).invoke(); assert.equal(r.status, 200); assert.deepEqual((await r.json()).data.assets, []);
});
test('subsequent release resolution is available after a previous visibility denial', async () => {
  assert.equal((await publicRead({ assetRows: [] }).invoke()).status, 404);
  assert.equal((await publicRead().invoke()).status, 200);
});
test('original T06 response stays unchanged without assets=1 and empty lists avoid another RPC', async () => {
  const h = publicRead(); const r = await h.invoke('?id=' + contentId); assert.deepEqual((await r.json()).data, content); assert.equal(h.calls.length, 1);
  const empty = publicRead({ contentRows: [] }); assert.deepEqual((await (await empty.invoke('?assets=1')).json()).data, []); assert.equal(empty.calls.length, 1);
});
test('expansion is exact; duplicate parameters and unexpected metadata identities fail closed', async () => {
  for (const q of ['?assets=0', '?assets=1&assets=1', '?id=' + contentId + '&assets=1&path=private']) assert.equal((await publicRead().invoke(q)).status, 400);
  for (const rows of [[{ content_id: assetId, assets: [] }], [{ content_id: contentId, assets: [metadata, metadata] }]]) assert.equal((await publicRead({ assetRows: rows }).invoke()).status, 500);
});
test('invalid MIME/dimensions, unsafe upstream status and transport errors fail closed', async () => {
  for (const change of [{ mime_type: 'text/html' }, { width: -1 }, { duration_seconds: '10' }, { role: 'THUMBNAIL', mime_type: 'video/mp4' }]) assert.equal((await publicRead({ assetRows: [{ content_id: contentId, assets: [{ ...metadata, ...change }] }] }).invoke()).status, 500);
  assert.equal((await publicRead({ status: 500 }).invoke()).status, 500);
});
test('route binds only existing Founder management helper', async () => {
  const route = await import('../src/app/api/content/assets/manage/route.js');
  assert.equal(typeof route.POST, 'function'); assert.equal(route.GET, undefined); assert.equal(route.runtime, 'nodejs');
});
test('SQL contract keeps relation/deletion integrity and authoritative T06 transitions additive', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261009090000_trial_content_assets.sql', import.meta.url), 'utf8');
  assert.match(sql, /references public.trial_content\(id\) on delete restrict/);
  assert.match(sql, /references public.trial_assets\(id\) on delete restrict/);
  assert.match(sql, /unique\(content_id,asset_id\)/);
  for (const role of ['PRIMARY', 'THUMBNAIL']) assert.match(sql, new RegExp("create unique index .* where role='" + role + "'"));
  assert.match(sql, /enable row level security/); assert.match(sql, /revoke all on public.trial_content_assets/);
  assert.match(sql, /auth.uid\(\) is null or not public.is_founder\(\)/);
  assert.match(sql, /a.status<>'READY'/); assert.match(sql, /for update/g);
  assert.match(sql, /before update of status on public.trial_assets/);
  assert.match(sql, /Detach asset before changing its state/);
  assert.match(sql, /perform public.manage_trial_content/);
  assert.match(sql, /c.state='RELEASED'/); assert.match(sql, /a.status='READY'/);
  assert.match(sql, /storage.objects/); assert.match(sql, /cardinality\(content_ids\) between 1 and 100/);
  assert.doesNotMatch(sql, /drop |truncate |create or replace|on delete cascade|create policy .* on storage.objects/i);
});
