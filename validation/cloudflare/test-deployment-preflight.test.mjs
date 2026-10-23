import assert from 'node:assert/strict';
import { test } from 'node:test';
import { credentialPresence, target, verifyChanges, verifyHost, verifyWrangler } from './test-deployment-preflight.mjs';

const host = { RUNNER_OS: 'Linux', GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: target.repository, GITHUB_REF: target.ref, GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'a'.repeat(40) };
const paths = ['.github/workflows/cloudflare-test-preflight.yml', 'validation/cloudflare/test-deployment-preflight.mjs', 'validation/cloudflare/test-deployment-preflight.test.mjs', 'docs/cloudflare-test-deployment.md'];
const config = () => ({ name: target.worker, main: '.open-next/worker.js', workers_dev: false, preview_urls: false, routes: [], vars: { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: `https://${target.project}.supabase.co` }, services: [{ binding: 'WORKER_SELF_REFERENCE', service: target.worker }] });

test('host gate rejects other repositories, branches, retries and local hosts', () => {
  assert.doesNotThrow(() => verifyHost(host, 'linux', 'v24.21.0'));
  for (const patch of [{ GITHUB_REPOSITORY: 'other/repo' }, { GITHUB_REF: 'refs/heads/main' }, { GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_SHA: 'untrusted' }, { GITHUB_ACTIONS: 'false' }]) {
    assert.throws(() => verifyHost({ ...host, ...patch }, 'linux', 'v24.21.0'), /^Error: STOP_/);
  }
  assert.throws(() => verifyHost(host, 'win32', 'v24.21.0'), /STOP_HOST/);
});

test('scope gate rejects modifications, deletions, renames and unrelated additions', () => {
  const valid = paths.map((path) => `A\t${path}`).join('\n');
  assert.doesNotThrow(() => verifyChanges(valid));
  for (const invalid of [valid.replace(/^A/, 'M'), valid.replace(/^A/, 'D'), valid.replace(paths[0], 'src/server/trial-session.js'), valid + '\nA\t.env', valid.replace(/^A/, 'R100')]) {
    assert.throws(() => verifyChanges(invalid), /^Error: STOP_/);
  }
});

test('credentials appear only as presence booleans and missing values remain blocked', () => {
  const fake = 'test-only-sensitive-sentinel';
  const present = credentialPresence({ CLOUDFLARE_TEST_API_TOKEN: fake, HTC_SUPABASE_TEST_PUBLISHABLE_KEY: fake });
  assert.deepEqual(present, { CLOUDFLARE_TEST_API_TOKEN: true, HTC_SUPABASE_TEST_PUBLISHABLE_KEY: true });
  assert.equal(JSON.stringify(present).includes(fake), false);
  assert.deepEqual(credentialPresence({}), { CLOUDFLARE_TEST_API_TOKEN: false, HTC_SUPABASE_TEST_PUBLISHABLE_KEY: false });
});

test('configuration gate rejects public routes, plaintext keys, other targets and environment overlays', () => {
  assert.doesNotThrow(() => verifyWrangler(config()));
  for (const patch of [{ workers_dev: true }, { preview_urls: true }, { routes: ['*/*'] }, { env: { test: {} } }, { vars: { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: 'https://different.invalid' } }, { vars: { ...config().vars, SUPABASE_PUBLISHABLE_KEY: 'must-not-be-plaintext' } }]) {
    assert.throws(() => verifyWrangler({ ...config(), ...patch }), /^Error: STOP_/);
  }
});
