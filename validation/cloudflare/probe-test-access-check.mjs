// LOCAL synthetic browser regression on hosted Linux. Every route is fulfilled
// locally: no real session, external request, Google login or Auth operation.
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { testAccessCheckResponse } from '../../cloudflare/test-access-check.mjs';

const origin = 'https://htc-trial-workers-test.holictraderscompany.workers.dev';
const pathname = '/__htc-test-access-check';
const env = { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co' };
const report = {
  status: 'BLOCKED', mode: 'LOCAL_SYNTHETIC_BROWSER_REGRESSION_NOT_LIVE_AUTH',
  at: new Date().toISOString(), sha: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID,
  views: [], failures: [], realGoogleOAuth: false, liveSupabaseRequests: 0,
  externalNetworkRequests: 0, cookiesTransferred: false, credentialsUsed: false,
  AuthDatabaseStorageMutations: 0, deployments: 0, screenshotArtifacts: 0
};
const guard = (condition, code) => { if (!condition) throw new Error(code); };
let browser;

async function fixture(width, behavior = 'user') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const state = { authenticated: behavior !== 'anonymous', requests: [], errors: [], blocked: 0, logoutForms: 0 };
  const page = await context.newPage();
  page.on('pageerror', () => { state.errors.push('PAGE_ERROR'); });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      state.blocked++; report.externalNetworkRequests++;
      await route.abort(); return;
    }
    const record = { path: url.pathname, method: request.method() };
    state.requests.push(record);
    try {
      if (url.pathname === pathname && request.method() === 'GET') {
        const response = testAccessCheckResponse(new Request(request.url()), env);
        guard(response?.status === 200, 'STOP_DIAGNOSTIC_RESPONSE');
        await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
      } else if (url.pathname === '/api/session' && request.method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: true, data: { authenticated: state.authenticated, display_name: 'PRIVATE_SYNTHETIC_DETAIL' } }) });
      } else if (url.pathname === '/api/founder/operations' && request.method() === 'POST') {
        record.sameOrigin = await request.headerValue('origin') === origin;
        guard(record.sameOrigin, 'STOP_SUMMARY_ORIGIN');
        assert.deepEqual(request.postDataJSON(), { action: 'summary' });
        const status = state.authenticated ? (behavior === 'founder' ? 200 : 403) : 401;
        await route.fulfill({ status, contentType: 'application/json', headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: status === 200, error: { code: status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHENTICATED' : 'PRIVATE_UNAPPROVED_DETAIL', message: 'PRIVATE_SYNTHETIC_DETAIL' } }) });
      } else if (url.pathname === '/auth/sign-out' && request.method() === 'POST') {
        record.sameOrigin = await request.headerValue('origin') === origin;
        guard(record.sameOrigin && state.logoutForms === 0 && behavior === 'user', 'STOP_NATIVE_FORM_ORIGIN_OR_REPEAT');
        state.logoutForms++;
        // Synthetic state only; the request never reaches an Auth server.
        state.authenticated = false;
        await route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Cache-Control': 'no-store' }, body: '<!doctype html><html lang="en"><head><title>Synthetic form capture</title></head><body><h1>Synthetic sign-out request captured</h1></body></html>' });
      } else if (url.pathname === '/favicon.ico' && request.method() === 'GET') {
        await route.fulfill({ status: 204, body: '' });
      } else {
        state.blocked++; await route.abort();
      }
    } catch {
      state.errors.push('ROUTE_GUARD_FAILED');
      await route.abort();
    }
  });
  await page.goto(origin + pathname, { waitUntil: 'load', timeout: 20000 });
  await page.getByRole('heading', { name: 'HTC TEST access check' }).waitFor();
  return { context, page, state };
}

async function evidence(page) {
  return JSON.parse(await page.locator('#result').innerText());
}
async function settled(page, field) {
  await page.waitForFunction(name => {
    const text = document.getElementById('result').textContent;
    if (text === 'READY_NOT_STARTED') return false;
    const value = JSON.parse(text)[name];
    return value && !value.code.endsWith('_IN_PROGRESS');
  }, field, { timeout: 10000 });
  const result = await evidence(page);
  guard(!JSON.stringify(result).includes('PRIVATE_'), 'STOP_PRIVATE_RESULT');
  return result;
}

try {
  guard(process.platform === 'linux' && process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_ENVIRONMENT === 'github-hosted', 'STOP_HOST');
  guard(process.version === 'v24.21.0' && process.env.GITHUB_REPOSITORY === 'holictraderscompany-art/htc-trial' && process.env.GITHUB_REF === 'refs/heads/codex/cloudflare-workers-preparation' && process.env.GITHUB_RUN_ATTEMPT === '1', 'STOP_SCOPE');
  guard(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? '') && /^[0-9]+$/.test(process.env.GITHUB_RUN_ID ?? ''), 'STOP_SOURCE_ID');
  guard(!process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_TEST_API_TOKEN && !process.env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY, 'STOP_UNEXPECTED_CREDENTIAL_INPUT');
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    const { context, page, state } = await fixture(width);
    try {
      guard(await page.locator('#result').innerText() === 'READY_NOT_STARTED' && state.requests.every(r => [pathname, '/favicon.ico'].includes(r.path)), 'STOP_AUTOMATIC_NETWORK');
      guard(await page.locator('#sign-out').isDisabled() && await page.locator('#logout-check').isDisabled(), 'STOP_INITIAL_ACTION_GUARDS');
      guard(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'STOP_RESPONSIVE_OVERFLOW');
      await page.locator('#user-check').click();
      const before = await settled(page, 'user_check');
      guard(before.user_check.passed === true && before.user_check.session.authenticated === true && before.user_check.founder_api.status === 403 && before.user_check.founder_api.code === 'FORBIDDEN', 'STOP_SYNTHETIC_USER_CHECK');
      guard(await page.locator('#user-check').isDisabled() && await page.locator('#sign-out').isEnabled() && await page.locator('#logout-check').isDisabled(), 'STOP_USER_ACTION_GUARDS');
      const nativeForm = context.waitForEvent('page', { timeout: 10000 });
      await page.locator('#sign-out').click();
      const popup = await nativeForm;
      await popup.getByRole('heading', { name: 'Synthetic sign-out request captured' }).waitFor({ timeout: 10000 });
      guard(state.logoutForms === 1 && state.requests.find(r => r.path === '/auth/sign-out')?.sameOrigin === true, 'STOP_NATIVE_FORM');
      await page.locator('#logout-check').click();
      const after = await settled(page, 'logout_check');
      guard(after.logout_check.passed === true && after.logout_check.session.authenticated === false && after.logout_check.founder_api.status === 401 && after.logout_check.founder_api.code === 'UNAUTHENTICATED', 'STOP_SYNTHETIC_LOGOUT_CHECK');
      guard(JSON.stringify(after.user_check) === JSON.stringify(before.user_check), 'STOP_LOST_USER_RECEIPT');
      const summaries = state.requests.filter(r => r.path === '/api/founder/operations');
      guard(summaries.length === 2 && summaries.every(r => r.sameOrigin === true) && state.requests.filter(r => r.path === '/api/session').length === 2, 'STOP_UNEXPECTED_REQUEST_COUNTS');
      guard(await page.locator('#user-check').isDisabled() && await page.locator('#sign-out').isDisabled() && await page.locator('#logout-check').isDisabled(), 'STOP_FINAL_ACTION_GUARDS');
      guard(state.blocked === 0 && state.errors.length === 0, 'STOP_BROWSER_OR_ROUTE_ERROR');
      report.views.push({ width, passed: true, cspScriptExecuted: true, initialNetworkInert: true, summaryOriginSame: true, nativeSignOutOriginSame: true, noHorizontalOverflow: true, USER403: 'SYNTHETIC_PASS', postLogout401: 'SYNTHETIC_PASS', originalReceiptPreserved: true });
    } finally { await context.close(); }
  }
  for (const behavior of ['anonymous', 'founder']) {
    const { context, page, state } = await fixture(390, behavior);
    try {
      await page.locator('#user-check').click();
      const result = await settled(page, 'user_check');
      guard(result.user_check.passed === false && result.user_check.code.startsWith('STOP_'), 'STOP_ERROR_CASE_NOT_CLOSED');
      guard(await page.locator('#sign-out').isDisabled() && await page.locator('#logout-check').isDisabled(), 'STOP_ERROR_ACTION_GUARDS');
      guard(state.logoutForms === 0 && state.blocked === 0 && state.errors.length === 0, 'STOP_ERROR_BROWSER_OR_ROUTE');
      guard(state.requests.filter(r => r.path === '/api/founder/operations').length === (behavior === 'anonymous' ? 0 : 1), 'STOP_ERROR_REQUEST_COUNT');
      report.failures.push({ case: behavior, passed: true, failedClosed: true, AuthOperations: 0 });
    } finally { await context.close(); }
  }
  guard(report.views.length === 2 && report.failures.length === 2 && report.externalNetworkRequests === 0, 'STOP_PROOF_COUNT');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL_NO_RETRY';
  report.failedGuard = /^STOP_[A-Z0-9_]+$/.test(error?.message ?? '') ? error.message : 'STOP_CONTROLLED_BROWSER_ERROR';
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  report.finished = new Date().toISOString();
  mkdirSync('.wrangler/htc-test-deployment', { recursive: true });
  writeFileSync('.wrangler/htc-test-deployment/access-check-browser-report.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  const safe = JSON.stringify(report);
  console.log(safe);
  console.log(`::notice title=HTC synthetic access-check browser regression::${safe.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Synthetic access-check browser regression (not LIVE authentication)\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
}
