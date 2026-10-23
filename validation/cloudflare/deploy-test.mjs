// Authorized TEST-only cloud controller. No application or security-policy changes.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { target, verifyHost, verifyWrangler } from './test-deployment-preflight.mjs';

export const origin = 'https://htc-trial-workers-test.holictraderscompany.workers.dev';
export const repairBaseVersion = 'a101e9e0-d84f-4473-9867-1475126b0c9e';
const callback = `${origin}/auth/callback`;
const configPath = 'wrangler.test.generated.jsonc';
const statePath = '.wrangler/htc-test-deployment/state.json';
const requiredChanges = new Set([
  '.github/workflows/cloudflare-test-preflight.yml',
  'validation/cloudflare/test-deployment-preflight.mjs',
  'validation/cloudflare/test-deployment-preflight.test.mjs',
  'docs/cloudflare-test-deployment.md',
  '.github/workflows/cloudflare-test-deploy.yml',
  'validation/cloudflare/deploy-test.mjs',
  'validation/cloudflare/deploy-test.test.mjs',
]);
const optionalChanges = new Set([
  'validation/cloudflare/test-deployment-checkpoint.json',
  '.github/workflows/cloudflare-test-ui.yml',
  'validation/cloudflare/probe-deployed-ui.mjs',
  'cloudflare/redirect-error-fetch.mjs',
  'cloudflare/worker-entry.mjs',
  'cloudflare/install-redirect-error-fetch.mjs',
  'tests/cloudflare-redirect-error.test.mjs',
  'validation/cloudflare/redirect-error-workerd-worker.mjs',
  'validation/cloudflare/redirect-error-workerd.wrangler.jsonc',
  'validation/cloudflare/probe-redirect-error-workerd.mjs',
]);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const guard = (condition, code) => { if (!condition) throw new Error(code); };
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitBytes = file => execFileSync('git', ['show', `HEAD:${file}`], { stdio: ['ignore', 'pipe', 'pipe'] });

export function verifyApproval(env, platform = process.platform, version = process.version) {
  verifyHost(env, platform, version);
  guard(env.RUNNER_ENVIRONMENT === 'github-hosted', 'STOP_RUNNER_OWNERSHIP');
  guard(/^[0-9]+$/.test(env.GITHUB_RUN_ID ?? ''), 'STOP_RUN_ID');
  guard((env.TEST_EXECUTION_MODE === 'package' && env.DEPLOYMENT_ENABLED === 'false') || (['deploy','repair'].includes(env.TEST_EXECUTION_MODE) && env.DEPLOYMENT_ENABLED === 'true'), 'STOP_DISABLED_OR_MODE');
  guard(env.APPROVED_WORKFLOW_SHA === env.GITHUB_SHA, 'STOP_UNAPPROVED_SHA');
  if (['deploy','repair'].includes(env.TEST_EXECUTION_MODE)) guard(env.REDIRECT_ALLOWLIST_VERIFIED === 'true', 'STOP_OAUTH_CALLBACK_GATE');
  if (env.TEST_EXECUTION_MODE === 'repair') guard(env.APPROVED_REPAIR_BASE_VERSION === repairBaseVersion, 'STOP_REPAIR_VERSION_APPROVAL');
  guard(env.CONFIG_CF_ACCOUNT === target.account && env.CONFIG_WORKER === target.worker && env.CONFIG_PROJECT === target.project, 'STOP_CONFIG_BINDINGS');
  guard(env.HTC_SUPABASE_TARGET === 'test' && env.SUPABASE_URL === `https://${target.project}.supabase.co`, 'STOP_ENV_TARGET');
}

export function verifyDeploymentChanges(lines) {
  const rows = lines.trim().split('\n').filter(Boolean).map(line => line.split('\t'));
  guard(rows.length >= requiredChanges.size && rows.length <= requiredChanges.size + optionalChanges.size, 'STOP_CHANGE_COUNT');
  const names = new Set();
  for (const [status, file, extra] of rows) {
    guard(status === 'A' && !extra && (requiredChanges.has(file) || optionalChanges.has(file)) && !names.has(file), 'STOP_CHANGE_SCOPE');
    names.add(file);
  }
  guard([...requiredChanges].every(file => names.has(file)), 'STOP_REQUIRED_SOURCE');
}

export function generatedConfig(base, repair = false) {
  verifyWrangler(base);
  const generated = { ...structuredClone(base), account_id: target.account, workers_dev: true, secrets: { required: ['SUPABASE_PUBLISHABLE_KEY'] } };
  if (repair) generated.main = 'cloudflare/worker-entry.mjs';
  const reverse = structuredClone(generated);
  delete reverse.account_id;
  delete reverse.secrets;
  reverse.workers_dev = false;
  if (repair) reverse.main = base.main;
  guard(JSON.stringify(reverse) === JSON.stringify(base), 'STOP_CONFIG_DELTA');
  return generated;
}

export function privateBuildEnv(env) {
  const clean = { ...env };
  for (const key of Object.keys(clean)) if (/TOKEN|SECRET|PASSWORD|PUBLISHABLE_KEY|DATABASE_URL|API_KEY|_KEY$/i.test(key)) delete clean[key];
  return { ...clean, HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: `https://${target.project}.supabase.co`, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_worker_runtime_fixture', WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_SANITIZE: 'true' };
}

export function requireCredentials(env) {
  guard(typeof env.CLOUDFLARE_TEST_API_TOKEN === 'string' && /^[A-Za-z0-9_-]{20,300}$/.test(env.CLOUDFLARE_TEST_API_TOKEN), 'STOP_CI_TOKEN');
  const key = env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY;
  guard(typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key) && !/fixture|replace|synthetic|example/i.test(key), 'STOP_TEST_KEY');
}

function verifySource(allowGenerated = false) {
  guard(git('rev-parse', 'HEAD') === process.env.GITHUB_SHA, 'STOP_CHECKOUT_SHA');
  guard([`https://github.com/${target.repository}`, `https://github.com/${target.repository}.git`].includes(git('remote', 'get-url', 'origin')), 'STOP_ORIGIN');
  const dirty = git('status', '--porcelain=v1');
  guard(dirty === '' || (allowGenerated && dirty === `?? ${configPath}`), 'STOP_DIRTY');
  git('merge-base', '--is-ancestor', target.migration, 'HEAD');
  git('merge-base', '--is-ancestor', target.group03, 'HEAD');
  verifyDeploymentChanges(git('diff', '--name-status', target.migration, 'HEAD'));
  const bytes = gitBytes('validation/cloudflare/final-review.json');
  guard(sha256(bytes) === target.manifestSHA256, 'STOP_MANIFEST');
  const manifest = JSON.parse(bytes);
  guard(manifest.files.length === 22 && manifest.expectedFinalFileCount === 23, 'STOP_MANIFEST_COUNT');
  for (const file of manifest.files) {
    guard(sha256(gitBytes(file.path)) === file.sha256 && git('rev-parse', `HEAD:${file.path}`) === file.gitBlobOID, 'STOP_SEALED_BYTES');
  }
  guard(sha256(gitBytes('pnpm-lock.yaml')) === target.lockSHA256, 'STOP_LOCKFILE');
  return generatedConfig(JSON.parse(readFileSync('wrangler.jsonc', 'utf8')), process.env.TEST_EXECUTION_MODE === 'repair');
}

async function getJSON(url, headers, code, accepted = [200]) {
  let response;
  try { response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error(`${code}_TRANSPORT`); }
  guard(accepted.includes(response.status), `${code}_HTTP${response.status}`);
  let body;
  try { body = await response.json(); } catch { throw new Error(`${code}_JSON`); }
  return { status: response.status, body };
}

async function cfGet(suffix, code, accepted) {
  const result = await getJSON(`https://api.cloudflare.com/client/v4/accounts/${target.account}${suffix}`, {
    Authorization: `Bearer ${process.env.CLOUDFLARE_TEST_API_TOKEN}`,
  }, code, accepted);
  if (result.status === 200) guard(result.body.success === true, `${code}_API`);
  return result;
}

export function verifyRepairBaseline(settings, deployments, endpoint) {
  const active = deployments?.deployments;
  guard(Array.isArray(active) && active.length === 1 && active[0].versions?.length === 1 && active[0].versions[0].version_id === repairBaseVersion && active[0].versions[0].percentage === 100, 'STOP_REPAIR_BASELINE');
  guard(endpoint?.enabled === true && endpoint.previews_enabled === false, 'STOP_REPAIR_ROUTING');
  const bindings = settings?.bindings;
  guard(Array.isArray(bindings) && bindings.length === 5 && new Set(bindings.map(b => b.name)).size === 5, 'STOP_REPAIR_BINDINGS');
  for (const [name,type] of [['ASSETS','assets'],['HTC_SUPABASE_TARGET','plain_text'],['SUPABASE_URL','plain_text'],['SUPABASE_PUBLISHABLE_KEY','secret_text'],['WORKER_SELF_REFERENCE','service']]) guard(bindings.some(b => b.name === name && b.type === type), 'STOP_REPAIR_BINDINGS');
  guard(bindings.find(b => b.name === 'HTC_SUPABASE_TARGET').text === 'test' && bindings.find(b => b.name === 'SUPABASE_URL').text === `https://${target.project}.supabase.co` && bindings.find(b => b.name === 'WORKER_SELF_REFERENCE').service === target.worker, 'STOP_REPAIR_TARGET');
  guard(settings.compatibility_date === '2026-10-22' && JSON.stringify([...(settings.compatibility_flags ?? [])].sort()) === JSON.stringify(['global_fetch_strictly_public','nodejs_compat']), 'STOP_REPAIR_FLAGS');
}

async function accessPreflight(report) {
  requireCredentials(process.env);
  const account = await cfGet('', 'STOP_ACCOUNT');
  guard(account.body.result?.id === target.account, 'STOP_ACCOUNT_ID');
  const subdomain = await cfGet('/workers/subdomain', 'STOP_SUBDOMAIN');
  guard(subdomain.body.result?.subdomain === 'holictraderscompany', 'STOP_SUBDOMAIN_ID');
  const repair = process.env.TEST_EXECUTION_MODE === 'repair';
  if (repair) {
    const worker = await cfGet(`/workers/scripts/${target.worker}/settings`, 'STOP_REPAIR_SETTINGS');
    const deployments = await cfGet(`/workers/scripts/${target.worker}/deployments`, 'STOP_REPAIR_DEPLOYMENTS');
    const endpoint = await cfGet(`/workers/scripts/${target.worker}/subdomain`, 'STOP_REPAIR_ENDPOINT');
    verifyRepairBaseline(worker.body.result, deployments.body.result, endpoint.body.result);
  } else {
    const worker = await cfGet(`/workers/scripts/${target.worker}/settings`, 'STOP_WORKER_EXISTENCE', [404]);
    guard(worker.body.success === false && Array.isArray(worker.body.errors) && worker.body.errors.some(error => error.code === 10007), 'STOP_WORKER_ABSENCE_AMBIGUOUS');
  }
  const settings = await getJSON(`https://${target.project}.supabase.co/auth/v1/settings`, {
    apikey: process.env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY,
  }, 'STOP_TEST_AUTH');
  guard(settings.body.external?.google === true, 'STOP_GOOGLE_PROVIDER');
  report.preflight = { account: 'PASS', ...(repair ? { existingSingleVersionVerified: repairBaseVersion } : { workerAbsent: 'PASS' }), hostname: origin, TESTKeyAccepted: true, GoogleProviderEnabled: true, callbackTarget: callback, callbackGate: process.env.REDIRECT_ALLOWLIST_VERIFIED === 'true' ? 'VERIFIED_BY_APPROVED_ENVIRONMENT_GATE' : 'BLOCKED_NOT_REQUIRED_FOR_PACKAGE', planChangeRequested: false };
}

function loadState(phase) {
  guard(existsSync(statePath), 'STOP_STATE_ABSENT');
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  guard(state.sha === process.env.GITHUB_SHA && state.run === process.env.GITHUB_RUN_ID && state.phase === phase && state.deploymentAttempts === 0, 'STOP_STATE');
  return state;
}
function saveState(state) {
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state) + '\n', { mode: 0o600 });
}
function run(stage, args, env, report, timeout = 900000) {
  const started = new Date().toISOString();
  const result = spawnSync('pnpm', args, { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024, timeout, killSignal: 'SIGTERM' });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  report.stages.push({ name: stage, started, finished: new Date().toISOString(), exit: result.status, outputSHA256: sha256(output) });
  if (stage === 'redirect-runtime' && existsSync('.wrangler/htc-test-deployment/redirect-runtime-report.json')) {
    const proof = JSON.parse(readFileSync('.wrangler/htc-test-deployment/redirect-runtime-report.json', 'utf8'));
    report.redirectRuntime = Object.fromEntries(['status','sha','run','mode','legacyRedirectErrorRejected','compatibilityReadHTTP','secretInputs','fixtures','failedGuard'].filter(key => Object.hasOwn(proof,key)).map(key => [key,proof[key]]));
    if (proof.result) report.redirectRuntime.result = Object.fromEntries(['ok','nativeErrorName','unsupportedRedirectReported','manualStatus','adaptedStatus','manualKeySetShape','adaptedKeySetShape','adaptedCalls','observedMode'].map(key => [key,proof.result[key]]));
  }
  guard(!result.error && result.status === 0, stage === 'deploy' ? 'STOP_DEPLOY_RESULT_AMBIGUOUS_NO_RETRY' : `STOP_${stage.toUpperCase().replaceAll('-','_')}`);
  return output;
}

export function extractDeployedURL(output) {
  const urls = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\/?/g) ?? [];
  guard(urls.some(url => url.replace(/\/$/, '') === origin), 'STOP_DEPLOY_URL_UNPROVEN');
  guard(urls.every(url => url.replace(/\/$/, '') === origin), 'STOP_UNEXPECTED_DEPLOY_URL');
  return origin;
}

async function runtimeChecks(report) {
  const checks = [];
  const request = (pathname, body, extra = {}) => fetch(report.url + pathname, {
    ...(body ? { method: 'POST', body: JSON.stringify(body), headers: { Origin: report.url, 'Content-Type': 'application/json' } } : {}),
    ...extra, redirect: 'manual', signal: AbortSignal.timeout(20000),
  });
  const check = (name, ok, response) => { checks.push({ name, status: response.status, passed: Boolean(ok) }); guard(ok, 'STOP_HTTPS_CHECK'); };
  report.runtime = checks;
  const health = await request('/api/health');
  check('HTTPS health and no-store', health.status === 200 && health.headers.get('cache-control')?.includes('no-store'), health);
  const session = await request('/api/session');
  const sessionBody = await session.json();
  check('Anonymous session', session.status === 200 && sessionBody.data?.authenticated === false, session);
  const icon = await request('/icon.svg');
  check('Static SVG', icon.status === 200 && icon.headers.get('content-type')?.includes('image/svg+xml'), icon);
  for (const pathname of ['/founder', '/founder/content', '/founder/assets', '/founder/publishing', '/founder/operations']) {
    const response = await request(pathname);
    const location = new URL(response.headers.get('location') ?? '/', report.url);
    check(`Anonymous route ${pathname}`, [303, 307].includes(response.status) && location.origin === report.url && location.pathname === '/sign-in', response);
  }
  for (const [pathname, body] of [['/api/founder', { probe: 'access' }], ['/api/founder/content', { action: 'list', cursor: null }], ['/api/founder/assets', { action: 'reserve' }], ['/api/founder/operations', { action: 'summary' }]]) {
    const response = await request(pathname, body);
    check(`Anonymous API ${pathname}`, response.status === 401 && response.headers.get('cache-control')?.includes('no-store'), response);
  }
  const cross = await request('/api/founder/operations', { action: 'summary' }, { headers: { Origin: 'https://invalid.test', 'Content-Type': 'application/json' } });
  check('Cross-origin rejection', cross.status === 403, cross);
  const start = await request('/auth/start', {});
  const destination = new URL(start.headers.get('location') ?? '/', report.url);
  let callbackURL;
  try { callbackURL = new URL(destination.searchParams.get('redirect_to')); } catch { throw new Error('STOP_OAUTH_REDIRECT'); }
  check('PKCE targets exact TEST and HTTPS callback', start.status === 303 && destination.origin === `https://${target.project}.supabase.co` && destination.pathname === '/auth/v1/authorize' && destination.searchParams.get('code_challenge_method') === 's256' && callbackURL.origin === report.url && callbackURL.pathname === '/auth/callback', start);
  const cookie = start.headers.get('set-cookie') ?? '';
  check('PKCE HttpOnly Secure SameSite cookie', /HttpOnly/i.test(cookie) && /;\s*Secure(?:;|$)/i.test(cookie) && /SameSite=Lax/i.test(cookie), start);
  const invalid = await request('/auth/callback');
  const invalidLocation = new URL(invalid.headers.get('location') ?? '/', report.url);
  check('Invalid callback fails closed', invalid.status === 303 && invalidLocation.origin === report.url && invalidLocation.pathname === '/sign-in', invalid);
}

async function main(mode) {
  const report = { mode, executionMode: process.env.TEST_EXECUTION_MODE, sha: process.env.GITHUB_SHA, at: new Date().toISOString(), status: 'BLOCKED', stages: [], deploymentAttempted: false, databaseFixtures: 0, realGoogleOAuth: 'BLOCKED_PENDING_LEGITIMATE_BROWSER_LOGIN', authenticatedFounderUSER: 'BLOCKED_PENDING_LEGITIMATE_BROWSER_LOGIN' };
  let secretFile;
  try {
    guard(['preflight', 'build', 'deploy'].includes(mode), 'STOP_MODE');
    verifyApproval(process.env);
    const expected = verifySource(mode === 'deploy');
    if (mode === 'preflight') {
      guard(!existsSync(statePath) && !existsSync(configPath), 'STOP_EXISTING_RUN_STATE');
      await accessPreflight(report);
      saveState({ sha: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID, phase: 'PREFLIGHT_PASS', deploymentAttempts: 0 });
      report.status = 'PREFLIGHT_PASS';
    } else if (mode === 'build') {
      const state = loadState('PREFLIGHT_PASS');
      run('install', ['install', '--frozen-lockfile', '--ignore-scripts'], privateBuildEnv(process.env), report);
      guard(sha256(readFileSync('pnpm-lock.yaml')) === target.lockSHA256, 'STOP_LOCK_CHANGED');
      if (process.env.TEST_EXECUTION_MODE === 'repair') {
        run('redirect-runtime', ['exec', 'node', 'validation/cloudflare/probe-redirect-error-workerd.mjs'], privateBuildEnv(process.env), report, 180000);
        const proof = JSON.parse(readFileSync('.wrangler/htc-test-deployment/redirect-runtime-report.json', 'utf8'));
        guard(proof.status === 'PASS' && proof.sha === process.env.GITHUB_SHA && proof.run === process.env.GITHUB_RUN_ID && proof.legacyRedirectErrorRejected === true && proof.compatibilityReadHTTP === 200 && proof.secretInputs === false && proof.fixtures === 0, 'STOP_RUNTIME_REPAIR_PROOF');
        state.redirectRuntimeProofSHA256 = sha256(readFileSync('.wrangler/htc-test-deployment/redirect-runtime-report.json'));
        state.adapterSHA256 = sha256(readFileSync('cloudflare/redirect-error-fetch.mjs'));
        state.installerSHA256 = sha256(readFileSync('cloudflare/install-redirect-error-fetch.mjs'));
        state.entrySHA256 = sha256(readFileSync('cloudflare/worker-entry.mjs'));
      }
      writeFileSync(configPath, JSON.stringify(expected, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      const clean = privateBuildEnv(process.env);
      run('build', ['exec', 'opennextjs-cloudflare', 'build', `--config=${configPath}`], clean, report);
      guard(existsSync('.open-next/worker.js') && statSync('.open-next/worker.js').size > 0 && existsSync('.open-next/assets'), 'STOP_ARTIFACTS');
      state.phase = 'BUILD_PASS'; state.configSHA256 = sha256(readFileSync(configPath));
      state.workerSHA256 = sha256(readFileSync('.open-next/worker.js')); saveState(state);
      report.status = process.env.TEST_EXECUTION_MODE === 'package' ? 'TEST_PACKAGE_PASS_DEPLOYMENT_DISABLED' : 'BUILD_PASS';
    } else {
      guard(['deploy','repair'].includes(process.env.TEST_EXECUTION_MODE) && process.env.DEPLOYMENT_ENABLED === 'true', 'STOP_NO_UPLOAD_IN_PACKAGE_MODE');
      const state = loadState('BUILD_PASS');
      guard(sha256(readFileSync(configPath)) === state.configSHA256 && JSON.stringify(JSON.parse(readFileSync(configPath))) === JSON.stringify(expected), 'STOP_GENERATED_CONFIG');
      guard(sha256(readFileSync('.open-next/worker.js')) === state.workerSHA256, 'STOP_WORKER_BYTES');
      if (process.env.TEST_EXECUTION_MODE === 'repair') {
        guard(sha256(readFileSync('.wrangler/htc-test-deployment/redirect-runtime-report.json')) === state.redirectRuntimeProofSHA256 && sha256(readFileSync('cloudflare/redirect-error-fetch.mjs')) === state.adapterSHA256 && sha256(readFileSync('cloudflare/install-redirect-error-fetch.mjs')) === state.installerSHA256 && sha256(readFileSync('cloudflare/worker-entry.mjs')) === state.entrySHA256, 'STOP_REPAIR_BYTES');
      }
      await accessPreflight(report); // Re-check absence immediately before the only mutation.
      guard(typeof process.env.RUNNER_TEMP === 'string' && /^\/[A-Za-z0-9_./-]+$/.test(process.env.RUNNER_TEMP), 'STOP_PRIVATE_PATH');
      secretFile = path.join(process.env.RUNNER_TEMP, `htc-runtime-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.json`);
      writeFileSync(secretFile, JSON.stringify({ SUPABASE_PUBLISHABLE_KEY: process.env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY }) + '\n', { flag: 'wx', mode: 0o600 });
      guard((statSync(secretFile).mode & 0o777) === 0o600, 'STOP_SECRET_PERMISSIONS');
      state.phase = 'DEPLOY_SUBMITTED_NO_RETRY'; state.deploymentAttempts = 1; saveState(state);
      report.deploymentAttempted = true;
      const deployEnv = { ...process.env, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_TEST_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: target.account, SUPABASE_PUBLISHABLE_KEY: process.env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY, WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_SANITIZE: 'true' };
      const output = run('deploy', ['exec', 'opennextjs-cloudflare', 'deploy', `--config=${configPath}`, `--secrets-file=${secretFile}`], deployEnv, report, 600000);
      report.url = extractDeployedURL(output);
      const version = output.match(/Current Version ID:\s*([a-f0-9-]{36})/i);
      if (version) report.version = version[1];
      const settings = await cfGet(`/workers/scripts/${target.worker}/settings`, 'STOP_POST_SETTINGS');
      const bindings = settings.body.result?.bindings;
      guard(Array.isArray(bindings), 'STOP_POST_BINDINGS');
      guard(bindings.some(binding => binding.name === 'SUPABASE_PUBLISHABLE_KEY' && binding.type === 'secret_text'), 'STOP_RUNTIME_SECRET_BINDING');
      guard(bindings.some(binding => binding.name === 'HTC_SUPABASE_TARGET' && binding.text === 'test') && bindings.some(binding => binding.name === 'SUPABASE_URL' && binding.text === `https://${target.project}.supabase.co`), 'STOP_RUNTIME_TEST_TARGET');
      const endpoint = await cfGet(`/workers/scripts/${target.worker}/subdomain`, 'STOP_POST_SUBDOMAIN');
      guard(endpoint.body.result?.enabled === true && endpoint.body.result?.previews_enabled === false, 'STOP_RUNTIME_ROUTING');
      await runtimeChecks(report);
      report.status = 'TEST_DEPLOYMENT_AND_ANONYMOUS_SECURITY_PASS_AUTHENTICATED_GATES_PENDING';
      state.phase = 'DEPLOYED_RUNTIME_PASS'; saveState(state);
    }
  } catch (error) {
    report.status = report.deploymentAttempted ? 'STOP_AFTER_DEPLOY_NO_RETRY' : 'STOP_BEFORE_DEPLOY';
    report.failedGuard = /^STOP_[A-Z0-9_]+$/.test(error?.message ?? '') ? error.message : 'STOP_CONTROLLED_INTERNAL_ERROR';
    process.exitCode = 1;
  } finally {
    if (secretFile && existsSync(secretFile)) unlinkSync(secretFile);
    report.finished = new Date().toISOString();
    mkdirSync(path.dirname(statePath), { recursive: true });
    writeFileSync(`.wrangler/htc-test-deployment/${['preflight','build','deploy'].includes(mode) ? mode : 'invalid'}-report.json`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    const safe = JSON.stringify(report);
    console.log(safe);
    console.log(`::notice title=HTC TEST ${['preflight','build','deploy'].includes(mode) ? mode : 'invalid'}::${safe.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## HTC TEST deployment ${mode === 'deploy' ? 'runtime' : 'preparation'}\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]);
