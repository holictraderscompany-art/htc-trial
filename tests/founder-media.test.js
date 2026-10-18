import test from 'node:test';
import assert from 'node:assert/strict';
import {createFounderMediaHandler} from '../src/server/founder-media.js';
import {reconcileUploadAttempt,sendSignedUpload} from '../src/components/founder-direct-upload.js';

const id='00000000-0000-4000-8000-000000000824';
const path=`image/${id}/asset.png`,base='https://uzhkzhmncxjplrdtdzgd.supabase.co';
const env={HTC_SUPABASE_TARGET:'test',SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test'};
const payload={action:'reserve',request_id:id,asset_type:'IMAGE',mime_type:'image/png',original_filename:'fixture.png',byte_size:8};
function request(p=payload,{origin='https://htc.test',cookie='htc_trial_session=synthetic-founder',mime='application/json'}={}){
  return new Request('https://htc.test/api/founder/assets',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':mime},body:JSON.stringify(p)});
}
function fixture({founder=true,authStatus=200,status='PENDING',privateBucket=true,expires=Date.now()+600000,signStatus=200,url=`/object/upload/sign/trial-assets/${path}?token=synthetic-scoped-capability`}={}){
  const calls=[];
  const handler=createFounderMediaHandler({env,fetchImpl:async (urlArg,options)=>{
    calls.push({url:String(urlArg),options});assert.ok(String(urlArg).startsWith(base));
    if(String(urlArg).endsWith('/auth/v1/user'))return Response.json({id},{status:authStatus});
    if(String(urlArg).endsWith('/is_founder'))return Response.json(founder);
    if(String(urlArg).endsWith('/manage_trial_asset'))return Response.json({asset:{id,status,asset_type:'IMAGE',storage_bucket:'trial-assets',storage_path:path,mime_type:'image/png',original_filename:'fixture.png',byte_size:8,expires_at:new Date(expires).toISOString()},bucket_private:privateBucket,object:status==='READY'?{size:8,mime_type:'image/png'}:null});
    if(String(urlArg).includes('/object/upload/sign/'))return Response.json({url},{status:signStatus});
    throw Error('Unexpected network request');
  }});
  return {calls,handler};
}
test('signed upload cookie bridge rejects missing/duplicate session and foreign Origin before network',async()=>{
  for(const [options,status] of [[{origin:'https://evil.test'},403],[{cookie:''},401],[{cookie:'htc_trial_session=a; htc_trial_session=b'},401]]){
    const f=fixture();assert.equal((await f.handler(request(payload,options))).status,status);assert.equal(f.calls.length,0);
  }
});
test('USER and expired session cannot obtain signed capabilities',async()=>{
  for(const [options,status] of [[{founder:false},403],[{authStatus:401},401]]){
    const f=fixture(options);assert.equal((await f.handler(request())).status,status);assert.equal(f.calls.some(c=>c.url.includes('/object/upload/sign/')),false);
  }
});
test('signed capability is only for server-generated path, no upsert, no primary session exposure',async()=>{
  const f=fixture(),r=await f.handler(request());assert.equal(r.status,200);
  const text=await r.text(),data=JSON.parse(text).data;
  assert.equal(data.upload.url,`${base}/storage/v1/object/upload/sign/trial-assets/${path}?token=synthetic-scoped-capability`);
  assert.equal(data.upload.method,'PUT');assert.equal(data.upload.capability_ttl_seconds,7200);
  assert.deepEqual(data.upload.headers,{'Content-Type':'image/png','x-upsert':'false'});
  assert.equal(text.includes('synthetic-founder'),false);assert.equal(text.includes(env.SUPABASE_PUBLISHABLE_KEY),false);
  const sign=f.calls.find(c=>c.url.includes('/object/upload/sign/'));
  assert.equal(sign.options.headers.Authorization,'Bearer synthetic-founder');assert.equal(sign.options.headers['Content-Type'],'image/png');
  assert.equal(sign.options.headers['x-upsert'],'false');assert.equal(sign.options.body,undefined);
  assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('invalid MIME, size, traversal and caller-selected paths fail before reservation/signing',async()=>{
  for(const p of [{...payload,mime_type:'image/svg+xml'},{...payload,byte_size:6000001},{...payload,byte_size:0},{...payload,original_filename:'../x.png'},{...payload,storage_path:'other/file.png'}]){
    const f=fixture();assert.equal((await f.handler(request(p))).status,400);assert.equal(f.calls.some(c=>c.url.endsWith('/manage_trial_asset')),false);
  }
});
test('public bucket, malformed path capability and upstream signing error fail closed',async()=>{
  for(const options of [{privateBucket:false},{signStatus:403},{url:`https://evil.test/object/upload/sign/trial-assets/${path}?token=x`},{url:`/object/upload/sign/trial-assets/image/other/asset.png?token=x`},{url:`/object/upload/sign/trial-assets/${path}?token=x&extra=1`},{url:`/object/upload/sign/trial-assets/${path}?token=synthetic-founder`}]){
    const f=fixture(options),r=await f.handler(request());assert.equal(r.status,500);assert.equal((await r.text()).includes('synthetic-founder'),false);
  }
});
test('expired or READY reservations do not issue another capability',async()=>{
  for(const options of [{expires:Date.now()-1000},{status:'READY'}]){
    const f=fixture(options),r=await f.handler(request());assert.equal(r.status,200);
    assert.equal(Boolean((await r.json()).data.upload),false);assert.equal(f.calls.some(c=>c.url.includes('/object/upload/sign/')),false);
  }
});
test('binary input cannot enter the JSON media bridge',async()=>{
  const f=fixture();assert.equal((await f.handler(request(payload,{mime:'image/png'}))).status,400);
  assert.equal(f.calls.some(c=>c.url.includes('/object/upload/sign/')),false);
});
test('browser sends binary directly to Storage without application cookies or Authorization',async()=>{
  const f=fixture(),reservation=(await (await f.handler(request())).json()).data;
  const file=new File([Uint8Array.from([137,80,78,71,13,10,26,10])],'fixture.png',{type:'image/png'});
  const calls=[];await sendSignedUpload(reservation,file,{fetchImpl:async(url,options)=>{calls.push({url,options});return new Response('{}');}});
  assert.equal(calls.length,1);assert.ok(calls[0].url.startsWith(base+'/storage/v1/object/upload/sign/'));
  assert.equal(calls[0].options.method,'PUT');assert.equal(calls[0].options.credentials,'omit');
  assert.equal(calls[0].options.referrerPolicy,'no-referrer');assert.equal(calls[0].options.headers.Authorization,undefined);
  assert.equal(calls[0].options.body,file);assert.equal(calls[0].options.headers['x-upsert'],'false');
});
test('browser upload rejects invalid capability/size/MIME and never retries an uncertain transfer',async()=>{
  const f=fixture(),reservation=(await (await f.handler(request())).json()).data;
  const file=new File([new Uint8Array(8)],'fixture.png',{type:'image/png'});
  let calls=0;const fetchImpl=async()=>{calls++;return new Response('{}',{status:500});};
  await assert.rejects(sendSignedUpload(reservation,file,{fetchImpl}),/uncertain/);assert.equal(calls,1);
  for(const upload of [{...reservation.upload,method:'POST'},{...reservation.upload,capability_ttl_seconds:60},{...reservation.upload,url:'https://evil.test/u?token=x'},{...reservation.upload,headers:{'Content-Type':'video/mp4','x-upsert':'false'}}]){
    await assert.rejects(sendSignedUpload({...reservation,upload},file,{fetchImpl}));
  }
  assert.equal(calls,1);
});

test('uncertain reservation without an asset id keeps its idempotency identity',async()=>{
  const attempt={requestId:id,fingerprint:'synthetic'};
  assert.equal(await reconcileUploadAttempt(attempt,()=>assert.fail('No exact asset identity yet')),attempt);
});
test('recovery uses the exact protected asset read instead of absence from a page',async()=>{
  const attempt={id,requestId:id},calls=[];
  assert.equal(await reconcileUploadAttempt(attempt,async readId=>{calls.push(readId);return {items:[{id,status:'PENDING'}]};}),attempt);
  assert.deepEqual(calls,[id]);
  assert.equal(await reconcileUploadAttempt(attempt,async()=>{throw Object.assign(Error('Gone'),{status:404});}),null);
});
test('authorization and uncertain read failures cannot clear an upload reservation',async()=>{
  const attempt={id,requestId:id};
  for(const error of [401,403,409,500].map(status=>Object.assign(Error('Unavailable'),{status})).concat(new TypeError('Network failure'))){
    await assert.rejects(reconcileUploadAttempt(attempt,async()=>{throw error;}),error);
    assert.equal(attempt.id,id);
  }
});
