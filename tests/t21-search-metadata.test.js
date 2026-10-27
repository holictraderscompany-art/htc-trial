import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchPolicy, publicPageMetadata, articleMetadata, createRobotsHandler, createSitemapHandler } from '../src/server/search-metadata.js';
import { createContentHandler } from '../src/server/content-release.js';
import { discoveryContent, detailContent } from '../src/server/public-experience.js';

// Reserved example domain and synthetic UUIDs: fixtures only, never real HTC configuration.
const origin = 'https://htc-seo-fixture.example.org', host = new URL(origin).host;
const env = { NODE_ENV: 'production', HTC_SEO_INDEXING: 'enabled', HTC_SEO_CANONICAL_ORIGIN: origin,
  SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' };
const policy = () => searchPolicy(env, host);
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const request = (path, requestHost = host, headers = {}) => new Request(`${origin}${path}`, { headers: { host: requestHost, ...headers } });
const row = (n, state = 'RELEASED') => ({ id: id(n), category: 'INTRODUCTION', title: `HTC Trial introduction ${n}`,
  body: 'Introductory awareness only. Curriculum begins January 2027.', state, founder_id: 'PRIVATE_FOUNDER_CANARY', storage_path: 'PRIVATE_PATH_CANARY' });
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function publicFixture(records = [row(1), row(2, 'DRAFT'), row(3, 'WITHDRAWN')], beforeAssets = null) {
  const calls = [];
  const handler = createContentHandler('public', { env, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    const payload = JSON.parse(options.body);
    if (url.endsWith('/read_released_content_page')) return Response.json({ items: records.filter(c => c.state === 'RELEASED'), next_position: null });
    if (url.endsWith('/read_released_content')) return Response.json(records.filter(c => c.state === 'RELEASED' && c.id === payload.content_id));
    if (url.endsWith('/read_released_content_assets')) {
      beforeAssets?.(records);
      return Response.json(records.filter(c => c.state === 'RELEASED' && payload.content_ids.includes(c.id)).map(c => ({ content_id: c.id, assets: [] })));
    }
    throw Error('PRIVATE_TRANSPORT_CANARY');
  } });
  return { records, calls, detail: value => detailContent(value, { handler }), page: value => discoveryContent(value, { handler }) };
}

test('T21 indexing is closed without explicit verified-origin provisioning and matching host', () => {
  assert.deepEqual(searchPolicy(), { indexable: false, origin: null });
  assert.deepEqual(searchPolicy(null, host), { indexable: false, origin: null });
  for (const key of ['NODE_ENV', 'HTC_SEO_INDEXING', 'HTC_SEO_CANONICAL_ORIGIN', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) {
    const incomplete = { ...env }; delete incomplete[key];
    assert.equal(searchPolicy(incomplete, host).indexable, false);
  }
  assert.deepEqual(policy(), { indexable: true, origin });
});

test('T21 preview/test and development builds cannot use the production canonical configuration', () => {
  for (const change of [{ NODE_ENV: 'development' }, { HTC_SUPABASE_TARGET: 'test' }, { VERCEL_ENV: 'preview' },
    { CONTEXT: 'deploy-preview' }, { CF_PAGES: '1' }, { SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co' }])
    assert.equal(searchPolicy({ ...env, ...change }, host).indexable, false);
});

test('T21 malformed, credential-bearing and hosted-preview canonical origins fail closed', () => {
  for (const raw of [null, [], '', 'http://example.org', 'https://user:secret@example.org', `${origin}/path`, `${origin}?token=secret`,
    `${origin}#fragment`, `${origin}:8443`, 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://example.test',
    'https://example.workers.dev', 'https://example.pages.dev', 'https://example.vercel.app', 'https://example.netlify.app', `${origin}/../`, `${origin}\\path`])
    assert.equal(searchPolicy({ ...env, HTC_SEO_CANONICAL_ORIGIN: raw }, host).indexable, false, String(raw));
});

test('T21 request host can veto configuration but cannot create a canonical via forwarded headers', async () => {
  for (const badHost of [null, '', 'attacker.example.org', `${host}:8443`, `${host},attacker.example.org`])
    assert.equal(searchPolicy(env, badHost).indexable, false);
  const response = createRobotsHandler({ env })(request('/robots.txt', 'preview.example.org', { 'x-forwarded-host': host }));
  assert.doesNotMatch(await response.text(), /Sitemap:/);
});

test('T21 home and discovery use distinct accurate Trial metadata and approved absolute canonicals', () => {
  const home = publicPageMetadata('home', policy()), content = publicPageMetadata('content', policy());
  assert.notEqual(home.title, content.title);
  assert.equal(home.alternates.canonical, `${origin}/`);
  assert.equal(content.alternates.canonical, `${origin}/content`);
  assert.match(home.description, /January 2027/);
  assert.match(content.description, /not part of this Trial/);
  assert.equal(home.robots.index, true);
  assert.equal(home.openGraph.url, home.alternates.canonical);
  assert.equal(home.twitter.card, 'summary');
  assert.ok(!Object.hasOwn(home.openGraph, 'images'));
});

test('T21 missing canonical prerequisite emits useful text without fabricated URLs', () => {
  const m = publicPageMetadata('home', searchPolicy());
  assert.equal(m.robots.index, false); assert.deepEqual(m.alternates, {});
  assert.ok(!Object.hasOwn(m.openGraph, 'url'));
  assert.doesNotMatch(JSON.stringify(m), /https?:\/\//);
});

test('T21 filter/cursor/invalid query and unavailable discovery results are not indexed', () => {
  for (const params of [{ category: 'INTRODUCTION' }, { cursor: 'opaque' }, { token: 'PRIVATE_QUERY_CANARY' }, { category: [] }, null, []]) {
    const m = publicPageMetadata('content', policy(), params);
    assert.equal(m.robots.index, false); assert.deepEqual(m.alternates, {});
    assert.ok(!JSON.stringify(m).includes('PRIVATE_QUERY_CANARY'));
  }
  assert.equal(publicPageMetadata('content', policy(), {}, false).robots.index, false);
  assert.equal(publicPageMetadata({ toString: null }, policy()).robots.index, false);
});

test('T21 released article metadata is derived from the existing anonymous public projection only', async () => {
  const f = publicFixture(), result = await f.detail(id(1)), m = articleMetadata(id(1), result, policy());
  assert.equal(m.title, row(1).title);
  assert.equal(m.description, row(1).body);
  assert.equal(m.alternates.canonical, `${origin}/content/${id(1)}`);
  assert.equal(m.openGraph.type, 'article');
  assert.equal(m.robots.index, true);
  assert.doesNotMatch(JSON.stringify(m), /PRIVATE_|storage_path|founder_id/);
  assert.ok(f.calls.every(c => !c.options.headers.Authorization && !c.url.includes('is_founder')));
});

test('T21 article descriptions collapse whitespace and limit Unicode characters', () => {
  const item = { ...row(1), body: `Intro\n\n${'😀'.repeat(200)}` };
  const m = articleMetadata(id(1), { status: 200, data: item }, policy());
  assert.equal(Array.from(m.description).length, 160); assert.doesNotMatch(m.description, /\n/);
});

for (const state of ['DRAFT', 'WITHDRAWN']) test(`T21 ${state} details and metadata remain unavailable`, async () => {
  const f = publicFixture([row(1, state)]), result = await f.detail(id(1));
  assert.equal(result.status, 404);
  const m = articleMetadata(id(1), result, policy());
  assert.equal(m.robots.index, false); assert.deepEqual(m.alternates, {});
  assert.ok(!JSON.stringify(m).includes(row(1).title));
});

test('T21 wrong IDs, malformed results and private-state injections cannot produce article canonicals', () => {
  for (const [value, result] of [['../founder', { status: 200, data: row(1) }], [id(2), { status: 200, data: row(1) }],
    [id(1), { status: 200, data: row(1, 'DRAFT') }], [id(1), { status: 500, data: row(1) }], [id(1), null],
    [id(1), { status: 200, data: { ...row(1), body: '<script>PRIVATE_CANARY</script>' } }]]) {
    const m = articleMetadata(value, result, policy());
    assert.equal(m.robots.index, false); assert.deepEqual(m.alternates, {});
    assert.doesNotMatch(JSON.stringify(m), /PRIVATE_|\.\.\/founder/);
  }
});

test('T21 withdrawal between content and asset reads removes sitemap and article metadata eligibility', async () => {
  const f = publicFixture([row(1)], records => { records[0].state = 'WITHDRAWN'; });
  const result = await f.detail(id(1)); assert.equal(result.status, 404);
  assert.equal(articleMetadata(id(1), result, policy()).robots.index, false);
  const response = await createSitemapHandler({ env, readPage: f.page })(request('/sitemap.xml'));
  assert.ok(!(await response.text()).includes(id(1)));
});

test('T21 sitemap includes only homepage, discovery and currently RELEASED UUID destinations', async () => {
  const f = publicFixture(), response = await createSitemapHandler({ env, readPage: f.page })(request('/sitemap.xml'));
  const body = await response.text();
  assert.equal(response.status, 200); assert.match(body, new RegExp(`/content/${id(1)}`));
  assert.ok(!body.includes(id(2)) && !body.includes(id(3)));
  assert.doesNotMatch(body, /PRIVATE_|founder|\/api\/|\/auth\/|sign-in|trial-assets|signed|token/);
  assert.equal((body.match(/<loc>/g) ?? []).length, 3);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-type'), /application\/xml/);
});

test('T21 sitemap uses bounded T09 continuation and retains every returned UUID', async () => {
  const calls = [];
  const response = await createSitemapHandler({ env, readPage: async parameters => {
    calls.push(parameters);
    return { status: 200, data: { items: [row(calls.length)], next_cursor: calls.length === 1 ? 'opaque_cursor' : null } };
  } })(request('/sitemap.xml'));
  assert.equal(response.status, 200); const body = await response.text();
  assert.ok(body.includes(id(1)) && body.includes(id(2)));
  assert.deepEqual(calls, [{}, { cursor: 'opaque_cursor' }]);
});

test('T21 preview or absent-domain sitemap is empty and performs no public data read', async () => {
  let calls = 0; const handler = createSitemapHandler({ env: {}, readPage: async () => { calls++; throw Error(); } });
  const response = await handler(request('/sitemap.xml'));
  assert.equal(response.status, 200); assert.equal(calls, 0);
  assert.doesNotMatch(await response.text(), /<loc>|example.org|founder/);
});

test('T21 sitemap errors return redacted 503 with no stale/partial URLs', async () => {
  const badPages = [async () => { throw Error('PRIVATE_ERROR_CANARY'); }, async () => ({ status: 500 }),
    async () => ({ status: 200, data: { items: [row(1, 'DRAFT')], next_cursor: null } }),
    async () => ({ status: 200, data: { items: [{ id: '../founder' }], next_cursor: null } }),
    async () => ({ status: 200, data: { items: [row(1), row(1)], next_cursor: null } }),
    async () => ({ status: 200, data: { items: [], next_cursor: 'PRIVATE?TOKEN' } })];
  for (const readPage of badPages) {
    const response = await createSitemapHandler({ env, readPage })(request('/sitemap.xml'));
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /<loc>|PRIVATE|founder|token/);
  }
});

test('T21 repeating cursors, duplicate IDs across pages and scan overflow fail without partial output', async () => {
  for (const mode of ['cursor', 'id', 'overflow']) {
    let n = 0;
    const response = await createSitemapHandler({ env, readPage: async () => {
      n++; return { status: 200, data: { items: [row(mode === 'id' ? 1 : n)], next_cursor: mode === 'cursor' ? 'repeated' : `cursor_${n}` } };
    } })(request('/sitemap.xml'));
    assert.equal(response.status, 503); assert.ok(n <= 20);
    assert.doesNotMatch(await response.text(), /<loc>/);
  }
});

test('T21 preview robots permits reading noindex while excluding private paths and omitting sitemap', async () => {
  const closed = createRobotsHandler({ env: {} })(request('/robots.txt'));
  const closedBody = await closed.text();
  assert.match(closedBody, /Allow: \//); assert.doesNotMatch(closedBody, /Disallow: \/\n|Sitemap:/);
  assert.equal(publicPageMetadata('home', searchPolicy()).robots.index, false);
  const open = createRobotsHandler({ env })(request('/robots.txt'));
  const body = await open.text(); assert.match(body, /Allow: \//);
  assert.ok(body.includes(`Sitemap: ${origin}/sitemap.xml`));
  for (const surface of ['/founder', '/api/', '/auth/', '/sign-in']) assert.ok(body.includes(`Disallow: ${surface}`));
  assert.equal(open.headers.get('cache-control'), 'no-store');
});

test('T21 route exports use dynamic no-store factories and no mutations', async () => {
  for (const name of ['robots.txt', 'sitemap.xml']) {
    const module = await import(`../src/app/${name}/route.js`);
    assert.equal(module.dynamic, 'force-dynamic');
    const response = await module.GET(new Request(`https://example.invalid/${name}`));
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  }
});

test('T21 metadata wiring retains request memoization, notFound and inherited protected noindex', () => {
  const root = read('src/app/layout.js'), detail = read('src/app/(public)/content/[id]/page.js');
  assert.match(root, /robots: \{ index: false, follow: false \}/);
  assert.match(detail, /cache\(detailContent\)/); assert.match(detail, /\[400, 404\]\.includes\(result.status\)\) notFound\(\)/);
  assert.match(read('src/app/(public)/content/page.js'), /cache\(discoveryContent\)/);
  assert.match(read('src/server/search-context.js'), /requestHeaders.get\('host'\)/);
  assert.doesNotMatch(read('src/server/search-context.js'), /forwarded|NEXT_PUBLIC/);
  assert.doesNotMatch(read('src/server/search-metadata.js'), /manage_trial|service_role|Authorization|signedUrl|setInterval|setTimeout/);
});
