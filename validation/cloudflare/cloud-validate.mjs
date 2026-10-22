// This orchestrator intentionally refuses heavy execution on the Windows control host.
import fs from 'node:fs';
import os from 'node:os';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base = '4e8e07b18c1040722169223196add2112751cfeb';
assert.equal(process.platform, 'linux', 'Cloud Linux executor required');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'GitHub-hosted execution required');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY, 'holictraderscompany-art/htc-trial');
assert.equal(process.env.GITHUB_REF, 'refs/heads/codex/cloudflare-workers-preparation');
assert(os.totalmem() >= 6 * 1024 ** 3, 'Insufficient cloud RAM');
assert.equal(process.env.HTC_SUPABASE_TARGET, 'test');
assert.equal(process.env.SUPABASE_URL, 'https://uzhkzhmncxjplrdtdzgd.supabase.co');
assert.equal(process.env.SUPABASE_PUBLISHABLE_KEY, 'sb_publishable_worker_runtime_fixture');
for (const key of ['CLOUDFLARE_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL']) assert(!process.env[key], 'Privileged credential must not be supplied');
const report = {
  at: new Date().toISOString(), status: 'RUNNING', base,
  host: { provider: 'GitHub Actions', run_id: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT,
    sha: process.env.GITHUB_SHA, os: os.release(), platform: process.platform, architecture: os.arch(),
    totalRAMMiB: Math.round(os.totalmem() / 1024 ** 2), freeRAMMiB: Math.round(os.freemem() / 1024 ** 2),
    CPUs: os.cpus().length, node: process.version, runner: process.env.RUNNER_NAME },
  stages: [], deployment_attempted: false, database_fixtures: 0, real_OAuth_tested: false,
  authenticated_Worker_integration_tested: false, authentication_tests: 'Existing injected unit fixtures plus actual anonymous Worker HTTP; not LIVE Google OAuth',
};
const servers = [];
function run(name, command, args, timeout = 600000) {
  const started = new Date().toISOString();
  console.log('HTC_STAGE_START ' + name);
  const result = cp.spawnSync(command, args, { encoding: 'utf8', timeout, maxBuffer: 32 * 1024 ** 2 });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(`validation/cloudflare/${name}.log`, output);
  const stage = { name, started, finished: new Date().toISOString(), exit: result.status,
    status: result.status === 0 && !result.error ? 'PASS' : 'FAIL',
    output_sha256: crypto.createHash('sha256').update(output).digest('hex') };
  const tests = output.match(/(?:# |ℹ )tests (\d+)/);
  const passed = output.match(/(?:# |ℹ )pass (\d+)/);
  if (tests) stage.tests = Number(tests[1]);
  if (passed) stage.passed = Number(passed[1]);
  report.stages.push(stage);
  console.log('HTC_STAGE_RESULT ' + JSON.stringify(stage));
  if (stage.status !== 'PASS') {
    // No private credentials are supplied to these commands. Never dump environment.
    console.log(output.split('\n').slice(-45).join('\n'));
    const detail = (name + '\n' + output.split('\n').slice(-45).join('\n')).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.log('::notice title=HTC failure context::' + detail);
    throw new Error(name + ' failed' + (result.error ? ': ' + result.error.code : ''));
  }
  return output;
}
async function server(name, args, port) {
  const stream = fs.openSync(`validation/cloudflare/${name}.log`, 'w');
  const child = cp.spawn('pnpm', args, { stdio: ['ignore', stream, stream], detached: true });
  fs.closeSync(stream); servers.push(child);
  for (let n = 0; n < 90; n++) {
    if (child.exitCode !== null) throw new Error(name + ' exited before readiness');
    try { const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) }); if (r.status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(name + ' readiness timeout');
}
function regressions() {
  run('adapter-typecheck', 'pnpm', ['exec', 'tsc', '--noEmit', '--skipLibCheck', '--target', 'es2022', '--module', 'nodenext', '--moduleResolution', 'nodenext', 'open-next.config.ts']);
  run('production-audit', 'pnpm', ['audit', '--prod', '--json']);
  run('application', 'pnpm', ['test']);
  run('sqlite-content', 'pnpm', ['test:local:sqlite']);
  run('sqlite-assets', 'pnpm', ['test:t14:sqlite']);
}
try {
  run('protected-scope', 'git', ['diff', '--exit-code', base, '--', 'src', 'supabase', 'validation/test-db', 'validation/t13',
    'validation/t14', 'validation/t15-master', 'validation/t16-r1', 'validation/t16-r2', 'validation/t16-final']);
  report.host.pnpm = run('pnpm-version', 'pnpm', ['--version']).trim();
  // Actual run 39720220422 rejected these two exact pins under pnpm's default
  // 24-hour release-age policy. Do not reinstall prematurely or waive the policy.
  report.releaseAgeGate = { resumeAfterUTC: '2026-10-22T13:23:30Z',
    evidenceRun: '39720220422', policyMinutes: 1440,
    packages: ['@opennextjs/cloudflare@1.20.13', '@opennextjs/aws@4.1.12'] };
  if (Date.now() < Date.parse(report.releaseAgeGate.resumeAfterUTC)) throw new Error('BLOCKED_RELEASE_AGE: resume after 2026-10-22T13:23:30Z; pnpm policy remains enforced');
  if (process.argv.includes('--bootstrap-lock')) run('dependency-resolution', 'pnpm', ['install', '--no-frozen-lockfile', '--ignore-scripts']);
  run('frozen-install', 'pnpm', ['install', '--frozen-lockfile', '--ignore-scripts']);
  run('configuration', 'pnpm', ['test:workers:config']);
  if (process.argv.includes('--reuse-regressions')) {
    const bytes = fs.readFileSync('validation/cloudflare/run-39719749196.json');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), 'a3a1b0a307d4e831482f723eb8393bc84b99f52bed01ce062f6e0d7648985785');
    const prior = JSON.parse(bytes);
    assert.equal(prior.host.sha, 'd24b7f09d8e8f04b7bd6b4793c7f5290e05db0ac');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync('pnpm-lock.yaml')).digest('hex'), prior.lock_sha256);
    const changed = cp.execFileSync('git', ['diff', '--name-only', prior.host.sha, '--', 'package.json', 'open-next.config.ts', 'tests'], { encoding: 'utf8' });
    assert.deepEqual(changed.trim().split('\n').filter(Boolean).filter(path => path !== 'tests/cloudflare-config.test.mjs'), []);
    const names = ['adapter-typecheck', 'production-audit', 'application', 'sqlite-content', 'sqlite-assets'];
    if (process.version === prior.host.node) {
      report.reused_stages = prior.stages.filter(stage => names.includes(stage.name)).map(stage => ({ ...stage, reused_from_run: prior.host.run_id }));
      assert.equal(report.reused_stages.length, names.length);
      for (const stage of report.reused_stages) assert.equal(stage.status, 'PASS');
      console.log('HTC_REUSED_REGRESSIONS ' + JSON.stringify(report.reused_stages));
    } else {
      report.freshRegressionReason = 'Hosted Node version differs from the prior validated runtime';
      regressions();
    }
  } else {
    regressions();
  }
  fs.writeFileSync('.dev.vars', 'NEXTJS_ENV=development\nSUPABASE_PUBLISHABLE_KEY=sb_publishable_worker_runtime_fixture\n');
  run('workers-build', 'pnpm', ['build:workers']);
  const dry = run('workers-dry-run', 'pnpm', ['dry-run:workers']);
  report.bundleSummary = dry.split('\n').filter(line => /Total Upload|gzip|Startup Time/.test(line));
  // Cloudflare's current Free and Paid limit is 64 MiB uncompressed, not gzip.
  // https://developers.cloudflare.com/workers/platform/limits/#worker-size
  const upload = dry.match(/Total Upload:\s*([\d.]+)\s*(KiB|MiB|B)\b/);
  assert(upload, 'Wrangler dry-run did not report a verifiable bundle size');
  report.bundleBytes = Number(upload[1]) * ({ B: 1, KiB: 1024, MiB: 1024 ** 2 }[upload[2]]);
  assert(report.bundleBytes <= 64 * 1024 ** 2, 'Bundle exceeds the documented Workers size limit');
  run('browser-install', 'pnpm', ['exec', 'playwright', 'install', 'chromium']);
  await server('worker-preview', ['preview:workers'], 3105);
  let httpFailure;
  try { run('worker-http', 'node', ['validation/cloudflare/probe-local-worker.mjs']); }
  catch (error) { httpFailure = error; }
  report.runtime = JSON.parse(fs.readFileSync('validation/cloudflare/runtime-local.json', 'utf8'));
  await server('next-reference', ['start', '--port', '3106'], 3106);
  run('worker-ui', 'node', ['validation/cloudflare/probe-worker-ui.mjs']);
  report.ui = JSON.parse(fs.readFileSync('validation/cloudflare/ui-cloud.json', 'utf8'));
  if (httpFailure) throw httpFailure;
  report.status = 'PASS';
} catch (error) {
  report.status = error.message.startsWith('BLOCKED_') ? 'BLOCKED' : 'FAIL'; report.failure = error.message; process.exitCode = 1;
} finally {
  for (const child of servers) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  report.finished = new Date().toISOString();
  if (fs.existsSync('pnpm-lock.yaml')) {
    const bytes = fs.readFileSync('pnpm-lock.yaml');
    report.lock_sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const encoded = bytes.toString('base64');
    console.log('HTC_LOCK_BEGIN');
    for (let i = 0; i < encoded.length; i += 12000) console.log('HTC_LOCK_CHUNK ' + encoded.slice(i, i + 12000));
    console.log('HTC_LOCK_END');
  }
  fs.writeFileSync('validation/cloudflare/cloud-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log('HTC_CLOUD_REPORT ' + JSON.stringify(report));
  const summary = JSON.stringify(report).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log('::notice title=HTC cloud report::' + summary);
  // Keep each annotation bounded: GitHub may truncate the complete report.
  const encodedReport = Buffer.from(JSON.stringify(report)).toString('base64');
  const chunks = Math.ceil(encodedReport.length / 3000);
  for (let i = 0; i < chunks; i++) console.log(`::notice title=HTC report chunk ${i + 1}/${chunks}::` + encodedReport.slice(i * 3000, (i + 1) * 3000));
}
