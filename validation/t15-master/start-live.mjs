// Opt-in loopback-only TEST runner. Product authentication/handlers are unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ApiError,authorize,readJson} from '../../src/server/api-foundation.js';
import {readSessionToken} from '../../src/server/session-token.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const target='https://uzhkzhmncxjplrdtdzgd.supabase.co',origin='http://localhost:3103';
const config=JSON.parse(fs.readFileSync('C:/Users/ASUS/.codex/visualizations/2026/10/10/01a123df-92ce-7e03-ae21-cbf0a442bf94/live-test-runtime-public.json'));
if(config.HTC_SUPABASE_TARGET!=='test'||config.SUPABASE_URL!==target||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.SUPABASE_PUBLISHABLE_KEY??''))throw Error('Explicit TEST public configuration required');
Object.assign(process.env,{HTC_SUPABASE_TARGET:'test',SUPABASE_URL:target,SUPABASE_PUBLISHABLE_KEY:config.SUPABASE_PUBLISHABLE_KEY,NEXT_TELEMETRY_DISABLED:'1'});
const manifest=JSON.parse(fs.readFileSync(path.join(here,'fixture-manifest.json')));
const events=[];
const record=e=>{events.push({at:new Date().toISOString(),...e});fs.writeFileSync(path.join(here,'server-http.json'),JSON.stringify({target,events},null,2));};
const transport=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);
  if(![target,origin,'http://127.0.0.1:3103'].includes(url.origin))throw Error('Non-TEST transport blocked');
  const r=await transport(input,options);
  if(url.origin===target){const event={path:url.pathname,method:options?.method??'GET',status:r.status};if(url.pathname==='/rest/v1/rpc/is_founder'){try{const value=await r.clone().json();if(typeof value==='boolean')event.founder=value;}catch{}}record(event);}
  return r;
};
async function identity(req){
  const url=new URL(req.url,origin),headers=new Headers(req.headers);
  headers.set('Authorization',`Bearer ${readSessionToken(new Request(url,{headers}))}`);
  const {upstream}=await authorize(new Request(url,{headers}),'authenticated',{env:process.env,fetchImpl:globalThis.fetch});
  return {authenticated:true,founder:await upstream('/rest/v1/rpc/is_founder',{method:'POST',body:'{}'})===true};
}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end(JSON.stringify(data));};
const require=createRequire(root+'/package.json');
const app=require('next')({dev:false,dir:root,hostname:'localhost',port:3103});await app.prepare();const handle=app.getRequestHandler();
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,origin);res.setHeader('X-HTC-Validation-Target','SUPABASE-TEST-uzhkzhmncxjplrdtdzgd');
  // Reuse the existing T14 read-only diagnostic; the TEST runner itself is opt-in.
  if(req.method==='GET' && url.pathname==='/__t14-session-check') {
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
    return json(res,status,{...safe,status});
  }
  if(url.pathname.startsWith('/__t15-')){
    try{
      if(req.headers.host!=='localhost:3103'||url.search)throw new ApiError(403);
      if(req.method==='GET'&&url.pathname==='/__t15-check'){
        const role=await identity(req);record({event:'browser_identity',...role});return json(res,200,{target:manifest.target,...role});
      }
      if(req.method==='GET'&&url.pathname==='/__t15-command'){
        const file=path.join(here,'active-job.json');const job=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
        return json(res,200,{job});
      }
      if(req.method==='POST'&&['/__t15-receipt','/__t15-claim'].includes(url.pathname)){
        if(req.headers.origin!==origin)throw new ApiError(403);
        const role=await identity(req);
        const body=await readJson(new Request(url,{method:'POST',headers:new Headers(req.headers),body:await new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>20000)reject(new ApiError(400));});req.on('end',()=>resolve(b));})}),20000);
        if(url.pathname==='/__t15-claim'){
          if(!body||Object.keys(body).length!==1||!/^[a-zA-Z0-9_-]{1,80}$/.test(body.jobId))throw new ApiError(400);
          const active=JSON.parse(fs.readFileSync(path.join(here,'active-job.json')));
          if(active.id!==body.jobId||role.founder!==(active.role!=='USER'))throw new ApiError(403);
          const lease=path.join(here,body.jobId+'.claim.json');
          if(fs.existsSync(lease))return json(res,409,{ok:false});
          fs.writeFileSync(lease,JSON.stringify({at:new Date().toISOString(),jobId:body.jobId,...role}),{flag:'wx'});
          return json(res,200,{ok:true});
        }
        if(!body||Object.keys(body).some(k=>!['jobId','ok','statuses','assetId','details','error'].includes(k))||!/^[a-zA-Z0-9_-]{1,80}$/.test(body.jobId)||typeof body.ok!=='boolean'||!Array.isArray(body.statuses)||body.statuses.some(s=>!Number.isInteger(s)||s<100||s>599))throw new ApiError(400);
        if(body.assetId&&!manifest.assets.some(a=>a.id===body.assetId))throw new ApiError(400);
        if(body.error&&!['HTTP_FAILURE','IDENTITY','UPLOAD','UI_TIMEOUT','UNEXPECTED','NETWORK'].includes(body.error))throw new ApiError(400);
        if(body.details&&Object.entries(body.details).some(([k,v])=>!/^[a-z_]{1,40}$/.test(k)||!['boolean','number'].includes(typeof v)))throw new ApiError(400);
        const receipt={at:new Date().toISOString(),...role,...body};const file=path.join(here,body.jobId+'.receipt.json');
        if(fs.existsSync(file))return json(res,409,{ok:false});fs.writeFileSync(file,JSON.stringify(receipt,null,2),{flag:'wx'});return json(res,200,{ok:true});
      }
      if(req.method==='GET'&&url.pathname==='/__t15-live'){
        const html=fs.readFileSync(path.join(here,'browser-harness.html'),'utf8');const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];if(!source)throw Error('Harness script missing');
        const hash=createHash('sha256').update(source).digest('base64');
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; script-src 'sha256-${hash}'; connect-src 'self' ${target}; frame-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`});res.end(html);return;
      }
      return json(res,404,{ok:false});
    }catch(error){return json(res,error instanceof ApiError?error.status:500,{ok:false,authenticated:false});}
  }
  res.on('finish',()=>{if(['/api/founder/operations','/api/founder/content','/api/founder/assets','/founder/publishing'].includes(url.pathname))record({event:'application_response',path:url.pathname,status:res.statusCode,method:req.method});});
  return handle(req,res);
});
server.listen(3103,'127.0.0.1',()=>console.log('T15 TEST runner ready at http://localhost:3103/__t15-live'));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
