// T15 cases recovered from the mixed T15/T16 suite. LOCAL fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalSqlite} from './local-sqlite-adapter.js';
import {createFounderOperationsHandler} from '../src/server/founder-operations.js';
import {createFounderContentHandler} from '../src/server/founder-content.js';
const assetId='00000000-0000-4000-8000-000000000001';
const missingId='00000000-0000-4000-8000-000000000002';
const draft={action:'create',category:'INFORMATION',title:'T15 synthetic draft',body:'Trial presentation fixture only.'};
const request=(p,role='founder',origin='https://htc.test')=>new Request('https://htc.test/api/founder/operations',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(role==='anonymous'?{}:{Cookie:`htc_trial_session=synthetic-${role}`})},body:JSON.stringify(p)});
async function fixture(t){
  const local=createLocalSqlite({mode:'sqlite'});t.after(()=>local.close());
  const content=createFounderContentHandler(local),operations=createFounderOperationsHandler(local);
  const run=async p=>{const r=await content(request(p));return {status:r.status,...await r.json()};};
  const row=(await run(draft)).data;
  const operation=async(p,role='founder')=>{const r=await operations(request(p,role));return {status:r.status,...await r.json()};};
  const published=async()=>await(await local.fetchImpl(`${local.env.SUPABASE_URL}/rest/v1/rpc/read_released_content`,{body:JSON.stringify({content_id:row.id})})).json();
  return {local,run,row,operation,operations,published};
}
test('LOCAL T15: anonymous, USER and expired sessions cannot release or withdraw',async t=>{
  const f=await fixture(t);
  for(const action of ['release','withdraw'])for(const [role,status] of [['anonymous',401],['user',403],['expired',401]]){
    assert.equal((await f.operation({action,id:f.row.id},role)).status,status);
  }
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
});
test('LOCAL T15: exact Origin, role claims, lifecycle fields and unknown actions fail closed',async t=>{
  const f=await fixture(t);
  assert.equal((await f.operations(request({action:'release',id:f.row.id},'founder','https://evil.test'))).status,403);
  for(const p of [{action:'unknown'},{action:'release',id:f.row.id,role:'FOUNDER'},{action:'release',id:f.row.id,state:'RELEASED'},
    {action:'release',id:'invalid'},{action:'release'},{action:'publish',id:f.row.id}])assert.equal((await f.operation(p)).status,400);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
});
test('LOCAL T15: release, withdrawal and re-release respect public visibility and T13 read-only states',async t=>{
  const f=await fixture(t);
  assert.equal((await f.published()).length,0);
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,200);
  assert.equal((await f.published()).length,1);
  const edit={action:'update',id:f.row.id,category:'INFORMATION',title:'Rejected edit',body:'Rejected edit'};
  assert.equal((await f.run(edit)).status,409);
  assert.equal((await f.operation({action:'withdraw',id:f.row.id})).status,200);
  assert.equal((await f.published()).length,0);
  assert.equal((await f.run(edit)).status,409);
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,200);
  assert.equal((await f.published()).length,1);
});
test('LOCAL T15: missing and duplicate/invalid transitions return controlled404/409',async t=>{
  const f=await fixture(t);
  assert.equal((await f.operation({action:'release',id:missingId})).status,404);
  assert.equal((await f.operation({action:'withdraw',id:f.row.id})).status,409);
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,200);
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,409);
  assert.equal((await f.operation({action:'withdraw',id:f.row.id})).status,200);
  assert.equal((await f.operation({action:'withdraw',id:f.row.id})).status,409);
});
test('LOCAL T15: non-ready linked object prevents release without changing DRAFT',async t=>{
  const f=await fixture(t);f.local.fixture.asset(assetId);
  assert.equal((await f.operation({action:'attach',content_id:f.row.id,asset_id:assetId,role:'PRIMARY'})).status,200);
  f.local.fixture.objectMatch(assetId,false);
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,409);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
  f.local.fixture.objectMatch(assetId,true);
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,200);
  assert.equal((await f.operation({action:'detach',content_id:f.row.id,asset_id:assetId})).status,409);
  assert.equal((await f.operation({action:'delete_asset',id:assetId})).status,409);
});
test('LOCAL T15: rollback preserves data and ambiguous commit requires readback, no automatic retry',async t=>{
  const f=await fixture(t);let checked=0;
  const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>{
    if(String(url).endsWith('/transition_trial_content_checked'))checked++;
    return f.local.fetchImpl(url,options);
  }});
  f.local.fixture.failNextWrite('rollback');
  assert.equal((await handler(request({action:'release',id:f.row.id}))).status,500);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
  f.local.fixture.failNextWrite('after-commit');
  assert.equal((await handler(request({action:'release',id:f.row.id}))).status,500);
  assert.equal(checked,2);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'RELEASED');
  assert.equal((await f.operation({action:'release',id:f.row.id})).status,409);
});
test('LOCAL T15: publishing uses only checked RPC and rejects mismatched server results',async t=>{
  const f=await fixture(t);const paths=[];
  const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>{
    paths.push(new URL(url).pathname);return f.local.fetchImpl(url,options);
  }});
  assert.equal((await handler(request({action:'release',id:f.row.id}))).status,200);
  assert.equal(paths.filter(x=>x.endsWith('/transition_trial_content_checked')).length,1);
  assert.equal(paths.some(x=>x.endsWith('/manage_trial_content')),false);
  const saved=(await f.run({action:'read',id:f.row.id})).data;
  for(const content of [{...saved,id:missingId},{...saved,state:'DRAFT'},{...saved,created_at:null}]){
    const bad=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>String(url).endsWith('/transition_trial_content_checked')?
      Response.json({outcome:'saved',content}):f.local.fetchImpl(url,options)});
    assert.equal((await bad(request({action:'release',id:f.row.id}))).status,500);
  }
});
test('LOCAL T15: unavailable checked RPC returns safe error with no lifecycle mutation',async t=>{
  const f=await fixture(t);
  const unavailable=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>{
    if(String(url).endsWith('/transition_trial_content_checked'))throw Error('private-internal-sentinel');
    return f.local.fetchImpl(url,options);
  }});
  const response=await unavailable(request({action:'release',id:f.row.id}));
  assert.equal(response.status,500);assert.doesNotMatch(await response.text(),/private-internal-sentinel/);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
});
