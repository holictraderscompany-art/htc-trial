// New post-propagation READ-ONLY validation. Never uploads/redeploys a Worker.
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';

const origin = 'https://htc-trial-workers-test.holictraderscompany.workers.dev';
const TEST = 'https://uzhkzhmncxjplrdtdzgd.supabase.co';
const report = {
  at: new Date().toISOString(), sha: process.env.GITHUB_SHA, status: 'BLOCKED', origin,
  deploymentEvidence: { sha: '8203ce62ce4a3859270cd3736d9c0b62cb02be51', version: 'a101e9e0-d84f-4473-9867-1475126b0c9e', run: '39894081617', source: 'Previously verified deployment evidence; public probe cannot query privileged version metadata' },
  http: [], views: [], databaseFixturesCreated: 0, deploymentsAttempted: 0,
  realGoogleOAuth: 'NOT_TESTED', authenticatedFounderUSER: 'NOT_TESTED',
  credentialInputs: false, cookiesTransferred: false, artifactUploads: false,
};
const guard = (ok, code) => { if (!ok) throw new Error(code); };
const request = (pathname, body, extra = {}) => fetch(origin + pathname, {
  ...(body ? { method: 'POST', body: JSON.stringify(body), headers: { Origin: origin, 'Content-Type': 'application/json' } } : {}),
  ...extra, redirect: 'manual', signal: AbortSignal.timeout(20000),
});
const record = (name, passed, response) => {
  report.http.push({ name, status: response.status, passed: Boolean(passed) });
  guard(passed, 'STOP_HTTP_ASSERTION');
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
let browser;
try {
  guard(process.platform === 'linux' && process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_ENVIRONMENT === 'github-hosted', 'STOP_HOST');
  guard(process.env.GITHUB_REPOSITORY === 'holictraderscompany-art/htc-trial' && process.env.GITHUB_REF === 'refs/heads/codex/cloudflare-workers-preparation' && process.env.GITHUB_RUN_ATTEMPT === '1', 'STOP_SCOPE');
  guard(process.version === 'v24.21.0', 'STOP_NODE');
  guard(!process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_TEST_API_TOKEN && !process.env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY, 'STOP_UNEXPECTED_CREDENTIAL_INPUT');
  if (process.env.HTC_DEPLOY_REPORT) {
    guard(process.env.HTC_DEPLOY_REPORT === '.wrangler/htc-test-deployment/deploy-report.json', 'STOP_DEPLOY_REPORT_PATH');
    const proof = JSON.parse(readFileSync(process.env.HTC_DEPLOY_REPORT, 'utf8'));
    guard(proof.sha === process.env.GITHUB_SHA && proof.status === 'TEST_DEPLOYMENT_AND_ANONYMOUS_SECURITY_PASS_AUTHENTICATED_GATES_PENDING' && proof.url === origin && proof.runtime?.length === 16 && proof.runtime.every(check => check.passed === true) && /^[a-f0-9-]{36}$/.test(proof.version ?? ''), 'STOP_DEPLOY_REPORT');
    report.http = proof.runtime.map(check => ({...check, reusedFromSameJob: true}));
    report.deploymentEvidence = {sha: proof.sha, version: proof.version, run: process.env.GITHUB_RUN_ID, source: 'Same hosted job verified deployment result and 16 completed HTTP probes'};
  } else {
  const health = await request('/api/health');
  record('HTTPS health and no-store', health.status === 200 && health.headers.get('cache-control')?.includes('no-store'), health);
  const session = await request('/api/session');
  const anonymous = await session.json();
  record('Anonymous session', session.status === 200 && anonymous.data?.authenticated === false, session);
  const icon = await request('/icon.svg');
  record('Static SVG', icon.status === 200 && icon.headers.get('content-type')?.includes('image/svg+xml'), icon);
  for (const pathname of ['/founder', '/founder/content', '/founder/assets', '/founder/publishing', '/founder/operations']) {
    const response = await request(pathname);
    const location = new URL(response.headers.get('location') ?? '/', origin);
    record(`Anonymous route ${pathname}`, [303,307].includes(response.status) && location.origin === origin && location.pathname === '/sign-in', response);
  }
  for (const [pathname, body] of [['/api/founder',{probe:'access'}],['/api/founder/content',{action:'list',cursor:null}],['/api/founder/assets',{action:'reserve'}],['/api/founder/operations',{action:'summary'}]]) {
    const response = await request(pathname, body);
    record(`Anonymous API ${pathname}`, response.status === 401 && response.headers.get('cache-control')?.includes('no-store'), response);
  }
  const cross = await request('/api/founder/operations', {action:'summary'}, {headers:{Origin:'https://invalid.test','Content-Type':'application/json'}});
  record('Cross-origin rejection', cross.status === 403, cross);
  const start = await request('/auth/start', {});
  const destination = new URL(start.headers.get('location') ?? '/', origin);
  const callback = new URL(destination.searchParams.get('redirect_to') ?? '/', origin);
  record('PKCE targets exact TEST and HTTPS callback', start.status === 303 && destination.origin === TEST && destination.pathname === '/auth/v1/authorize' && destination.searchParams.get('code_challenge_method') === 's256' && callback.origin === origin && callback.pathname === '/auth/callback', start);
  const cookie = start.headers.get('set-cookie') ?? '';
  record('PKCE HttpOnly Secure SameSite cookie', /HttpOnly/i.test(cookie) && /;\s*Secure(?:;|$)/i.test(cookie) && /SameSite=Lax/i.test(cookie), start);
  const invalid = await request('/auth/callback');
  const location = new URL(invalid.headers.get('location') ?? '/', origin);
  record('Invalid callback fails closed', invalid.status === 303 && location.origin === origin && location.pathname === '/sign-in', invalid);
  guard(report.http.length === 16, 'STOP_SECURITY_CHECK_COUNT');
  }

  // GET is the existing anonymous public-read contract. No bearer token is sent.
  const publicAPI = await request('/api/content?paged=1&limit=12&assets=1');
  const publicBody = await publicAPI.json();
  const items = publicBody.data?.items;
  const safePage = publicBody.data && Object.keys(publicBody.data).sort().join() === 'items,next_cursor' && (publicBody.data.next_cursor === null || (typeof publicBody.data.next_cursor === 'string' && publicBody.data.next_cursor.length <= 512));
  const contentKeys = ['assets','body','category','id','title'];
  const assetKeys = ['duration_seconds','height','id','mime_type','role','width'];
  const safeRows = Array.isArray(items) && items.length <= 12 && items.every(item => item && Object.keys(item).sort().join() === contentKeys.join() && uuid.test(item.id) && typeof item.title === 'string' && typeof item.body === 'string' && Array.isArray(item.assets) && item.assets.every(asset => asset && Object.keys(asset).sort().join() === assetKeys.join() && uuid.test(asset.id)));
  record('Public released-content API and metadata boundary', publicAPI.status === 200 && publicAPI.headers.get('cache-control')?.includes('no-store') && publicBody.ok === true && safePage && safeRows, publicAPI);
  report.publicDiscovery = { method: 'GET', returnedCount: items.length, metadataOnly: true, privateFieldsExposed: false };

  browser = await chromium.launch({ headless: true });
  for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport:{width,height:900}, reducedMotion:'reduce', serviceWorkers:'block' });
    let blockedNetwork = 0;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && ['GET','HEAD'].includes(route.request().method())) return route.continue();
      blockedNetwork++; return route.abort();
    });
    try {
      for (const pathname of ['/','/sign-in','/sign-in?error=failed','/content']) {
        const page = await context.newPage();
        const errors = []; page.on('pageerror', error => errors.push(error.name));
        try {
          const response = await page.goto(origin + pathname, { waitUntil:'networkidle',timeout:30000 });
          guard(response?.status() === 200 && new URL(page.url()).origin === origin, 'STOP_UI_HTTP');
          await page.locator('h1').waitFor();
          guard(await page.locator('.brand').isVisible() && await page.locator('nav[aria-label="Main navigation"]').isVisible() && await page.locator('main').isVisible(), 'STOP_UI_SHELL');
          guard(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'STOP_UI_OVERFLOW');
          guard(errors.length === 0, 'STOP_UI_PAGE_ERROR');
          if (pathname.startsWith('/sign-in')) {
            guard(await page.locator('form').getAttribute('action') === '/auth/start' && await page.getByRole('button',{name:'Continue with Google'}).isVisible(), 'STOP_UI_SIGN_IN');
          }
          if (pathname.includes('error=')) guard(/Sign-in did not complete/.test(await page.locator('p.notice[role="alert"]').innerText()), 'STOP_UI_ERROR_STATE');
          if (pathname === '/content') {
            guard(await page.getByRole('heading',{name:'Content',exact:true}).isVisible() && await page.locator('#category').isVisible(), 'STOP_UI_PUBLIC_CONTENT');
            guard(await page.locator('.content-list > li').count() === items.length, 'STOP_PUBLIC_API_UI_COUNT');
            if (items.length === 0) guard(await page.locator('.empty-state').isVisible(), 'STOP_UI_EMPTY_CONTENT');
          }
          const image = await page.screenshot({fullPage:true});
          report.views.push({width,path:pathname,status:'PASS',noHorizontalOverflow:true,pageErrors:0,screenshotSHA256:createHash('sha256').update(image).digest('hex')});
        } finally { await page.close(); }
      }
      guard(blockedNetwork === 0, 'STOP_UNEXPECTED_BROWSER_NETWORK');
    } finally { await context.close(); }
  }
  guard(report.views.length === 8, 'STOP_UI_VIEW_COUNT');
  report.status = 'PASS_PUBLIC_HTTPS_AND_UI_AUTHENTICATED_GATES_PENDING';
  report.passedHTTPChecks = report.http.length;
  report.baselinePublicViews = 6;
  report.additionalDiscoveryViews = 2;
} catch (error) {
  report.status = 'FAIL_NO_AUTOMATIC_RETRY';
  report.failedGuard = /^STOP_[A-Z0-9_]+$/.test(error?.message ?? '') ? error.message : 'STOP_CONTROLLED_RUNTIME_ERROR';
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  report.finished = new Date().toISOString();
  const safe = JSON.stringify(report);
  console.log(safe);
  console.log(`::notice title=HTC deployed TEST public validation::${safe.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Deployed TEST public validation\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n\nNo Google login, session transfer, fixture, upload, logout or deployment was performed.\n`);
}
