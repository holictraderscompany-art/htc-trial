// Run once on the hosted cloud runner after frozen install; never deploys.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
const report={status:'BLOCKED',at:new Date().toISOString(),sha:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,mode:'CLOUD_LOCAL_WORKERD_TEST_PUBLIC_JWKS_GET_ONLY',deployments:0,credentialsUsed:false,secretInputs:false,fixtures:0};
let server, output='';
try {
  if(process.platform!=='linux' || process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_ENVIRONMENT!=='github-hosted' || process.env.GITHUB_REPOSITORY!=='holictraderscompany-art/htc-trial' || process.env.GITHUB_REF!=='refs/heads/codex/cloudflare-workers-preparation' || process.env.GITHUB_RUN_ATTEMPT!=='1') throw new Error('STOP_CLOUD_SCOPE');
  const env={...process.env,WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG_SANITIZE:'true',WRANGLER_SEND_METRICS:'false'};
  for(const key of Object.keys(env)) if(/TOKEN|SECRET|PASSWORD|PUBLISHABLE_KEY|DATABASE_URL|API_KEY|_KEY$/i.test(key)) delete env[key];
  server=spawn('pnpm',['exec','wrangler','dev','--local','--ip','127.0.0.1','--port','3107','--config=validation/cloudflare/redirect-error-workerd.wrangler.jsonc'],{env,detached:true,stdio:['ignore','pipe','pipe']});
  let spawnFailure=false;server.on('error',()=>{spawnFailure=true;});
  const capture=bytes=>{if(output.length<1024*1024) output+=bytes.toString().slice(0,1024*1024-output.length);};
  server.stdout.on('data',capture);server.stderr.on('data',capture);
  let ready=false;
  for(let attempt=0;attempt<60;attempt++) {
    if(spawnFailure || server.exitCode!==null) throw new Error('STOP_WORKERD_STARTUP');
    try {const response=await fetch('http://127.0.0.1:3107/ready',{redirect:'manual',signal:AbortSignal.timeout(500)});if(response.status===200){ready=true;break;}} catch {}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!ready) throw new Error('STOP_WORKERD_READINESS');
  const response=await fetch('http://127.0.0.1:3107/probe',{redirect:'manual',signal:AbortSignal.timeout(50000)});
  const result=await response.json();
  // Copy only the fixture's fixed safe contract; never print raw errors or logs.
  report.result={ok:result.ok,nativeErrorName:result.nativeErrorName,unsupportedRedirectReported:result.unsupportedRedirectReported,manualStatus:result.manualStatus,adaptedStatus:result.adaptedStatus,manualKeySetShape:result.manualKeySetShape,adaptedKeySetShape:result.adaptedKeySetShape,adaptedCalls:result.adaptedCalls,observedMode:result.observedMode};
  if(response.status!==200 || result.ok!==true || result.nativeErrorName!=='TypeError' || result.unsupportedRedirectReported!==true || result.manualStatus!==200 || result.adaptedStatus!==200 || result.manualKeySetShape!==true || result.adaptedKeySetShape!==true || result.adaptedCalls!==1 || result.observedMode!=='manual') throw new Error('STOP_WORKERD_PROOF');
  report.legacyRedirectErrorRejected=true;
  report.compatibilityReadHTTP=200;
  report.status='PASS';
} catch(error) {
  report.status='FAIL_NO_RETRY';report.failedGuard=/^STOP_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'STOP_CONTROLLED_WORKERD_ERROR';process.exitCode=1;
} finally {
  if(server?.pid){try{process.kill(-server.pid,'SIGTERM');}catch{}}
  report.workerOutputSHA256=createHash('sha256').update(output).digest('hex');
  report.finished=new Date().toISOString();
  mkdirSync('.wrangler/htc-test-deployment',{recursive:true});
  writeFileSync('.wrangler/htc-test-deployment/redirect-runtime-report.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
  const safe=JSON.stringify(report);console.log(safe);
  console.log(`::notice title=HTC workerd redirect proof::${safe.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`);
  if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## Native workerd redirect proof\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n`);
}
