// Cloud loopback workerd only. No credential input, redirects followed or database fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const origin = 'http://127.0.0.1:3105';
const results = [];
const record = (name, passed, status) => {
  results.push({ name, passed, status });
  assert(passed, name);
};
async function request(path, body, extra = {}) {
  return fetch(origin + path, {
    ...(body ? { method: 'POST', body: JSON.stringify(body), headers: {
      Origin: origin, 'Content-Type': 'application/json',
    } } : {}), ...extra, redirect: 'manual', signal: AbortSignal.timeout(20000),
  });
}
let failure = null;
const diagnostics = {};
try {
  const health = await request('/api/health');
  record('Worker health HTTP200 and no-store', health.status === 200 && health.headers.get('cache-control')?.includes('no-store'), health.status);
  const session = await request('/api/session');
  const sessionBody = await session.json();
  record('No-cookie session is unauthenticated', session.status === 200 && sessionBody.data?.authenticated === false, session.status);
  const icon = await request('/icon.svg');
  record('Worker static SVG asset is served', icon.status === 200 && icon.headers.get('content-type')?.includes('image/svg+xml'), icon.status);
  for (const path of ['/founder', '/founder/content', '/founder/assets', '/founder/publishing', '/founder/operations']) {
    const r = await request(path);
    const destination = new URL(r.headers.get('location') ?? '/', origin);
    record('Anonymous route denial ' + path, [303, 307].includes(r.status) && destination.pathname === '/sign-in', r.status);
  }
  for (const [path, payload] of [
    ['/api/founder', { probe: 'access' }],
    ['/api/founder/content', { action: 'list', cursor: null }],
    ['/api/founder/assets', { action: 'reserve' }],
    ['/api/founder/operations', { action: 'summary' }],
  ]) {
    const r = await request(path, payload);
    if (r.status !== 401) {
      // Anonymous, bounded diagnostics only: no cookies, auth exchange or data mutation.
      const callback = await request('/auth/callback');
      diagnostics.callback = { status: callback.status,
        origin: new URL(callback.headers.get('location') ?? '/', origin).origin };
      diagnostics.originMatrix = [];
      for (const candidate of [origin, 'http://localhost:3105', 'http://127.0.0.1', 'https://127.0.0.1:3105']) {
        const probe = await request(path, payload, { headers: { Origin: candidate, 'Content-Type': 'application/json' } });
        diagnostics.originMatrix.push({ origin: candidate, status: probe.status });
      }
    }
    record('No-cookie privileged API rejected before upstream ' + path, r.status === 401 && r.headers.get('cache-control')?.includes('no-store'), r.status);
  }
  const originDenied = await request('/api/founder/operations', { action: 'summary' }, {
    method: 'POST', headers: { Origin: 'https://invalid.test', 'Content-Type': 'application/json' },
  });
  record('Cross-origin summary denied', originDenied.status === 403, originDenied.status);
  const start = await request('/auth/start', {});
  // Preview uses an explicitly synthetic publishable-key fixture in ignored .dev.vars.
  // This response is inspected in memory; its PKCE cookie/challenge is never logged.
  const destination = new URL(start.headers.get('location') ?? '/', origin);
  const cookie = start.headers.get('set-cookie') ?? '';
  record('Node crypto/PKCE redirect targets TEST only', start.status === 303
    && destination.origin === 'https://uzhkzhmncxjplrdtdzgd.supabase.co'
    && destination.pathname === '/auth/v1/authorize'
    && destination.searchParams.get('code_challenge_method') === 's256', start.status);
  record('PKCE cookie is HttpOnly and SameSite Lax', /HttpOnly/.test(cookie) && /SameSite=Lax/.test(cookie), start.status);
  const invalidCallback = await request('/auth/callback');
  record('Missing OAuth code fails closed without token exchange', invalidCallback.status === 303
    && new URL(invalidCallback.headers.get('location'), origin).pathname === '/sign-in', invalidCallback.status);
} catch (error) {
  failure = error instanceof assert.AssertionError ? 'Assertion failed: ' + error.message : error.name;
}
const report = {
  at: new Date().toISOString(), label: 'CLOUD LOOPBACK WORKER — synthetic key, anonymous and malformed-flow probes only',
  status: failure ? 'FAIL' : 'PASS', results, failure, diagnostics,
  real_Google_OAuth_tested: false, authenticated_Founder_or_USER_tested: false,
  LIVE_database_or_Storage_validation: false, secrets_exported: false,
  database_fixtures_created: 0, followed_redirects: false,
};
fs.writeFileSync(new URL('runtime-local.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failure) process.exitCode = 1;
