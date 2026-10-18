import {ApiError,reply,supabaseConfiguration} from './api-foundation.js';
import {readSessionToken} from './session-token.js';
import {createAssetHandler,FILE_CAP} from './media-assets.js';

// JSON-only cookie bridge. Binary transfers go directly to private Storage.
export function createFounderMediaHandler({env=process.env,fetchImpl=fetch}={}) {
  const handler=createAssetHandler({env,fetchImpl});
  return async request=>{
    try {
      if(request.method!=='POST')return reply(405,null,'POST');
      if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403);
      const token=readSessionToken(request),headers=new Headers(request.headers);
      headers.set('Authorization',`Bearer ${token}`);
      const response=await handler(new Request(request,{headers}));
      if(!response.ok)return response;
      const {data}=await response.json();
      if(data.upload) {
        const config=supabaseConfiguration(env),upload=new URL(data.upload.url);
        if(upload.origin!==config.url || !/^\/storage\/v1\/object\/trial-assets\/(image|thumbnail|video|audio|document)\/[0-9a-f-]{36}\/asset\.(png|jpg|webp|mp4|mp3|pdf)$/.test(upload.pathname)
          || upload.search || upload.hash || upload.username || upload.password || !upload.pathname.includes(`/${data.id}/`))throw new ApiError(500);
        const path=upload.pathname.slice('/storage/v1/object/'.length);
        // The current catalog guard requires reservation MIME on the signer's
        // INSERT permission probe. No binary or session credential is returned.
        const signed=await fetchImpl(`${config.url}/storage/v1/object/upload/sign/${path}`,{
          method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${token}`,
            'Content-Type':data.upload.headers['Content-Type'],'x-upsert':'false'},
          cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
        if(!signed.ok){await signed.body?.cancel();throw new ApiError(500);}
        const result=await signed.json();
        if(typeof result.url!=='string')throw new ApiError(500);
        const url=new URL(result.url.startsWith('/object/')?`${config.url}/storage/v1${result.url}`:result.url,config.url);
        if(url.origin!==config.url || url.pathname!==`/storage/v1/object/upload/sign/${path}` || url.username || url.password || url.hash
          || url.searchParams.size!==1 || !url.searchParams.get('token') || url.searchParams.get('token')===token)throw new ApiError(500);
        data.upload={url:url.href,method:'PUT',headers:{'Content-Type':data.upload.headers['Content-Type'],'x-upsert':'false'},max_bytes:FILE_CAP,capability_ttl_seconds:7200};
      }
      delete data.download;
      return reply(200,data);
    }catch(error){return reply(error instanceof ApiError?error.status:500);}
  };
}
