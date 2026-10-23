// LOCAL synthetic regression of the diagnostic harness, never LIVE auth evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { testAccessCheckResponse, withTestAccessCheck } from '../cloudflare/test-access-check.mjs';

const origin = 'https://htc-trial-workers-test.holictraderscompany.workers.dev';
const pathname = '/__htc-test-access-check';
const env = { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co' };
const request = (suffix = '', options = {}) => new Request(origin + pathname + suffix, options);
const sessionReply = (authenticated, status = 200, noStore = true) => Response.json({ ok: true, data: { authenticated, display_name: 'PRIVATE_ACCOUNT_SENTINEL' } }, { status, headers: noStore ? { 'Cache-Control': 'no-store' } : {} });
const apiReply = (status = 403, code = 'FORBIDDEN', noStore = true) => Response.json({ ok: false, error: { code, message: 'PRIVATE_DETAIL_SENTINEL' }, data: { private: 'PRIVATE_ACCOUNT_SENTINEL' } }, { status, headers: noStore ? { 'Cache-Control': 'no-store' } : {} });
const html = await testAccessCheckResponse(request(), env).text();
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function browser(replies) {
  const elements = Object.fromEntries(['user-check', 'sign-out', 'sign-out-form', 'logout-check', 'result'].map(id => [id, {
    disabled: ['sign-out', 'logout-check'].includes(id), textContent: '', handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler; }
  }]));
  const calls = [];
  runInNewContext(script, {
    document: { getElementById: id => { assert.ok(elements[id]); return elements[id]; } },
    fetch: async (path, init) => {
      calls.push({ path, init });
      const reply = replies[calls.length - 1];
      if (reply instanceof Error) throw reply;
      assert.ok(reply, 'Unexpected network request');
      return reply;
    }
  });
  return {
    calls, elements,
    click: id => elements[id].handlers.click(),
    submit: () => {
      const event = { prevented: false, preventDefault() { this.prevented = true; } };
      elements['sign-out-form'].handlers.submit(event);
      return event;
    },
    evidence: () => JSON.parse(elements.result.textContent)
  };
}

test('diagnostic rendering is exact TEST-only, inert, no-store and credential-free', () => {
  const response = testAccessCheckResponse(request(), env);
  assert.equal(response.status, 200);
  for (const [name, value] of [['Cache-Control', 'no-store, max-age=0'], ['Referrer-Policy', 'same-origin'], ['X-Content-Type-Options', 'nosniff'], ['X-Frame-Options', 'DENY'], ['Cross-Origin-Resource-Policy', 'same-origin']]) assert.equal(response.headers.get(name), value);
  assert.equal(response.headers.has('set-cookie'), false);
  assert.equal(response.headers.has('access-control-allow-origin'), false);
  const b = browser([]);
  assert.equal(b.calls.length, 0);
  assert.equal(b.elements['sign-out'].disabled, true);
  assert.equal(b.elements['logout-check'].disabled, true);
  assert.equal(b.submit().prevented, true);
  assert.equal(b.calls.length, 0);
});

test('wrong target fails closed and unrelated paths retain existing Worker ownership', () => {
  for (const configuration of [{}, { ...env, HTC_SUPABASE_TARGET: 'other' }, { ...env, SUPABASE_URL: 'https://unapproved.invalid' }]) assert.equal(testAccessCheckResponse(request(), configuration).status, 404);
  for (const wrongOrigin of ['http://htc-trial-workers-test.holictraderscompany.workers.dev', 'https://other.workers.dev', origin + ':8443']) assert.equal(testAccessCheckResponse(new Request(wrongOrigin + pathname), env).status, 404);
  for (const path of ['/', '/api/session', '/founder/operations', '/__htc-test-access-check/']) assert.equal(testAccessCheckResponse(new Request(origin + path), env), null);
});

test('only GET/HEAD without query or fragment can render; POST cannot trigger a job', async () => {
  const head = testAccessCheckResponse(request('', { method: 'HEAD' }), env);
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const response = testAccessCheckResponse(request('', { method }), env);
    assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
  for (const suffix of ['?', '?action=start', '?redirect=https://unapproved.invalid', '#start']) assert.equal(testAccessCheckResponse(request(suffix), env).status, 400);
});

test('CSP matches the sole inline script and restricts requests/forms/framing', () => {
  assert.equal(typeof script, 'string');
  const csp = testAccessCheckResponse(request(), env).headers.get('content-security-policy');
  const digest = createHash('sha256').update(script).digest('base64');
  assert.equal(csp, `default-src 'none'; script-src 'sha256-${digest}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`);
  assert.doesNotMatch(html, /<script[^>]*src=|<link\b|<img\b|\son(?:click|load|submit)=|javascript:/i);
  assert.doesNotMatch(script, /document\.cookie|localStorage|sessionStorage|indexedDB|Authorization|setTimeout|setInterval|window\.open|\.submit\(/i);
  assert.match(html, /<form id="sign-out-form" method="post" action="\/auth\/sign-out" target="_blank" rel="noopener">/);
});

test('USER check makes one exact read-only pair and displays only whitelisted proof', async () => {
  const b = browser([sessionReply(true), apiReply()]);
  await b.click('user-check');
  assert.equal(b.calls.length, 2);
  assert.equal(b.calls[0].path, '/api/session');
  assert.equal(b.calls[1].path, '/api/founder/operations');
  assert.equal(b.calls[1].init.method, 'POST');
  assert.equal(b.calls[1].init.body, '{"action":"summary"}');
  assert.deepEqual(Object.keys(b.calls[1].init.headers), ['Content-Type']);
  for (const { init } of b.calls) {
    assert.equal(init.credentials, 'same-origin'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(init.mode, 'same-origin'); assert.equal(init.referrerPolicy, 'same-origin');
  }
  assert.equal(b.evidence().user_check.passed, true);
  assert.equal(b.evidence().user_check.founder_api.status, 403);
  assert.equal(b.evidence().user_check.founder_api.code, 'FORBIDDEN');
  assert.equal(b.elements['sign-out'].disabled, false);
  assert.equal(b.elements['logout-check'].disabled, true);
  assert.doesNotMatch(b.elements.result.textContent, /PRIVATE_|display_name|message/);
  await b.click('user-check'); assert.equal(b.calls.length, 2);
});

test('missing/invalid session stops before the API and never enables sign-out', async () => {
  for (const reply of [sessionReply(false), sessionReply(true, 401), sessionReply(true, 200, false), Response.json({ ok: true, data: { authenticated: 'true' } }, { headers: { 'Cache-Control': 'no-store' } })]) {
    const b = browser([reply]);
    await b.click('user-check');
    assert.equal(b.calls.length, 1); assert.equal(b.evidence().user_check.passed, false);
    assert.equal(b.evidence().user_check.code, 'STOP_AUTHENTICATED_SESSION_REQUIRED');
    assert.equal(b.elements['sign-out'].disabled, true);
    assert.equal(b.submit().prevented, true);
    await b.click('user-check'); await b.click('logout-check'); assert.equal(b.calls.length, 1);
  }
});

test('unexpected Founder/anonymous/API responses stop without exposing data or enabling logout', async () => {
  for (const reply of [apiReply(200), apiReply(401, 'UNAUTHENTICATED'), apiReply(403, 'PRIVATE_UNAPPROVED_CODE'), apiReply(403, 'FORBIDDEN', false), Response.json({ ok: true }, { status: 403, headers: { 'Cache-Control': 'no-store' } })]) {
    const b = browser([sessionReply(true), reply]);
    await b.click('user-check');
    assert.equal(b.calls.length, 2); assert.equal(b.evidence().user_check.passed, false);
    assert.equal(b.evidence().user_check.code, 'STOP_USER_DENIAL_NOT_VERIFIED');
    assert.equal(b.elements['sign-out'].disabled, true); assert.equal(b.submit().prevented, true);
    assert.doesNotMatch(b.elements.result.textContent, /PRIVATE_|message/);
    await b.click('user-check'); assert.equal(b.calls.length, 2);
  }
});

test('transport/JSON failures stop without retry or printing raw exceptions', async () => {
  for (const replies of [[new TypeError('PRIVATE_EXCEPTION_SENTINEL')], [new Response('PRIVATE_NON_JSON')], [sessionReply(true), new TypeError('PRIVATE_EXCEPTION_SENTINEL')]]) {
    const b = browser(replies); await b.click('user-check');
    assert.equal(b.evidence().user_check.code, 'STOP_USER_CHECK_TRANSPORT_OR_RESPONSE');
    assert.doesNotMatch(b.elements.result.textContent, /PRIVATE_/);
    const count = b.calls.length; await b.click('user-check'); assert.equal(b.calls.length, count);
  }
});

test('explicit official form is one-shot; post-logout pair preserves original USER proof', async () => {
  const b = browser([sessionReply(true), apiReply(), sessionReply(false), apiReply(401, 'UNAUTHENTICATED')]);
  await b.click('logout-check'); assert.equal(b.calls.length, 0);
  await b.click('user-check');
  const before = JSON.stringify(b.evidence().user_check);
  assert.equal(b.submit().prevented, false);
  assert.equal(b.calls.length, 2, 'The native form, not JavaScript fetch, owns logout');
  assert.equal(b.elements['sign-out'].disabled, true);
  assert.equal(b.elements['logout-check'].disabled, false);
  assert.equal(b.submit().prevented, true);
  await b.click('logout-check');
  assert.equal(b.calls.length, 4);
  assert.equal(JSON.stringify(b.evidence().user_check), before);
  assert.equal(b.evidence().logout_check.passed, true);
  assert.equal(b.evidence().logout_check.session.authenticated, false);
  assert.equal(b.evidence().logout_check.founder_api.status, 401);
  assert.equal(b.evidence().logout_check.code, 'POST_LOGOUT_ACCESS_DENIAL_PASS');
  assert.doesNotMatch(b.elements.result.textContent, /PRIVATE_/);
  await b.click('logout-check'); await b.click('user-check');
  assert.equal(b.calls.length, 4); assert.equal(b.submit().prevented, true);
});

test('a still-authenticated post-logout session stops before another summary request', async () => {
  const b = browser([sessionReply(true), apiReply(), sessionReply(true)]);
  await b.click('user-check'); b.submit(); await b.click('logout-check');
  assert.equal(b.calls.length, 3);
  assert.equal(b.evidence().logout_check.code, 'STOP_LOGGED_OUT_SESSION_NOT_VERIFIED');
  assert.equal(b.elements['sign-out'].disabled, true); assert.equal(b.elements['logout-check'].disabled, true);
  await b.click('logout-check'); assert.equal(b.calls.length, 3);
});

test('post-logout API mismatch and transport failure stop, retaining USER receipt', async () => {
  for (const reply of [apiReply(), apiReply(401, 'PRIVATE_UNAPPROVED_CODE'), apiReply(401, 'UNAUTHENTICATED', false), new TypeError('PRIVATE_FAILURE')]) {
    const b = browser([sessionReply(true), apiReply(), sessionReply(false), reply]);
    await b.click('user-check'); b.submit(); await b.click('logout-check');
    assert.equal(b.evidence().user_check.passed, true); assert.equal(b.evidence().logout_check.passed, false);
    assert.equal(b.calls.length, 4); assert.doesNotMatch(b.elements.result.textContent, /PRIVATE_/);
    await b.click('logout-check'); assert.equal(b.calls.length, 4);
  }
});

test('wrapper passes the original Request/env/context/this and response through unchanged', async () => {
  const originalRequest = new Request(origin + '/content');
  const originalEnvironment = { ...env }, ctx = { synthetic: true };
  const response = new Response('unchanged application response');
  let calls = 0;
  const worker = {
    fetch(receivedRequest, receivedEnvironment, receivedContext) {
      calls++; assert.equal(this, worker);
      assert.equal(receivedRequest, originalRequest);
      assert.equal(receivedEnvironment, originalEnvironment); assert.equal(receivedContext, ctx);
      return Promise.resolve(response);
    }
  };
  const originalDescriptor = Object.getOwnPropertyDescriptor(worker, 'fetch');
  const wrapped = withTestAccessCheck(worker);
  assert.equal(calls, 0);
  assert.equal(await wrapped.fetch(originalRequest, originalEnvironment, ctx), response);
  assert.equal(calls, 1);
  assert.deepEqual(Object.getOwnPropertyDescriptor(worker, 'fetch'), originalDescriptor);
});

test('wrapper preserves symbols, own non-fetch descriptors and prototype without invoking accessors', () => {
  const proto = { inheritedOperation() { return 'unchanged'; } };
  const named = Symbol('synthetic named handler');
  let getterCalls = 0;
  const queue = () => {}, scheduled = () => {};
  const worker = Object.create(proto, {
    fetch: { value() { return new Response(); }, writable: false, enumerable: false, configurable: false },
    queue: { value: queue, writable: false, enumerable: false, configurable: false },
    scheduled: { value: scheduled, writable: true, enumerable: true, configurable: true },
    indicator: { get() { getterCalls++; return 'synthetic'; }, enumerable: false, configurable: false },
    [named]: { value: queue, enumerable: false, configurable: false }
  });
  const wrapped = withTestAccessCheck(worker);
  assert.equal(getterCalls, 0); assert.equal(Object.getPrototypeOf(wrapped), proto);
  for (const name of ['queue', 'scheduled', 'indicator', named]) assert.deepEqual(Object.getOwnPropertyDescriptor(wrapped, name), Object.getOwnPropertyDescriptor(worker, name));
  assert.equal(wrapped.queue, queue); assert.equal(wrapped.scheduled, scheduled);
  assert.equal(wrapped.inheritedOperation, proto.inheritedOperation);
  const replacement = Object.getOwnPropertyDescriptor(wrapped, 'fetch');
  assert.equal(replacement.enumerable, false); assert.equal(replacement.configurable, false); assert.equal(replacement.writable, false);
  assert.notEqual(replacement.value, worker.fetch);
});

test('diagnostic and rejected diagnostic targets never invoke the application handler', () => {
  let calls = 0;
  const wrapped = withTestAccessCheck({ fetch() { calls++; throw new Error('Unexpected application request'); } });
  assert.equal(wrapped.fetch(request(), env, {}).status, 200);
  assert.equal(wrapped.fetch(request(), {}, {}).status, 404);
  assert.equal(wrapped.fetch(request('?start=1'), env, {}).status, 400);
  assert.equal(wrapped.fetch(request('', { method: 'POST' }), env, {}).status, 405);
  assert.equal(calls, 0);
});

test('invalid or unknown default exports fail closed before handler execution', () => {
  for (const invalid of [null, undefined, {}, { fetch: true }, () => new Response()]) assert.throws(() => withTestAccessCheck(invalid), /^TypeError: A Worker handler object with fetch is required$/);
});
