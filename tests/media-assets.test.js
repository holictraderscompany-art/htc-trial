import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAssetHandler } from '../src/server/media-assets.js';

const id = '11111111-1111-4111-8111-111111111111';
const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const reserve = { action: 'reserve', request_id: id, asset_type: 'IMAGE', mime_type: 'image/png', original_filename: 'picture.png', byte_size: 8 };
const png = new Uint8Array([137,80,78,71,13,10,26,10]);
const ext = { 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','audio/mpeg':'mp3','application/pdf':'pdf' };
function harness(options = {}) {
  let row = { id, ...reserve, storage_bucket: 'trial-assets', storage_path: `image/${id}/asset.png`, status: 'PENDING', expires_at: new Date(Date.now()+600000).toISOString(), width: null, height: null, duration_seconds: null };
  let exists = options.exists ?? true;
  const calls = [];
  const fetchImpl = async (url, settings = {}) => {
    calls.push({ url, settings });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id, is_anonymous: options.anonymous ?? false }, { status: options.authStatus ?? 200 });
    if (url.endsWith('/rpc/is_founder')) return Response.json(options.founder ?? true);
    if (url.includes('/rpc/manage_trial_asset')) {
      const p = JSON.parse(settings.body).payload;
      if (options.rpcFail === p.action) return Response.json({ message: 'private upstream detail' }, { status: 500 });
      if (p.action === 'reserve') row = { ...row, ...p, storage_path: `${p.asset_type.toLowerCase()}/${id}/asset.${ext[p.mime_type]}`, ...(options.row ?? {}) };
      if (p.action === 'begin_delete') { if (!row) return Response.json(null); row.status = 'DELETING'; return Response.json(row); }
      if (p.action === 'finish_delete') { row = null; return Response.json({ id, deleted: true }); }
      if (p.action === 'finalize') { row.status = 'READY'; return Response.json(row); }
      return Response.json({ asset: row, bucket_private: options.private ?? true, object: exists ? { size: options.size ?? row.byte_size, mime_type: options.mime ?? row.mime_type } : null });
    }
    if (settings.method === 'DELETE') { if (options.deleteFail) return new Response('', { status: 500 }); exists = false; return Response.json([]); }
    if (url.includes('/object/authenticated/')) return new Response(options.bytes ?? png, { status: options.rangeStatus ?? 206, headers: { 'content-range': options.range ?? `bytes 0-${Math.min(row.byte_size,512)-1}/${row.byte_size}` } });
    throw new Error('Unexpected upstream');
  };
  const handler = createAssetHandler({ env, fetchImpl });
  const invoke = (p, token = 'test-session', overrides = {}) => handler(new Request('https://htc.test/api/assets/manage', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(p), ...overrides,
  }));
  return { invoke, calls, get row() { return row; } };
}
for (const [kind,mime,file] of [['IMAGE','image/png','a.png'],['THUMBNAIL','image/jpeg','a.jpg'],['VIDEO','video/mp4','a.mp4'],['AUDIO','audio/mpeg','a.mp3'],['DOCUMENT','application/pdf','a.pdf']]) {
  test(`Founder reserves ${kind} with scoped private direct upload`, async () => {
    const h = harness(); const response = await h.invoke({ ...reserve, asset_type: kind, mime_type: mime, original_filename: file });
    assert.equal(response.status,200); const { data } = await response.json();
    assert.equal(data.status,'PENDING'); assert.equal(data.upload.max_bytes,6000000);
    assert.match(data.upload.url,/supabase.co\/storage\/v1\/object\/trial-assets\//);
    assert.equal(data.upload.headers['x-upsert'],'false');
    assert.equal(JSON.stringify(data).includes('test-session'),false);
    assert.equal(h.calls.some(c => c.url.includes('/storage/')),false);
  });
}
test('USER and anonymous denied every management operation before storage/RPC mutation', async () => {
  for (const p of [reserve,...['finalize','delete','read'].map(action => ({ action,id }))]) {
    for (const options of [{ founder:false },{ anonymous:true },{ authStatus:401 }]) {
      const h=harness(options); assert.equal((await h.invoke(p)).status,options.founder === false ? 403 : 401);
      assert.equal(h.calls.some(c=>c.url.includes('manage_trial_asset') || c.url.includes('/storage/')),false);
    }
    const h=harness(); assert.equal((await h.invoke(p,null)).status,401); assert.equal(h.calls.length,0);
  }
});
test('invalid types, MIME, extension, size, metadata and traversal fail before reservation', async () => {
  for (const change of [{ asset_type:'LESSON' },{ mime_type:'text/html' },{ mime_type:'image/svg+xml' },{ mime_type:'toString' },{ mime_type:'__proto__' },{ mime_type:null },{ original_filename:'a.exe' },{ byte_size:6000001 },{ byte_size:0 },{ byte_size:1.5 },{ byte_size:'8' },{ original_filename:'../a.png' },{ original_filename:'a/b.png' },{ original_filename:'a\\b.png' },{ storage_path:'custom' },{ status:'READY' },{ request_id:'bad' }]) {
    const h=harness(); assert.equal((await h.invoke({ ...reserve,...change })).status,400);
    assert.equal(h.calls.length,2);
  }
});
test('cap boundary accepted; public bucket fails closed', async () => {
  assert.equal((await harness().invoke({ ...reserve,byte_size:6000000 })).status,200);
  assert.equal((await harness({ private:false }).invoke(reserve)).status,500);
});
test('missing object cannot finalize or read as completed', async () => {
  for (const action of ['finalize','read']) assert.equal((await harness({ exists:false }).invoke({ action,id })).status,404);
});
test('valid signature finalizes; repeated finalize is deterministic; private read never proxies bytes', async () => {
  const h=harness(); assert.equal((await h.invoke({ action:'finalize',id })).status,200);
  assert.equal((await h.invoke({ action:'finalize',id })).status,200);
  const { data }=await (await h.invoke({ action:'read',id })).json();
  assert.equal(data.status,'READY'); assert.match(data.download.url,/\/object\/authenticated\//);
  assert.equal(h.calls.filter(c=>c.url.includes('/object/authenticated/')).length,1);
});
for (const [asset_type,mime_type,original_filename,bytes] of [
  ['IMAGE','image/jpeg','a.jpg',new Uint8Array([255,216,255,224])],
  ['IMAGE','image/webp','a.webp',new TextEncoder().encode('RIFF1234WEBPVP8 ')],
  ['VIDEO','video/mp4','a.mp4',new Uint8Array([0,0,0,16,102,116,121,112,105,115,111,109,0,0,0,0])],
  ['AUDIO','audio/mpeg','a.mp3',new TextEncoder().encode('ID3abcdefg')],
  ['DOCUMENT','application/pdf','a.pdf',new TextEncoder().encode('%PDF-1.7\n')],
]) test(`uploaded ${mime_type} signature accepted`, async () => {
  const h=harness({ bytes });
  assert.equal((await h.invoke({ ...reserve,asset_type,mime_type,original_filename,byte_size:bytes.length })).status,200);
  assert.equal((await h.invoke({ action:'finalize',id })).status,200);
});
test('reservation retries reuse returned identity and do not trust missing READY objects', async () => {
  const h=harness();
  const first=await (await h.invoke(reserve)).json(); const second=await (await h.invoke(reserve)).json();
  assert.equal(first.data.id,second.data.id);
  assert.equal((await harness({ exists:false,row:{ status:'READY' } }).invoke(reserve)).status,500);
});
test('wrong object size/MIME and forbidden bytes trigger deterministic cleanup', async () => {
  for (const options of [{ size:9 },{ mime:'text/html' },{ bytes:new Uint8Array(8) }]) {
    const h=harness(options); assert.equal((await h.invoke({ action:'finalize',id })).status,400); assert.equal(h.row,null);
    assert.equal(h.calls.some(c=>c.settings.method==='DELETE'),true);
  }
});
test('bad range or oversized prefix is rejected without unbounded buffering', async () => {
  for (const options of [{ range:'bytes 0-7/9' },{ rangeStatus:200 },{ bytes:new Uint8Array(513) }]) {
    const h=harness(options); assert.equal((await h.invoke({ action:'finalize',id })).status,500);
    assert.equal(h.row.status,'PENDING');
  }
});
test('finalization transport failure preserves reservation for recovery and redacts errors', async () => {
  const h=harness({ rpcFail:'finalize' }); const response=await h.invoke({ action:'finalize',id });
  assert.equal(response.status,500); assert.equal(h.row.status,'PENDING');
  assert.equal((await response.text()).includes('private upstream detail'),false);
});
test('delete failures retain DELETING metadata; successful and missing deletes are idempotent', async () => {
  for (const options of [{ deleteFail:true },{ rpcFail:'finish_delete' }]) {
    const h=harness(options); assert.equal((await h.invoke({ action:'delete',id })).status,500); assert.equal(h.row.status,'DELETING');
  }
  const h=harness(); assert.equal((await h.invoke({ action:'delete',id })).status,200); assert.equal(h.row,null);
  assert.equal((await h.invoke({ action:'delete',id })).status,200);
});
test('abandoned and invalid uploads can be cleaned without an object', async () => {
  const h=harness({ exists:false }); assert.equal((await h.invoke({ action:'delete',id })).status,200); assert.equal(h.row,null);
  assert.equal((await harness({ bytes:new Uint8Array(8),deleteFail:true }).invoke({ action:'finalize',id })).status,500);
});
test('invalid private upstream path fails closed; expired reservation exposes cleanup ID without upload authority', async () => {
  assert.equal((await harness({ row:{ storage_path:'../outside' } }).invoke(reserve)).status,500);
  const response=await harness({ row:{ expires_at:'2000-01-01T00:00:00Z' } }).invoke(reserve);
  assert.equal(response.status,200); const { data }=await response.json(); assert.equal(data.id,id); assert.equal(data.upload,null);
});
test('route exports bind only server-side POST and enforce malformed/bounded inputs', async () => {
  const route=await import('../src/app/api/assets/manage/route.js'); assert.equal(route.runtime,'nodejs'); assert.equal(typeof route.POST,'function'); assert.equal(route.GET,undefined);
  const h=harness(); assert.equal((await h.invoke(reserve,'test-session',{ method:'PUT' })).status,405);
  for (const body of ['{','x'.repeat(2049)]) assert.equal((await h.invoke(reserve,'test-session',{ body })).status,400);
});
test('migration limits RPC/table access and isolates upload, read, delete operations', async () => {
  const sql=await readFile(new URL('../supabase/migrations/20261008090000_trial_assets.sql',import.meta.url),'utf8');
  assert.match(sql,/enable row level security/); assert.match(sql,/revoke all on public.trial_assets from public, anon, authenticated/);
  assert.match(sql,/auth.uid\(\) is null or not public.is_founder\(\)/);
  assert.match(sql,/allow_only_operation\('object.upload'\)/); assert.match(sql,/object.delete_many/);
  assert.match(sql,/on conflict\(request_id\) do nothing/); assert.match(sql,/for share/); assert.match(sql,/for update/);
  assert.match(sql,/create trigger guard_trial_asset_object before insert or update on storage.objects/);
  assert.match(sql,/No active asset reservation/); assert.match(sql,/new.bucket_id <> 'trial-assets' then return new/);
  assert.match(sql,/a.expires_at > clock_timestamp\(\)/); assert.match(sql,/object_metadata->>'size'/);
  assert.doesNotMatch(sql,/grant .* on public.trial_assets|for update to authenticated|trial_content|content_asset/i);
});
