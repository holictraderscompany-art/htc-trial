import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { founderAccess } from '../src/server/founder-access.js';
import { readSessionToken } from '../src/server/session-token.js';
import { FounderBoundary, FounderEntry } from '../src/components/founder-views.js';
import { createHandler } from '../src/server/api-foundation.js';
import { createContentHandler } from '../src/server/content-release.js';
import { createContentAssetHandler } from '../src/server/content-assets.js';
import { createAssetHandler } from '../src/server/media-assets.js';

const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const id = '00000000-0000-4000-8000-000000000001';
const request = (cookie, headers = {}) => new Request('https://htc.test/founder', { headers: { ...(cookie === undefined ? {} : { cookie }), ...headers } });
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function fixture({ allowed = false, user = { id, is_anonymous: false }, authStatus = 200, rpcStatus = 200, fail = false, configuration = env } = {}) {
  const calls = [];
  const dependencies = { env: configuration, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (fail) throw Error('private-upstream-detail');
    if (url.endsWith('/auth/v1/user')) return Response.json(user, { status: authStatus });
    if (url.endsWith('/rpc/is_founder')) return Response.json(allowed, { status: rpcStatus });
    throw Error('Unexpected upstream request');
  } };
  return { calls, dependencies, access: r => founderAccess(r, dependencies) };
}

test('T12 missing, malformed and ambiguous cookies deny access before transport', async () => {
  for (const cookie of [undefined, '', 'other=synthetic', 'htc_trial_session=', 'htc_trial_session=bad value',
    'htc_trial_session=one; htc_trial_session=two', `htc_trial_session=${'a'.repeat(3501)}`]) {
    const f = fixture({ allowed: true });
    assert.deepEqual(await f.access(request(cookie)), { state: 'anonymous' });
    assert.equal(f.calls.length, 0);
  }
  assert.equal(readSessionToken(request('other=ignored; htc_trial_session=synthetic-session')), 'synthetic-session');
});

for (const authStatus of [401, 403]) test(`T12 rejected/expired session (${authStatus}) cannot render Founder content`, async () => {
  const f = fixture({ allowed: true, authStatus });
  assert.deepEqual(await f.access(request('htc_trial_session=synthetic-expired')), { state: 'anonymous' });
  assert.equal(f.calls.length, 1);
});

test('T12 anonymous identities and invalid server identifiers fail closed', async () => {
  for (const user of [{ id, is_anonymous: true }, { id: 'not-a-uuid' }, {}]) {
    const f = fixture({ allowed: true, user });
    assert.deepEqual(await f.access(request('htc_trial_session=synthetic-session')), { state: 'anonymous' });
    assert.equal(f.calls.length, 1);
  }
});

test('T12 USER denied despite forged identity headers, metadata and email', async () => {
  const f = fixture({ user: { id, email: 'holictraderscompany@gmail.com', user_metadata: { role: 'FOUNDER' }, app_metadata: { role: 'FOUNDER' } } });
  const r = request('htc_trial_session=synthetic-user', { Authorization: 'Bearer forged-founder', 'X-Role': 'FOUNDER', 'X-Email': 'holictraderscompany@gmail.com' });
  assert.deepEqual(await f.access(r), { state: 'denied' });
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls.every(c => c.options.headers.Authorization === 'Bearer synthetic-user'));
  assert.equal(f.calls[1].options.body, '{}');
});

test('T12 Founder requires exact authoritative true and never returns identity/token', async () => {
  const f = fixture({ allowed: true, user: { id, email: 'private-email', secret: 'private-user-data' } });
  const result = await f.access(request('htc_trial_session=synthetic-founder'));
  assert.deepEqual(result, { state: 'founder' });
  assert.ok(f.calls.every(c => c.options.headers.Authorization === 'Bearer synthetic-founder' && c.options.cache === 'no-store' && c.options.redirect === 'error'));
  for (const allowed of ['true', 1, null, {}, { role: 'FOUNDER' }]) {
    assert.deepEqual(await fixture({ allowed }).access(request('htc_trial_session=synthetic-founder')), { state: 'denied' });
  }
  assert.doesNotMatch(JSON.stringify(result), /private|synthetic|token|email|user/);
});

test('T12 upstream/configuration failures are unavailable without leaking errors', async () => {
  for (const options of [{ fail: true }, { authStatus: 500 }, { allowed: true, rpcStatus: 500 }, { configuration: {} }]) {
    assert.deepEqual(await fixture(options).access(request('htc_trial_session=synthetic-session')), { state: 'unavailable' });
  }
});

test('T12 authorization revalidates role on each adapter request', async () => {
  let allowed = true;
  let checks = 0;
  const dependencies = { env, fetchImpl: async url => {
    if (url.endsWith('/user')) return Response.json({ id });
    checks++;
    return Response.json(allowed);
  } };
  const r = request('htc_trial_session=synthetic-founder');
  assert.deepEqual(await founderAccess(r, dependencies), { state: 'founder' });
  allowed = false;
  assert.deepEqual(await founderAccess(r, dependencies), { state: 'denied' });
  assert.equal(checks, 2);
});

for (const state of ['anonymous', 'denied', 'unavailable', undefined]) test(`T12 ${state ?? 'unknown'} state suppresses privileged children and entry`, () => {
  const html = renderToStaticMarkup(h(FounderBoundary, { state }, h('p', null, 'private-child-sentinel')));
  assert.doesNotMatch(html, /private-child-sentinel|Founder workspace|Founder navigation|Founder application/);
  assert.match(html, /role="alert"/);
  assert.equal(renderToStaticMarkup(h(FounderEntry, { state })), '');
});

test('T12 actual authorized shell renders semantic navigation and only real destinations', () => {
  const html = renderToStaticMarkup(h(FounderBoundary, { state: 'founder' }, h(FounderEntry, { state: 'founder' })));
  assert.match(html, /Founder workspace/); assert.match(html, /<h1>Founder application<\/h1>/);
  assert.match(html, /aria-label="Founder navigation"/); assert.match(html, /href="#main"/);
  assert.match(html, /<main id="main" tabindex="-1"/);
  const form = html.match(/<form\b[^>]*>/)?.[0] ?? '';
  assert.match(form, /method="post"/); assert.match(form, /action="\/auth\/sign-out"/);
  assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]), ['#main', '/founder', '/founder', '/content']);
  assert.doesNotMatch(html, /<video|<audio|<img|\/api\/|EDITOR|analytics|storage|token|email/i);
});

test('T12 authorized transport and rendering integrate without exposing session data', async () => {
  for (const allowed of [true, false]) {
    const { state } = await fixture({ allowed }).access(request('htc_trial_session=synthetic-session'));
    const html = renderToStaticMarkup(h(FounderBoundary, { state }, h(FounderEntry, { state })));
    assert.equal(html.includes('Founder application'), allowed);
    assert.equal(html.includes('Access denied'), !allowed);
    assert.doesNotMatch(html, /synthetic-session|sb_publishable|holictraderscompany@gmail.com/);
  }
});

test('T12 cookie bridge does not grant cookie-only management API access', async () => {
  const f = fixture({ allowed: true });
  const handlers = [createHandler('founder', f.dependencies), createContentHandler('founder', f.dependencies),
    createContentAssetHandler(f.dependencies), createAssetHandler(f.dependencies)];
  for (const handler of handlers) {
    const response = await handler(new Request('https://htc.test/api/manage', { method: 'POST', headers: {
      cookie: 'htc_trial_session=synthetic-founder', 'Content-Type': 'application/json',
    }, body: '{}' }));
    assert.equal(response.status, 401);
  }
  assert.equal(f.calls.length, 0);
});

test('T12 page and layout independently use request-local server authorization', async () => {
  const layout = await source('src/app/founder/layout.js');
  const page = await source('src/app/founder/page.js');
  for (const file of [layout, page]) {
    assert.match(file, /await getFounderAccess\(\)/);
    assert.match(file, /state === 'anonymous'.*redirect\('\/sign-in'\)/);
    assert.match(file, /dynamic = 'force-dynamic'/);
    assert.doesNotMatch(file, /use client|email|localStorage|user_metadata/);
  }
  const access = await source('src/app/founder/access.js');
  assert.match(access, /cache.*from 'react'/); assert.match(access, /await headers\(\)/);
  assert.doesNotMatch(access, /unstable_cache|use cache|revalidate/);
});

test('T12 root/public layouts remain separated and retain global public recovery', async () => {
  const root = await source('src/app/layout.js');
  const publicLayout = await source('src/app/(public)/layout.js');
  const shell = await source('src/components/public-shell.js');
  assert.doesNotMatch(root, /SessionNavigation|site-header|Founder|PublicShell/);
  assert.match(publicLayout, /<PublicShell>\{children\}<\/PublicShell>/);
  assert.doesNotMatch(shell, /founder|manage|storage|token/i);
  for (const path of ['src/app/not-found.js', 'src/app/error.js']) assert.match(await source(path), /<PublicShell>/);
  assert.doesNotMatch(await source('src/app/(public)/not-found.js'), /PublicShell/);
});
