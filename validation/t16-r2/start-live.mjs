// Opt-in local TEST validation only. No application handlers or authentication changes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash} from 'node:crypto';
import {ApiError,authorize} from '../../src/server/api-foundation.js';
import {readSessionToken} from '../../src/server/session-token.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.dirname(fileURLToPath(import.meta.url));
const target='https://uzhkzhmncxjplrdtdzgd.supabase.co',origin='http://localhost:3103';
const config=JSON.parse(fs.readFileSync('C:/Users/ASUS/.codex/visualizations/2026/10/10/01a123df-92ce-7e03-ae21-cbf0a442bf94/live-test-runtime-public.json'));
if(config.HTC_SUPABASE_TARGET!=='test'||config.SUPABASE_URL!==target||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.SUPABASE_PUBLISHABLE_KEY??''))throw Error('Explicit approved TEST configuration required');
Object.assign(process.env,{HTC_SUPABASE_TARGET:'test',SUPABASE_URL:target,SUPABASE_PUBLISHABLE_KEY:config.SUPABASE_PUBLISHABLE_KEY,NEXT_TELEMETRY_DISABLED:'1'});
const previous=path.join(out,'server-http.json');
const saved=fs.existsSync(previous)?JSON.parse(fs.readFileSync(previous)):null;
if(saved&&saved.target!=='uzhkzhmncxjplrdtdzgd')throw Error('Evidence target mismatch');
const context=new AsyncLocalStorage(),events=saved?.events??[];
let requestId=events.reduce((n,e)=>Math.max(n,e.request??0),0);
function record(data){events.push({at:new Date().toISOString(),request:context.getStore()?.id??null,...data});fs.writeFileSync(path.join(out,'server-http.json'),JSON.stringify({target:'uzhkzhmncxjplrdtdzgd',events},null,2)+'\n');}
const transport=globalThis.fetch;
const enableTimeoutProbe=process.argv.includes('--summary-timeout-probe');
globalThis.fetch=async(input,options={})=>{
  const u=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);
  if(u.origin!==target)throw Error('Non-TEST upstream blocked');
  const method=options.method??'GET';
  const allowed=(u.pathname==='/auth/v1/user'&&method==='GET')||
    (u.pathname==='/auth/v1/token'&&method==='POST')||
    (u.pathname==='/rest/v1/user_profiles'&&method==='GET')||
    (['/rest/v1/rpc/is_founder','/rest/v1/rpc/founder_operation_counts'].includes(u.pathname)&&method==='POST');
  if(!allowed)throw Error('Upstream operation outside read-only T16 runner');
  const event={event:'upstream',path:u.pathname,method};
  // Opt-in TEST fault only after the real Foundation Founder check succeeded.
  // The browser supplies no token to this hook; the normal HttpOnly path remains.
  if(enableTimeoutProbe&&context.getStore()?.summaryTimeout&&u.pathname==='/rest/v1/rpc/founder_operation_counts'){
    if(context.getStore()?.founder!==true||!options.signal)throw Error('Founder deadline prerequisite missing');
    record({event:'controlled_fault',path:u.pathname,mode:'summary_upstream_deadline',forwarded_to_database:false});
    await new Promise((resolve,reject)=>{
      const stop=()=>{record({event:'controlled_fault_complete',path:u.pathname,error:'TimeoutError'});reject(new DOMException('Controlled TEST deadline','TimeoutError'));};
      if(options.signal.aborted)stop();else options.signal.addEventListener('abort',stop,{once:true});
    });
  }
  try{const r=await transport(input,options);event.status=r.status;
    if(r.ok&&u.pathname==='/rest/v1/rpc/is_founder'){const v=await r.clone().json();if(typeof v==='boolean'){event.founder=v;if(context.getStore())context.getStore().founder=v;}}
    if(r.ok&&u.pathname==='/rest/v1/rpc/founder_operation_counts'){const v=await r.clone().json();event.summary={source:v.source,captured_at:v.captured_at,content:v.content,assets:v.assets};}
    record(event);return r;
  }catch(error){record({...event,error:['TimeoutError','AbortError','TypeError'].includes(error.name)?error.name:'Other'});throw error;}
};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end(JSON.stringify(data));};
const require=createRequire(root+'/package.json');
const app=require('next')({dev:false,dir:root,hostname:'localhost',port:3103});await app.prepare();const handle=app.getRequestHandler();
const server=createServer((req,res)=>context.run({id:++requestId,summaryTimeout:req.method==='POST'&&req.url==='/api/founder/operations'&&req.headers['x-htc-t16-fault']==='summary-timeout'},async()=>{
  const url=new URL(req.url,origin),id=context.getStore().id;
  // Reject unknown Host before handling cookies or contacting any upstream.
  if(req.headers.host!=='localhost:3103'&&req.headers.host!=='127.0.0.1:3103')return json(res,403,{ok:false});
  res.setHeader('X-HTC-Validation-Target','SUPABASE-TEST-uzhkzhmncxjplrdtdzgd');
  res.on('finish',()=>{if(!url.pathname.startsWith('/_next/'))record({event:'http',request:id,path:url.pathname,method:req.method,status:res.statusCode});});
  if(req.method==='GET'&&url.pathname==='/__t16-live'&&!url.search){
    const sourceHtml=fs.readFileSync(path.join(out,'live.html'),'utf8');
    const html=enableTimeoutProbe?sourceHtml:sourceHtml.replace('<button id="timeout">','<button id="timeout" disabled>');
    const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; script-src 'sha256-${createHash('sha256').update(script).digest('base64')}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`});return res.end(html);
  }
  if(req.method==='GET'&&url.pathname==='/__t16-session-check'){
    let status=401;const safe={target:'uzhkzhmncxjplrdtdzgd',authenticated:false,founder:false,upstream_checked:false};
    try{if(req.headers.host!=='localhost:3103'||url.search)throw new ApiError(403);
      const headers=new Headers(req.headers);headers.set('Authorization',`Bearer ${readSessionToken(new Request(url,{headers}))}`);safe.upstream_checked=true;
      const {upstream}=await authorize(new Request(url,{headers}),'authenticated',{env:process.env,fetchImpl:globalThis.fetch});
      safe.authenticated=true;safe.founder=await upstream('/rest/v1/rpc/is_founder',{method:'POST',body:'{}'})===true;status=200;
    }catch(error){status=error instanceof ApiError?error.status:500;}
    record({event:'session',status,...safe});return json(res,status,{status,...safe});
  }
  // Only summary is permitted. Existing mutation APIs are never exercised by this runner.
  if(req.method==='POST'&&url.pathname.startsWith('/api/founder/')){
    if(url.pathname!=='/api/founder/operations')return json(res,403,{ok:false});
    // Do not consume or rewrite Next's request stream. The upstream allowlist
    // above permits only is_founder/count reads, so all mutations fail closed.
  }
  if(req.method==='POST'&&url.pathname==='/auth/sign-out')return json(res,403,{ok:false,message:'Personal session revocation prohibited in T16-R2'});
  return handle(req,res);
}));
server.listen(3103,'127.0.0.1',()=>{record({event:'runner_ready',summary_timeout_probe_enabled:enableTimeoutProbe});console.log('T16-R2 TEST read-only runner ready at http://localhost:3103/__t16-session-check');});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
