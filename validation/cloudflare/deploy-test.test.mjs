import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accessCheckBaseDeployments, accessCheckBaseVersion, accessPreflight, extractDeployedURL, generatedConfig, origin, privateBuildEnv, repairBaseVersion, requireCredentials, verifyAccessCheckBaseline, verifyAccessCheckBrowserProof, verifyAccessCheckCredential, verifyApproval, verifyDeploymentChanges, verifyRepairBaseline } from './deploy-test.mjs';
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

test('repair approval requires the exact previously deployed version and only changes generated entrypoint', () => {
  const approved = {...env(),TEST_EXECUTION_MODE:'repair',APPROVED_REPAIR_BASE_VERSION:repairBaseVersion};
  assert.doesNotThrow(() => verifyApproval(approved,'linux','v24.21.0'));
  for (const patch of [{APPROVED_REPAIR_BASE_VERSION:undefined},{APPROVED_REPAIR_BASE_VERSION:'different'},{DEPLOYMENT_ENABLED:'false'},{REDIRECT_ALLOWLIST_VERIFIED:'false'}]) assert.throws(() => verifyApproval({...approved,...patch},'linux','v24.21.0'),/STOP_/);
  const initial = generatedConfig(base()), repair = generatedConfig(base(),true);
  assert.equal(repair.main,'cloudflare/worker-entry.mjs');
  assert.deepEqual({...repair,main:initial.main},initial);
});

test('repair baseline refuses drift, split deployments, additional bindings and wrong targets', () => {
  const settings = {compatibility_date:'2026-10-22',compatibility_flags:['nodejs_compat','global_fetch_strictly_public'],bindings:[
    {name:'ASSETS',type:'assets'}, {name:'HTC_SUPABASE_TARGET',type:'plain_text',text:'test'},
    {name:'SUPABASE_URL',type:'plain_text',text:`https://${target.project}.supabase.co`},
    {name:'SUPABASE_PUBLISHABLE_KEY',type:'secret_text'}, {name:'WORKER_SELF_REFERENCE',type:'service',service:target.worker},
  ]};
  const deployments = {deployments:[{versions:[{version_id:repairBaseVersion,percentage:100}]}]};
  const endpoint = {enabled:true,previews_enabled:false};
  assert.doesNotThrow(() => verifyRepairBaseline(settings,deployments,endpoint));
  for (const altered of [{deployments:[]},{deployments:[...deployments.deployments,...deployments.deployments]},{deployments:[{versions:[{version_id:'different',percentage:100}]}]},{deployments:[{versions:[{version_id:repairBaseVersion,percentage:50}]}]}]) assert.throws(() => verifyRepairBaseline(settings,altered,endpoint),/STOP_REPAIR_BASELINE/);
  for (const altered of [{...endpoint,previews_enabled:true},{...endpoint,enabled:false}]) assert.throws(() => verifyRepairBaseline(settings,deployments,altered),/STOP_REPAIR_ROUTING/);
  const foreign = structuredClone(settings); foreign.bindings[2].text='https://unapproved.invalid';
  assert.throws(() => verifyRepairBaseline(foreign,deployments,endpoint),/STOP_REPAIR_TARGET/);
  assert.throws(() => verifyRepairBaseline({...settings,bindings:[...settings.bindings,{name:'EXTRA',type:'kv_namespace'}]},deployments,endpoint),/STOP_REPAIR_BINDINGS/);
  assert.throws(() => verifyRepairBaseline({...settings,compatibility_flags:['nodejs_compat']},deployments,endpoint),/STOP_REPAIR_FLAGS/);
});

test('access-check continuation requires its own exact approved version without changing repair approval', () => {
  const approved={...env(),TEST_EXECUTION_MODE:'accesscheck',APPROVED_ACCESSCHECK_BASE_VERSION:accessCheckBaseVersion};
  assert.doesNotThrow(()=>verifyApproval(approved,'linux','v24.21.0'));
  for(const patch of [
    {APPROVED_ACCESSCHECK_BASE_VERSION:undefined}, {APPROVED_ACCESSCHECK_BASE_VERSION:repairBaseVersion},
    {APPROVED_WORKFLOW_SHA:'b'.repeat(40)}, {DEPLOYMENT_ENABLED:'false'},
    {REDIRECT_ALLOWLIST_VERIFIED:'false'}, {GITHUB_RUN_ATTEMPT:'2'}, {CONFIG_PROJECT:'different'},
  ]) assert.throws(()=>verifyApproval({...approved,...patch},'linux','v24.21.0'),/STOP_/);
  assert.throws(()=>verifyApproval({...approved,TEST_EXECUTION_MODE:'repair',APPROVED_REPAIR_BASE_VERSION:accessCheckBaseVersion},'linux','v24.21.0'),/STOP_REPAIR_VERSION_APPROVAL/);
  const rows=['.github/workflows/cloudflare-test-preflight.yml','validation/cloudflare/test-deployment-preflight.mjs','validation/cloudflare/test-deployment-preflight.test.mjs','docs/cloudflare-test-deployment.md','.github/workflows/cloudflare-test-deploy.yml','validation/cloudflare/deploy-test.mjs','validation/cloudflare/deploy-test.test.mjs','cloudflare/test-access-check.mjs','tests/cloudflare-test-access-check.test.mjs'].map(name=>`A\t${name}`).join('\n');
  assert.doesNotThrow(()=>verifyDeploymentChanges(rows));
  assert.throws(()=>verifyDeploymentChanges(rows.replace('cloudflare/test-access-check.mjs','src/app/api/founder/operations/route.js')),/STOP_CHANGE_SCOPE/);
  const generated=generatedConfig(base(),true);
  assert.equal(generated.main,'cloudflare/worker-entry.mjs');
  assert.deepEqual(generated.routes,[]); assert.equal(generated.preview_urls,false);
});

const accessCheckFixture=()=>({
  settings:{compatibility_date:'2026-10-22',compatibility_flags:['nodejs_compat','global_fetch_strictly_public'],bindings:[
    {name:'ASSETS',type:'assets'}, {name:'HTC_SUPABASE_TARGET',type:'plain_text',text:'test'},
    {name:'SUPABASE_URL',type:'plain_text',text:`https://${target.project}.supabase.co`},
    {name:'SUPABASE_PUBLISHABLE_KEY',type:'secret_text'}, {name:'WORKER_SELF_REFERENCE',type:'service',service:target.worker},
  ]},
  deployments:{deployments:accessCheckBaseDeployments.map(({id,version})=>({id,versions:[{version_id:version,percentage:100}]}))},
  endpoint:{enabled:true,previews_enabled:false},
});

test('access-check baseline pins both historical IDs and versions and the current 100-percent deployment',()=>{
  const {settings,deployments,endpoint}=accessCheckFixture();
  assert.doesNotThrow(()=>verifyAccessCheckBaseline(settings,deployments,endpoint));
  const mutate=change=>{const value=structuredClone(deployments);change(value.deployments);return value;};
  for(const altered of [
    {deployments:[]}, {deployments:[deployments.deployments[0]]},
    {deployments:[...deployments.deployments,deployments.deployments[0]]},
    mutate(rows=>rows.reverse()), mutate(rows=>{rows[0].id='unapproved';}),
    mutate(rows=>{rows[1].id=rows[0].id;}),
    mutate(rows=>{rows[0].versions[0].version_id=repairBaseVersion;}),
    mutate(rows=>{rows[1].versions[0].version_id=accessCheckBaseVersion;}),
    mutate(rows=>{rows[0].versions[0].percentage=50;}),
    mutate(rows=>{rows[1].versions[0].percentage=0;}),
    mutate(rows=>{rows[0].versions.push({...rows[0].versions[0]});}),
  ]) assert.throws(()=>verifyAccessCheckBaseline(settings,altered,endpoint),/STOP_ACCESSCHECK_BASELINE/);
  // The historical repair mode continues to reject this two-deployment state.
  assert.throws(()=>verifyRepairBaseline(settings,deployments,endpoint),/STOP_REPAIR_BASELINE/);
});

test('access-check keeps the same five bindings, exact TEST target, flags and private routing guards',()=>{
  const {settings,deployments,endpoint}=accessCheckFixture();
  for(const altered of [{...endpoint,enabled:false},{...endpoint,previews_enabled:true}])
    assert.throws(()=>verifyAccessCheckBaseline(settings,deployments,altered),/STOP_ACCESSCHECK_ROUTING/);
  const mutate=change=>{const value=structuredClone(settings);change(value);return value;};
  for(const altered of [
    mutate(value=>{value.bindings.pop();}),
    mutate(value=>{value.bindings.push({name:'EXTRA',type:'kv_namespace'});}),
    mutate(value=>{value.bindings[3].type='plain_text';}),
    mutate(value=>{value.bindings[2].text='https://unapproved.invalid';}),
    mutate(value=>{value.bindings[1].text='production';}),
    mutate(value=>{value.bindings[4].service='other-worker';}),
    mutate(value=>{value.compatibility_date='2026-10-23';}),
    mutate(value=>{value.compatibility_flags=['nodejs_compat'];}),
  ]) assert.throws(()=>verifyAccessCheckBaseline(altered,deployments,endpoint),/STOP_ACCESSCHECK_(?:BINDINGS|TARGET|FLAGS)/);
});

test('access-check browser evidence is exact-source synthetic proof with both view and fail-closed cases',()=>{
  const proof={
    status:'PASS', mode:'LOCAL_SYNTHETIC_BROWSER_REGRESSION_NOT_LIVE_AUTH',sha:env().GITHUB_SHA,run:env().GITHUB_RUN_ID,
    externalNetworkRequests:0,credentialsUsed:false,cookiesTransferred:false,AuthDatabaseStorageMutations:0,
    deployments:0,liveSupabaseRequests:0,realGoogleOAuth:false,screenshotArtifacts:0,
    views:[1440,390].map(width=>({width,passed:true,cspScriptExecuted:true,initialNetworkInert:true,
      summaryOriginSame:true,nativeSignOutOriginSame:true,noHorizontalOverflow:true,USER403:'SYNTHETIC_PASS',
      postLogout401:'SYNTHETIC_PASS',originalReceiptPreserved:true})),
    failures:['anonymous','founder'].map(name=>({case:name,passed:true,failedClosed:true,AuthOperations:0})),
  };
  assert.doesNotThrow(()=>verifyAccessCheckBrowserProof(proof,env()));
  const mutate=change=>{const value=structuredClone(proof);change(value);return value;};
  for(const altered of [
    undefined, {...proof,status:'FAIL_NO_RETRY'}, {...proof,mode:'LIVE_AUTH_PASS'},
    {...proof,sha:'b'.repeat(40)}, {...proof,run:'2'},
    {...proof,views:[]}, {...proof,failures:[]},
    mutate(value=>{value.views[1].width=1440;}),
    mutate(value=>{value.views[0].initialNetworkInert=false;}),
    mutate(value=>{value.views[0].originalReceiptPreserved=false;}),
    mutate(value=>{value.failures[1].failedClosed=false;}),
    mutate(value=>{value.failures[1].AuthOperations=1;}),
    ...['externalNetworkRequests','AuthDatabaseStorageMutations','deployments','liveSupabaseRequests','screenshotArtifacts'].map(key=>({...proof,[key]:1})),
    ...['credentialsUsed','cookiesTransferred','realGoogleOAuth'].map(key=>({...proof,[key]:true})),
  ]) assert.throws(()=>verifyAccessCheckBrowserProof(altered,env()),/STOP_ACCESSCHECK_BROWSER_PROOF/);
});

const credentialFixture = now => ({ id:'a'.repeat(32), status:'active', expires_on:new Date(now + 60 * 60 * 1000).toISOString() });

test('access-check credential requires active canonical metadata, bounded expiry and token-management denial',()=>{
  const now=Date.parse('2026-10-24T00:00:00Z'), metadata=credentialFixture(now);
  assert.deepEqual(verifyAccessCheckCredential({...metadata,value:'sensitive-sentinel',name:'private-name'},403,now),{
    status:'active',expiresOn:metadata.expires_on,accountTokenManagement:'DENIED_HTTP403',
  });
  for(const duration of [5 * 60 * 1000 + 1,12 * 60 * 60 * 1000])
    assert.doesNotThrow(()=>verifyAccessCheckCredential({...metadata,expires_on:new Date(now+duration).toISOString()},403,now));
  for(const altered of [undefined,null,{}, {...metadata,id:undefined},{...metadata,id:'A'.repeat(32)},
    {...metadata,id:'a'.repeat(31)},{...metadata,status:'disabled'},{...metadata,status:'expired'}])
    assert.throws(()=>verifyAccessCheckCredential(altered,403,now),/^Error: STOP_ACCESSCHECK_CI_TOKEN_METADATA$/);
  for(const expires_on of [undefined,null,now,'invalid','2026-10-24','2026-02-30T01:00:00Z',
    ...[-1,0,5 * 60 * 1000,12 * 60 * 60 * 1000 + 1].map(duration=>new Date(now+duration).toISOString())])
    assert.throws(()=>verifyAccessCheckCredential({...metadata,expires_on},403,now),/^Error: STOP_ACCESSCHECK_CI_TOKEN_EXPIRY$/);
  assert.throws(()=>verifyAccessCheckCredential(metadata,403,NaN),/STOP_ACCESSCHECK_CI_TOKEN_EXPIRY/);
  for(const status of [200,201,400,401,404,429,500,undefined,'403'])
    assert.throws(()=>verifyAccessCheckCredential(metadata,status,now),/^Error: STOP_ACCESSCHECK_CI_TOKEN_MANAGEMENT_SCOPE$/);
});

function accessCheckEnvironment(t, mode='accesscheck') {
  const values={TEST_EXECUTION_MODE:mode,CLOUDFLARE_TEST_API_TOKEN:'t'.repeat(40),HTC_SUPABASE_TEST_PUBLISHABLE_KEY:'sb_publishable_ValidTestShape'};
  const previous=Object.fromEntries(Object.keys(values).map(key=>[key,process.env[key]]));
  Object.assign(process.env,values);
  t.after(()=>{for(const [key,value] of Object.entries(previous)) {
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }});
}

test('access-check preflight verifies the account credential and discards token-list bodies before baseline reads',async t=>{
  accessCheckEnvironment(t);
  const {settings,deployments,endpoint}=accessCheckFixture(), requests=[];
  let cancelled=0, managementJSONReads=0;
  const metadata=credentialFixture(Date.now());
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    const parsed=new URL(url), suffix=parsed.pathname.replace(`/client/v4/accounts/${target.account}`,'')+parsed.search;
    requests.push(suffix);
    assert.equal(options.method,undefined);
    assert.equal(options.redirect,'error');
    if(suffix==='/tokens?per_page=5') return {status:403,body:{async cancel(){cancelled++;}},async json(){managementJSONReads++;throw new Error('unread-token-metadata');}};
    const results={
      '/tokens/verify':metadata,'':{id:target.account},'/workers/subdomain':{subdomain:'holictraderscompany'},
      [`/workers/scripts/${target.worker}/settings`]:settings,
      [`/workers/scripts/${target.worker}/deployments`]:deployments,
      [`/workers/scripts/${target.worker}/subdomain`]:endpoint,
    };
    if(parsed.origin===`https://${target.project}.supabase.co`) return {status:200,async json(){return {external:{google:true}};}};
    assert.equal(Object.hasOwn(results,suffix),true,'unexpected request');
    return {status:200,async json(){return {success:true,result:results[suffix]};}};
  });
  const report={};
  await accessPreflight(report);
  assert.deepEqual(requests.slice(0,3),['/tokens/verify','/tokens?per_page=5','']);
  assert.equal(cancelled,1); assert.equal(managementJSONReads,0);
  assert.deepEqual(report.accessCheckCredential,{status:'active',expiresOn:metadata.expires_on,accountTokenManagement:'DENIED_HTTP403'});
  assert.equal(JSON.stringify(report).includes(metadata.id),false);
});

test('access-check preflight stops before build or upload on unsafe metadata or any ambiguous management response',async t=>{
  accessCheckEnvironment(t);
  const now=Date.now(), metadata=credentialFixture(now);
  for(const {result=metadata,status=403,guard} of [
    {result:{...metadata,status:'disabled'},guard:'STOP_ACCESSCHECK_CI_TOKEN_METADATA'},
    {result:{...metadata,expires_on:new Date(now-1).toISOString()},guard:'STOP_ACCESSCHECK_CI_TOKEN_EXPIRY'},
    {result:{...metadata,expires_on:new Date(now+13 * 60 * 60 * 1000).toISOString()},guard:'STOP_ACCESSCHECK_CI_TOKEN_EXPIRY'},
    ...[200,400,401,404,429,500].map(status=>({status,guard:`STOP_ACCESSCHECK_CI_TOKEN_MANAGEMENT_HTTP${status}`})),
  ]) await t.test(guard,async child=>{
    const requests=[]; let cancelled=0, managementJSONReads=0;
    child.mock.method(globalThis,'fetch',async (url,options)=>{
      requests.push(new URL(url).pathname+new URL(url).search);
      assert.equal(options.method,undefined);
      if(url.endsWith('/tokens/verify')) return {status:200,async json(){return {success:true,result};}};
      assert.equal(url,`https://api.cloudflare.com/client/v4/accounts/${target.account}/tokens?per_page=5`);
      return {status,body:{async cancel(){cancelled++;}},async json(){managementJSONReads++;throw new Error('unread-token-metadata');}};
    });
    const report={};
    await assert.rejects(accessPreflight(report),{message:guard});
    assert.equal(requests.length,2);
    assert.equal(cancelled,1); assert.equal(managementJSONReads,0);
    assert.equal(report.accessCheckCredential,undefined);
    assert.equal(report.preflight,undefined);
  });
});

test('historical package, deploy and repair preflights do not request account-token metadata',async t=>{
  for(const mode of ['package','deploy','repair']) await t.test(mode,async child=>{
    accessCheckEnvironment(child,mode);
    const requests=[];
    child.mock.method(globalThis,'fetch',async url=>{
      requests.push(url);
      return {status:403,async json(){throw new Error('unexpected body read');}};
    });
    await assert.rejects(accessPreflight({}),{message:'STOP_ACCOUNT_HTTP403'});
    assert.deepEqual(requests,[`https://api.cloudflare.com/client/v4/accounts/${target.account}`]);
  });
});
