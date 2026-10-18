import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {here,manifest,sessions,cmd,json,write,begin,call,transition,relation,deleteBridge,submit,result,blocked,overlap,rollback,browser,snapshotSql,lit} from './native.mjs';
const file='r2d-runtime.json';assert(!fs.existsSync(path.join(here,file)),'Existing runtime; inspect checkpoint, never replay setup');
const a=manifest.assets.find(x=>x.label==='a'),b=manifest.assets.find(x=>x.label==='b');
const contents=manifest.contents.filter(c=>!c.case.startsWith('R3'));
const content=id=>contents.find(c=>c.case===id).id;
const ids=contents.map(c=>lit(c.id)+'::uuid').join(',');
const assetIds=[a,b].map(a=>lit(a.id)+'::uuid').join(',');
const evidence={scope:'T15-R2D native independent sessions and actual TEST Storage',target:manifest.target,status:'RUNNING',sessions,fixtureManifest:manifest,setupAttempted:false,cases:[],cleanup:[],startedAt:new Date().toISOString()};
write(file,evidence);
const outcome=(r,value)=>assert.equal(r.rpc.outcome,value);
async function start(){const A=json(await cmd('A',begin())),B=json(await cmd('B',begin()));assert.equal(A.founder,true);assert.equal(B.founder,true);assert.equal(A.pid,sessions.A.proof.backend_pid);assert.equal(B.pid,sessions.B.proof.backend_pid);return {A,B};}
async function state(id){return json(await cmd('A',`SELECT jsonb_build_object('state',(SELECT state FROM public.trial_content WHERE id=${lit(id)}::uuid),'relations',(SELECT count(*) FROM public.trial_content_assets WHERE content_id=${lit(id)}::uuid),'assets_ready',(SELECT bool_and(status='READY') FROM public.trial_assets WHERE id IN (${assetIds})));`));}
async function race(id,holder,waiter,endA,expected){
  const starts=await start();const held=json(await cmd('A',holder));
  const job=submit('B',waiter),blocking=await blocked(job);
  const done=json(await cmd('A',`${endA}; SELECT jsonb_build_object('completion',${lit(endA)},'at',clock_timestamp());`));
  const waited=json(await result(job));outcome(waited,expected);
  // Waiter never commits a release or an unexpected attachment.
  await cmd('B','ROLLBACK;');
  const final=await state(id);assert.equal(final.state,endA==='COMMIT'?'RELEASED':'DRAFT');assert.equal(final.assets_ready,true);
  return {starts,held,waited,blocking,completion:done,final};
}
let setup=false;
try{
  // A current genuine Founder HTTP receipt is required before native fixture creation.
  const preflight=JSON.parse(fs.readFileSync(path.join(here,'browser-founder-preflight.json')));
  assert(preflight.ok&&preflight.founder&&preflight.authenticated&&preflight.statuses.includes(200));
  const fresh=await browser({id:'r2d_founder_preflight',role:'FOUNDER',type:'api',path:'/api/founder/operations',payload:{action:'assets',cursor:null},expectedStatus:200});evidence.founderHttp=fresh;
  const baseline=json(await cmd('A',snapshotSql));evidence.baseline=baseline;
  assert.equal(baseline.content,0);assert.equal(baseline.assets,0);assert.equal(baseline.relations,0);assert.equal(baseline.objects,0);assert.equal(baseline.history_count,10);
  const pngPath='C:/Users/ASUS/.codex/visualizations/2026/10/10/01a123df-92ce-7e03-ae21-cbf0a442bf94/t14-live-synthetic-20261016.png';
  const png=fs.readFileSync(pngPath);assert.equal(png.length,70);assert.equal(crypto.createHash('sha256').update(png).digest('hex'),manifest.png_sha256);
  evidence.setupAttempted=true;write(file,evidence);setup=true;
  // Administrator seeds explicitly scoped synthetic PENDING rows only. Live
  // Founder authorization, signing, binary upload and finalization remain real.
  await cmd('A',`BEGIN READ WRITE; DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.trial_content WHERE id IN (${ids})) OR EXISTS(SELECT 1 FROM public.trial_assets WHERE id IN (${assetIds}) OR request_id IN (${[a,b].map(a=>lit(a.request_id)+'::uuid').join(',')})) OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trial-assets' AND NOT public) THEN RAISE EXCEPTION 'Fixture collision or bucket mismatch'; END IF; END $$; INSERT INTO public.trial_content(id,category,title,body) VALUES ${contents.map(c=>`(${lit(c.id)}::uuid,'INFORMATION',${lit(manifest.tag+' '+c.case)},${lit(manifest.tag+' '+c.case)})`).join(',')}; INSERT INTO public.trial_assets(id,request_id,asset_type,storage_path,mime_type,original_filename,byte_size) VALUES ${[a,b].map(a=>`(${lit(a.id)}::uuid,${lit(a.request_id)}::uuid,'IMAGE',${lit(a.path)},'image/png',${lit(a.filename)},70)`).join(',')}; COMMIT;`);
  evidence.uploads=[];
  for(const asset of [a,b]){const receipt=await browser({id:'r2d_upload_'+asset.label,role:'FOUNDER',type:'upload',asset,png:png.toString('base64')});
    const readback=json(await cmd('A',`SELECT jsonb_build_object('id',a.id,'request_id',a.request_id,'status',a.status,'bucket',a.storage_bucket,'path',a.storage_path,'mime',a.mime_type,'bytes',a.byte_size,'filename',a.original_filename,'object_count',(SELECT count(*) FROM storage.objects o WHERE o.bucket_id=a.storage_bucket AND o.name=a.storage_path AND o.metadata->>'mimetype'=a.mime_type AND (o.metadata->>'size')::numeric=a.byte_size)) FROM public.trial_assets a WHERE a.id=${lit(asset.id)}::uuid;`));
    assert.equal(readback.status,'READY');assert.equal(readback.object_count,1);assert.equal(readback.request_id,asset.request_id);assert.equal(readback.path,asset.path);assert.equal(readback.filename,asset.filename);evidence.uploads.push({receipt,readback});write(file,evidence);
  }
  await cmd('A',begin());
  for(const c of contents){if(['C4','C5'].includes(c.case))continue;outcome(json(await cmd('A',relation(c.id,a.id))),'saved');if(['C1/E1','C1/E1-secondary','E2/F5'].includes(c.case))outcome(json(await cmd('A',relation(c.id,b.id,'attach','ATTACHMENT'))),'saved');}
  await cmd('A','COMMIT;');
  async function record(id,fn){try{const details=await fn();evidence.cases.push({id,status:'PASS',...details});write(file,evidence);console.log('PASS '+id);}catch(e){evidence.cases.push({id,status:'FAIL',error:e.message});write(file,evidence);throw e;}}
  await record('C1/E1',async()=>{
    const starts=await start();const first=json(await cmd('A',transition(content('C1/E1')))),second=json(await cmd('B',transition(content('C1/E1-secondary'))));outcome(first,'saved');outcome(second,'saved');
    const proof=await overlap();assert(proof.holder_xact_start&&proof.waiter_xact_start);assert.equal(proof.blockers.length,0);
    // Both transactions retain SHARE locks on both assets. A NOWAIT upgrade
    // in each session proves the other transaction's incompatible row lock.
    const probes=[];for(const actor of ['A','B'])for(const asset of [a,b]){
      const p=json(await cmd(actor,`RESET ROLE; DO $$ DECLARE code text; BEGIN BEGIN PERFORM 1 FROM public.trial_assets WHERE id=${lit(asset.id)}::uuid FOR UPDATE NOWAIT; RAISE EXCEPTION 'Expected peer SHARE lock missing'; EXCEPTION WHEN lock_not_available THEN code:=SQLSTATE; END; PERFORM set_config('htc.share_probe',code,true); END $$; SELECT jsonb_build_object('sqlstate',current_setting('htc.share_probe'),'pid',pg_backend_pid(),'at',clock_timestamp()); SET LOCAL ROLE authenticated;`));assert.equal(p.sqlstate,'55P03');probes.push(p);}
    await rollback();const final=await state(content('C1/E1')),other=await state(content('C1/E1-secondary'));assert.equal(final.state,'DRAFT');assert.equal(other.state,'DRAFT');return {starts,first,second,proof,probes,final,other,completion:'ROLLBACK both'};
  });
  await record('C2/D3',async()=>{const r=await race(content('C2/D3'),transition(content('C2/D3')),deleteBridge(a.id),'ROLLBACK','linked_asset');outcome(r.held,'saved');return r;});
  await record('C3/D4',async()=>{const r=await race(content('C3/D4'),deleteBridge(a.id),transition(content('C3/D4')),'ROLLBACK','saved');outcome(r.held,'linked_asset');return r;});
  await record('C4',async()=>{const r=await race(content('C4'),transition(content('C4')),relation(content('C4'),a.id),'COMMIT','not_draft');outcome(r.held,'saved');assert.equal(r.final.relations,0);return r;});
  await record('C5',async()=>{
    const starts=await start();const held=json(await cmd('A',relation(content('C5'),a.id)));outcome(held,'saved');const job=submit('B',transition(content('C5'))),blocking=await blocked(job);await cmd('A','COMMIT;');const waited=json(await result(job));outcome(waited,'saved');await cmd('B','ROLLBACK;');const final=await state(content('C5'));assert.equal(final.state,'DRAFT');assert.equal(final.relations,1);return {starts,held,waited,blocking,final};
  });
  await record('D5/F4',async()=>{
    const starts=await start();await cmd('A',`RESET ROLE; SELECT 1 FROM public.trial_assets WHERE id=${lit(a.id)}::uuid FOR UPDATE; SET LOCAL ROLE authenticated;`);
    const guard=json(await cmd('A',`DO $$ DECLARE code text; BEGIN BEGIN PERFORM public.manage_trial_asset(jsonb_build_object('action','begin_delete','id',${lit(a.id)})); RAISE EXCEPTION 'Linked guard missing'; EXCEPTION WHEN foreign_key_violation THEN code:=SQLSTATE; END; PERFORM set_config('htc.asset_guard',code,true); END $$; SELECT jsonb_build_object('sqlstate',current_setting('htc.asset_guard'),'at',clock_timestamp());`));assert.equal(guard.sqlstate,'23503');
    const job=submit('B',transition(content('D5/F4'))),blocking=await blocked(job);await cmd('A','ROLLBACK;');const waited=json(await result(job));outcome(waited,'saved');await cmd('B','ROLLBACK;');const final=await state(content('D5/F4'));assert.equal(final.state,'DRAFT');assert.equal(final.assets_ready,true);return {starts,guard,blocking,waited,final};
  });
  await record('E2/F5',async()=>{
    const starts=await start();const sorted=[a,b].sort((x,y)=>x.id.localeCompare(y.id)),low=sorted[0],high=sorted[1];
    await cmd('A',`RESET ROLE; SELECT 1 FROM public.trial_assets WHERE id=${lit(high.id)}::uuid FOR UPDATE; SET LOCAL ROLE authenticated;`);
    const job=submit('B',`SET LOCAL lock_timeout='10s'; DO $$ DECLARE code text; BEGIN BEGIN PERFORM public.transition_trial_content_checked(jsonb_build_object('action','release','id',${lit(content('E2/F5'))})); RAISE EXCEPTION 'Expected lock timeout missing'; EXCEPTION WHEN lock_not_available THEN code:=SQLSTATE; END; PERFORM set_config('htc.asset_timeout',code,true); END $$; SELECT jsonb_build_object('sqlstate',current_setting('htc.asset_timeout'),'pid',pg_backend_pid(),'at',clock_timestamp());`);
    const blocking=await blocked(job);
    const order=json(await cmd('A',`RESET ROLE; DO $$ DECLARE code text; BEGIN BEGIN PERFORM 1 FROM public.trial_assets WHERE id=${lit(low.id)}::uuid FOR UPDATE NOWAIT; RAISE EXCEPTION 'Expected lower asset SHARE lock missing'; EXCEPTION WHEN lock_not_available THEN code:=SQLSTATE; END; PERFORM set_config('htc.asset_order',code,true); END $$; SELECT jsonb_build_object('sqlstate',current_setting('htc.asset_order'),'at',clock_timestamp()); SET LOCAL ROLE authenticated;`));assert.equal(order.sqlstate,'55P03');
    const timeout=json(await result(job));assert.equal(timeout.sqlstate,'55P03');await rollback();const final=await state(content('E2/F5'));assert.equal(final.state,'DRAFT');assert.equal(final.assets_ready,true);return {starts,blocking,order,timeout,final,sortedAssetIds:sorted.map(x=>x.id)};
  });
  evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.error=error.message;console.log('STOP '+error.message);}
finally{
  if(setup){try{
    await rollback();await cmd('A',begin());
    // No native relation deletion or illegal lifecycle reset is used.
    const relations=json(await cmd('A',`RESET ROLE; SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(jsonb_build_object('content_id',r.content_id,'asset_id',r.asset_id,'state',c.state)) FROM public.trial_content_assets r JOIN public.trial_content c ON c.id=r.content_id WHERE r.content_id IN (${ids}) AND r.asset_id IN (${assetIds})),'[]'::jsonb)); SET LOCAL ROLE authenticated;`));
    for(const rel of relations.items){assert.equal(rel.state,'DRAFT','STOP: committed linked release needs separate recovery review');outcome(json(await cmd('A',relation(rel.content_id,rel.asset_id,'detach'))),'saved');}await cmd('A','COMMIT;');
    for(const asset of [a,b]){
      const check=json(await cmd('A',`SELECT jsonb_build_object('exists',EXISTS(SELECT 1 FROM public.trial_assets WHERE id=${lit(asset.id)}::uuid AND request_id=${lit(asset.request_id)}::uuid AND storage_path=${lit(asset.path)} AND original_filename=${lit(asset.filename)}),'relations',(SELECT count(*) FROM public.trial_content_assets WHERE asset_id=${lit(asset.id)}::uuid));`));assert.equal(check.relations,0);assert.equal(check.exists,true);
      const receipt=await browser({id:'r2d_cleanup_'+asset.label,role:'FOUNDER',type:'delete',asset});
      const readback=json(await cmd('A',`SELECT jsonb_build_object('assets',(SELECT count(*) FROM public.trial_assets WHERE id=${lit(asset.id)}::uuid),'objects',(SELECT count(*) FROM storage.objects WHERE bucket_id='trial-assets' AND name=${lit(asset.path)}),'relations',(SELECT count(*) FROM public.trial_content_assets WHERE asset_id=${lit(asset.id)}::uuid));`));assert.deepEqual(readback,{assets:0,objects:0,relations:0});evidence.cleanup.push({asset:asset.id,receipt,readback});write(file,evidence);
    }
    await cmd('A',`BEGIN READ WRITE; DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.trial_content WHERE id IN (${ids}) AND body NOT LIKE ${lit(manifest.tag+'%')}) OR EXISTS(SELECT 1 FROM public.trial_content_assets WHERE content_id IN (${ids})) THEN RAISE EXCEPTION 'Ownership or relation mismatch'; END IF; END $$; DELETE FROM public.trial_content WHERE id IN (${ids}) AND body LIKE ${lit(manifest.tag+'%')}; COMMIT;`);
    evidence.after=json(await cmd('A',snapshotSql));assert.deepEqual(evidence.after,evidence.baseline);evidence.preservation=true;
  }catch(error){evidence.status='FAIL';evidence.cleanupError=error.message;evidence.cleanupUncertain=true;console.log('STOP cleanup: '+error.message);}}
  evidence.completedAt=new Date().toISOString();write(file,evidence);console.log(JSON.stringify({status:evidence.status,passed:evidence.cases.filter(c=>c.status==='PASS').length,cleanup:evidence.cleanup.length,preservation:evidence.preservation??false}));if(evidence.status!=='PASS')process.exitCode=1;
}
