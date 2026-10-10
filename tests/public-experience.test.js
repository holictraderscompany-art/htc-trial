import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { discoveryContent, detailContent } from '../src/server/public-experience.js';
import { createContentHandler } from '../src/server/content-release.js';
import { createTrialSessionHandlers } from '../src/server/trial-session.js';
import { ContentList, ContentArticle, MediaMetadata, PageState } from '../src/components/content-views.js';
import { continuationPath } from '../src/public/content-presentation.js';

const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const id = '00000000-0000-4000-8000-000000000001';
const asset = { id: '00000000-0000-4000-8000-000000000002', role: 'PRIMARY', mime_type: 'image/png', width: null, height: null, duration_seconds: null };
const item = { id, category: 'INFORMATION', title: 'Controlled test title', body: 'First paragraph.\n\nSecond paragraph.', assets: [asset] };
const html = (component, props) => renderToStaticMarkup(h(component, props));
const source = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

function contentFixture(state = 'RELEASED') {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/read_released_content_page')) return Response.json({ items: state === 'RELEASED' ? [item] : [], next_position: null });
    if (url.endsWith('/read_released_content')) return Response.json(state === 'RELEASED' ? [item] : []);
    if (url.endsWith('/read_released_content_assets')) return Response.json(state === 'RELEASED' ? [{ content_id: id, assets: [asset] }] : []);
    throw Error('Unexpected request');
  };
  return { handler: createContentHandler('public', { env, fetchImpl }), calls };
}
test('T10 public entry truthfully describes Trial and links to the real discovery route', async () => {
  const page = await source('src/app/page.js');
  assert.match(page, /Holic Traders Company/); assert.match(page, /January 2027/);
  assert.match(page, /href="\/content"/); assert.match(page, /without signing in/);
});
test('T10 discovery adapter reuses T09 bounded anonymous queries and one media batch', async () => {
  const fixture = contentFixture(); const result = await discoveryContent({ category: 'INFORMATION' }, fixture);
  assert.equal(result.status, 200); assert.deepEqual(result.data.items, [item]);
  assert.equal(fixture.calls.length, 2);
  assert.deepEqual(JSON.parse(fixture.calls[0].options.body), { page_size: 12, category_filter: 'INFORMATION', after_created_at: null, after_id: null });
  assert.ok(fixture.calls.every(call => !call.options.headers.Authorization));
});
test('T10 discovery rejects duplicate and unknown UI parameters without upstream requests', async () => {
  for (const parameters of [{ category: ['INFORMATION', 'EDITORIAL'] }, { search: 'anything' }, { cursor: ['a', 'b'] }]) {
    const fixture = contentFixture(); assert.equal((await discoveryContent(parameters, fixture)).status, 400); assert.equal(fixture.calls.length, 0);
  }
});
test('T10 continuation URLs preserve opaque cursor/category and remain internal', () => {
  const path = continuationPath('a&category=OTHER', 'INFORMATION'); const url = new URL(path, 'https://htc.test');
  assert.equal(url.pathname, '/content'); assert.equal(url.searchParams.get('cursor'), 'a&category=OTHER');
  assert.equal(url.searchParams.get('category'), 'INFORMATION');
});
test('T10 released detail uses the current T06/T07B safe read contract', async () => {
  const fixture = contentFixture(); const result = await detailContent(id, fixture);
  assert.equal(result.status, 200); assert.deepEqual(result.data, item);
  assert.deepEqual(JSON.parse(fixture.calls[0].options.body), { content_id: id });
});
for (const state of ['DRAFT', 'WITHDRAWN']) test(`T10 ${state} detail and discovery remain unavailable`, async () => {
  assert.equal((await detailContent(id, contentFixture(state))).status, 404);
  assert.deepEqual((await discoveryContent({}, contentFixture(state))).data.items, []);
});
test('T10 invalid detail and unavailable transport remain controlled', async () => {
  assert.equal((await detailContent('../private', contentFixture())).status, 400);
  const handler = createContentHandler('public', { env, fetchImpl: async () => { throw Error('private-upstream-detail'); } });
  assert.deepEqual(await detailContent(id, { handler }), { status: 500, data: null });
});
test('T10 content list has real detail links, semantic headings and no fabricated media', () => {
  const rendered = html(ContentList, { items: [item] });
  assert.match(rendered, new RegExp(`href="/content/${id}"`)); assert.match(rendered, /<article>/); assert.match(rendered, /<h2>/);
  assert.match(rendered, /1 media reference/); assert.doesNotMatch(rendered, /<img|<video|<audio|Download|Play/);
});
test('T10 empty state contains honest guidance and no fake content', () => {
  const rendered = html(ContentList, { items: [] });
  assert.match(rendered, /No content available/); assert.match(rendered, /Try another category/); assert.doesNotMatch(rendered, /Controlled test title/);
});
test('T10 detail renders readable paragraphs and escapes content rather than HTML', () => {
  const rendered = html(ContentArticle, { item: { ...item, body: '<script>attack()</script>\n\nPlain text.' } });
  assert.match(rendered, /&lt;script&gt;/); assert.doesNotMatch(rendered, /<script>/); assert.match(rendered, /<p>Plain text\.<\/p>/);
  assert.match(rendered, /Back to content/);
});
test('T10 metadata presentation never renders private capabilities or fake players', () => {
  const rendered = html(MediaMetadata, { assets: [{ ...asset, storage_path: 'private-path', download: 'private-url', token: 'synthetic-token' }] });
  assert.match(rendered, /Primary media/); assert.match(rendered, /PNG image/);
  assert.doesNotMatch(rendered, /private-path|private-url|synthetic-token|<img|<audio|<video|href=/);
  assert.equal(html(MediaMetadata, { assets: [] }), '');
});
test('T10 error and not-found presentation gives semantic, actionable states', () => {
  const rendered = html(PageState, { title: 'Content is unavailable', children: 'Please try again.', action: 'Try again', alert: true });
  assert.match(rendered, /role="alert"/); assert.match(rendered, /<h1>/); assert.match(rendered, /href="\/content"/);
});
test('T10 shell has skip navigation and real links without Founder controls', async () => {
  const layout = await source('src/app/layout.js'); const navigation = await source('src/components/session-navigation.js');
  assert.match(layout, /lang="en"/); assert.match(layout, /href="#main"/); assert.match(layout, /<main id="main"/);
  assert.match(layout, /aria-label="Main navigation"/); assert.match(navigation, /href="\/sign-in"/);
  assert.doesNotMatch(layout + navigation, /\/api\/founder|manage_trial|service.role|localStorage|sessionStorage/);
});
test('T10 loading and session failures have accessible messages and recovery', async () => {
  const loading = await source('src/app/content/loading.js'); const navigation = await source('src/components/session-navigation.js');
  assert.match(loading, /aria-busy="true"/); assert.match(loading, /role="status"/);
  assert.match(navigation, /Sign-in status unavailable/); assert.match(navigation, /AbortController/); assert.match(navigation, /Retry/);
});

function authFixture({ valid = true, profile = true, exchange = true } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/token?')) return exchange ? Response.json({ access_token: 'synthetic-session', refresh_token: 'never-persisted', expires_in: 3600 }) : Response.json({ secret: 'private-error' }, { status: 400 });
    if (url.endsWith('/auth/v1/user')) return valid ? Response.json({ id, is_anonymous: false }) : Response.json({}, { status: 401 });
    if (url.includes('/user_profiles?')) return Response.json(profile ? [{ id, display_name: 'Existing USER', role: 'FOUNDER', secret: 'private-field' }] : []);
    if (url.includes('/logout?')) return new Response(null, { status: 204 });
    throw Error('Unexpected request');
  };
  return { calls, handlers: createTrialSessionHandlers({ env, fetchImpl }) };
}
const request = (path, options = {}) => new Request(`https://htc.test${path}`, options);
test('T10 anonymous and expired sessions expose no private identity', async () => {
  const anonymous = authFixture(); assert.deepEqual((await (await anonymous.handlers.session(request('/api/session'))).json()).data, { authenticated: false, display_name: null });
  assert.equal(anonymous.calls.length, 0);
  const expired = authFixture({ valid: false }); assert.equal((await (await expired.handlers.session(request('/api/session', { headers: { cookie: 'htc_trial_session=expired' } }))).json()).data.authenticated, false);
});
test('T10 USER identity is server-validated and projected without role or token', async () => {
  const fixture = authFixture(); const response = await fixture.handlers.session(request('/api/session', { headers: { cookie: 'htc_trial_session=synthetic-session' } }));
  assert.deepEqual((await response.json()).data, { authenticated: true, display_name: 'Existing USER' });
  assert.equal(fixture.calls[0].options.headers.Authorization, 'Bearer synthetic-session');
  assert.ok(fixture.calls.every(call => !call.url.includes('is_founder')));
  assert.equal((await authFixture({ profile: false }).handlers.session(request('/api/session', { headers: { cookie: 'htc_trial_session=synthetic-session' } }))).status, 403);
});
test('T10 sign-in uses Google PKCE and rejects cross-origin initiation', async () => {
  const fixture = authFixture(); assert.equal((await fixture.handlers.start(request('/auth/start', { method: 'POST', headers: { origin: 'https://attacker.test' } }))).status, 403);
  const response = await fixture.handlers.start(request('/auth/start', { method: 'POST', headers: { origin: 'https://htc.test' } }));
  const url = new URL(response.headers.get('location')); assert.equal(url.origin, env.SUPABASE_URL);
  assert.equal(url.searchParams.get('provider'), 'google'); assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=600; Secure/);
});
test('T10 callback verifies correlation/identity and retains only expiring HttpOnly access', async () => {
  const fixture = authFixture(); const start = await fixture.handlers.start(request('/auth/start', { method: 'POST', headers: { origin: 'https://htc.test' } }));
  const flow = start.headers.get('set-cookie').split(';')[0]; const callbackUrl = new URL(new URL(start.headers.get('location')).searchParams.get('redirect_to')); callbackUrl.searchParams.set('code', 'test-code');
  const response = await fixture.handlers.callback(new Request(callbackUrl, { headers: { cookie: flow } }));
  assert.equal(new URL(response.headers.get('location')).pathname, '/content');
  assert.match(response.headers.get('set-cookie'), /htc_trial_session=synthetic-session/); assert.match(response.headers.get('set-cookie'), /Max-Age=3600; Secure/);
  assert.doesNotMatch(response.headers.get('set-cookie'), /never-persisted/); assert.match(response.headers.get('set-cookie'), /htc_trial_pkce=;.*Max-Age=0/);
  assert.equal((await fixture.handlers.callback(request('/auth/callback?attempt=wrong&code=test'))).headers.get('location'), 'https://htc.test/sign-in?error=failed');
});
test('T10 sign-out rejects CSRF, clears local cookies and revokes only current session', async () => {
  const fixture = authFixture(); assert.equal((await fixture.handlers.signout(request('/auth/sign-out', { method: 'POST', headers: { origin: 'https://attacker.test' } }))).status, 403);
  const response = await fixture.handlers.signout(request('/auth/sign-out', { method: 'POST', headers: { origin: 'https://htc.test', cookie: 'htc_trial_session=synthetic-session' } }));
  assert.equal(response.status, 303); assert.match(response.headers.get('set-cookie'), /htc_trial_session=;.*Max-Age=0/);
  assert.ok(fixture.calls[0].url.endsWith('logout?scope=local'));
});
test('T10 invalid callback never exchanges code or leaks provider errors; methods are restricted', async () => {
  const fixture = authFixture();
  const response = await fixture.handlers.callback(request('/auth/callback?error=private-provider-error'));
  assert.equal(fixture.calls.length, 0); assert.doesNotMatch(response.headers.get('location'), /private-provider-error/);
  assert.equal((await fixture.handlers.start(request('/auth/start'))).status, 405);
  assert.equal((await fixture.handlers.signout(request('/auth/sign-out'))).status, 405);
  assert.equal((await fixture.handlers.session(request('/api/session', { method: 'POST' }))).status, 405);
});
test('T10 USER cannot gain Founder capability through the cookie UI flow', async () => {
  const { createHandler } = await import('../src/server/api-foundation.js');
  const handler = createHandler('founder', { env, fetchImpl: async url => url.endsWith('/user') ? Response.json({ id, is_anonymous: false }) : Response.json(false) });
  assert.equal((await handler(request('/api/founder', { method: 'POST', headers: { Authorization: 'Bearer synthetic-user', 'Content-Type': 'application/json' }, body: '{"probe":"access"}' }))).status, 403);
  assert.equal((await handler(request('/api/founder', { method: 'POST', headers: { cookie: 'htc_trial_session=synthetic-user' } }))).status, 401);
});
