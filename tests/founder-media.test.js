import test from 'node:test';
import assert from 'node:assert/strict';
import {createFounderMediaHandler,createFounderUploadHandler} from '../src/server/founder-media.js';
import {supabaseConfiguration} from '../src/server/api-foundation.js';
const id='00000000-0000-4000-8000-000000000824';
const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
const env={HTC_SUPABASE_TARGET:'test',SUPABASE_URL:'https://uzhkzhmncxjplrdtdzgd.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test'};
function fixture({founder=true,authStatus=200,status='PENDING',size=8,storageStatus=200,privateBucket=true,expires=Date.now()+600000}={}){
  const calls=[];
  const row={id,status,asset_type:'IMAGE',storage_bucket:'trial-assets',storage_path:`image/${id}/asset.png`,mime_type:'image/png',original_filename:'fixture.png',byte_size:size,expires_at:new Date(expires).toISOString()};
  const dependencies={env,fetchImpl:async(url,options)=>{
    calls.push({url,options});assert.ok(url.startsWith(env.SUPABASE_URL));
    if(url.endsWith('/auth/v1/user'))return Response.json({id},{status:authStatus});
    if(url.endsWith('/is_founder'))return Response.json(founder);
    if(url.endsWith('/manage_trial_asset'))return Response.json({asset:row,bucket_private:privateBucket,object:null});
    if(url.includes('/storage/v1/object/'))return Response.json({ok:true},{status:storageStatus});
    throw Error('Unexpected transport');
  }};
  return {calls,media:createFounderMediaHandler(dependencies),upload:createFounderUploadHandler(dependencies)};
}
function request({origin='https://htc.test',cookie='htc_trial_session=synthetic-founder',mime='image/png',body=png,query=`?id=${id}`}={}){
  return new Request(`https://htc.test/api/founder/assets/upload${query}`,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':mime},body});
}
test('test project requires explicit opt-in and refuses arbitrary target/secret keys',()=>{
  assert.equal(supabaseConfiguration(env).url,env.SUPABASE_URL);
  for(const e of [{...env,HTC_SUPABASE_TARGET:undefined},{...env,SUPABASE_URL:'https://evil.test'},
    {...env,HTC_SUPABASE_TARGET:'production'},{...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_bad'}])assert.throws(()=>supabaseConfiguration(e));
});
test('cookie upload denies wrong Origin and missing/duplicate cookies before network',async()=>{
  for(const [p,status] of [[{origin:'https://evil.test'},403],[{cookie:''},401],[{cookie:'htc_trial_session=a; htc_trial_session=b'},401]]){
    const f=fixture();assert.equal((await f.upload(request(p))).status,status);assert.equal(f.calls.length,0);
  }
});
test('expired identity and USER cannot reserve/upload private objects',async()=>{
  for(const [options,status] of [[{authStatus:401},401],[{founder:false},403]]){
    const f=fixture(options);assert.equal((await f.upload(request())).status,status);
    assert.equal(f.calls.some(c=>c.url.includes('/storage/')),false);
  }
});
test('reservation response exposes only the cookie bridge; never the session token',async()=>{
  const f=fixture();const response=await f.media(new Request('https://htc.test/api/founder/assets',{method:'POST',
    headers:{Origin:'https://htc.test',Cookie:'htc_trial_session=synthetic-founder','Content-Type':'application/json'},
    body:JSON.stringify({action:'reserve',request_id:id,asset_type:'IMAGE',mime_type:'image/png',original_filename:'fixture.png',byte_size:8})}));
  assert.equal(response.status,200);const text=await response.text();const data=JSON.parse(text).data;
  assert.equal(data.upload.url,`/api/founder/assets/upload?id=${id}`);
  assert.equal(text.includes('synthetic-founder'),false);assert.equal(data.upload.headers,undefined);
});
test('bounded upload enforces reservation MIME, size, signature, state and expiry',async()=>{
  for(const [options,p] of [[{}, {mime:'application/pdf'}],[{}, {body:new Uint8Array(9)}],[{}, {body:new Uint8Array(7)}],
    [{},{body:new Uint8Array(8)}],[{status:'READY'},{}],[{expires:Date.now()-1000},{}],[{}, {query:`?id=${id}&extra=1`}]]){
    const f=fixture(options);assert.equal((await f.upload(request(p))).status,400);
    assert.equal(f.calls.some(c=>c.url.includes('/storage/')),false);
  }
});
test('valid cookie upload retains authorization server-side and awaits separate finalize',async()=>{
  const f=fixture();const response=await f.upload(request());assert.equal(response.status,200);
  const data=(await response.json()).data;assert.deepEqual(data,{id,status:'PENDING',uploaded:true});
  const c=f.calls.find(x=>x.url.includes('/storage/'));assert.deepEqual(c.options.body,png);
  assert.equal(c.options.headers.Authorization,'Bearer synthetic-founder');assert.equal(c.options.headers['x-upsert'],'false');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('storage failure and public bucket fail closed without reporting uploaded',async()=>{
  for(const options of [{storageStatus:500},{privateBucket:false}]){
    const response=await fixture(options).upload(request());assert.equal(response.status,500);
    assert.equal((await response.text()).includes('synthetic-founder'),false);
  }
});
