// Read-only verification; only writes R1 report JSON. No network/SQL.
import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const git=(cwd,...args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8'}).trimEnd();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const inventoryBytes=fs.readFileSync(new URL('./baseline-inventory.json',import.meta.url));
assert.equal(sha(inventoryBytes),read('./baseline-inventory.sha256').trim());
const inventory=JSON.parse(inventoryBytes),preservation=[];
for(const tree of inventory.worktrees){
 assert.equal(git(tree.root,'rev-parse','HEAD'),tree.head,tree.root);
 assert.equal(git(tree.root,'status','--porcelain=v1','-uall'),tree.status,tree.root);
 for(const f of tree.files)assert.equal(sha(fs.readFileSync(tree.root+'/'+f.path)),f.sha256,tree.root+'/'+f.path);
 preservation.push({root:tree.root,head:tree.head,original_changed_files:tree.files.length,result:'PASS'});
}
const base='94981054f4fa2493205b44919e37802322312c3c';
assert.equal(git(root,'rev-parse','HEAD'),base);
assert.equal(git(root,'branch','--show-current'),'codex/t15-r1-reconciliation');
assert.equal(git(root,'diff','--cached','--name-only'),'');
const protectedPaths=['src/server/api-foundation.js','src/server/session-token.js','src/server/trial-session.js',
 'src/server/founder-content.js','src/components/founder-content-workspace.js','src/server/media-assets.js',
 'src/server/founder-media.js','src/components/founder-direct-upload.js','tests/founder-media.test.js',
 'supabase/migrations','validation/test-db'];
assert.equal(git(root,'diff','--name-only','HEAD','--',...protectedPaths),'');
assert.equal(fs.existsSync(root+'/src/app/founder/operations/page.js'),false);
assert.doesNotMatch(fs.readFileSync(root+'/src/server/founder-operations.js','utf8'),/founder_operation_counts/);
assert.doesNotMatch(fs.readFileSync(root+'/src/components/founder-operation-workspace.js','utf8'),/Operations overview|Snapshot captured:/);
const history=JSON.parse(fs.readFileSync(root+'/validation/test-db/history.json','utf8'));
for(const x of history.migrations){
 const p=`validation/test-db/supabase/migrations/${x.version}_${x.name}.sql`;
 assert.equal(sha(fs.readFileSync(root+'/'+p)),x.source_sha256,p);
 assert.equal(sha(cp.execFileSync('git',['show','HEAD:'+p],{cwd:root})),x.source_sha256,p);
}
const counts=p=>{const s=read(p),n=Number(s.match(/tests (\d+)/)?.[1]);assert.match(s,/fail 0/);return n;};
assert.equal(counts('./application-tests.log'),216);
assert.equal(counts('./t14-sqlite.log'),3);assert.equal(counts('./t13-sqlite.log'),12);
const browser=p=>{const text=read(p),r=JSON.parse(text.split(/### Result\r?\n/)[1].split(/\r?\n###/)[0]);assert.ok(r.results.every(x=>x.result==='LOCAL PASS'));return r;};
const t14=browser('./browser-t14-cli.log'),t15=browser('./browser-publishing-cli.log');
assert.equal(t14.results.length,20);assert.equal(t15.results.length,24);
assert.match(read('./build.log'),/Compiled successfully/);assert.match(read('./build.log'),/Finished TypeScript/);
assert.doesNotMatch(read('./build.log'),/ƒ \/founder\/operations/);
const files=[...new Set([...git(root,'diff','--name-only').split('\n'),...git(root,'ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();
const secretHits=[];
const patterns={jwt:/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
 secretKey:/\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
 privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 credentialUri:/postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s@'"/]+@/};
for(const p of files){const s=fs.readFileSync(root+'/'+p,'utf8');for(const [kind,regex] of Object.entries(patterns))if(regex.test(s))secretHits.push({path:p,kind});}
assert.equal(secretHits.length,0,'Credential pattern hit; values never printed');
const report={scope:'T15-R1 ONLY',verdict:'R1 LOCAL PASS; T15 overall PARTIAL',base,
 inventory_sha256:sha(inventoryBytes),preservation,protected_baseline_paths:protectedPaths,
 original_worktree_file_hashes_verified:preservation.reduce((n,x)=>n+x.original_changed_files,0),
 tests:{application:216,t15_focused_included:8,t14_sqlite:3,t13_sqlite:12,t14_browser:20,t15_browser:24,failures:0},
 build:'PASS; fresh production build, existing Next TypeScript phase PASS',lint:'No standalone lint/typecheck script configured',
 migrations:'10/10 recorded history and exact source hashes; no SQL/database mutation',secret_hits:secretHits,
 limits:['SQLite/browser auth is synthetic LOCAL evidence only','No native PostgreSQL concurrency performed; R2 remains NOT RUN','No genuine authenticated LIVE Publishing performed; R3 remains NOT RUN'],
 cleanup:{browser:'Own isolated Playwright session closed',server:'Own3104 fixture stopped',local_sqlite:'Task-created synthetic fixture retained after automatic approval review rejected deletion: blocked by policy; no alternative deletion attempted',path:'C:/Users/ASUS/AppData/Local/Temp/htc-sqlite-fixture-zm9BIV/fixture.sqlite',t14_server_session:'Untouched'},
 staged_files:0,commit:false,push:false,merge:false,deployment:false,production_access:false,
 security_scan_limit:'Pattern scan is supporting evidence; manual diff/boundary review also performed',
 changed_files:files};
fs.writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(new URL('./browser-t14-results.json',import.meta.url),JSON.stringify(t14,null,2)+'\n');
fs.writeFileSync(new URL('./browser-publishing-results.json',import.meta.url),JSON.stringify(t15,null,2)+'\n');
console.log(JSON.stringify({verdict:report.verdict,tests:report.tests,preserved_worktrees:preservation.length,preserved_changed_files:report.original_worktree_file_hashes_verified,secret_hits:0,migrations:history.migrations.length}));
