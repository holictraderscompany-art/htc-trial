'use client';
import {createElement as h,useEffect,useRef,useState} from 'react';

export default function FounderOperationWorkspace({kind}) {
  const [contents,setContents]=useState([]),[assets,setAssets]=useState([]),[relations,setRelations]=useState([]);
  const [contentId,setContentId]=useState(''),[assetId,setAssetId]=useState(''),[role,setRole]=useState('PRIMARY');
  const [summary,setSummary]=useState(null),[source,setSource]=useState(''),[busy,setBusy]=useState(true),[blocked,setBlocked]=useState(false);
  const [message,setMessage]=useState('Loading snapshot…'),[stale,setStale]=useState(false),[cursor,setCursor]=useState(null),[contentCursor,setContentCursor]=useState(null);
  const pending=useRef(false),mounted=useRef(false);
  const [uploadFile,setUploadFile]=useState(null),[uploadType,setUploadType]=useState('IMAGE');
  async function call(payload,content=false,media=false) {
    const response=await fetch(media?'/api/founder/assets':content?'/api/founder/content':'/api/founder/operations',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error',body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
    const result=await response.json();
    if(!response.ok || result.ok!==true) {
      if([401,403].includes(response.status)){setContents([]);setAssets([]);setRelations([]);setSummary(null);setBlocked(true);}
      const error=Error(response.status===401?'Session expired. Sign in again.':response.status===403?'Access denied.':response.status===400?'Check the selected fields.':response.status===409?'Operation rejected. Reload current state.':'Unavailable. Reload before trying again.');
      error.status=response.status;throw error;
    }
    return result.data;
  }
  async function run(operation,mutation=false) {
    if(pending.current)return;pending.current=true;setBusy(true);setMessage('Working…');
    try{await operation();}
    catch(error){setStale(true);setMessage([400,401,403,409].includes(error.status)?error.message:mutation?'Operation result is uncertain. Reload before retrying.':'Unavailable. Reload before trying again.');if(mutation && error.status!==400)setBlocked(true);}
    finally{pending.current=false;setBusy(false);}
  }
  async function load() {
    const data=await call({action:'summary'});setSummary(data);setSource(data.source);
    if(kind!=='summary'){
      const [c,a]=await Promise.all([call({action:'list',cursor:null},true),call({action:'assets',cursor:null})]);
      setContents(c.items);setContentCursor(c.next_cursor);setAssets(a.items);setCursor(a.next_cursor);setRelations([]);setContentId('');setAssetId('');
    }
    setBlocked(false);setStale(false);setMessage('Snapshot loaded.');
  }
  useEffect(()=>{if(!mounted.current){mounted.current=true;void run(load);}},[]);
  const current=contents.find(c=>c.id===contentId),selectedAsset=assets.find(a=>a.id===assetId);
  async function chooseContent(id){setContentId(id);setRelations([]);if(id){const r=await call({action:'relations',content_id:id});setRelations(r.relations);setMessage('Content relations loaded.');}}
  async function mutate(action){
    const payload=['release','withdraw'].includes(action)?{action,id:contentId}:action==='delete_asset'?{action,id:assetId}:{action,content_id:contentId,asset_id:assetId,...(action==='attach'?{role}:{})};
    await call(payload);await load();setMessage('Operation confirmed. Snapshot reloaded.');
  }
  async function upload(){
    if(!uploadFile || source!=='SUPABASE_DATABASE')throw Error('Live upload unavailable.');
    const reservation=await call({action:'reserve',request_id:crypto.randomUUID(),asset_type:uploadType,
      mime_type:uploadFile.type,original_filename:uploadFile.name,byte_size:uploadFile.size},false,true);
    if(reservation.status!=='PENDING' || reservation.upload?.url!==`/api/founder/assets/upload?id=${reservation.id}`)throw Error('Reservation could not be confirmed.');
    const response=await fetch(reservation.upload.url,{method:'POST',headers:{'Content-Type':uploadFile.type},credentials:'same-origin',
      cache:'no-store',redirect:'error',body:uploadFile,signal:AbortSignal.timeout(25000)});
    const result=await response.json();
    if([401,403].includes(response.status)){setContents([]);setAssets([]);setRelations([]);setSummary(null);setBlocked(true);}
    if(!response.ok || result.ok!==true || result.data?.id!==reservation.id || result.data?.uploaded!==true)throw Error('Upload result is uncertain.');
    const ready=await call({action:'finalize',id:reservation.id},false,true);
    if(ready.status!=='READY')throw Error('Finalization not confirmed.');
    setUploadFile(null);await load();setMessage('Private upload verified READY.');
  }
  const selector=(id,label,value,onChange,rows,text)=>h('label',{htmlFor:id},label,h('select',{id,value,disabled:busy||blocked,onChange:e=>onChange(e.target.value)},h('option',{value:''},'Select…'),...rows.map(row=>h('option',{key:row.id,value:row.id},text(row)))));
  return h('section',{className:'founder-content','aria-busy':busy},
    h('h1',null,kind==='assets'?'Media and asset workspace':kind==='publishing'?'Publishing operations':'Operations overview'),
    h('p',{className:'notice'},source==='LOCAL_SQLITE_FIXTURE'?'LOCAL SQLite fixture · synthetic auth and asset metadata · no live storage or Supabase validation.':source==='SUPABASE_DATABASE'?'Supabase database snapshot; no service health claim.':'Database source not verified until a snapshot loads. No service health claim.'),
    h('p',{role:'status','aria-live':'polite'},message),stale&&h('p',{className:'notice'},'Snapshot stale or unavailable. Reload to verify current state.'),
    h('button',{type:'button',className:'button secondary',disabled:busy,onClick:()=>void run(load)},'Reload snapshot'),
    h('p',null,h('a',{href:'/founder/content'},'Content workspace'),' · ',h('a',{href:'/founder/assets'},'Asset workspace'),' · ',h('a',{href:'/founder/publishing'},'Publishing'),' · ',h('a',{href:'/founder/operations'},'Operations overview')),
    kind==='summary'&&summary&&h('div',null,h('p',null,`Snapshot captured: ${summary.captured_at}`),
      h('h2',null,'Content lifecycle'),h('ul',null,...Object.entries(summary.content).map(([k,n])=>h('li',{key:k},`${k}: ${n}`))),
      h('h2',null,'Asset state'),h('ul',null,...Object.entries(summary.assets).map(([k,n])=>h('li',{key:k},`${k}: ${n}`)))),
    kind!=='summary'&&h('div',{className:'workspace-form'},
      selector('operation-content','Content',contentId,id=>void run(()=>chooseContent(id)),contents,c=>`${c.title} · ${c.state}`),
      contentCursor&&h('button',{disabled:busy||blocked,onClick:()=>void run(async()=>{const c=await call({action:'list',cursor:contentCursor},true);setContents(old=>[...old,...c.items]);setContentCursor(c.next_cursor);setMessage('More content loaded.');})},'Load more content'),
      !contents.length&&!busy&&h('p',null,'No content available in this snapshot.'),
      current&&h('p',null,`Selected state: ${current.state}`),
      kind==='publishing'?h('div',null,
        h('p',null,'Release readiness is checked atomically by the operation. No scheduling or direct lifecycle editing.'),
        h('button',{className:'button',disabled:busy||blocked||!current||current.state==='RELEASED',onClick:()=>void run(()=>mutate('release'),true)},'Release content'),
        h('button',{className:'button secondary',disabled:busy||blocked||current?.state!=='RELEASED',onClick:()=>void run(()=>mutate('withdraw'),true)},'Withdraw content')):
      h('div',null,
        source==='SUPABASE_DATABASE'?h('form',{onSubmit:e=>{e.preventDefault();void run(upload,true);}},
          h('h2',null,'Private upload'),h('p',null,'Maximum 6,000,000 bytes. Use a filename with letters, numbers, dots, underscores or hyphens.'),
          h('label',{htmlFor:'upload-type'},'Asset type',h('select',{id:'upload-type',value:uploadType,disabled:busy||blocked,onChange:e=>setUploadType(e.target.value)},
            ...['IMAGE','THUMBNAIL','VIDEO','AUDIO','DOCUMENT'].map(value=>h('option',{key:value,value},value)))),
          h('label',{htmlFor:'upload-file'},'File',h('input',{id:'upload-file',type:'file',disabled:busy||blocked,accept:'image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,application/pdf',onChange:e=>setUploadFile(e.target.files?.[0]??null)})),
          h('button',{className:'button',type:'submit',disabled:busy||blocked||!uploadFile},'Upload private asset')):
        h('p',null,'Upload unavailable in SQLite: metadata fixtures do not contain binary objects.'),
        selector('operation-asset','Asset metadata',assetId,setAssetId,assets,a=>`${a.original_filename} · ${a.status} · ${a.id}`),
        cursor&&h('button',{disabled:busy||blocked,onClick:()=>void run(async()=>{const a=await call({action:'assets',cursor});setAssets(old=>[...old,...a.items]);setCursor(a.next_cursor);setMessage('More assets loaded.');})},'Load more assets'),
        selectedAsset&&h('p',null,`${selectedAsset.asset_type} · ${selectedAsset.mime_type} · ${selectedAsset.byte_size} bytes · ${selectedAsset.status}`),
        h('label',{htmlFor:'operation-role'},'Relation role',h('select',{id:'operation-role',value:role,disabled:busy||blocked,onChange:e=>setRole(e.target.value)},...['PRIMARY','THUMBNAIL','ATTACHMENT'].map(value=>h('option',{key:value,value},value)))),
        h('button',{className:'button',disabled:busy||blocked||current?.state!=='DRAFT'||selectedAsset?.status!=='READY',onClick:()=>void run(()=>mutate('attach'),true)},'Attach asset'),
        h('button',{className:'button secondary',disabled:busy||blocked||current?.state!=='DRAFT'||!relations.some(r=>r.asset_id===assetId),onClick:()=>void run(()=>mutate('detach'),true)},'Detach asset'),
        h('button',{className:'button secondary',disabled:busy||blocked||!selectedAsset,onClick:()=>void run(()=>mutate('delete_asset'),true)},'Delete unlinked asset'),
        h('h2',null,'Content relations'),h('ul',null,...relations.map(r=>h('li',{key:r.id},`${r.role} · ${r.asset_id}`))))));
}
