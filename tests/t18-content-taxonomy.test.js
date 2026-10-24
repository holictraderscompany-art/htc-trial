import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contentCategories, validateContentRequest, createContentHandler } from '../src/server/content-release.js';
import { publicPageRequest } from '../src/server/content-discovery.js';
import { projectFounderContent, createFounderContentHandler } from '../src/server/founder-content.js';

const taxonomy = JSON.parse(readFileSync(new URL('../docs/t18-content-taxonomy.json', import.meta.url), 'utf8'));
const bundle = taxonomy.example_bundle;
const id = '00000000-0000-4000-8000-000000000018';
const stamp = '2026-10-25T00:00:00Z';
const payload = () => ({ action: 'create', category: bundle.article.category, title: bundle.article.title, body: bundle.article.body });
const row = state => ({ id, ...bundle.article, state, created_at: stamp, updated_at: stamp,
  released_at: state === 'DRAFT' ? null : stamp, pillar: bundle.pillar, topic_key: bundle.topic_key });

test('T18 purpose mapping covers the actual category contract; pillars are separate', () => {
  assert.deepEqual(Object.keys(taxonomy.category_purpose), contentCategories);
  assert.deepEqual(Object.keys(taxonomy.pillars), ['Education', 'Learning', 'Knowledge', 'Community']);
  for (const category of contentCategories) {
    assert.equal(typeof taxonomy.category_purpose[category], 'string');
    assert.doesNotThrow(() => validateContentRequest({ ...payload(), category }));
    assert.equal(publicPageRequest(new URL(`https://htc.test/api/content?paged=1&category=${category}`), contentCategories).category, category);
  }
  for (const pillar of Object.keys(taxonomy.pillars)) {
    assert.throws(() => validateContentRequest({ ...payload(), category: pillar }), error => error.status === 400);
    assert.throws(() => publicPageRequest(new URL(`https://htc.test/api/content?paged=1&category=${pillar}`), contentCategories), error => error.status === 400);
  }
});

test('T18 recipes preserve the complete approved platform and format coverage', () => {
  const recipes = taxonomy.platform_recipes;
  assert.equal(new Set(recipes.map(r => r.key)).size, recipes.length);
  assert.deepEqual(recipes.map(r => [r.platform, r.formats]), [
    ['Instagram', ['CAROUSEL']], ['Instagram', ['REEL']],
    ['Facebook', ['CAROUSEL', 'ALBUM']], ['Facebook', ['REEL']],
    ['TikTok', ['PHOTO_CAROUSEL']], ['TikTok', ['ANIMATED_VIDEO']],
    ['YouTube', ['LONG_FORM_VIDEO']], ['YouTube', ['SHORT']], ['HTC Website', ['ARTICLE']],
  ]);
  for (const key of ['instagram-carousel', 'tiktok-photo-carousel']) {
    assert.deepEqual(recipes.find(r => r.key === key).slides, { min: 1, max: 8 });
  }
  assert.deepEqual(recipes.find(r => r.key === 'youtube-explainer').duration_seconds, { min: 600, max: 900 });
  for (const recipe of recipes.filter(r => /REEL|VIDEO|SHORT/.test(r.formats.join(' ')))) {
    assert.equal(recipe.style, 'CINEMATIC_STYLIZED_3D');
  }
});

test('T18 example has no orphan derivatives, duplicate article or fabricated live records', () => {
  assert.equal(bundle.illustrative_only, true);
  assert.equal(bundle.trial_eligible, null);
  assert.match(bundle.topic_key, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
  assert.ok(Object.hasOwn(taxonomy.pillars, bundle.pillar));
  assert.ok(Object.hasOwn(taxonomy.classifications, bundle.classification));
  assert.ok(bundle.audience.length > 0);
  for (const audience of bundle.audience) assert.ok(Object.hasOwn(taxonomy.audiences, audience));
  assert.equal(bundle.article.content_id, null);
  assert.equal(new Set(bundle.derivatives.map(d => d.recipe)).size, bundle.derivatives.length);
  assert.deepEqual(bundle.derivatives.map(d => d.recipe).sort(), taxonomy.platform_recipes.map(r => r.key).sort());
  assert.equal(bundle.derivatives.filter(d => d.recipe === 'website-article').length, 1);
  for (const derivative of bundle.derivatives) {
    assert.equal(derivative.source_topic_key, bundle.topic_key);
    assert.equal(derivative.content_id, null);
    assert.deepEqual(derivative.asset_ids, []);
    assert.deepEqual(derivative.sequence, []);
    assert.equal(new Intl.Locale(derivative.language).toString(), derivative.language);
  }
  assert.equal(new Intl.Locale(bundle.source_language).toString(), bundle.source_language);
  for (const reference of bundle.source_references) assert.ok(readFileSync(new URL(`../${reference}`, import.meta.url)).length > 0);
});

test('T18 article maps to existing CMS payloads; editorial metadata cannot become write fields', () => {
  assert.doesNotThrow(() => validateContentRequest(payload()));
  assert.doesNotThrow(() => validateContentRequest({ ...payload(), action: 'update', id }));
  for (const key of Object.keys(taxonomy.editorial_fields)) {
    assert.throws(() => validateContentRequest({ ...payload(), [key]: bundle[key] ?? 'editorial-only' }), error => error.status === 400);
  }
  assert.throws(() => validateContentRequest({ ...payload(), state: 'RELEASED' }), error => error.status === 400);
  assert.throws(() => validateContentRequest({ ...payload(), body: '<metadata>private</metadata>' }), error => error.status === 400);
  assert.throws(() => validateContentRequest({ ...payload(), body: 'x'.repeat(8001) }), error => error.status === 400);
});

test('T18 editorial annotations cannot alter the existing Founder lifecycle projection', () => {
  for (const state of ['DRAFT', 'RELEASED', 'WITHDRAWN']) {
    const projected = projectFounderContent(row(state), id);
    assert.equal(projected.state, state);
    assert.deepEqual(Object.keys(projected), ['id', 'category', 'title', 'body', 'state', 'created_at', 'updated_at', 'released_at']);
  }
  assert.throws(() => projectFounderContent(row('TRIAL_APPROVED'), id), error => error.status === 500);
});

test('T18 metadata stays outside public output; nonreleased upstream rows fail closed (fixture only)', async () => {
  for (const state of ['RELEASED', 'DRAFT', 'WITHDRAWN']) {
    const calls = [];
    const handler = createContentHandler('public', {
      env: { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_t18_fixture' },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        assert.ok(url.endsWith('/rest/v1/rpc/read_released_content'));
        return Response.json([row(state)]);
      },
    });
    const response = await handler(new Request('https://htc.test/api/content', {
      headers: { Authorization: 'Bearer synthetic-user-cannot-elevate' },
    }));
    assert.equal(response.status, state === 'RELEASED' ? 200 : 500);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers.apikey, 'sb_publishable_t18_fixture');
    assert.equal(calls[0].options.headers.Authorization, undefined);
    const data = (await response.json()).data;
    if (state === 'RELEASED') assert.deepEqual(data, [{ id, category: bundle.article.category, title: bundle.article.title, body: bundle.article.body }]);
    else assert.equal(data, undefined);
  }
});

test('T18 annotations cannot bypass Founder authentication, role checks or the payload allowlist (fixture only)', async () => {
  for (const [cookie, founder, expected] of [[false, false, 401], [true, false, 403], [true, true, 400]]) {
    const calls = [];
    const handler = createFounderContentHandler({
      env: { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_t18_fixture' },
      fetchImpl: async url => {
        calls.push(url);
        if (url.endsWith('/auth/v1/user')) return Response.json({ id, is_anonymous: false });
        if (url.endsWith('/rpc/is_founder')) return Response.json(founder);
        throw Error('T18 metadata must never reach a mutation RPC');
      },
    });
    const request = new Request('https://htc.test/api/founder/content', {
      method: 'POST',
      headers: { Origin: 'https://htc.test', 'Content-Type': 'application/json',
        ...(cookie ? { Cookie: 'htc_trial_session=synthetic-t18-session' } : {}) },
      body: JSON.stringify({ ...payload(), topic_key: bundle.topic_key, trial_eligible: true }),
    });
    assert.equal((await handler(request)).status, expected);
    assert.equal(calls.length, cookie ? 2 : 0);
  }
});
