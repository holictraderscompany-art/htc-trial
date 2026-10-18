import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export const here=path.dirname(fileURLToPath(import.meta.url));
export const manifest=JSON.parse(fs.readFileSync(path.join(here,'fixture-manifest.json')));
assert.equal(manifest.target,'uzhkzhmncxjplrdtdzgd');
const artifacts='C:/Users/ASUS/.codex/visualizations/2026/10/10/01a123df-92ce-7e03-ae21-cbf0a442bf94';
export const dirs={A:path.join(artifacts,'t15-master-native-20261018-01'),B:path.join(artifacts,'t15-r2c-native-20261018-01')};
export const sessions=Object.fromEntries(Object.entries(dirs).map(([a,d])=>[a,JSON.parse(fs.readFileSync(path.join(d,a+'.ready.json')))]));
for(const [a,p] of Object.entries(sessions)){assert.equal(p.target,manifest.target);assert.equal(p.method,'Direct IPv6');assert.equal(p.proof.backend_ssl,true);assert(!fs.existsSync(path.join(dirs[a],a+'.failure.json')));}
assert.notEqual(sessions.A.proof.backend_pid,sessions.B.proof.backend_pid);
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const lit=s=>"'"+String(s).replaceAll("'","''")+"'";
export const write=(f,o)=>{const p=path.join(here,f);fs.writeFileSync(p+'.tmp',JSON.stringify(o,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
let seq=0;const prefix=Date.now().toString(36);
export function submit(actor,sql){const id='master_'+prefix+'_'+(++seq),d=dirs[actor],file=path.join(d,actor+'.request.json');assert(!fs.existsSync(file),'Pending native request');fs.writeFileSync(file,JSON.stringify({id,sql}),{flag:'wx'});return {actor,id,dispatchedAt:new Date().toISOString()};}
export async function result(job,timeout=40000){const start=Date.now();while(Date.now()-start<timeout){const d=dirs[job.actor];if(fs.existsSync(path.join(d,job.actor+'.failure.json')))throw Error('Native '+job.actor+' failed; no retry');const p=path.join(d,job.actor+'.result-'+job.id+'.json');if(fs.existsSync(p))return {...JSON.parse(fs.readFileSync(p)),dispatchedAt:job.dispatchedAt};await sleep(100);}throw Error('Native timeout '+job.id+'; inspect before retry');}
export const cmd=async(a,sql)=>result(submit(a,sql));
export const json=r=>{const rows=r.lines.filter(s=>s.startsWith('{')).map(s=>JSON.parse(s));assert(rows.length,'Expected JSON');return rows.at(-1);};
export function begin(role='FOUNDER'){
  return `BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE; SET LOCAL lock_timeout='15s'; DO $$ BEGIN IF (SELECT count(*) FROM public.user_profiles WHERE role=${lit(role)})<>1 THEN RAISE EXCEPTION 'TEST role ambiguous'; END IF; PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM public.user_profiles WHERE role=${lit(role)}),true); END $$; SET LOCAL ROLE authenticated; SELECT jsonb_build_object('pid',pg_backend_pid(),'founder',public.is_founder(),'read_only',current_setting('transaction_read_only'),'at',clock_timestamp(),'transaction_start',transaction_timestamp());`;
}
export const call=(name,payload)=>`SELECT jsonb_build_object('rpc',public.${name}(${lit(JSON.stringify(payload))}::jsonb),'sqlstate','00000','at',clock_timestamp(),'pid',pg_backend_pid());`;
export const transition=(id,action='release')=>call('transition_trial_content_checked',{action,id});
export const relation=(content_id,asset_id,action='attach',role='PRIMARY')=>call('manage_trial_content_asset_draft',{action,content_id,asset_id,...(action==='attach'?{role}:{})});
export const deleteBridge=id=>call('delete_trial_asset_for_founder',{action:'delete_asset',id});
export async function overlap(){return json(await cmd('A',`RESET ROLE; SELECT pg_stat_clear_snapshot(); SELECT jsonb_build_object('holder_pid',a.pid,'waiter_pid',b.pid,'holder_backend_start',a.backend_start,'waiter_backend_start',b.backend_start,'holder_xact_start',a.xact_start,'waiter_xact_start',b.xact_start,'wait_event_type',b.wait_event_type,'wait_event',b.wait_event,'waiter_state',b.state,'blockers',pg_blocking_pids(b.pid),'at',clock_timestamp()) FROM pg_stat_activity a CROSS JOIN pg_stat_activity b WHERE a.pid=${sessions.A.proof.backend_pid} AND b.pid=${sessions.B.proof.backend_pid}; SET LOCAL ROLE authenticated;`));}
export async function blocked(job){for(let n=0;n<20;n++){const proof=await overlap();if(proof.wait_event_type==='Lock'&&proof.blockers.includes(sessions.A.proof.backend_pid)){assert(proof.holder_xact_start&&proof.waiter_xact_start);return proof;}if(fs.existsSync(path.join(dirs.B,'B.result-'+job.id+'.json')))throw Error('Expected lock contention absent');await sleep(100);}throw Error('Expected native blocking not observed');}
export async function browser(job,timeout=90000){
  assert(!fs.existsSync(path.join(here,job.id+'.claim.json'))&&!fs.existsSync(path.join(here,job.id+'.receipt.json')),'Browser job already attempted');
  write('active-job.json',job);const start=Date.now();while(Date.now()-start<timeout){const p=path.join(here,job.id+'.receipt.json');if(fs.existsSync(p)){const r=JSON.parse(fs.readFileSync(p));assert.equal(r.authenticated,true);assert.equal(r.founder,job.role!=='USER');assert.equal(r.ok,true,'Browser job failed: '+JSON.stringify(r));return r;}await sleep(300);}throw Error('Browser receipt missing; do not replay job');
}
export async function rollback(){const a=submit('A','ROLLBACK; RESET ROLE;'),b=submit('B','ROLLBACK; RESET ROLE;');await Promise.all([result(a),result(b)]);}
export const snapshotSql=`SELECT jsonb_build_object('content',(SELECT count(*) FROM public.trial_content),'assets',(SELECT count(*) FROM public.trial_assets),'relations',(SELECT count(*) FROM public.trial_content_assets),'objects',(SELECT count(*) FROM storage.objects WHERE bucket_id='trial-assets'),'history_count',(SELECT count(*) FROM supabase_migrations.schema_migrations),'history_hash',(SELECT md5(string_agg(version||name||statements::text,'' ORDER BY version)) FROM supabase_migrations.schema_migrations),'profiles_hash',(SELECT md5(coalesce(string_agg(to_jsonb(x)::text,'' ORDER BY id),'')) FROM public.user_profiles x),'functions_hash',(SELECT md5(string_agg(concat_ws('|',p.oid::text,pg_get_functiondef(p.oid),p.proacl::text),'' ORDER BY p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'),'policies_hash',(SELECT md5(string_agg(to_jsonb(p)::text,'' ORDER BY schemaname,tablename,policyname)) FROM pg_policies p WHERE schemaname IN ('public','storage')),'table_acl_hash',(SELECT md5(string_agg(concat_ws('|',c.oid::text,c.relacl::text,c.relrowsecurity::text,c.relforcerowsecurity::text),'' ORDER BY c.oid)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p')),'defaults_hash',(SELECT md5(coalesce(string_agg(to_jsonb(a)::text,'' ORDER BY oid),'')) FROM pg_default_acl a));`;
