// TEST-only diagnostic presentation. The existing application remains authoritative.
// Importing/rendering this module performs no network, Auth or persistent-state I/O.
import { createHash } from 'node:crypto';

const origin = 'https://htc-trial-workers-test.holictraderscompany.workers.dev';
const pathname = '/__htc-test-access-check';
const project = 'https://uzhkzhmncxjplrdtdzgd.supabase.co';
const script = String.raw`
(() => {
  'use strict';
  const userButton = document.getElementById('user-check');
  const signOutButton = document.getElementById('sign-out');
  const signOutForm = document.getElementById('sign-out-form');
  const logoutButton = document.getElementById('logout-check');
  const result = document.getElementById('result');
  const evidence = { user_check: null, logout_check: null };
  let userAttempted = false, userPassed = false, logoutSubmitted = false;
  let logoutAttempted = false, stopped = false;
  const render = () => { result.textContent = JSON.stringify(evidence, null, 2); };
  const noStore = response => (response.headers.get('cache-control') ?? '')
    .split(',').some(value => value.trim().toLowerCase() === 'no-store');
  const stop = (stage, code) => {
    stopped = true;
    userButton.disabled = true;
    signOutButton.disabled = true;
    logoutButton.disabled = true;
    evidence[stage] = { ...evidence[stage], passed: false, code };
    render();
  };
  async function session() {
    const response = await fetch('/api/session', {
      credentials: 'same-origin', mode: 'same-origin', referrerPolicy: 'same-origin',
      cache: 'no-store', redirect: 'error'
    });
    const body = await response.json();
    return {
      status: response.status,
      authenticated: typeof body?.data?.authenticated === 'boolean'
        ? body.data.authenticated : null,
      no_store: noStore(response)
    };
  }
  async function summary() {
    const response = await fetch('/api/founder/operations', {
      method: 'POST', credentials: 'same-origin', mode: 'same-origin', referrerPolicy: 'same-origin',
      cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'summary' })
    });
    const body = await response.json();
    return {
      status: response.status,
      ok: typeof body?.ok === 'boolean' ? body.ok : null,
      code: ['FORBIDDEN', 'UNAUTHENTICATED'].includes(body?.error?.code)
        ? body.error.code : null,
      no_store: noStore(response)
    };
  }
  userButton.addEventListener('click', async () => {
    if (userAttempted || stopped) return;
    userAttempted = true;
    userButton.disabled = true;
    evidence.user_check = { passed: false, code: 'USER_CHECK_IN_PROGRESS' };
    render();
    try {
      const current = await session();
      evidence.user_check.session = current;
      if (current.status !== 200 || current.authenticated !== true || !current.no_store) {
        stop('user_check', 'STOP_AUTHENTICATED_SESSION_REQUIRED'); return;
      }
      const api = await summary();
      evidence.user_check.founder_api = api;
      if (api.status !== 403 || api.ok !== false || api.code !== 'FORBIDDEN' || !api.no_store) {
        stop('user_check', 'STOP_USER_DENIAL_NOT_VERIFIED'); return;
      }
      userPassed = true;
      evidence.user_check.passed = true;
      evidence.user_check.code = 'USER_API_DENIAL_PASS';
      signOutButton.disabled = false;
      render();
    } catch {
      stop('user_check', 'STOP_USER_CHECK_TRANSPORT_OR_RESPONSE');
    }
  });
  signOutForm.addEventListener('submit', event => {
    if (!userPassed || stopped || logoutSubmitted) { event.preventDefault(); return; }
    logoutSubmitted = true;
    signOutButton.disabled = true;
    logoutButton.disabled = false;
    // The browser submits the existing official form only after the user clicks.
    // Its new tab leaves this page's non-sensitive USER receipt available.
  });
  logoutButton.addEventListener('click', async () => {
    if (!userPassed || !logoutSubmitted || logoutAttempted || stopped) return;
    logoutAttempted = true;
    logoutButton.disabled = true;
    evidence.logout_check = { passed: false, code: 'LOGOUT_CHECK_IN_PROGRESS' };
    render();
    try {
      const current = await session();
      evidence.logout_check.session = current;
      if (current.status !== 200 || current.authenticated !== false || !current.no_store) {
        stop('logout_check', 'STOP_LOGGED_OUT_SESSION_NOT_VERIFIED'); return;
      }
      const api = await summary();
      evidence.logout_check.founder_api = api;
      if (api.status !== 401 || api.ok !== false || api.code !== 'UNAUTHENTICATED' || !api.no_store) {
        stop('logout_check', 'STOP_POST_LOGOUT_DENIAL_NOT_VERIFIED'); return;
      }
      evidence.logout_check.passed = true;
      evidence.logout_check.code = 'POST_LOGOUT_ACCESS_DENIAL_PASS';
      render();
    } catch {
      stop('logout_check', 'STOP_LOGOUT_CHECK_TRANSPORT_OR_RESPONSE');
    }
  });
})();
`;
const scriptHash = createHash('sha256').update(script).digest('base64');
const headers = {
  'Cache-Control': 'no-store, max-age=0',
  // Non-CORS native form POSTs under no-referrer can acquire Origin:null.
  // This fixed, query-free page keeps external referrers suppressed while
  // preserving the existing strict same-origin CSRF boundary for sign-out.
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': `default-src 'none'; script-src 'sha256-${scriptHash}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
};
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HTC TEST access check</title></head>
<body><main><h1>HTC TEST access check</h1>
<p>This page is for the normal Chrome USER TEST profile on the isolated HTC TEST Worker. Keep the FOUNDER profile separate.</p>
<p>Nothing runs automatically. Do not reload this page during the checks. Each check runs once; STOP means stop without retry.</p>
<ol>
<li>Use the existing official <a href="/sign-in" target="_blank" rel="noopener noreferrer">HTC sign-in page</a> only if this USER TEST profile needs a legitimate private login. Return here after sign-in.</li>
<li><button id="user-check" type="button">Check USER session and Founder API denial once</button></li>
<li>After USER API denial passes, use the existing official sign-out form. The result opens in a separate tab. If that tab reports an error, stop without repeating sign-out.
<form id="sign-out-form" method="post" action="/auth/sign-out" target="_blank" rel="noopener"><button id="sign-out" type="submit" disabled>Sign out verified USER TEST session once</button></form></li>
<li>After sign-out finishes, return to this original tab: <button id="logout-check" type="button" disabled>Check logged-out session and API denial once</button></li>
</ol>
<p>Only status, boolean and controlled error-code evidence is displayed. No account details are collected. This verifies browser access after logout; it does not claim immediate JWT invalidation.</p>
<pre id="result" role="status" aria-live="polite">READY_NOT_STARTED</pre>
</main><script>${script}</script></body></html>`;

export function testAccessCheckResponse(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname !== pathname) return null;
  const reject = (status, code, extra = {}) => new Response(request.method === 'HEAD' ? null : `${code}\n`, {
    status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', ...extra }
  });
  if (url.origin !== origin || env.HTC_SUPABASE_TARGET !== 'test' || env.SUPABASE_URL !== project) {
    return reject(404, 'NOT_FOUND');
  }
  if (url.search || url.hash || request.url.includes('?')) return reject(400, 'INVALID_REQUEST');
  if (!['GET', 'HEAD'].includes(request.method)) return reject(405, 'METHOD_NOT_ALLOWED', { Allow: 'GET, HEAD' });
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 200, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Wrap the known OpenNext object without spreading away symbols, accessors,
// non-enumerable handlers or its prototype. Only the fetch descriptor changes.
export function withTestAccessCheck(worker) {
  if (worker === null || typeof worker !== 'object' || typeof worker.fetch !== 'function') {
    throw new TypeError('A Worker handler object with fetch is required');
  }
  const descriptors = Object.getOwnPropertyDescriptors(worker);
  const original = descriptors.fetch;
  descriptors.fetch = {
    configurable: original?.configurable ?? true,
    enumerable: original?.enumerable ?? true,
    writable: original?.writable ?? false,
    value: function fetch(request, env, ctx) {
      const diagnostic = testAccessCheckResponse(request, env);
      if (diagnostic !== null) return diagnostic;
      return Reflect.apply(worker.fetch, worker, [request, env, ctx]);
    }
  };
  return Object.create(Object.getPrototypeOf(worker), descriptors);
}
