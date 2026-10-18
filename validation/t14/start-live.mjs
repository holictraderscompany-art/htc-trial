// TEST-only local runner; reads existing public TEST configuration, never prints it.
import {readFileSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ApiError,authorize,readJson} from '../../src/server/api-foundation.js';
import {readSessionToken} from '../../src/server/session-token.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
// Opt-in TEST harness diagnostics contain booleans/counts only. Never record
// request URLs, header values, OAuth codes, verifiers, cookies or tokens.
const diagnostic=process.argv.includes('--callback-diagnostic');
const authPreflight=process.argv.includes('--auth-preflight');
const accessCheck=process.argv.includes('--access-check');
const capabilityCheck=process.argv.includes('--capability-check');
let storageProbe=null;
const expiryObservations=[];
const events=[];
function record(event) {
  if(!diagnostic)return;
  events.push({at:new Date().toISOString(),...event});
  writeFileSync(new URL('./callback-diagnostic.json',import.meta.url),JSON.stringify({
    target:'uzhkzhmncxjplrdtdzgd',scope:'TEST harness only; no credential values',events,
  },null,2)+'\n');
}
const file='C:/Users/ASUS/.codex/visualizations/2026/10/10/01a123df-92ce-7e03-ae21-cbf0a442bf94/live-test-runtime-public.json';
const config=JSON.parse(readFileSync(file,'utf8'));
const target='https://uzhkzhmncxjplrdtdzgd.supabase.co';
if(config.HTC_SUPABASE_TARGET!=='test' || config.SUPABASE_URL!==target
  || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.SUPABASE_PUBLISHABLE_KEY??''))throw Error('Approved public TEST configuration unavailable');
Object.assign(process.env,{HTC_SUPABASE_TARGET:'test',SUPABASE_URL:target,
  SUPABASE_PUBLISHABLE_KEY:config.SUPABASE_PUBLISHABLE_KEY,NEXT_TELEMETRY_DISABLED:'1'});
const transport=globalThis.fetch;
globalThis.fetch=(input,options)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);
  if(![target,'http://localhost:3103','http://127.0.0.1:3103'].includes(url.origin))throw Error('Non-TEST network target blocked');
  const response=transport(input,options);
  if(diagnostic && url.pathname==='/rest/v1/rpc/is_founder')return response.then(async result=>{
    let allowed=null;
    try{const value=await result.clone().json();if(typeof value==='boolean')allowed=value;}catch{}
    record({stage:'role_authorization',status:result.status,authoritative_founder:allowed});
    return result;
  });
  if(diagnostic && ['/auth/v1/token','/auth/v1/user','/auth/v1/logout'].includes(url.pathname)) {
    return response.then(result=>{
      record({stage:'auth_transport',path:url.pathname,status:result.status});
      return result;
    },error=>{
      record({stage:'auth_transport',path:url.pathname,error:
        ['TimeoutError','AbortError','TypeError'].includes(error.name)?error.name:'Other'});
      throw error;
    });
  }
  return response;
};
const require=createRequire(root+'/package.json');
const app=require('next')({dev:false,dir:root,hostname:'localhost',port:3103});
await app.prepare();const handle=app.getRequestHandler();
const server=createServer(async(req,res)=>{
  res.setHeader('X-HTC-Validation-Target','SUPABASE-TEST-uzhkzhmncxjplrdtdzgd');
  const url=new URL(req.url,'http://localhost:3103');
  // Read-only diagnosis using the browser's own HttpOnly session. Return only
  // parser state and authoritative authorization booleans, never identity/token
  // values. This endpoint cannot create fixtures, sign uploads or renew a session.
  if(capabilityCheck && req.method==='GET' && url.pathname==='/__t14-session-check') {
    let status=401;
    const safe={target:'uzhkzhmncxjplrdtdzgd',cookie_state:'not_checked',upstream_checked:false,authenticated:null,founder:null};
    try {
      if(req.headers.host!=='localhost:3103'||url.search)throw new ApiError(403);
      const count=(req.headers.cookie??'').split(';').filter(x=>x.trim().startsWith('htc_trial_session=')).length;
      safe.cookie_state=count===0?'missing':count>1?'duplicate':'invalid_format';
      const headers=new Headers(req.headers);
      const token=readSessionToken(new Request(url,{headers}));
      safe.cookie_state='present_valid_format';
      headers.set('Authorization',`Bearer ${token}`);
      safe.upstream_checked=true;
      await authorize(new Request(url,{headers}),'founder',{env:process.env,fetchImpl:globalThis.fetch});
      status=200;safe.authenticated=true;safe.founder=true;
    }catch(error){
      status=error instanceof ApiError?error.status:500;
      if(status===401)safe.authenticated=false;
      if(status===403&&safe.cookie_state==='present_valid_format'){safe.authenticated=true;safe.founder=false;}
    }
    record({stage:'expiry_session_preflight',status,...safe});
    res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});
    res.end(JSON.stringify({...safe,status}));return;
  }
  // TEST-only spelling alias. Keep one canonical page; preserve expiry mode.
  if(capabilityCheck && req.method==='GET' && url.pathname==='/_t14-capability-check') {
    res.writeHead(303,{'Location':`/__t14-capability-check${url.search}`,'Cache-Control':'no-store'});
    res.end();return;
  }
  // Loopback-only, status-only TEST telemetry. This endpoint grants no database
  // or Storage authority and never accepts credential values or free text.
  // Client reports alone cannot establish a LIVE PASS.
  if(capabilityCheck && req.method==='POST' && url.pathname==='/__t14-expiry-evidence') {
    try {
      if(req.headers.host!=='localhost:3103'||req.headers.origin!=='http://localhost:3103'||url.search)throw new ApiError(403);
      const p=await readJson(new Request(url,{method:'POST',headers:new Headers(req.headers),body:req,duplex:'half'}),1024);
      const names=['previous_expiry_fixture_absent','expiry_only_real_founder','owned_fixture','expiry_only_started','expired_reservation_denied','cleanup_response','timed_fixture_cleaned','expired_signed_capability_denied','STOP'];
      const allowed=['at','test','id','status','confirmed','live_source','reservation_expires_at','explicit_token_expiry_reported'];
      const iso=x=>typeof x==='string'&&/^2026-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x));
      if(!p||Array.isArray(p)||Object.keys(p).some(k=>!allowed.includes(k))||!names.includes(p.test)||!iso(p.at)||expiryObservations.length>=64
        ||(Object.hasOwn(p,'id')&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.id))
        ||(Object.hasOwn(p,'status')&&(!Number.isInteger(p.status)||p.status<100||p.status>599))
        ||(Object.hasOwn(p,'reservation_expires_at')&&!iso(p.reservation_expires_at))
        ||['confirmed','live_source','explicit_token_expiry_reported'].some(k=>Object.hasOwn(p,k)&&typeof p[k]!=='boolean'))throw new ApiError(400);
      expiryObservations.push({received_at:new Date().toISOString(),...p});
      writeFileSync(new URL('./final-blocker/expiry-browser-observations.json',import.meta.url),JSON.stringify({
        target:'uzhkzhmncxjplrdtdzgd',trust:'Untrusted browser observations; corroborate HTTP/Storage and database before PASS',events:expiryObservations,
      },null,2)+'\n');
      res.writeHead(204,{'Cache-Control':'no-store'});res.end();return;
    }catch(error){res.writeHead(error instanceof ApiError?error.status:500,{'Cache-Control':'no-store'});res.end();return;}
  }
  if(capabilityCheck && req.method==='GET' && url.pathname==='/__t14-capability-check') {
    const html=readFileSync(new URL('./capability-live.html',import.meta.url),'utf8');
    const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
    if(!script)throw Error('TEST capability script missing');
    const hash=createHash('sha256').update(script.replace(/\r\n?/g,'\n')).digest('base64');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':`default-src 'none'; script-src 'sha256-${hash}'; connect-src 'self' ${target}; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`});
    res.end(html);return;
  }
  if(capabilityCheck && req.method==='POST' && ['/__t14-register-storage-probe','/__t14-storage-check'].includes(url.pathname)) {
    try {
      if(req.headers.host!=='localhost:3103' || req.headers.origin!=='http://localhost:3103')throw new ApiError(403);
      const headers=new Headers(req.headers),cookieRequest=new Request(url,{headers});
      headers.set('Authorization',`Bearer ${readSessionToken(cookieRequest)}`);
      const actorRequest=new Request(url,{headers});
      const registering=url.pathname==='/__t14-register-storage-probe';
      const actor=await authorize(actorRequest,registering?'founder':'authenticated',{env:process.env,fetchImpl:globalThis.fetch});
      if(registering) {
        const p=await readJson(new Request(url,{method:'POST',headers,body:req,duplex:'half'}),128);
        if(!p || Object.keys(p).length!==1 || !/^[0-9a-f-]{36}$/.test(p.id??''))throw new ApiError(400);
        const list=await actor.upstream('/rest/v1/rpc/read_trial_assets_for_founder',{method:'POST',body:JSON.stringify({after_id:null,asset_id:p.id})});
        const asset=list?.items?.[0];
        if(list.source!=='SUPABASE_DATABASE' || list.items.length!==1 || asset.id!==p.id || asset.status!=='READY'
          || asset.asset_type!=='IMAGE' || asset.mime_type!=='image/png' || asset.byte_size!==70
          || !/^t14-cap-[0-9a-f-]{36}\.png$/.test(asset.original_filename))throw new ApiError(400);
        storageProbe={id:asset.id,path:`image/${asset.id}/asset.png`};
        res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({registered:true,id:asset.id}));return;
      }
      if(!storageProbe)throw new ApiError(404);
      const founder=await actor.upstream('/rest/v1/rpc/is_founder',{method:'POST',body:'{}'});
      const result=await globalThis.fetch(`${target}/storage/v1/object/authenticated/trial-assets/${storageProbe.path}`,{
        headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY,Authorization:headers.get('Authorization'),Range:'bytes=0-0'},
        redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
      await result.body?.cancel();
      const safe={test_target:'uzhkzhmncxjplrdtdzgd',asset_id:storageProbe.id,actor_founder:founder===true,upstream_status:result.status,binary_forwarded:false};
      record({stage:'private_storage_probe',...safe});
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(safe));return;
    }catch(error){
      const status=error instanceof ApiError?error.status:500;
      res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({test_target:'uzhkzhmncxjplrdtdzgd',status,error:'TEST probe not completed; no binary or credential returned'}));return;
    }
  }
  // Optional TEST-only browser forms exercise real HttpOnly authorization
  // without copying a cookie/token or supplying any mutable asset payload.
  if(accessCheck && req.method==='GET' && url.pathname==='/__t14-access-check') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});
    res.end('<!doctype html><meta charset="utf-8"><title>T14 TEST authorization checks</title><h1>T14 TEST authorization checks</h1><p>TEST uzhkzhmncxjplrdtdzgd only. API forms send an empty invalid payload. Storage probe reads at most one byte server-side from one Founder-registered synthetic fixture and returns status only. No credential export or asset mutation.</p><form method="post" action="/api/founder/assets"><button>Check asset API authorization</button></form><form method="post" action="/api/founder/operations"><button>Check operations API authorization</button></form><form method="post" action="/__t14-storage-check"><button>Check private Storage authorization</button></form><p><a href="/sign-in">HTC sign in</a> <a href="/founder/assets">Founder asset workspace</a></p>');
    return;
  }
  if(diagnostic && ['/api/founder/assets','/api/founder/operations','/api/founder/content'].includes(url.pathname)) {
    res.on('finish',()=>record({stage:'founder_http_response',path:url.pathname,
      method:req.method,status:res.statusCode}));
  }
  // Optional TEST-only readiness check before starting OAuth. Drain the health
  // response so Node may reuse its verified TLS connection for the callback.
  // No auth request is retried and Foundation's original deadline stays intact.
  if(authPreflight && req.method==='POST' && url.pathname==='/auth/start') {
    const started=performance.now();
    try {
      const health=await transport(`${target}/auth/v1/health`,{headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY},
        cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
      await health.arrayBuffer();
      record({stage:'auth_preflight',status:health.status,elapsed_ms:Math.round(performance.now()-started)});
      if(!health.ok)throw Error('TEST readiness check failed');
    }catch {
      record({stage:'auth_preflight_failed'});
      res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});
      res.end('TEST authentication transport is not ready. No OAuth request was started.');
      return;
    }
  }
  if(diagnostic && url.pathname==='/auth/callback') {
    record({stage:'callback_request',host_is_localhost:req.headers.host==='localhost:3103',
      attempt_count:url.searchParams.getAll('attempt').length,
      code_count:url.searchParams.getAll('code').length,has_error:url.searchParams.has('error'),
      pkce_cookie_name_count:(req.headers.cookie??'').split(';').filter(x=>x.trim().startsWith('htc_trial_pkce=')).length});
    res.on('finish',()=>{
      const cookie=res.getHeader('set-cookie');
      const values=Array.isArray(cookie)?cookie:[String(cookie??'')];
      const location=new URL(String(res.getHeader('location')??'/'),'http://localhost:3103');
      record({stage:'callback_response',status:res.statusCode,
        redirected_to_content:location.pathname==='/content',
        redirected_to_failed_signin:location.pathname==='/sign-in' && location.searchParams.get('error')==='failed',
        session_cookie_set:values.some(x=>x.startsWith('htc_trial_session=') && /; HttpOnly;/.test(x))});
    });
  }
  return handle(req,res);
});
server.listen(3103,'127.0.0.1',()=>console.log('T14 TEST-only live app ready at http://localhost:3103/sign-in'));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
