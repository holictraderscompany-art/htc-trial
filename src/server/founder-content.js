import { ApiError, authorize, readJson, reply } from './api-foundation.js';
import { readSessionToken } from './session-token.js';
import { contentCategories, validateContentRequest } from './content-release.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ['id', 'category', 'title', 'body', 'state', 'created_at', 'updated_at', 'released_at'];
const timestamp = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
export { project as projectFounderContent };
function project(row, id) {
  if (!row || !uuid.test(row.id ?? '') || (id && row.id.toLowerCase() !== id.toLowerCase()) ||
      !contentCategories.includes(row.category) || !['DRAFT', 'RELEASED', 'WITHDRAWN'].includes(row.state) ||
      typeof row.title !== 'string' || !row.title.trim() || [...row.title].length > 200 || /[<>]/.test(row.title) ||
      typeof row.body !== 'string' || !row.body.trim() || [...row.body].length > 8000 || /[<>]/.test(row.body) ||
      !timestamp(row.created_at) || !timestamp(row.updated_at) ||
      (row.state === 'DRAFT' ? row.released_at !== null : !timestamp(row.released_at))) throw new ApiError(500);
  return Object.fromEntries(fields.map(key => [key, row[key]]));
}

// L3 cookie adapter. Existing bearer-only APIs and Foundation stay unchanged.
export function createFounderContentHandler(dependencies) {
  return async request => {
    try {
      if (request.method !== 'POST') return reply(405, null, 'POST');
      const url = new URL(request.url);
      // Exact Origin is required for reads too: this cookie endpoint is private.
      if (request.headers.get('origin') !== url.origin) throw new ApiError(403);
      const token = readSessionToken(request);
      const { upstream } = await authorize(new Request(request.url, {
        headers: { Authorization: `Bearer ${token}` },
      }), 'founder', dependencies);
      if (url.search) throw new ApiError(400);
      const payload = await readJson(request, 32768);
      if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new ApiError(400);
      if (payload.action === 'list') {
        if (Object.keys(payload).length !== 2 || !Object.hasOwn(payload, 'cursor') ||
            (payload.cursor !== null && (typeof payload.cursor !== 'string' || !uuid.test(payload.cursor)))) throw new ApiError(400);
        const rows = await upstream('/rest/v1/rpc/list_trial_content_for_founder', {
          method: 'POST', body: JSON.stringify({ after_id: payload.cursor }),
        });
        if (!Array.isArray(rows) || rows.length > 51) throw new ApiError(500);
        const safe = rows.map(row => project(row));
        let previous = payload.cursor?.toLowerCase() ?? '';
        for (const row of safe) {
          const id = row.id.toLowerCase();
          if (id <= previous) throw new ApiError(500);
          previous = id;
        }
        return reply(200, { items: safe.slice(0, 50), next_cursor: safe.length === 51 ? safe[49].id : null });
      }
      if (!['create', 'read', 'update'].includes(payload.action)) throw new ApiError(400);
      validateContentRequest(payload);
      if (payload.action === 'update') {
        const { action, ...editable } = payload;
        const result = await upstream('/rest/v1/rpc/update_trial_content_draft', {
          method: 'POST', body: JSON.stringify({ payload: editable }),
        });
        if (result?.outcome === 'not_found') return reply(404);
        if (result?.outcome === 'not_draft') return Response.json({ ok: false, error: {
          code: 'NOT_DRAFT', message: 'This content is read-only. Reload its current state.',
        } }, { status: 409, headers: reply(400).headers });
        if (result?.outcome !== 'saved' || result.content?.state !== 'DRAFT') throw new ApiError(500);
        return reply(200, project(result.content, payload.id));
      }
      const result = await upstream('/rest/v1/rpc/manage_trial_content', { method: 'POST', body: JSON.stringify({ payload }) });
      if (result === null) return reply(404);
      if (payload.action === 'create' && result?.state !== 'DRAFT') throw new ApiError(500);
      return reply(200, project(result, payload.id));
    } catch (error) {
      return reply(error instanceof ApiError ? error.status : 500);
    }
  };
}
