import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createLocalSqlite } from './local-sqlite-adapter.js';
import { createFounderContentHandler } from '../src/server/founder-content.js';
import { createContentHandler } from '../src/server/content-release.js';
import { createContentAssetHandler } from '../src/server/content-assets.js';

const assetId = '00000000-0000-4000-8000-000000000020';
const otherId = '00000000-0000-4000-8000-000000000021';
const draft = { action:'create',category:'INFORMATION',title:'Synthetic draft',body:'Local fixture only' };
function request(payload, role='founder', bearer=false) {
  return new Request('http://localhost:3103/api/founder/content', {method:'POST',
    headers:{'Content-Type':'application/json',Origin:'http://localhost:3103',
      ...(bearer ? {Authorization:`Bearer synthetic-${role}`} : {Cookie:`htc_trial_session=synthetic-${role}`})},body:JSON.stringify(payload)});
}
async function use(t) {
  const root = mkdtempSync(join(tmpdir(),'htc-sqlite-test-'));
  const filename = join(root,'fixture.sqlite');
  const local = createLocalSqlite({mode:'sqlite',filename});
  t.after(() => {
    local.close();
    assert.equal(dirname(resolve(root)),resolve(tmpdir()));
    assert.ok(basename(root).startsWith('htc-sqlite-test-'));
    rmSync(root,{recursive:true});
  }); // Verified unique temp directory owned by this test only.
  const handler = createFounderContentHandler(local);
  const run = async p => {const response=await handler(request(p)); return {status:response.status,...await response.json()};};
  const publishing = createContentHandler('founder',local);
  const publish = async p => {const r=await publishing(request(p,'founder',true));return {status:r.status,...await r.json()};};
  const relations = createContentAssetHandler(local);
  const relation = async p => {const r=await relations(request(p,'founder',true));return {status:r.status,...await r.json()};};
  const row=(await run(draft)).data;
  return {local,filename,handler,run,publish,relation,row};
}
test('LOCAL PASS: explicit mode, fresh database, no network/storage fallback', async t => {
  assert.throws(()=>createLocalSqlite(),/Explicit/);
  const f=await use(t);
  assert.throws(()=>createLocalSqlite({mode:'sqlite',filename:f.filename}),/existing/);
  await assert.rejects(f.local.fetchImpl('https://example.com'),/blocks external/);
  await assert.rejects(f.local.fetchImpl(`${f.local.env.SUPABASE_URL}/storage/v1/object`,{headers:{Authorization:'Bearer synthetic-founder'}}),/Unsupported/);
});
test('LOCAL PASS: shared T13 create/read/update/list and unsupported delete',async t=>{
  const f=await use(t); assert.equal((await f.run({action:'read',id:f.row.id})).data.title,draft.title);
  const p={action:'update',id:f.row.id,category:draft.category,title:'Updated',body:draft.body};
  assert.equal((await f.run(p)).data.title,'Updated');
  assert.equal((await f.run({action:'list',cursor:null})).data.items.length,1);
  assert.equal((await f.run({action:'delete',id:f.row.id})).status,400); // Content deletion is not an approved contract.
  assert.equal((await f.run({...p,state:'RELEASED'})).status,400);
});
test('LOCAL PASS: unchanged server authorization denies USER, expired and unknown fixtures',async t=>{
  const f=await use(t);
  for(const [role,status] of [['user',403],['expired',401],['unknown',401]]) assert.equal((await f.handler(request(draft,role))).status,status);
});
test('LOCAL PASS: release/withdraw guards and public visibility; draft saves conflict',async t=>{
  const f=await use(t);
  const p={action:'update',id:f.row.id,category:draft.category,title:'Denied edit',body:draft.body};
  const publicHandler=createContentHandler('public',f.local);
  const visible=async()=> (await (await publicHandler(new Request('http://localhost:3103/api/content'))).json()).data;
  assert.equal((await visible()).length,0);
  assert.equal((await f.publish({action:'release',id:f.row.id})).status,200);
  assert.equal((await visible()).length,1);
  assert.equal((await f.run(p)).status,409);
  assert.equal((await f.publish({action:'release',id:f.row.id})).status,500);
  assert.equal((await f.publish({action:'withdraw',id:f.row.id})).status,200);
  assert.equal((await visible()).length,0);
  assert.equal((await f.run(p)).status,409);
  assert.equal((await f.publish({action:'withdraw',id:f.row.id})).status,500);
});
test('LOCAL PASS: SQLite rollback and ambiguous committed response require readback',async t=>{
  const f=await use(t); const p={action:'update',id:f.row.id,category:draft.category,title:'Changed',body:draft.body};
  f.local.fixture.failNextWrite('rollback'); assert.equal((await f.run(p)).status,500);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.title,draft.title);
  f.local.fixture.failNextWrite('after-commit'); assert.equal((await f.run(p)).status,500);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.title,'Changed');
});
test('LOCAL PASS: asset metadata fixture CRUD, foreign keys and link uniqueness',async t=>{
  const f=await use(t); f.local.fixture.asset(assetId); f.local.fixture.asset(otherId);
  assert.equal(f.local.fixture.readAsset(assetId).status,'READY');
  const p={action:'attach',content_id:f.row.id,asset_id:assetId,role:'PRIMARY'};
  assert.equal((await f.relation(p)).status,200);
  assert.equal((await f.relation(p)).status,500);
  assert.equal((await f.relation({...p,asset_id:otherId})).status,500);
  assert.throws(()=>f.local.fixture.updateAsset(assetId,'DELETING'),/Detach/);
  assert.throws(()=>f.local.fixture.deleteAsset(assetId),/FOREIGN KEY/);
  assert.equal((await f.relation({action:'detach',content_id:f.row.id,asset_id:assetId})).status,200);
  f.local.fixture.updateAsset(assetId,'DELETING');f.local.fixture.deleteAsset(assetId);
  assert.equal(f.local.fixture.readAsset(assetId),undefined);
  assert.equal(f.local.fixture.counts().relations,0);
});
test('LOCAL PASS: READY/object/thumbnail checks and existing relation edits reset release',async t=>{
  const f=await use(t);f.local.fixture.asset(assetId,'PENDING');f.local.fixture.asset(otherId,'READY','application/pdf');
  const p={action:'attach',content_id:f.row.id,asset_id:assetId,role:'PRIMARY'};
  assert.equal((await f.relation(p)).status,500);
  assert.equal((await f.relation({...p,asset_id:otherId,role:'THUMBNAIL'})).status,500);
  f.local.fixture.updateAsset(assetId,'READY'); await f.publish({action:'release',id:f.row.id});
  assert.equal((await f.relation(p)).status,200);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
  assert.equal((await f.relation({action:'list',content_id:f.row.id})).data.relations.length,1);
});
test('LOCAL PASS: independent SQLite connection serializes writers; drafts remain last-writer-wins',async t=>{
  const f=await use(t);const other=new DatabaseSync(f.filename);
  try {
  other.exec('BEGIN IMMEDIATE');
  const p={action:'update',id:f.row.id,category:draft.category,title:'First',body:draft.body};
  assert.equal((await f.run(p)).status,500);other.exec('ROLLBACK');
  assert.equal((await f.run(p)).status,200);assert.equal((await f.run({...p,title:'Last'})).status,200);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.title,'Last');
  } finally {other.close();}
});
test('LOCAL PASS: missing/invalid records and mismatched object metadata are denied',async t=>{
  const f=await use(t);
  assert.equal((await f.run({action:'read',id:assetId})).status,404);
  assert.equal((await f.run({action:'read',id:'invalid'})).status,400);
  f.local.fixture.asset(assetId,'READY','image/png',false);
  assert.equal((await f.relation({action:'attach',content_id:f.row.id,asset_id:assetId,role:'PRIMARY'})).status,500);
  assert.equal(f.local.fixture.counts().relations,0);
});
test('LOCAL PASS: relation and content edit roll back together',async t=>{
  const f=await use(t);f.local.fixture.asset(assetId);await f.publish({action:'release',id:f.row.id});
  f.local.fixture.failNextWrite('rollback');
  assert.equal((await f.relation({action:'attach',content_id:f.row.id,asset_id:assetId,role:'PRIMARY'})).status,500);
  assert.equal(f.local.fixture.counts().relations,0);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'RELEASED');
});
test('LOCAL PASS: independently committed lifecycle transition cannot bypass draft-only save',async t=>{
  const f=await use(t);const other=new DatabaseSync(f.filename);
  try {
    other.exec('BEGIN IMMEDIATE');
    other.prepare("UPDATE content SET data=json_set(data,'$.state','RELEASED','$.released_at',?) WHERE id=?").run(new Date().toISOString(),f.row.id);
    const p={action:'update',id:f.row.id,category:draft.category,title:'Must not save',body:draft.body};
    assert.equal((await f.run(p)).status,500);
    other.exec('COMMIT');assert.equal((await f.run(p)).status,409);
    assert.equal((await f.run({action:'read',id:f.row.id})).data.title,draft.title);
  } finally {other.close();}
});
test('LOCAL PASS: persisted SQLite pagination uses existing 50-item UI contract',async t=>{
  const f=await use(t);for(let i=0;i<51;i++) await f.run({...draft,title:`Synthetic ${i}`});
  const first=(await f.run({action:'list',cursor:null})).data;
  assert.equal(first.items.length,50);assert.ok(first.next_cursor);
  const second=(await f.run({action:'list',cursor:first.next_cursor})).data;
  assert.equal(second.items.length,2);assert.equal(second.next_cursor,null);
  assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,52);
});
