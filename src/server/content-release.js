import { ApiError, authorize, readJson, reply, supabaseTransport } from './api-foundation.js';
import { releasedAssetMetadata } from './content-assets.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories = ['INTRODUCTION', 'INFORMATION', 'EDITORIAL', 'DISCOVERY', 'FUTURE_JOURNEY', 'VALIDATION'];
const keys = {
  create: ['action', 'category', 'title', 'body'],
  update: ['action', 'id', 'category', 'title', 'body'],
  release: ['action', 'id'],
  withdraw: ['action', 'id'],
  read: ['action', 'id'],
};
function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : value;
}
function text(value, maximum) {
  return typeof value === 'string' && value.length > 0 && [...value].length <= maximum && !/[<>]/.test(value);
}
function validate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !Object.hasOwn(keys, payload.action)) throw new ApiError(400);
  const required = keys[payload.action];
  if (Object.keys(payload).length !== required.length || required.some(key => !Object.hasOwn(payload, key))) throw new ApiError(400);
  if (payload.action !== 'create' && !uuid.test(payload.id ?? '')) throw new ApiError(400);
  if (['create', 'update'].includes(payload.action)) {
    payload.title = normalizeText(payload.title);
    payload.body = normalizeText(payload.body);
    if (!categories.includes(payload.category) || !text(payload.title, 200) || !text(payload.body, 8000)) throw new ApiError(400);
  }
}

export function createContentHandler(boundary, { env = process.env, fetchImpl = fetch } = {}) {
  if (!['public', 'founder'].includes(boundary)) throw new Error('Invalid boundary');
  return async function handle(request) {
    const method = boundary === 'public' ? 'GET' : 'POST';
    try {
      if (request.method !== method) return reply(405, null, method);
      const url = new URL(request.url);
      if (boundary === 'founder') {
        const { upstream } = await authorize(request, 'founder', { env, fetchImpl });
        if (url.search) throw new ApiError(400);
        const payload = await readJson(request, 32768);
        validate(payload);
        const result = await upstream('/rest/v1/rpc/manage_trial_content', { method: 'POST', body: JSON.stringify({ payload }) });
        if (result === null) return reply(404);
        // Return only the known internal contract even if upstream adds fields.
        if (!result || !uuid.test(result.id ?? '') || !['DRAFT', 'RELEASED', 'WITHDRAWN'].includes(result.state)) throw new ApiError(500);
        return reply(200, Object.fromEntries(['id', 'category', 'title', 'body', 'state', 'created_at', 'updated_at', 'released_at'].map(key => [key, result[key]])));
      }
      const parameters = [...url.searchParams];
      if (parameters.length > 2 || new Set(parameters.map(([key]) => key)).size !== parameters.length ||
          parameters.some(([key, value]) => key === 'id' ? !uuid.test(value) : key !== 'assets' || value !== '1')) throw new ApiError(400);
      const includeAssets = url.searchParams.get('assets') === '1';
      const contentId = url.searchParams.get('id');
      // Caller tokens are intentionally ignored: public reads always use the anonymous contract.
      const upstream = supabaseTransport(env, fetchImpl);
      const rows = await upstream('/rest/v1/rpc/read_released_content', { method: 'POST', body: JSON.stringify({ content_id: contentId }) });
      if (!Array.isArray(rows) || rows.length > 100 || (contentId && rows.length > 1)) throw new ApiError(500);
      const safe = rows.map(row => {
        const title = normalizeText(row?.title);
        const body = normalizeText(row?.body);
        if (!row || !uuid.test(row.id ?? '') || (contentId && row.id !== contentId) ||
            !categories.includes(row.category) || !text(title, 200) || !text(body, 8000) ||
            (Object.hasOwn(row, 'state') && row.state !== 'RELEASED')) throw new ApiError(500);
        return { id: row.id, category: row.category, title, body };
      });
      if (contentId && safe.length === 0) return reply(404);
      if (includeAssets) {
        const assets = await releasedAssetMetadata(upstream, safe.map(row => row.id));
        // A concurrent withdrawal/edit between reads removes the expanded record.
        const visible = safe.filter(row => assets.has(row.id)).map(row => ({ ...row, assets: assets.get(row.id) }));
        if (contentId && visible.length === 0) return reply(404);
        return reply(200, contentId ? visible[0] : visible);
      }
      return reply(200, contentId ? safe[0] : safe);
    } catch (error) {
      return reply(error instanceof ApiError ? error.status : 500);
    }
  };
}
