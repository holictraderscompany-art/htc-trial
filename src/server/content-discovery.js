import { Buffer } from 'node:buffer';
import { ApiError } from './api-foundation.js';

if (typeof window !== 'undefined') throw new Error('Server module');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function timestamp(value) {
  return typeof value === 'string' && /^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString().slice(0, 19) === value.slice(0, 19);
}
function micros(value) {
  const fraction = value.match(/\.([0-9]+)Z$/)?.[1] ?? '';
  return BigInt(Math.floor(Date.parse(value) / 1000)) * 1000000n + BigInt(fraction.padEnd(6, '0'));
}
function after(position, previous) {
  const a = micros(position.created_at), b = micros(previous.created_at);
  return a < b || (a === b && position.id > previous.id);
}
export function publicPageRequest(url, categories) {
  if (!url.searchParams.has('paged')) return null;
  const entries = [...url.searchParams];
  if (new Set(entries.map(([key]) => key)).size !== entries.length ||
      entries.some(([key]) => !['paged', 'limit', 'cursor', 'category', 'assets'].includes(key)) ||
      url.searchParams.get('paged') !== '1' ||
      (url.searchParams.has('assets') && url.searchParams.get('assets') !== '1')) throw new ApiError(400);
  const rawLimit = url.searchParams.get('limit') ?? '20';
  if (!/^[1-9][0-9]{0,2}$/.test(rawLimit) || Number(rawLimit) > 100) throw new ApiError(400);
  const category = url.searchParams.get('category');
  if (category !== null && !categories.includes(category)) throw new ApiError(400);
  let position = null;
  if (url.searchParams.has('cursor')) {
    const encoded = url.searchParams.get('cursor');
    try {
      if (!encoded || encoded.length > 512 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw Error();
      const bytes = Buffer.from(encoded, 'base64url');
      if (bytes.toString('base64url') !== encoded) throw Error();
      const cursor = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!cursor || Array.isArray(cursor) || Object.keys(cursor).length !== 4 || cursor.v !== 1 ||
          !timestamp(cursor.created_at) || !uuid.test(cursor.id ?? '') || cursor.category !== category) throw Error();
      position = { created_at: cursor.created_at, id: cursor.id };
    } catch { throw new ApiError(400); }
  }
  return { limit: Number(rawLimit), category, position };
}
export async function readPublicPage(upstream, request) {
  const result = await upstream('/rest/v1/rpc/read_released_content_page', { method: 'POST', body: JSON.stringify({
    page_size: request.limit, category_filter: request.category,
    after_created_at: request.position?.created_at ?? null, after_id: request.position?.id ?? null,
  }) });
  if (!result || !Array.isArray(result.items) || result.items.length > request.limit ||
      new Set(result.items.map(row => row?.id)).size !== result.items.length ||
      (request.category !== null && result.items.some(row => row?.category !== request.category))) throw new ApiError(500);
  let nextCursor = null;
  if (result.next_position !== null) {
    const position = result.next_position;
    if (!position || Object.keys(position).length !== 2 || !timestamp(position.created_at) || !uuid.test(position.id ?? '') ||
        result.items.length !== request.limit || position.id !== result.items.at(-1)?.id ||
        (request.position && !after(position, request.position))) throw new ApiError(500);
    nextCursor = Buffer.from(JSON.stringify({ v: 1, created_at: position.created_at, id: position.id, category: request.category })).toString('base64url');
  }
  return { rows: result.items, nextCursor };
}
