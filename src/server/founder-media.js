import {ApiError,authorize,reply,supabaseConfiguration} from './api-foundation.js';
import {readSessionToken} from './session-token.js';
import {createAssetHandler,validateAssetRecord,assetSignature,FILE_CAP} from './media-assets.js';

function origin(request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403);
}
function bearerRequest(request,token) {
  const headers=new Headers(request.headers);headers.set('Authorization',`Bearer ${token}`);
  return new Request(request,{headers});
}
// Cookie bridge reuses the authoritative Foundation operations. No token is returned.
export function createFounderMediaHandler(dependencies={}) {
  const handler=createAssetHandler(dependencies);
  return async request=>{
    try{
      if(request.method!=='POST')return reply(405,null,'POST');
      origin(request);
      const response=await handler(bearerRequest(request,readSessionToken(request)));
      if(!response.ok)return response;
      const {data}=await response.json();
      if(data.upload){
        data.upload={url:`/api/founder/assets/upload?id=${data.id}`,method:'POST',max_bytes:FILE_CAP};
      }
      // The existing bearer download capability is not usable from a cookie UI.
      delete data.download;
      return reply(200,data);
    }catch(error){return reply(error instanceof ApiError?error.status:500);}
  };
}

export function createFounderUploadHandler({env=process.env,fetchImpl=fetch}={}) {
  return async request=>{
    try{
      if(request.method!=='POST')return reply(405,null,'POST');
      origin(request);const token=readSessionToken(request);
      const {upstream}=await authorize(new Request(request.url,{headers:{Authorization:`Bearer ${token}`}}),'founder',{env,fetchImpl});
      const url=new URL(request.url),id=url.searchParams.get('id');
      if(url.searchParams.size!==1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??''))throw new ApiError(400);
      const record=await upstream('/rest/v1/rpc/manage_trial_asset',{method:'POST',body:JSON.stringify({payload:{action:'inspect',id}})});
      if(!record)return reply(404);
      const row=validateAssetRecord(record.asset,id);
      if(record.bucket_private!==true)throw new ApiError(500);
      if(row.status!=='PENDING' || !Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at)<=Date.now())throw new ApiError(400);
      if(request.headers.get('content-type')!==row.mime_type || !request.body)throw new ApiError(400);
      const reader=request.body.getReader(),chunks=[];let size=0;
      try{
        while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
          if(size>row.byte_size || size>FILE_CAP){await reader.cancel();throw new ApiError(400);}chunks.push(value);}
      }finally{reader.releaseLock();}
      if(size!==row.byte_size)throw new ApiError(400);
      const bytes=new Uint8Array(size);let offset=0;
      for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      if(!assetSignature(bytes.subarray(0,512),row.mime_type))throw new ApiError(400);
      const config=supabaseConfiguration(env);
      const result=await fetchImpl(`${config.url}/storage/v1/object/trial-assets/${row.storage_path}`,{
        method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${token}`,'Content-Type':row.mime_type,'x-upsert':'false'},
        body:bytes,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
      await result.body?.cancel();
      if(!result.ok)throw new ApiError(500);
      // Separate finalize rechecks object metadata and signature through Foundation.
      return reply(200,{id,status:'PENDING',uploaded:true});
    }catch(error){return reply(error instanceof ApiError?error.status:500);}
  };
}
