// Read-only T16-R1 candidate check. No report generation, network or database calls.
// Run: node validation/t16-r1/verify-reconciliation.mjs
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trimEnd();
const baseline='510d94473d9ddd42f774472f6ebd2423764a66b1';
git('merge-base','--is-ancestor',baseline,'HEAD');
const manifest=json('validation/t16-r1/reconciliation-manifest.json');
assert.equal(manifest.baseline,baseline);
assert.equal(manifest.manifest_self_excluded,true);
const paths=new Set(manifest.files.map(f=>f.path));
assert.equal(paths.size,manifest.files.length);
for(const file of manifest.files){
  assert(!path.isAbsolute(file.path)&&!file.path.split('/').includes('..'));
  assert.equal(sha(read(file.path)),file.sha256,file.path);
}
paths.add('validation/t16-r1/reconciliation-manifest.json');
const changed=[git('diff',baseline,'--name-only'),git('ls-files','--others','--exclude-standard')]
  .flatMap(s=>s.split('\n').filter(Boolean));
assert(changed.every(p=>paths.has(p)),'Uninventoried change');
assert.equal(git('diff',baseline,'--name-only','--',...manifest.protected_paths),'');
const basePackage=JSON.parse(git('show',baseline+':package.json'));
assert.deepEqual(json('package.json').dependencies,basePackage.dependencies);
const server=read('src/server/founder-operations.js').toString().replaceAll('\r\n','\n');
const start=server.indexOf("      if(p.action==='summary') {"),end=server.indexOf("      if(['assets','asset'].includes(p.action)) {",start);
assert(start>=0&&end>start);
const withoutSummary=(server.slice(0,start)+server.slice(end)).replace(",summary:['action']",'');
assert.equal(withoutSummary.trimEnd(),git('show',baseline+':src/server/founder-operations.js').replaceAll('\r\n','\n'));
assert.match(read('tests/local-sqlite-adapter.js').toString(),/Invalid checked transition/);
assert.match(read('src/components/founder-operation-workspace.js').toString(),/reconcileUploadAttempt\(attempt.current/);
const history=json('validation/test-db/history.json');
assert.equal(history.project_id,'uzhkzhmncxjplrdtdzgd');assert.equal(history.migrations.length,10);
for(const row of history.migrations)assert.equal(sha(read('validation/test-db/supabase/migrations/'+row.version+'_'+row.name+'.sql')),row.source_sha256);
const results=json('validation/t16-r1/results.json');
assert.equal(results.verdict,'LOCAL PASS');
assert.deepEqual(results.tests.map(c=>[c.name,c.tests,c.exitCode]),[
  ['t16-focused',7,0],['application',223,0],['t13-sqlite',12,0],['t14-sqlite',3,0],['build',null,0]]);
const browser=json('validation/t16-r1/browser-results.json');
assert.equal(browser.results.length,36);assert(browser.results.every(r=>r.result==='LOCAL PASS'));
assert.equal(results.database_access,false);assert.equal(results.live_acceptance,'NOT TESTED — outside T16-R1');
console.log(JSON.stringify({result:'LOCAL PASS',baseline,manifest_files:manifest.files.length,
  T15_handler_unchanged_except_summary:true,recorded_SQL_hashes:10,focused:7,application:223,
  T13_SQLite:12,T14_SQLite:3,browser:36,build:'PASS',database_access:false},null,2));
