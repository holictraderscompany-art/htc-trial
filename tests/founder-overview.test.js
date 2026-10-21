// Recovered T16 cases from founder-publishing-overview.test.js, plus focused
// authorization/read-only boundary checks. LOCAL SQLite and synthetic identities only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalSqlite} from './local-sqlite-adapter.js';
import {createFounderOperationsHandler} from '../src/server/founder-operations.js';
import {createFounderContentHandler} from '../src/server/founder-content.js';
const assetId='00000000-0000-4000-8000-000000000001';
const otherId='00000000-0000-4000-8000-000000000002';
const thirdId='00000000-0000-4000-8000-000000000003';
const draft={action:'create',category:'INFORMATION',title:'T16 synthetic draft',body:'Trial presentation fixture only.'};
const request=(p,role='founder',origin='https://htc.test')=>new Request('https://htc.test/api/founder/operations',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(role==='anonymous'?{}:{Cookie:`htc_trial_session=synthetic-${role}`})},body:JSON.stringify(p)});
async function operationFixture(t){
  const local=createLocalSqlite({mode:'sqlite'});t.after(()=>local.close());
  const content=createFounderContentHandler(local),handler=createFounderOperationsHandler(local);
  const run=async p=>{const r=await content(request(p));return {status:r.status,...await r.json()};};
  const row=(await run(draft)).data;
  const operation=async(p,role='founder')=>{const r=await handler(request(p,role));return {status:r.status,...await r.json()};};
  return {local,run,row,operation,handler};
}

test('LOCAL PASS T16: exact grouped counts and truthful empty snapshot',async t=>{
  const f=await operationFixture(t);f.local.fixture.asset(assetId);f.local.fixture.asset(otherId,'PENDING');
  let summary=(await f.operation({action:'summary'})).data;
  assert.deepEqual(summary.content,{DRAFT:1,RELEASED:0,WITHDRAWN:0});assert.deepEqual(summary.assets,{PENDING:1,READY:1,DELETING:0});
  await f.operation({action:'release',id:f.row.id});summary=(await f.operation({action:'summary'})).data;assert.equal(summary.content.RELEASED,1);
  f.local.fixture.clear();summary=(await f.operation({action:'summary'})).data;assert.equal(Object.values(summary.content).reduce((a,b)=>a+b),0);
  assert.deepEqual(summary.assets,{PENDING:0,READY:0,DELETING:0});
});

test('LOCAL PASS T16: missing read-model prerequisites and malformed counts fail closed',async t=>{
  const f=await operationFixture(t);
  const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>{
    if(String(url).endsWith('/founder_operation_counts'))throw Error('private-internal-sentinel');
    return f.local.fetchImpl(url,options);
  }});
  const response=await handler(request({action:'summary'}));assert.equal(response.status,500);assert.doesNotMatch(await response.text(),/private-internal-sentinel/);
  const bad=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>String(url).endsWith('/founder_operation_counts')?
    Response.json({source:'LOCAL_SQLITE_FIXTURE',captured_at:new Date().toISOString(),content:{DRAFT:-1,RELEASED:0,WITHDRAWN:0},assets:{PENDING:0,READY:0,DELETING:0}}):f.local.fetchImpl(url,options)});
  assert.equal((await bad(request({action:'summary'}))).status,500);
});

test('LOCAL T16: anonymous, USER and expired identities are denied before the summary RPC',async t=>{
  const f=await operationFixture(t);let summaryCalls=0;
  const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>{
    if(String(url).endsWith('/founder_operation_counts'))summaryCalls++;
    return f.local.fetchImpl(url,options);
  }});
  for(const [role,status]of[['anonymous',401],['user',403],['expired',401]]){
    const response=await handler(request({action:'summary'},role));assert.equal(response.status,status);
    assert.equal((await response.json()).ok,false);
  }
  assert.equal(summaryCalls,0);
  assert.equal((await handler(request({action:'summary'}))).status,200);
  assert.equal(summaryCalls,1);
});

test('LOCAL T16: exact Origin, method, action fields and query string are enforced',async t=>{
  const f=await operationFixture(t);
  assert.equal((await f.handler(request({action:'summary'},'founder','https://evil.test'))).status,403);
  const missingOrigin=request({action:'summary'});missingOrigin.headers.delete('Origin');
  assert.equal((await f.handler(missingOrigin)).status,403);
  assert.equal((await f.handler(new Request('https://htc.test/api/founder/operations'))).status,405);
  for(const payload of [{action:'summary',role:'FOUNDER'},{action:'summary',state:'RELEASED'},{action:'summary',id:assetId},{action:'unknown'},{}]){
    assert.equal((await f.operation(payload)).status,400);
  }
  const query=new Request('https://htc.test/api/founder/operations?role=FOUNDER',{
    method:'POST',headers:request({action:'summary'}).headers,body:JSON.stringify({action:'summary'})});
  assert.equal((await f.handler(query)).status,400);
});

test('LOCAL T16: repeated summaries are read-only and never enumerate content or storage',async t=>{
  const f=await operationFixture(t);const at=new Date().toISOString();
  f.local.fixture.seedContent({...f.row,id:otherId,state:'RELEASED',released_at:at});
  f.local.fixture.seedContent({...f.row,id:thirdId,state:'WITHDRAWN',released_at:at});
  f.local.fixture.asset(assetId,'PENDING');f.local.fixture.asset(otherId,'READY');f.local.fixture.asset(thirdId,'DELETING');
  const before=f.local.fixture.counts(),paths=[];
  const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>{
    paths.push(new URL(url).pathname);return f.local.fetchImpl(url,options);
  }});
  for(let i=0;i<2;i++){
    const response=await handler(request({action:'summary'}));assert.equal(response.status,200);
    const {data}=await response.json();assert.equal(data.source,'LOCAL_SQLITE_FIXTURE');
    assert.ok(Number.isFinite(Date.parse(data.captured_at)));
    assert.deepEqual(data.content,{DRAFT:1,RELEASED:1,WITHDRAWN:1});
    assert.deepEqual(data.assets,{PENDING:1,READY:1,DELETING:1});
  }
  assert.deepEqual(f.local.fixture.counts(),before);
  assert.equal((await f.run({action:'read',id:f.row.id})).data.state,'DRAFT');
  assert.equal(paths.filter(p=>p.endsWith('/founder_operation_counts')).length,2);
  assert.ok(paths.every(p=>['/auth/v1/user','/rest/v1/rpc/is_founder','/rest/v1/rpc/founder_operation_counts'].includes(p)));
});

test('LOCAL T16: summary projection excludes private fields from the upstream response',async t=>{
  const f=await operationFixture(t),snapshot={source:'SUPABASE_DATABASE',captured_at:new Date().toISOString(),
    content:{DRAFT:1,RELEASED:2,WITHDRAWN:3,private_path:'private-internal-sentinel'},
    assets:{PENDING:4,READY:5,DELETING:6,private_url:'private-internal-sentinel'},
    debug:'private-internal-sentinel'};
  const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>String(url).endsWith('/founder_operation_counts')?
    Response.json(snapshot):f.local.fetchImpl(url,options)});
  const response=await handler(request({action:'summary'}));assert.equal(response.status,200);
  const text=await response.text();assert.doesNotMatch(text,/private-internal-sentinel/);
  const {data}=JSON.parse(text);assert.deepEqual(Object.keys(data),['source','captured_at','content','assets']);
  assert.deepEqual(data.content,{DRAFT:1,RELEASED:2,WITHDRAWN:3});
  assert.deepEqual(data.assets,{PENDING:4,READY:5,DELETING:6});
});

test('LOCAL T16: unknown sources, malformed timestamps and unsafe count schemas are rejected',async t=>{
  const f=await operationFixture(t),valid={source:'SUPABASE_DATABASE',captured_at:new Date().toISOString(),
    content:{DRAFT:0,RELEASED:0,WITHDRAWN:0},assets:{PENDING:0,READY:0,DELETING:0}};
  for(const snapshot of [{...valid,source:'UNVERIFIED'},{...valid,captured_at:'invalid'},
    {...valid,content:{...valid.content,DRAFT:'0'}},
    {...valid,content:{...valid.content,WITHDRAWN:Number.MAX_SAFE_INTEGER+1}},
    {...valid,assets:{...valid.assets,PENDING:null}},
    {...valid,assets:{...valid.assets,DELETING:-1}},
    {...valid,content:null},{...valid,assets:{PENDING:0,READY:0}}]){
    const handler=createFounderOperationsHandler({...f.local,fetchImpl:async(url,options)=>String(url).endsWith('/founder_operation_counts')?
      Response.json(snapshot):f.local.fetchImpl(url,options)});
    assert.equal((await handler(request({action:'summary'}))).status,500);
  }
});
