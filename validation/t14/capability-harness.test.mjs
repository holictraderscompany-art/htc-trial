// LOCAL harness tests only. Never authenticate or call Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('./capability-live.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const id='11111111-1111-4111-8111-111111111111';
function harness({oldStatus=404,authStatus=200,cleanupStatus=200,expiryMessage='"exp" claim timestamp check failed'}={}){
  let now=Date.parse('2026-10-17T00:00:00Z'),timer;
  const elements=new Map(),requests=[];
  const element=key=>{if(!elements.has(key))elements.set(key,{hidden:false,disabled:false,textContent:'',value:''});return elements.get(key);};
  class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const context=vm.createContext({
    URL,Uint8Array,Blob,AbortSignal,atob,Date:Clock,
    crypto:{randomUUID:()=>id},location:{href:'http://localhost:3103/__t14-capability-check?mode=token-expiry-only'},
    document:{getElementById:element,querySelector:()=>element('label'),querySelectorAll:()=>[element('p0'),element('p1')]},
    setInterval:fn=>{timer=fn;},addEventListener:()=>{},
    fetch:async(input,options={})=>{
      const url=String(input),p=options.body&&typeof options.body==='string'?JSON.parse(options.body):null;
      requests.push({url,p,options});
      if(url==='/__t14-expiry-evidence')return new Response(null,{status:204});
      if(url.startsWith('https://'))return Response.json({error:'InvalidJWT',message:expiryMessage},{status:400});
      let status=200,data;
      if(p.action==='asset')status=oldStatus;
      if(p.action==='assets'){status=authStatus;data={source:'SUPABASE_DATABASE',items:[]};}
      if(p.action==='reserve')data={id,status:'PENDING',expires_at:new Date(now+600000).toISOString(),upload:{url:`https://uzhkzhmncxjplrdtdzgd.supabase.co/storage/v1/object/upload/sign/trial-assets/image/${id}/asset.png?token=LOCAL_MOCK_ONLY`,method:'PUT',capability_ttl_seconds:7200,headers:{'x-upsert':'false','Content-Type':'image/png'}}};
      if(p.action==='delete_asset'){status=cleanupStatus;data={confirmed:status===200};}
      return Response.json({ok:status===200,data},{status});
    },
  });
  vm.runInContext(script,context);
  return {context,elements,requests,start:()=>element('expiry-only').onclick(),advance:async ms=>{
    now+=ms;timer();for(let n=0;n<12;n++)await new Promise(resolve=>setImmediate(resolve));
  }};
}
test('token-only reserves one path, immediately cleans it, then probes once after7200s',async()=>{
  const h=harness();await h.start();
  assert.equal(h.requests.filter(x=>x.p?.action==='reserve').length,1);
  assert.equal(h.requests.filter(x=>x.p?.action==='delete_asset').length,1);
  assert.equal(h.requests.filter(x=>x.url.startsWith('https://')).length,0);
  await h.advance(7204000);
  assert.equal(h.requests.filter(x=>x.url.startsWith('https://')).length,0);
  await h.advance(1001);
  const uploads=h.requests.filter(x=>x.url.startsWith('https://'));
  assert.equal(uploads.length,1);assert.equal(uploads[0].options.credentials,'omit');
  assert.match(h.elements.get('results').textContent,/"explicit_token_expiry_reported": true/);
  await h.advance(60000);await h.start();
  assert.equal(h.requests.filter(x=>x.url.startsWith('https://')).length,1);
  assert.equal(h.requests.filter(x=>x.p?.action==='reserve').length,1);
});
test('existing previous fixture blocks reserve',async()=>{
  const h=harness({oldStatus:200});await h.start();
  assert.equal(h.requests.some(x=>x.p?.action==='reserve'),false);
  assert.match(h.elements.get('results').textContent,/STOP/);
});
test('unauthenticated caller cannot reserve',async()=>{
  const h=harness({authStatus:401});await h.start();
  assert.equal(h.requests.some(x=>x.p?.action==='reserve'),false);
});
test('failed cleanup cannot proceed to token PUT',async()=>{
  const h=harness({cleanupStatus:401});await h.start();await h.advance(7300000);
  assert.equal(h.requests.some(x=>x.url.startsWith('https://')),false);
});
test('generic InvalidJWT/signature/reservation errors are not expiry evidence',()=>{
  const h=harness();
  for(const message of ['Invalid JWT','signature verification failed','No active asset reservation','Malformed token']){
    h.context.sample={error:'InvalidJWT',message};
    assert.equal(vm.runInContext('explicitTokenExpiry(sample)',h.context),false);
  }
  for(const sample of [{error:'ExpiredToken'},{error:'InvalidJWT',message:'"exp" claim timestamp check failed'},{error:'InvalidJWT',message:'JWT has expired'}]){
    h.context.sample=sample;assert.equal(vm.runInContext('explicitTokenExpiry(sample)',h.context),true);
  }
});
test('ambiguous actual response stops without retry or claiming expiry',async()=>{
  const h=harness({expiryMessage:'signature verification failed'});await h.start();await h.advance(7205001);await h.advance(60000);
  assert.equal(h.requests.filter(x=>x.url.startsWith('https://')).length,1);
  assert.match(h.elements.get('results').textContent,/"explicit_token_expiry_reported": false/);
  assert.match(h.elements.get('results').textContent,/STOP/);
});
