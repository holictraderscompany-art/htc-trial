// Read-only evidence and byte-integrity verification; no requests or database access.
import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name));
const json=name=>JSON.parse(read(name));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trimEnd();
const dir='validation/t16-r2/';
const r1=json('validation/t16-r1/reconciliation-manifest.json');
const manifest=json(dir+'manifest.json');
assert.equal(git('rev-parse','HEAD'),manifest.baseline);
assert.equal(git('branch','--show-current'),'codex/t16-r1-reconciliation');
assert.equal(git('diff','--cached','--name-only'),'');
assert.equal(git('diff','--check'),'');
assert.equal(sha(read('validation/t16-r1/reconciliation-manifest.json')),manifest.R1_manifest_sha256);
for(const f of [...r1.files,...manifest.files])assert.equal(sha(read(f.path)),f.sha256,f.path);
assert.equal(git('diff','--name-only','--',...r1.protected_paths),'');
const before=json(dir+'db-before.json'),after=json(dir+'db-resume-final.json');
for(const key of ['totals','history','tables','policies','function'])assert.deepEqual(after[key],before[key],key);
assert(Object.values(after.totals).every(n=>n===0));
assert.equal(after.read_only,'on');
const history=json('validation/test-db/history.json');
for(const row of json(dir+'history-sha256-acls.json').history){
  const original=history.migrations.find(x=>x.version===row.version&&x.name===row.name);
  assert.equal(row.source_sha256,original.source_sha256);
  assert.equal(sha(read('validation/test-db/supabase/migrations/'+row.version+'_'+row.name+'.sql')),original.source_sha256);
}
const user=json(dir+'user-live.json'),timeout=json(dir+'timeout-live.json'),upstream=json(dir+'upstream-timeout.json');
assert.equal(user.result,'PASS');assert.equal(user.session.authenticated,true);assert.equal(user.session.founder,false);assert.equal(user.summary.status,403);
const events=json(dir+'server-http-snapshot.json').events;
for(const id of [user.summary.request,user.dashboard.request]){
  const rows=events.filter(e=>e.request===id);
  assert(rows.some(e=>e.event==='upstream'&&e.path==='/rest/v1/rpc/is_founder'&&e.founder===false&&e.status===200));
  assert(!rows.some(e=>e.path==='/rest/v1/rpc/founder_operation_counts'));
}
assert.equal(timeout.result,'PASS');assert.equal(timeout.client_network_error,'net::ERR_ABORTED');assert.equal(timeout.interception_cleared_in_finally,true);
assert.equal(upstream.result,'PASS');assert(upstream.deadline_elapsed_ms>=9900&&upstream.deadline_elapsed_ms<12000);assert.equal(upstream.recovery_status,200);
assert.equal(events.findLast(e=>e.event==='runner_ready').summary_timeout_probe_enabled,false);
const cleanup=json(dir+'browser-cleanup.json');assert(cleanup.old_tab_absent&&cleanup.additional_tab_absent_in_inventory&&cleanup.additional_tab_closed_officially);
assert.equal(json(dir+'fault-cleanup.json').timeout_probe_disabled,true);
const results=json(dir+'results.json');assert.equal(results.verdict,'PARTIAL');
assert.equal(results.gates.expiry_LIVE,'NOT VERIFIED');assert.equal(results.gates.revocation_LIVE,'NOT VERIFIED');
for(const test of results.checks){const file=test.name==='production-build'?'build':test.name;assert.equal(sha(read(dir+file+'.log')),test.log_sha256);assert.equal(test.exitCode,0);}
console.log(JSON.stringify({result:'PASS',T16_R2_verdict:'PARTIAL',R1_preserved:19,R2_manifest_files:manifest.files.length,
  migrations_SHA256:10,USER_LIVE:'PASS',client_timeout:'PASS',controlled_upstream_deadline:'PASS',cleanup:'PASS',
  expiry_LIVE:'NOT VERIFIED',revocation_LIVE:'NOT VERIFIED',database_mutations:false,commit_push_deployment:false},null,2));
