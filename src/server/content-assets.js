import { ApiError, authorize, readJson, reply } from './api-foundation.js';

if (typeof window !== 'undefined') throw new Error('Server module');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = ['PRIMARY', 'THUMBNAIL', 'ATTACHMENT'];
const mimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'application/pdf'];
function relation(row, contentId, assetId) {
  if (!row || !uuid.test(row.id ?? '') || row.content_id !== contentId || !uuid.test(row.asset_id ?? '') ||
      (assetId && row.asset_id !== assetId) || !roles.includes(row.role) || !Number.isFinite(Date.parse(row.created_at))) throw new ApiError(500);
  return Object.fromEntries(['id', 'content_id', 'asset_id', 'role', 'created_at'].map(k => [k, row[k]]));
}
export function createContentAssetHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async request => {
    try {
      if (request.method !== 'POST') return reply(405, null, 'POST');
      const { upstream } = await authorize(request, 'founder', { env, fetchImpl });
      if (new URL(request.url).search) throw new ApiError(400);
      const p = await readJson(request, 2048);
      const keys = { attach: ['action', 'content_id', 'asset_id', 'role'], detach: ['action', 'content_id', 'asset_id'], list: ['action', 'content_id'] };
      if (!p || Array.isArray(p) || !Object.hasOwn(keys, p.action) || Object.keys(p).length !== keys[p.action].length ||
          keys[p.action].some(k => !Object.hasOwn(p, k)) || !uuid.test(p.content_id ?? '') ||
          (p.action !== 'list' && !uuid.test(p.asset_id ?? '')) || (p.action === 'attach' && !roles.includes(p.role))) throw new ApiError(400);
      const result = await upstream('/rest/v1/rpc/manage_trial_content_asset', { method: 'POST', body: JSON.stringify({ payload: p }) });
      if (result === null) return reply(404);
      if (p.action !== 'list') {
        const row = relation(result, p.content_id, p.asset_id);
        if (p.action === 'attach' && row.role !== p.role) throw new ApiError(500);
        return reply(200, row);
      }
      if (!result || result.content_id !== p.content_id || !Array.isArray(result.relations)) throw new ApiError(500);
      const rows = result.relations.map(r => relation(r, p.content_id));
      const ids = rows.map(r => r.asset_id);
      if (new Set(ids).size !== ids.length || ['PRIMARY', 'THUMBNAIL'].some(role => rows.filter(r => r.role === role).length > 1)) throw new ApiError(500);
      return reply(200, { content_id: p.content_id, relations: rows });
    } catch (error) { return reply(error instanceof ApiError ? error.status : 500); }
  };
}

// Called only for the optional T06 metadata expansion. Caller JWTs are not forwarded.
export async function releasedAssetMetadata(upstream, contentIds) {
  if (contentIds.length === 0) return new Map();
  const rows = await upstream('/rest/v1/rpc/read_released_content_assets', { method: 'POST', body: JSON.stringify({ content_ids: contentIds }) });
  if (!Array.isArray(rows) || rows.length > contentIds.length) throw new ApiError(500);
  const result = new Map();
  for (const row of rows) {
    if (!row || !contentIds.includes(row.content_id) || result.has(row.content_id) || !Array.isArray(row.assets)) throw new ApiError(500);
    const assets = row.assets.map(a => {
      if (!a || !uuid.test(a.id ?? '') || !roles.includes(a.role) || !mimes.includes(a.mime_type) ||
          (a.role === 'THUMBNAIL' && !a.mime_type.startsWith('image/')) ||
          (Object.hasOwn(a, 'status') && a.status !== 'READY') ||
          ['width', 'height'].some(k => a[k] !== null && (!Number.isInteger(a[k]) || a[k] < 1)) ||
          (a.duration_seconds !== null && (!Number.isFinite(a.duration_seconds) || a.duration_seconds < 0))) throw new ApiError(500);
      return Object.fromEntries(['id', 'role', 'mime_type', 'width', 'height', 'duration_seconds'].map(k => [k, a[k]]));
    });
    if (new Set(assets.map(a => a.id)).size !== assets.length || ['PRIMARY', 'THUMBNAIL'].some(role => assets.filter(a => a.role === role).length > 1)) throw new ApiError(500);
    result.set(row.content_id, assets);
  }
  return result;
}
