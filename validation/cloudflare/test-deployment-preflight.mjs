import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const target = Object.freeze({
  repository: 'holictraderscompany-art/htc-trial',
  ref: 'refs/heads/codex/cloudflare-workers-preparation',
  environment: 'cloudflare-test',
  worker: 'htc-trial-workers-test',
  account: '2e93ece77ccb74920f7b995f6d48996b',
  project: 'uzhkzhmncxjplrdtdzgd',
  migration: '3967a520a330577d8b1f5931361839dfeb28a46c',
  group03: '4e8e07b18c1040722169223196add2112751cfeb',
  main: '6df86a0e630f38b933d5e269c54ef20906d6bcf5',
  manifestSHA256: '7873a4da44883477c9f6c1f1593de210ced474f291b754bd5b4c325d4c258dcb',
  lockSHA256: 'f3dd0c9c7f92f8cec9ebacaf0912b8144ac1f773800771f90ea661db82cc89d6',
});

const additions = new Set([
  '.github/workflows/cloudflare-test-preflight.yml',
  'validation/cloudflare/test-deployment-preflight.mjs',
  'validation/cloudflare/test-deployment-preflight.test.mjs',
  'docs/cloudflare-test-deployment.md',
]);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const requireGuard = (condition, code) => { if (!condition) throw new Error(code); };

export function verifyHost(env, platform, nodeVersion) {
  requireGuard(platform === 'linux' && env.RUNNER_OS === 'Linux' && env.GITHUB_ACTIONS === 'true', 'STOP_HOST');
  requireGuard(nodeVersion === 'v24.21.0', 'STOP_NODE');
  requireGuard(env.GITHUB_REPOSITORY === target.repository && env.GITHUB_REF === target.ref, 'STOP_REPOSITORY_OR_BRANCH');
  requireGuard(env.GITHUB_RUN_ATTEMPT === '1', 'STOP_RETRY');
  requireGuard(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? ''), 'STOP_SHA');
}

export function verifyChanges(lines) {
  const changes = lines.trim().split('\n').filter(Boolean).map((line) => line.split('\t'));
  requireGuard(changes.length === additions.size, 'STOP_CANDIDATE_COUNT');
  requireGuard(changes.every(([status, path, extra]) => status === 'A' && additions.has(path) && extra === undefined), 'STOP_SCOPE');
  requireGuard(new Set(changes.map(([, path]) => path)).size === additions.size, 'STOP_DUPLICATE_PATH');
}

export function credentialPresence(env) {
  // Never return, hash, log or persist the values. This does not prove validity.
  return {
    CLOUDFLARE_TEST_API_TOKEN: Boolean(env.CLOUDFLARE_TEST_API_TOKEN),
    HTC_SUPABASE_TEST_PUBLISHABLE_KEY: Boolean(env.HTC_SUPABASE_TEST_PUBLISHABLE_KEY),
  };
}

export function verifyWrangler(config) {
  requireGuard(config.name === target.worker && config.main === '.open-next/worker.js', 'STOP_WORKER');
  requireGuard(config.account_id === undefined && config.env === undefined && config.secrets === undefined, 'STOP_BASE_CONFIG');
  requireGuard(config.workers_dev === false && config.preview_urls === false && config.routes?.length === 0, 'STOP_PUBLIC_ROUTING');
  requireGuard(config.vars?.HTC_SUPABASE_TARGET === 'test' && config.vars?.SUPABASE_URL === `https://${target.project}.supabase.co`, 'STOP_SUPABASE_TARGET');
  requireGuard(config.vars?.SUPABASE_PUBLISHABLE_KEY === undefined, 'STOP_PLAINTEXT_KEY');
  requireGuard(JSON.stringify(config.services) === JSON.stringify([{ binding: 'WORKER_SELF_REFERENCE', service: target.worker }]), 'STOP_SELF_REFERENCE');
}

function main() {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const gitBytes = (path) => execFileSync('git', ['show', `HEAD:${path}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  const report = { status: 'BLOCKED', mode: 'PREFLIGHT_ONLY_NO_DEPLOYMENT', target, checks: {}, credentials: {}, missing: [] };
  try {
    verifyHost(process.env, process.platform, process.version);
    report.checks.host = 'PASS';
    requireGuard(git('rev-parse', 'HEAD') === process.env.GITHUB_SHA, 'STOP_CHECKOUT_SHA');
    requireGuard([`https://github.com/${target.repository}`, `https://github.com/${target.repository}.git`].includes(git('remote', 'get-url', 'origin')), 'STOP_ORIGIN');
    requireGuard(git('status', '--porcelain=v1') === '', 'STOP_DIRTY');
    git('merge-base', '--is-ancestor', target.migration, 'HEAD');
    git('merge-base', '--is-ancestor', target.group03, 'HEAD');
    verifyChanges(git('diff', '--name-status', target.migration, 'HEAD'));
    report.checks.sourceScope = 'PASS';
    const manifestBytes = gitBytes('validation/cloudflare/final-review.json');
    requireGuard(digest(manifestBytes) === target.manifestSHA256, 'STOP_SEALED_MANIFEST');
    const manifest = JSON.parse(manifestBytes);
    requireGuard(manifest.files.length === 22 && manifest.expectedFinalFileCount === 23, 'STOP_SEALED_COUNT');
    for (const file of manifest.files) {
      requireGuard(digest(gitBytes(file.path)) === file.sha256, 'STOP_SEALED_CHECKSUM');
      requireGuard(git('rev-parse', `HEAD:${file.path}`) === file.gitBlobOID, 'STOP_SEALED_BLOB');
    }
    requireGuard(digest(gitBytes('pnpm-lock.yaml')) === target.lockSHA256, 'STOP_LOCKFILE');
    verifyWrangler(JSON.parse(readFileSync('wrangler.jsonc', 'utf8')));
    report.checks.sealedFiles = { status: 'PASS', count: 23, lockfile: 'PASS' };
    report.sha = process.env.GITHUB_SHA;
    report.credentials = credentialPresence(process.env);
    report.missing = Object.entries(report.credentials).filter(([, present]) => !present).map(([name]) => name);
    report.checks.credentialBinding = report.missing.length ? 'BLOCKED_MISSING' : 'PRESENT_NOT_YET_VALIDATED';
    report.status = report.missing.length ? 'BLOCKED_MISSING_CI_CREDENTIALS' : 'ACCESS_PRESENT_DEPLOYMENT_STILL_GATED';
  } catch (error) {
    // Fail closed without printing exceptions that could contain environment data.
    report.status = 'STOP_PREFLIGHT_INTEGRITY';
    report.failedGuard = /^STOP_[A-Z0-9_]+$/.test(error?.message ?? '') ? error.message : 'STOP_GIT_OR_PARSE';
  }
  const safeJSON = JSON.stringify(report);
  console.log(safeJSON);
  console.log(`::notice title=HTC TEST preflight::${safeJSON.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## HTC TEST access preflight\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n\nNo installation, build, Cloudflare request, secret provisioning or deployment was performed.\n`);
  // Presence alone is not credential validity or deployment acceptance.
  process.exitCode = report.status === 'ACCESS_PRESENT_DEPLOYMENT_STILL_GATED' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
