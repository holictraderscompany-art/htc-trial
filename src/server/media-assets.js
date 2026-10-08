import { ApiError, authorize, readJson, reply } from './api-foundation.js';

if (typeof window !== 'undefined') throw new Error('Server module');
export const FILE_CAP = 6000000;
const project = 'https://vzkbcgfywyhtvprxpwfb.supabase.co';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const formats = {
  'image/jpeg': ['IMAGE', 'THUMBNAIL'], 'image/png': ['IMAGE', 'THUMBNAIL'],
  'image/webp': ['IMAGE', 'THUMBNAIL'], 'video/mp4': ['VIDEO'],
  'audio/mpeg': ['AUDIO'], 'application/pdf': ['DOCUMENT'],
};
const extensions = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'], 'video/mp4': ['mp4'], 'audio/mpeg': ['mp3'], 'application/pdf': ['pdf'] };
function validate(p) {
  const keys = p?.action === 'reserve' ? ['action', 'request_id', 'asset_type', 'mime_type', 'original_filename', 'byte_size'] : ['action', 'id'];
  if (!p || Array.isArray(p) || !['reserve', 'finalize', 'delete', 'read'].includes(p.action) ||
      Object.keys(p).length !== keys.length || keys.some(k => !Object.hasOwn(p, k)) ||
      !uuid.test(p.action === 'reserve' ? p.request_id ?? '' : p.id ?? '')) throw new ApiError(400);
  if (p.action !== 'reserve') return;
  if (typeof p.mime_type !== 'string' || !Object.hasOwn(formats, p.mime_type) || !formats[p.mime_type].includes(p.asset_type) || !Number.isInteger(p.byte_size) || p.byte_size < 1 || p.byte_size > FILE_CAP ||
      typeof p.original_filename !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(p.original_filename) ||
      p.original_filename.includes('..') || !extensions[p.mime_type].includes(p.original_filename.split('.').at(-1).toLowerCase())) throw new ApiError(400);
}
function asset(row, id) {
  if (!row || !uuid.test(row.id ?? '') || (id && row.id !== id) || row.storage_bucket !== 'trial-assets' ||
      !formats[row.mime_type]?.includes(row.asset_type) || !Number.isInteger(row.byte_size) || row.byte_size < 1 || row.byte_size > FILE_CAP ||
      !['PENDING', 'READY', 'DELETING'].includes(row.status)) throw new ApiError(500);
  validate({ action: 'reserve', request_id: row.id, asset_type: row.asset_type, mime_type: row.mime_type, original_filename: row.original_filename, byte_size: row.byte_size });
  if (row.storage_path !== `${row.asset_type.toLowerCase()}/${row.id}/asset.${extensions[row.mime_type][0]}`) throw new ApiError(500);
  return row;
}
function projection(row) {
  return Object.fromEntries(['id', 'asset_type', 'mime_type', 'original_filename', 'byte_size', 'width', 'height', 'duration_seconds', 'status', 'created_at', 'updated_at'].map(k => [k, row[k]]));
}
function signature(bytes, mime) {
  const s = new TextDecoder('latin1').decode(bytes);
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (mime === 'image/webp') return s.startsWith('RIFF') && s.slice(8,12) === 'WEBP';
  if (mime === 'video/mp4') return bytes.length >= 16 && s.slice(4,8) === 'ftyp' && bytes[0] === 0 && bytes[1] === 0;
  if (mime === 'audio/mpeg') return s.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224 && (bytes[1] & 6) !== 0 && (bytes[2] & 240) !== 0 && (bytes[2] & 240) !== 240);
  return mime === 'application/pdf' && /^%PDF-[12]\.[0-9]/.test(s);
}
async function prefix(response) {
  if (!response.body) throw new ApiError(500);
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 512) throw new ApiError(500);
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  return bytes;
}
export function createAssetHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async request => {
    try {
      if (request.method !== 'POST') return reply(405, null, 'POST');
      const { upstream } = await authorize(request, 'founder', { env, fetchImpl });
      if (new URL(request.url).search) throw new ApiError(400);
      const p = await readJson(request, 2048); validate(p);
      const rpc = payload => upstream('/rest/v1/rpc/manage_trial_asset', { method: 'POST', body: JSON.stringify({ payload }) });
      const token = request.headers.get('authorization');
      const storage = (path, options = {}) => fetchImpl(`${project}/storage/v1/${path}`, {
        ...options, headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: token, ...options.headers },
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      const remove = async id => {
        const row = await rpc({ action: 'begin_delete', id });
        if (!row) return; asset(row, id);
        const response = await storage('object/trial-assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [row.storage_path] }) });
        if (!response.ok && response.status !== 404) throw new ApiError(500);
        const finished = await rpc({ action: 'finish_delete', id });
        if (!finished || finished.id !== id || finished.deleted !== true) throw new ApiError(500);
      };
      if (p.action === 'delete') { await remove(p.id); return reply(200, { id: p.id, deleted: true }); }
      const result = await rpc(p.action === 'reserve' ? p : { action: 'inspect', id: p.id });
      if (!result) return reply(404);
      const row = asset(result.asset, p.action === 'reserve' ? undefined : p.id);
      if (result.bucket_private !== true) throw new ApiError(500);
      if (p.action === 'reserve') {
        if (!Number.isFinite(Date.parse(row.expires_at))) throw new ApiError(500);
        if (row.status === 'READY') {
          if (!result.object || result.object.size !== row.byte_size || result.object.mime_type !== row.mime_type) throw new ApiError(500);
          return reply(200, projection(row));
        }
        if (row.status !== 'PENDING' || Date.parse(row.expires_at) <= Date.now()) return reply(200, {
          id: row.id, status: row.status, expires_at: row.expires_at, upload: null,
          recovery: 'Delete this reservation before using a new request_id.',
        });
        return reply(200, { id: row.id, status: 'PENDING', expires_at: row.expires_at, upload: {
          url: `${project}/storage/v1/object/trial-assets/${row.storage_path}`, method: 'POST',
          headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': row.mime_type, 'x-upsert': 'false' },
          authentication: 'Use your existing Founder session Authorization: Bearer header.', max_bytes: FILE_CAP,
        } });
      }
      if (row.status === 'DELETING') throw new ApiError(400);
      if (!result.object) return reply(404);
      if (result.object.size !== row.byte_size || result.object.mime_type !== row.mime_type) {
        if (p.action === 'finalize' && row.status === 'PENDING') await remove(row.id);
        throw new ApiError(400);
      }
      if (p.action === 'finalize' && row.status === 'PENDING') {
        const end = Math.min(row.byte_size, 512) - 1;
        const response = await storage(`object/authenticated/trial-assets/${row.storage_path}`, { headers: { Range: `bytes=0-${end}` } });
        if (response.status !== 206 || response.headers.get('content-range') !== `bytes 0-${end}/${row.byte_size}`) {
          await response.body?.cancel(); throw new ApiError(500);
        }
        const bytes = await prefix(response);
        if (bytes.length !== end + 1 || !signature(bytes, row.mime_type)) { await remove(row.id); throw new ApiError(400); }
        const ready = await rpc({ action: 'finalize', id: row.id });
        asset(ready, row.id); if (ready.status !== 'READY') throw new ApiError(500);
        return reply(200, projection(ready));
      }
      if (row.status !== 'READY') throw new ApiError(400);
      const data = projection(row);
      if (p.action === 'read') data.download = {
        url: `${project}/storage/v1/object/authenticated/trial-assets/${row.storage_path}`,
        authentication: 'Use your existing Founder session Authorization: Bearer header and publishable apikey.',
      };
      return reply(200, data);
    } catch (error) { return reply(error instanceof ApiError ? error.status : 500); }
  };
}
