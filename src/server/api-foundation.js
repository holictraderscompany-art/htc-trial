// Imported only by server route handlers. No browser or service-role client.
if (typeof window !== 'undefined') throw new Error('Server module');

const projectUrl = 'https://vzkbcgfywyhtvprxpwfb.supabase.co';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messages = {
  400: ['INVALID_REQUEST', 'Invalid request.'],
  401: ['UNAUTHENTICATED', 'Authentication required.'],
  403: ['FORBIDDEN', 'Access denied.'],
  404: ['NOT_FOUND', 'Resource not found.'],
  405: ['METHOD_NOT_ALLOWED', 'Method not allowed.'],
  500: ['INTERNAL_ERROR', 'Request could not be completed.'],
};

export class ApiError extends Error {
  constructor(status) { super('Controlled API error'); this.status = status; }
}

export function reply(status, data, allow) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (allow) headers.Allow = allow;
  const body = status === 200
    ? { ok: true, data }
    : { ok: false, error: { code: messages[status][0], message: messages[status][1] } };
  return Response.json(body, { status, headers });
}

function configuration(env) {
  if (env.SUPABASE_URL !== projectUrl ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.SUPABASE_PUBLISHABLE_KEY ?? '')) {
    throw new ApiError(500);
  }
  return { url: projectUrl, key: env.SUPABASE_PUBLISHABLE_KEY };
}

function bearer(request) {
  const value = request.headers.get('authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9._~+/=-]{1,8192})$/i.exec(value);
  if (!match) throw new ApiError(401);
  return match[1];
}

export async function readJson(request, maximumBytes = 1024) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiError(400);
  }
  if (!request.body) throw new ApiError(400);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) { await reader.cancel(); throw new ApiError(400); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let payload;
  try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new ApiError(400); }
  return payload;
}

async function validateProbe(request) {
  const payload = await readJson(request);
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload) ||
      Object.keys(payload).length !== 1 || payload.probe !== 'access') throw new ApiError(400);
}

// Shared server transport: omit Authorization for the approved anonymous read path.
export function supabaseTransport(env, fetchImpl, token) {
  const config = configuration(env);
  return async function upstream(path, options = {}, auth = false) {
    const response = await fetchImpl(`${config.url}${path}`, {
      ...options,
      headers: { apikey: config.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (auth && [401, 403].includes(response.status)) throw new ApiError(401);
      throw new ApiError(500);
    }
    return response.json();
  };
}

export async function authorize(request, boundary, { env = process.env, fetchImpl = fetch } = {}) {
  const token = bearer(request);
  const upstream = supabaseTransport(env, fetchImpl, token);
  const user = await upstream('/auth/v1/user', {}, true);
  if (!uuid.test(user?.id ?? '') || user.is_anonymous === true) throw new ApiError(401);
  if (boundary === 'founder') {
    const allowed = await upstream('/rest/v1/rpc/is_founder', { method: 'POST', body: '{}' });
    if (allowed !== true) throw new ApiError(403);
  } else if (boundary !== 'authenticated') throw new ApiError(403);
  return { user, upstream };
}

// Test injection is server-side only; route exports use the fixed production defaults.
export function createHandler(boundary, { env = process.env, fetchImpl = fetch } = {}) {
  if (!['public', 'authenticated', 'founder'].includes(boundary)) throw new Error('Invalid boundary');
  return async function handle(request) {
    const method = boundary === 'public' ? 'GET' : 'POST';
    try {
      if (request.method !== method) return reply(405, null, method);
      if (boundary === 'public') {
        if (new URL(request.url).search) throw new ApiError(400);
        return reply(200, { status: 'alive' });
      }
      const { user, upstream } = await authorize(request, boundary, { env, fetchImpl });
      if (new URL(request.url).search) throw new ApiError(400);
      await validateProbe(request);
      const profiles = await upstream(`/rest/v1/user_profiles?select=id&id=eq.${user.id}&limit=1`);
      if (!Array.isArray(profiles)) throw new ApiError(500);
      if (profiles.length === 0) throw new ApiError(404);
      if (profiles.length !== 1 || profiles[0].id !== user.id) throw new ApiError(500);
      return reply(200, { access: boundary });
    } catch (error) {
      return reply(error instanceof ApiError ? error.status : 500);
    }
  };
}
