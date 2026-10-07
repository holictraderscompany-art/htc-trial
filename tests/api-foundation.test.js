import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/server/api-foundation.js';

// Explicit non-credential placeholders; no live sessions or keys.
const env = {
  SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
};
const ownId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
function request({ token = 'test-session', body = { probe: 'access' }, raw, query = '', headers = {} } = {}) {
  return new Request(`http://localhost/api/access${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? JSON.stringify(body),
  });
}
function harness(boundary = 'authenticated', { founder = false, user = { id: ownId }, profiles = [{ id: ownId }], fail, upstreamStatus } = {}) {
  const calls = [];
  const handler = createHandler(boundary, { env, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (fail) throw new Error('sensitive internal failure must never escape');
    if (upstreamStatus) return Response.json({ message: 'sensitive upstream error' }, { status: upstreamStatus });
    if (url.endsWith('/auth/v1/user')) return Response.json(user);
    if (url.endsWith('/rpc/is_founder')) return Response.json(founder);
    if (url.includes('/user_profiles?')) return Response.json(profiles);
    throw new Error('Unexpected upstream request');
  } });
  return { handler, calls };
}

test('public liveness needs no configuration and exposes no private data', async () => {
  const handler = createHandler('public', { env: {}, fetchImpl: () => { throw new Error('Must not call upstream'); } });
  const response = await handler(new Request('http://localhost/api/health'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: { status: 'alive' } });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('public input and unsupported methods are rejected', async () => {
  const handler = createHandler('public');
  assert.equal((await handler(new Request('http://localhost/api/health?role=FOUNDER'))).status, 400);
  const response = await handler(request());
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});
test('unauthenticated access never calls Supabase', async () => {
  for (const boundary of ['authenticated', 'founder']) {
    const { handler, calls } = harness(boundary);
    assert.equal((await handler(request({ token: null }))).status, 401);
    assert.equal(calls.length, 0);
  }
});
test('Supabase rejects forged or expired bearer sessions', async () => {
  const { handler } = harness('authenticated', { upstreamStatus: 401 });
  assert.equal((await handler(request())).status, 401);
});
test('anonymous authenticated identity is rejected', async () => {
  const { handler } = harness('authenticated', { user: { id: ownId, is_anonymous: true } });
  assert.equal((await handler(request())).status, 401);
});
test('server-validated user may access only own profile using same bearer token', async () => {
  const { handler, calls } = harness();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: { access: 'authenticated' } });
  assert.match(calls[1].url, new RegExp(`id=eq.${ownId}&limit=1$`));
  for (const call of calls) {
    assert.equal(call.options.headers.Authorization, 'Bearer test-session');
    assert.equal(call.options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
    assert.equal(call.options.cache, 'no-store');
    assert.equal(call.options.redirect, 'error');
  }
});
test('USER cannot access Founder boundary despite supplied role or email', async () => {
  for (const spoof of [
    { body: { probe: 'access', role: 'FOUNDER' } },
    { body: { probe: 'access', email: 'holictraderscompany@gmail.com' } },
    { query: '?role=FOUNDER&email=holictraderscompany@gmail.com' },
    { headers: { 'X-Role': 'FOUNDER', 'X-Email': 'holictraderscompany@gmail.com' } },
  ]) {
    const { handler, calls } = harness('founder', { user: { id: ownId, user_metadata: { role: 'FOUNDER' } } });
    assert.equal((await handler(request(spoof))).status, 403);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.body, '{}');
  }
});
test('Founder allowed only when authoritative database helper returns true', async () => {
  const { handler } = harness('founder', { founder: true });
  assert.equal((await handler(request())).status, 200);
  for (const founder of ['true', 1, null, { role: 'FOUNDER' }]) {
    assert.equal((await harness('founder', { founder }).handler(request())).status, 403);
  }
});
test('invalid JSON, shape, extra fields and protected identifiers rejected', async () => {
  for (const input of [
    { raw: '{' }, { body: null }, { body: [] }, { body: {} },
    { body: { probe: 'wrong' } },
    ...['id', 'role', 'email', 'created_at', 'updated_at', 'display_name'].map(field => ({ body: { probe: 'access', [field]: 'client-value' } })),
    { query: `?id=${otherId}` }, { raw: 'x'.repeat(1025) },
    { headers: { 'Content-Type': 'text/plain' } },
  ]) assert.equal((await harness().handler(request(input))).status, 400);
});
test('invalid server user identifiers rejected before database lookup', async () => {
  const { handler, calls } = harness('authenticated', { user: { id: 'arbitrary-invalid-id' } });
  assert.equal((await handler(request())).status, 401);
  assert.equal(calls.length, 1);
});
test('missing own profile yields controlled not-found', async () => {
  assert.equal((await harness('authenticated', { profiles: [] }).handler(request())).status, 404);
});
test('unexpected cross-user result fails closed without exposing profile data', async () => {
  const response = await harness('authenticated', { profiles: [{ id: otherId }] }).handler(request());
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes(otherId));
});
test('upstream failures never leak messages or stack traces', async () => {
  for (const options of [{ fail: true }, { upstreamStatus: 500 }]) {
    const response = await harness('authenticated', options).handler(request());
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Request could not be completed.' } });
  }
});
test('wrong project and secret-key configuration fail closed', async () => {
  for (const badEnv of [{}, { ...env, SUPABASE_URL: 'https://another-project.supabase.co' }, { ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test_only' }]) {
    let called = false;
    const handler = createHandler('authenticated', { env: badEnv, fetchImpl: () => { called = true; } });
    assert.equal((await handler(request())).status, 500);
    assert.equal(called, false);
  }
});
test('route exports bind only approved boundary handlers', async () => {
  const health = await import('../src/app/api/health/route.js');
  const access = await import('../src/app/api/access/route.js');
  const founder = await import('../src/app/api/founder/route.js');
  assert.equal((await health.GET(new Request('http://localhost/api/health'))).status, 200);
  assert.equal((await access.POST(request({ token: null }))).status, 401);
  assert.equal((await founder.POST(request({ token: null }))).status, 401);
  assert.equal(health.runtime, 'nodejs');
});
