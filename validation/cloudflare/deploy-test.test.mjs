import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractDeployedURL, generatedConfig, origin, privateBuildEnv, requireCredentials, verifyApproval, verifyDeploymentChanges } from './deploy-test.mjs';
import { target } from './test-deployment-preflight.mjs';

const env = () => ({ RUNNER_OS:'Linux', RUNNER_ENVIRONMENT:'github-hosted', GITHUB_ACTIONS:'true', GITHUB_RUN_ID:'1', GITHUB_REPOSITORY:target.repository, GITHUB_REF:target.ref, GITHUB_RUN_ATTEMPT:'1', GITHUB_SHA:'a'.repeat(40), APPROVED_WORKFLOW_SHA:'a'.repeat(40), DEPLOYMENT_ENABLED:'true', TEST_EXECUTION_MODE:'deploy', REDIRECT_ALLOWLIST_VERIFIED:'true', CONFIG_CF_ACCOUNT:target.account, CONFIG_WORKER:target.worker, CONFIG_PROJECT:target.project, HTC_SUPABASE_TARGET:'test', SUPABASE_URL:`https://${target.project}.supabase.co` });
const base = () => ({ name:target.worker, main:'.open-next/worker.js', workers_dev:false, preview_urls:false, routes:[], vars:{ HTC_SUPABASE_TARGET:'test', SUPABASE_URL:`https://${target.project}.supabase.co` }, services:[{binding:'WORKER_SELF_REFERENCE',service:target.worker}] });
test('deployment requires exact environment approval, SHA, callback, host and first attempt', () => {
  assert.doesNotThrow(() => verifyApproval(env(),'linux','v24.21.0'));
  for (const patch of [{DEPLOYMENT_ENABLED:'false'},{APPROVED_WORKFLOW_SHA:'b'.repeat(40)},{REDIRECT_ALLOWLIST_VERIFIED:'false'},{CONFIG_CF_ACCOUNT:'different'},{CONFIG_PROJECT:'different'},{RUNNER_ENVIRONMENT:'self-hosted'},{HTC_SUPABASE_TARGET:undefined},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_REF:'refs/heads/main'}]) assert.throws(() => verifyApproval({...env(),...patch},'linux','v24.21.0'),/STOP_/);
  assert.throws(() => verifyApproval(env(),'win32','v24.21.0'),/STOP_HOST/);
});
test('package mode permits packaging while redirect gate is closed and upload disabled', () => {
  assert.doesNotThrow(() => verifyApproval({...env(),TEST_EXECUTION_MODE:'package',DEPLOYMENT_ENABLED:'false',REDIRECT_ALLOWLIST_VERIFIED:'false'},'linux','v24.21.0'));
  assert.throws(() => verifyApproval({...env(),TEST_EXECUTION_MODE:'package',DEPLOYMENT_ENABLED:'true'},'linux','v24.21.0'),/STOP_DISABLED_OR_MODE/);
  assert.throws(() => verifyApproval({...env(),TEST_EXECUTION_MODE:'unknown'},'linux','v24.21.0'),/STOP_DISABLED_OR_MODE/);
});
test('generated TEST overlay changes only account, workers.dev and required encrypted key', () => {
  const original = base(); const snapshot = JSON.stringify(original); const generated = generatedConfig(original);
  assert.equal(JSON.stringify(original),snapshot);
  assert.equal(generated.account_id,target.account); assert.equal(generated.workers_dev,true);
  assert.deepEqual(generated.secrets,{required:['SUPABASE_PUBLISHABLE_KEY']});
  assert.deepEqual(generated.routes,[]); assert.equal(generated.preview_urls,false);
  assert.equal(generated.vars.SUPABASE_PUBLISHABLE_KEY,undefined);
  for(const patch of [{workers_dev:true},{routes:['*/*']},{env:{test:{}}}]) assert.throws(() => generatedConfig({...base(),...patch}),/STOP_/);
});
test('build environment strips live credentials and supplies only explicit fixture key', () => {
  const clean = privateBuildEnv({CLOUDFLARE_TEST_API_TOKEN:'sensitive-sentinel',HTC_SUPABASE_TEST_PUBLISHABLE_KEY:'sensitive-sentinel',SUPABASE_SERVICE_ROLE_KEY:'sensitive-sentinel',DATABASE_URL:'sensitive-sentinel',SAFE:'keep'});
  assert.equal(clean.CLOUDFLARE_TEST_API_TOKEN,undefined); assert.equal(clean.HTC_SUPABASE_TEST_PUBLISHABLE_KEY,undefined);
  assert.equal(clean.DATABASE_URL,undefined); assert.equal(clean.SUPABASE_SERVICE_ROLE_KEY,undefined);
  assert.equal(clean.SUPABASE_PUBLISHABLE_KEY,'sb_publishable_worker_runtime_fixture'); assert.equal(clean.SAFE,'keep');
  assert.equal(JSON.stringify(clean).includes('sensitive-sentinel'),false);
});
test('credential format gate fails safely without echoing supplied values', () => {
  const valid={CLOUDFLARE_TEST_API_TOKEN:'t'.repeat(40),HTC_SUPABASE_TEST_PUBLISHABLE_KEY:'sb_publishable_ValidTestShape'};
  assert.doesNotThrow(() => requireCredentials(valid));
  for(const key of ['', 'sb_publishable_worker_runtime_fixture','sb_publishable_REPLACE_ME','secret-with-unsafe-value']) {
    assert.throws(() => requireCredentials({...valid,HTC_SUPABASE_TEST_PUBLISHABLE_KEY:key}), /^Error: STOP_TEST_KEY$/);
  }
});
test('scope allows only additive approved deployment/bootstrap files and optional checkpoint', () => {
  const names=['.github/workflows/cloudflare-test-preflight.yml','validation/cloudflare/test-deployment-preflight.mjs','validation/cloudflare/test-deployment-preflight.test.mjs','docs/cloudflare-test-deployment.md','.github/workflows/cloudflare-test-deploy.yml','validation/cloudflare/deploy-test.mjs','validation/cloudflare/deploy-test.test.mjs'];
  const rows=names.map(name=>`A\t${name}`).join('\n');
  assert.doesNotThrow(()=>verifyDeploymentChanges(rows));
  assert.doesNotThrow(()=>verifyDeploymentChanges(`${rows}\nA\tvalidation/cloudflare/test-deployment-checkpoint.json`));
  for(const invalid of [rows.replace(/^A/,'M'),rows.replace(names[0],'src/server/trial-session.js'),`${rows}\nA\t.env`,rows.replace(names[0],names[1])]) assert.throws(()=>verifyDeploymentChanges(invalid),/STOP_/);
});
test('deployment URL must be emitted by CLI and match only the fixed TEST hostname', () => {
  assert.equal(extractDeployedURL(`Deployed triggers\n  ${origin}\nCurrent Version ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`),origin);
  assert.throws(()=>extractDeployedURL('Succeeded but no URL was returned'),/STOP_DEPLOY_URL_UNPROVEN/);
  assert.throws(()=>extractDeployedURL(`${origin}\nhttps://other.example.workers.dev`),/STOP_UNEXPECTED_DEPLOY_URL/);
});
