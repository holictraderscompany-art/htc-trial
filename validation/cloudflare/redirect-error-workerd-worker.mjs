// Local workerd fixture only: public TEST JWKS GET; no keys, Auth mutations or fixtures.
import { createRedirectErrorFetch } from '../../cloudflare/redirect-error-fetch.mjs';
let consumed=false;
export default {
  async fetch(request) {
    const pathname=new URL(request.url).pathname;
    if(request.method==='GET' && pathname==='/ready') return Response.json({ready:true});
    if(request.method!=='GET' || pathname!=='/probe' || consumed) return new Response(null,{status:409});
    consumed=true;
    const native=globalThis.fetch;
    const health='https://uzhkzhmncxjplrdtdzgd.supabase.co/auth/v1/.well-known/jwks.json';
    let nativeErrorName=null, unsupportedRedirectReported=false;
    try {
      const response=await Reflect.apply(native,globalThis,[health,{redirect:'error',signal:AbortSignal.timeout(15000)}]);
      try {await response.body?.cancel();} catch {}
    } catch(error) {
      nativeErrorName=error instanceof TypeError?'TypeError':'OTHER';
      unsupportedRedirectReported=error instanceof TypeError && /redirect/i.test(error.message);
    }
    const manual=await Reflect.apply(native,globalThis,[health,{redirect:'manual',signal:AbortSignal.timeout(15000)}]);
    const manualStatus=manual.status; const manualKeySetShape=Array.isArray((await manual.json()).keys);
    let adaptedCalls=0, observedMode=null;
    const adapted=createRedirectErrorFetch(function(input,init){adaptedCalls++;observedMode=init.redirect;return Reflect.apply(native,globalThis,[input,init]);});
    const response=await adapted(health,{redirect:'error',signal:AbortSignal.timeout(15000)});
    const adaptedStatus=response.status; const adaptedKeySetShape=Array.isArray((await response.json()).keys);
    const ok=nativeErrorName==='TypeError' && unsupportedRedirectReported && manualStatus===200 && adaptedStatus===200 && manualKeySetShape && adaptedKeySetShape && adaptedCalls===1 && observedMode==='manual';
    return Response.json({ok,nativeErrorName,unsupportedRedirectReported,manualStatus,adaptedStatus,manualKeySetShape,adaptedKeySetShape,adaptedCalls,observedMode,credentialsUsed:false,project:'uzhkzhmncxjplrdtdzgd'},{status:ok?200:500});
  },
};
