import test from 'node:test';
import assert from 'node:assert/strict';
import { createContentHandler } from '../src/server/content-release.js';

const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const content = n => ({ id: id(n), category: 'INFORMATION', title: `Trial ${n}`, body: 'Trial media.' });
const media = (n, role, mime_type) => ({ id: id(n), role, mime_type, width: null, height: null, duration_seconds: null });
function publicRead(contentRows, assetRows) {
  const calls = [];
  const fetchImpl = async (url, settings) => {
    calls.push({ url, settings });
    if (url.endsWith('/rpc/read_released_content')) return Response.json(contentRows);
    if (url.endsWith('/rpc/read_released_content_assets')) return Response.json(assetRows);
    throw Error('Unexpected upstream request');
  };
  const handler = createContentHandler('public', { env, fetchImpl });
  return { calls, invoke: () => handler(new Request('https://htc.test/api/content?assets=1', {
    headers: { Authorization: 'Bearer synthetic-founder-session' },
  })) };
}

test('T08 mixed Trial media keeps all allowed MIME types and roles without exposing private capabilities', async () => {
  const assets = [
    media(201, 'PRIMARY', 'image/jpeg'),
    media(202, 'THUMBNAIL', 'image/webp'),
    media(203, 'ATTACHMENT', 'image/png'),
    media(204, 'ATTACHMENT', 'video/mp4'),
    media(205, 'ATTACHMENT', 'audio/mpeg'),
    media(206, 'ATTACHMENT', 'application/pdf'),
  ];
  const h = publicRead([content(1)], [{ content_id: id(1), assets: assets.map(a => ({
    ...a, status: 'READY', storage_path: 'private/path', storage_bucket: 'trial-assets',
    original_filename: 'private-name', download: { url: 'https://private.test' }, token: 'synthetic-private-token',
  })) }]);
  const response = await h.invoke();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual((await response.json()).data, [{ ...content(1), assets }]);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(JSON.parse(h.calls[1].settings.body), { content_ids: [id(1)] });
  for (const { url, settings } of h.calls) {
    assert.equal(Object.hasOwn(settings.headers, 'Authorization'), false);
    assert.equal(settings.cache, 'no-store');
    assert.equal(url.includes('/storage/'), false);
  }
});

for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
  test(`T08 THUMBNAIL public metadata supports the established ${mime} contract`, async () => {
    const thumbnail = media(201, 'THUMBNAIL', mime);
    const h = publicRead([content(1)], [{ content_id: id(1), assets: [thumbnail] }]);
    const response = await h.invoke();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data[0].assets, [thumbnail]);
  });
}

test('T08 full 100-content boundary uses one anonymous metadata batch and preserves content ordering', async () => {
  const rows = Array.from({ length: 100 }, (_, i) => content(i + 1));
  const metadata = [...rows].reverse().map(c => ({ content_id: c.id, assets: [] }));
  const h = publicRead(rows, metadata);
  const response = await h.invoke();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, rows.map(c => ({ ...c, assets: [] })));
  assert.equal(h.calls.length, 2);
  assert.deepEqual(JSON.parse(h.calls[1].settings.body).content_ids, rows.map(c => c.id));
});

test('T08 batch lifecycle recheck removes withdrawn content while retaining released empty and mixed-media records', async () => {
  const attachment = media(201, 'ATTACHMENT', 'application/pdf');
  const h = publicRead([content(1), content(2), content(3)], [
    { content_id: id(3), assets: [attachment] },
    { content_id: id(1), assets: [] },
  ]);
  const response = await h.invoke();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, [
    { ...content(1), assets: [] }, { ...content(3), assets: [attachment] },
  ]);
});

test('T08 inconsistent metadata in a later batch record fails the whole response without partial disclosure', async () => {
  const h = publicRead([content(1), content(2)], [
    { content_id: id(1), assets: [media(201, 'PRIMARY', 'image/png')] },
    { content_id: id(2), assets: [{ ...media(202, 'ATTACHMENT', 'application/pdf'), status: 'PENDING', storage_path: 'private/path' }] },
  ]);
  const response = await h.invoke();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Request could not be completed.' } });
});

test('T08 oversized upstream content batch fails before any metadata resolution', async () => {
  const h = publicRead(Array.from({ length: 101 }, (_, i) => content(i + 1)), []);
  assert.equal((await h.invoke()).status, 500);
  assert.equal(h.calls.length, 1);
});
