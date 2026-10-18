import { ApiError, authorize, readJson, reply } from './api-foundation.js';
import { readSessionToken } from './session-token.js';
import { projectFounderContent } from './founder-content.js';
import { FILE_CAP } from './media-assets.js';
import {createFounderMediaHandler} from './founder-media.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keys = { assets:['action','cursor'], asset:['action','id'], delete_asset:['action','id'],
  relations:['action','content_id'], attach:['action','content_id','asset_id','role'],
  detach:['action','content_id','asset_id'], release:['action','id'],withdraw:['action','id'] };
const source = value => ['LOCAL_SQLITE_FIXTURE','SUPABASE_DATABASE'].includes(value);
const headers = () => reply(400).headers;
function conflict(message) {
  return Response.json({ok:false,error:{code:'CONFLICT',message}}, {status:409,headers:headers()});
}
function asset(row) {
  if (!row || !uuid.test(row.id ?? '') || !['PENDING','READY','DELETING'].includes(row.status) ||
    !['IMAGE','THUMBNAIL','VIDEO','AUDIO','DOCUMENT'].includes(row.asset_type) ||
    !['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','application/pdf'].includes(row.mime_type) ||
    !Number.isInteger(row.byte_size) || row.byte_size < 1 || row.byte_size > FILE_CAP ||
    typeof row.original_filename !== 'string' || row.original_filename.includes('..') || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(row.original_filename)) throw new ApiError(500);
  return Object.fromEntries(['id','status','asset_type','mime_type','byte_size','original_filename'].map(k=>[k,row[k]]));
}
// L3 read/operation contracts fail closed until their Supabase RPC prerequisites exist.
// Local tests inject transport; production routes never choose SQLite or fixture auth.
export function createFounderOperationsHandler(dependencies) {
  return async request => {
    try {
      if (request.method !== 'POST') return reply(405,null,'POST');
      const url=new URL(request.url);
      if(request.headers.get('origin') !== url.origin) throw new ApiError(403);
      const {upstream}=await authorize(new Request(request.url,{headers:{Authorization:`Bearer ${readSessionToken(request)}`}}),'founder',dependencies);
      const p=await readJson(request,2048);
      if(url.search || !p || !Object.hasOwn(keys,p.action) || Object.keys(p).length!==keys[p.action].length || keys[p.action].some(k=>!Object.hasOwn(p,k))) throw new ApiError(400);
      for(const k of ['id','content_id','asset_id']) if(Object.hasOwn(p,k) && !uuid.test(p[k] ?? '')) throw new ApiError(400);
      if(p.action==='assets' && p.cursor!==null && !uuid.test(p.cursor ?? '')) throw new ApiError(400);
      if(p.action==='attach' && !['PRIMARY','THUMBNAIL','ATTACHMENT'].includes(p.role)) throw new ApiError(400);
      const rpc=(name,args)=>upstream(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(args)});
      if(['assets','asset'].includes(p.action)) {
        const r=await rpc('read_trial_assets_for_founder',{after_id:p.action==='assets'?p.cursor:null,asset_id:p.action==='asset'?p.id:null});
        if(!source(r?.source) || !Array.isArray(r.items) || r.items.length>51) throw new ApiError(500);
        const items=r.items.map(asset);let prev=p.cursor??'';
        for(const a of items) {if(a.id<=prev || (p.action==='asset' && a.id!==p.id))throw new ApiError(500);prev=a.id;}
        if(p.action==='asset' && items.length===0)return reply(404);
        return reply(200,{source:r.source,items:items.slice(0,50),next_cursor:items.length===51?items[49].id:null});
      }
      if(p.action==='relations') {
        const r=await rpc('manage_trial_content_asset',{payload:{action:'list',content_id:p.content_id}});
        if(r===null)return reply(404);
        if(r.content_id!==p.content_id || !Array.isArray(r.relations) || r.relations.length>100)throw new ApiError(500);
        const relations=r.relations.map(x=>{
          if(!uuid.test(x.id??'') || !uuid.test(x.asset_id??'') || x.content_id!==p.content_id || !['PRIMARY','THUMBNAIL','ATTACHMENT'].includes(x.role))throw new ApiError(500);
          return {id:x.id,content_id:x.content_id,asset_id:x.asset_id,role:x.role};
        });
        if(new Set(relations.map(x=>x.asset_id)).size!==relations.length || ['PRIMARY','THUMBNAIL'].some(role=>relations.filter(x=>x.role===role).length>1))throw new ApiError(500);
        return reply(200,{relations});
      }
      const r=await rpc(['release','withdraw'].includes(p.action)?'transition_trial_content_checked':p.action==='delete_asset'?'delete_trial_asset_for_founder':'manage_trial_content_asset_draft',{payload:p});
      if(p.action==='delete_asset' && r?.outcome==='storage_delete_required' && r.id===p.id) {
        const result=await createFounderMediaHandler(dependencies)(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify({action:'delete',id:p.id})}));
        if(!result.ok)return result;
        const data=(await result.json()).data;
        if(data.id!==p.id || data.deleted!==true)throw new ApiError(500);
        return reply(200,{confirmed:true});
      }
      if(r?.outcome==='not_found')return reply(404);
      if(['not_draft','invalid_transition','asset_not_ready','linked_asset','relation_conflict'].includes(r?.outcome))return conflict('Operation rejected. Reload the current content and asset state.');
      if(r?.outcome!=='saved')throw new ApiError(500);
      if(['release','withdraw'].includes(p.action)) {
        const content=projectFounderContent(r.content,p.id);
        if(content.state!==(p.action==='release'?'RELEASED':'WITHDRAWN'))throw new ApiError(500);
        return reply(200,{content});
      }
      if(p.action==='delete_asset') {
        if(r.id!==p.id || r.deleted!==true)throw new ApiError(500);
      }else if(!uuid.test(r.relation?.id??'') || r.relation?.content_id!==p.content_id || r.relation?.asset_id!==p.asset_id ||
        !['PRIMARY','THUMBNAIL','ATTACHMENT'].includes(r.relation?.role) || (p.action==='attach' && r.relation.role!==p.role))throw new ApiError(500);
      return reply(200,{confirmed:true});
    }catch(error){return reply(error instanceof ApiError?error.status:500);}
  };
}
