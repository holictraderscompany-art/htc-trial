// Real TEST HTTP/UI publishing. Native setup is explicitly synthetic, not OAuth proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {here,manifest,cmd,json,write,browser,snapshotSql,lit,rollback} from './native.mjs';
const filename='r3-runtime.json';assert(!fs.existsSync(path.join(here,filename)),'Inspect existing R3 checkpoint; never replay blindly');
const r2d=JSON.parse(fs.readFileSync(path.join(here,'r2d-runtime.json')));assert.equal(r2d.status,'PASS');assert.equal(r2d.preservation,true);
const main=manifest.contents.find(c=>c.case==='R3'),negative=manifest.contents.find(c=>c.case==='R3-readiness'),pending=manifest.assets.find(a=>a.label==='pending');
const ids=[main,negative].map(c=>lit(c.id)+'::uuid').join(',');
const missing='e8b30c88-2648-4c57-8ac6-cd8a2e84a3f2';
const evidence={target:manifest.target,status:'RUNNING',startedAt:new Date().toISOString(),cases:[],cleanup:[],setupAttempted:false,fixtures:{main,negative,pending,missing},limitations:['Negative readiness relation is a deliberately invalid native administrator TEST fixture. It is not claimed to be creatable through the application.','Ambiguous network failure and delayed-response UI behavior use preserved explicit LOCAL evidence, not manufactured live failures.']};
write(filename,evidence);let setup=false;
const save=()=>write(filename,evidence);
async function record(name,fn){const details=await fn();evidence.cases.push({name,status:'PASS',details});save();console.log('PASS '+name);return details;}
const api=(id,payload,expectedStatus=200,expectedState,path='/api/founder/operations')=>browser({id:'r3_'+id,role:'FOUNDER',type:'api',path,payload,expectedStatus,...(expectedState?{expectedState}:{})});
async function state(content){return json(await cmd('A',`SELECT jsonb_build_object('state',state,'body',body,'title',title,'relations',(SELECT count(*) FROM public.trial_content_assets WHERE content_id=c.id)) FROM public.trial_content c WHERE id=${lit(content.id)}::uuid;`));}
async function publicRead(content,expected){const r=await fetch('http://localhost:3103/api/content?id='+content.id+'&assets=1',{redirect:'error',cache:'no-store'});assert.equal(r.status,expected);const data=await r.json();if(expected===200){assert.equal(data.data.id,content.id);assert.equal(data.data.body,manifest.tag+' '+content.case);assert(!JSON.stringify(data).includes('storage_path'));assert(!JSON.stringify(data).includes('token'));}return {status:r.status,contentId:content.id,visible:expected===200};}
try{
  evidence.baseline=json(await cmd('A',snapshotSql));assert.deepEqual(evidence.baseline,r2d.after);
  await record('Founder current HTTP authorization',()=>api('founder_preflight',{action:'assets',cursor:null}));
  setup=true;evidence.setupAttempted=true;save();
  // No Storage object or READY state is fabricated. The invalid PENDING relation
  // exercises the checked release guard through genuine Founder HTTP.
  await cmd('A',`BEGIN READ WRITE; DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.trial_content WHERE id IN (${ids})) OR EXISTS(SELECT 1 FROM public.trial_assets WHERE id=${lit(pending.id)}::uuid OR request_id=${lit(pending.request_id)}::uuid) THEN RAISE EXCEPTION 'R3 fixture collision'; END IF; END $$; INSERT INTO public.trial_content(id,category,title,body) VALUES ${[main,negative].map(c=>`(${lit(c.id)}::uuid,'INFORMATION',${lit(manifest.tag+' '+c.case)},${lit(manifest.tag+' '+c.case)})`).join(',')}; INSERT INTO public.trial_assets(id,request_id,asset_type,storage_path,mime_type,original_filename,byte_size) VALUES (${lit(pending.id)}::uuid,${lit(pending.request_id)}::uuid,'IMAGE',${lit(pending.path)},'image/png',${lit(pending.filename)},70); INSERT INTO public.trial_content_assets(content_id,asset_id,role) VALUES (${lit(negative.id)}::uuid,${lit(pending.id)}::uuid,'PRIMARY'); COMMIT;`);
  await record('DRAFT private public read',()=>publicRead(main,404));
  await record('Anonymous release and withdrawal denied',async()=>{const results=[];for(const action of ['release','withdraw']){const r=await fetch('http://localhost:3103/api/founder/operations',{method:'POST',headers:{Origin:'http://localhost:3103','Content-Type':'application/json'},body:JSON.stringify({action,id:main.id}),redirect:'error'});await r.body?.cancel();assert.equal(r.status,401);results.push({action,status:r.status});}return results;});
  await record('DRAFT withdrawal rejected',()=>api('invalid_draft_withdraw',{action:'withdraw',id:main.id},409));
  await record('Forbidden role and lifecycle fields rejected',async()=>{const items=[];for(const [name,extra] of [['role',{role:'FOUNDER'}],['state',{state:'RELEASED'}]])items.push(await api('invalid_'+name,{action:'release',id:main.id,...extra},400));return items;});
  await record('Invalid UUID rejected',()=>api('invalid_uuid',{action:'release',id:'invalid'},400));
  await record('Missing content rejected',()=>api('missing_content',{action:'release',id:missing},404));
  await record('Missing asset relation rejected',()=>api('missing_asset',{action:'attach',content_id:main.id,asset_id:missing,role:'PRIMARY'},404));
  await record('Pending asset relation rejected',()=>api('pending_attach',{action:'attach',content_id:main.id,asset_id:pending.id,role:'PRIMARY'},409));
  await record('Actual HTTP non-ready linked release rejected atomically',async()=>{const receipt=await api('pending_release',{action:'release',id:negative.id},409);const committed=await state(negative);assert.equal(committed.state,'DRAFT');assert.equal(committed.relations,1);const publicState=await publicRead(negative,404);return {receipt,committed,publicState};});
  await record('Founder browser release and double submit',async()=>{const receipt=await browser({id:'r3_ui_release',role:'FOUNDER',type:'ui',contentId:main.id,action:'release',doubleSubmit:true});const committed=await state(main);assert.equal(committed.state,'RELEASED');return {receipt,committed,public:await publicRead(main,200)};});
  await record('Repeated release rejected',()=>api('duplicate_release',{action:'release',id:main.id},409));
  const edit={action:'update',id:main.id,category:'INFORMATION',title:'Rejected T15 fixture edit',body:'Rejected T15 fixture edit'};
  await record('T13 RELEASED editing denied',()=>api('released_edit',edit,409,undefined,'/api/founder/content'));
  await record('Founder browser withdrawal',async()=>{const receipt=await browser({id:'r3_ui_withdraw',role:'FOUNDER',type:'ui',contentId:main.id,action:'withdraw',doubleSubmit:true});const committed=await state(main);assert.equal(committed.state,'WITHDRAWN');return {receipt,committed,public:await publicRead(main,404)};});
  await record('Repeated withdrawal rejected',()=>api('duplicate_withdraw',{action:'withdraw',id:main.id},409));
  await record('T13 WITHDRAWN editing denied',()=>api('withdrawn_edit',edit,409,undefined,'/api/founder/content'));
  await record('Authorized re-release and committed readback',async()=>{const receipt=await api('rerelease',{action:'release',id:main.id},200,'RELEASED');const committed=await state(main);assert.equal(committed.state,'RELEASED');assert.equal(committed.body,manifest.tag+' '+main.case);return {receipt,committed,public:await publicRead(main,200)};});
  evidence.status='FOUNDER PASS; USER HTTP pending';
}catch(error){evidence.status='FAIL';evidence.error=error.message;console.log('STOP '+error.message);}
finally{
  if(setup){try{
    await rollback();
    const own=json(await cmd('A',`SELECT jsonb_build_object('assets',(SELECT count(*) FROM public.trial_assets WHERE id=${lit(pending.id)}::uuid AND request_id=${lit(pending.request_id)}::uuid AND storage_path=${lit(pending.path)} AND original_filename=${lit(pending.filename)}),'content',(SELECT count(*) FROM public.trial_content WHERE id IN (${ids}) AND body LIKE ${lit(manifest.tag+'%')}),'negative_state',(SELECT state FROM public.trial_content WHERE id=${lit(negative.id)}::uuid),'objects',(SELECT count(*) FROM storage.objects WHERE bucket_id='trial-assets' AND name=${lit(pending.path)}));`));assert.equal(own.content,2);assert.equal(own.assets,1);assert.equal(own.negative_state,'DRAFT');assert.equal(own.objects,0);
    const detach=await api('cleanup_detach',{action:'detach',content_id:negative.id,asset_id:pending.id});
    const deleted=await browser({id:'r3_cleanup_pending',role:'FOUNDER',type:'delete',asset:pending});
    await cmd('A',`BEGIN READ WRITE; DO $$ BEGIN IF (SELECT count(*) FROM public.trial_content WHERE id IN (${ids}) AND body LIKE ${lit(manifest.tag+'%')})<>2 OR EXISTS(SELECT 1 FROM public.trial_content_assets WHERE content_id IN (${ids})) OR EXISTS(SELECT 1 FROM public.trial_assets WHERE id=${lit(pending.id)}::uuid) OR EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='trial-assets' AND name=${lit(pending.path)}) THEN RAISE EXCEPTION 'STOP: R3 ownership/cleanup mismatch'; END IF; END $$; DELETE FROM public.trial_content WHERE id IN (${ids}) AND body LIKE ${lit(manifest.tag+'%')}; COMMIT;`);
    evidence.cleanup.push({ownership:own,detach,deleted});evidence.after=json(await cmd('A',snapshotSql));assert.deepEqual(evidence.after,evidence.baseline);evidence.preservation=true;
  }catch(error){evidence.status='FAIL';evidence.cleanupError=error.message;evidence.cleanupUncertain=true;console.log('STOP cleanup '+error.message);}}
  evidence.completedAt=new Date().toISOString();save();console.log(JSON.stringify({status:evidence.status,cases:evidence.cases.length,preservation:evidence.preservation??false}));if(evidence.status==='FAIL')process.exitCode=1;
}
