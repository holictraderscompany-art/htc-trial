import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalSqlite} from './local-sqlite-adapter.js';
import {createFounderOperationsHandler} from '../src/server/founder-operations.js';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function fixture(t){
  const local=createLocalSqlite({mode:'sqlite'});t.after(()=>local.close());
  const row=(await (await local.fetchImpl(`${local.env.SUPABASE_URL}/rest/v1/rpc/manage_trial_content`,{headers:{Authorization:'Bearer synthetic-founder'},body:JSON.stringify({payload:{action:'create',category:'INFORMATION',title:'T14 fixture',body:'Synthetic only'}})})).json());
  const handler=createFounderOperationsHandler(local);
  const run=async(p,role='founder')=>{const r=await handler(new Request('https://htc.test/api/founder/operations',{method:'POST',headers:{Origin:'https://htc.test',Cookie:`htc_trial_session=synthetic-${role}`,'Content-Type':'application/json'},body:JSON.stringify(p)}));return {status:r.status,...await r.json()};};
  return {local,row,run};
}
test('LOCAL T14: every asset operation denies USER/expired and excludes counts/client roles',async t=>{
  const f=await fixture(t);
  for(const p of [{action:'assets',cursor:null},{action:'asset',id:id(1)},{action:'relations',content_id:f.row.id},{action:'attach',content_id:f.row.id,asset_id:id(1),role:'PRIMARY'},{action:'detach',content_id:f.row.id,asset_id:id(1)},{action:'delete_asset',id:id(1)}]){
    assert.equal((await f.run(p,'user')).status,403);assert.equal((await f.run(p,'expired')).status,401);
  }
  for(const p of [{action:'summary'},{action:'assets',cursor:null,role:'FOUNDER'}])assert.equal((await f.run(p)).status,400);
});
test('LOCAL T14: READY-only roles, duplicate conflict, linked-delete denial and detach',async t=>{
  const f=await fixture(t);f.local.fixture.asset(id(1));f.local.fixture.asset(id(2));f.local.fixture.asset(id(3),'PENDING');
  const p={action:'attach',content_id:f.row.id,asset_id:id(1),role:'PRIMARY'};
  assert.equal((await f.run({...p,asset_id:id(3)})).status,409);
  assert.equal((await f.run(p)).status,200);assert.equal((await f.run(p)).status,409);
  assert.equal((await f.run({...p,asset_id:id(2)})).status,409);
  assert.equal((await f.run({action:'delete_asset',id:id(1)})).status,409);
  assert.equal((await f.run({action:'detach',content_id:f.row.id,asset_id:id(1)})).status,200);
  assert.equal((await f.run({action:'delete_asset',id:id(1)})).status,200);
  assert.equal(f.local.fixture.readAsset(id(1)),undefined);
});
test('LOCAL T14: bounded safe metadata, missing asset, RELEASED/WITHDRAWN relation guards',async t=>{
  const f=await fixture(t);f.local.fixture.asset(id(1));
  const list=(await f.run({action:'assets',cursor:null})).data;assert.equal(list.source,'LOCAL_SQLITE_FIXTURE');assert.equal(list.items.length,1);
  assert.equal(Object.hasOwn(list.items[0],'storage_path'),false);assert.equal((await f.run({action:'asset',id:id(2)})).status,404);
  const p={action:'attach',content_id:f.row.id,asset_id:id(1),role:'ATTACHMENT'};
  for(const state of ['RELEASED','WITHDRAWN']){
    f.local.fixture.seedContent({...f.row,state,released_at:null});
    assert.equal((await f.run(p)).status,409);assert.equal((await f.run({action:'detach',content_id:f.row.id,asset_id:id(1)})).status,409);
  }
});
