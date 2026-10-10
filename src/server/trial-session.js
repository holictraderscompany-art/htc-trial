import { randomBytes, createHash } from 'node:crypto';
import { ApiError, authorize, reply } from './api-foundation.js';

const project = 'https://vzkbcgfywyhtvprxpwfb.supabase.co';
const sessionCookie = 'htc_trial_session';
const flowCookie = 'htc_trial_pkce';
const tokenPattern = /^[A-Za-z0-9._~+/=-]{1,3500}$/;
function cookie(request, name) {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}
function setCookie(response, request, name, value, age, path = '/') {
  response.headers.append('Set-Cookie', `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
}
function redirect(request, path) {
  return new Response(null, { status: 303, headers: {
    Location: new URL(path, request.url).href, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
  } });
}
function sameOrigin(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new ApiError(403);
}

// Supabase's existing Google PKCE flow, without a second identity or role system.
// Only an expiring access token is retained in an HttpOnly cookie. No refresh token
// is persisted; expiry asks the visitor to sign in again. Every identity is verified
// through the existing Foundation authorize helper, never by decoding a client JWT.
export function createTrialSessionHandlers({ env = process.env, fetchImpl = fetch } = {}) {
  function configuration() {
    if (env.SUPABASE_URL !== project || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.SUPABASE_PUBLISHABLE_KEY ?? '')) throw new ApiError(500);
    return env.SUPABASE_PUBLISHABLE_KEY;
  }
  async function authFetch(path, options) {
    return fetchImpl(`${project}/auth/v1/${path}`, { ...options, headers: {
      apikey: configuration(), 'Content-Type': 'application/json', ...options.headers,
    }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
  }
  async function identity(request, token) {
    if (!tokenPattern.test(token ?? '')) throw new ApiError(401);
    return authorize(new Request(request.url, { headers: { Authorization: `Bearer ${token}` } }), 'authenticated', { env, fetchImpl });
  }
  return {
    async start(request) {
      if (request.method !== 'POST') return reply(405, null, 'POST');
      try {
        sameOrigin(request); configuration();
        const verifier = randomBytes(64).toString('base64url');
        const attempt = randomBytes(16).toString('hex');
        const callback = new URL('/auth/callback', request.url); callback.searchParams.set('attempt', attempt);
        const destination = new URL(`${project}/auth/v1/authorize`);
        destination.search = new URLSearchParams({ provider: 'google', redirect_to: callback.href,
          code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 's256' }).toString();
        const response = redirect(request, destination.href);
        setCookie(response, request, flowCookie, `${attempt}.${verifier}`, 600, '/auth');
        return response;
      } catch (error) { return error instanceof ApiError && error.status === 403 ? reply(403) : redirect(request, '/sign-in?error=unavailable'); }
    },
    async callback(request) {
      if (request.method !== 'GET') return reply(405, null, 'GET');
      let response;
      try {
        const query = new URL(request.url).searchParams;
        const flow = cookie(request, flowCookie);
        const [attempt, verifier] = (flow ?? '').split('.');
        if (!/^[a-f0-9]{32}$/.test(attempt ?? '') || !/^[A-Za-z0-9_-]{86}$/.test(verifier ?? '') ||
            query.getAll('attempt').length !== 1 || query.get('attempt') !== attempt ||
            query.getAll('code').length !== 1 || !/^[A-Za-z0-9_-]{1,2048}$/.test(query.get('code') ?? '') || query.has('error')) throw new ApiError(400);
        const exchange = await authFetch('token?grant_type=pkce', { method: 'POST', body: JSON.stringify({ auth_code: query.get('code'), code_verifier: verifier }) });
        if (!exchange.ok) throw new ApiError(401);
        const session = await exchange.json();
        await identity(request, session.access_token);
        if (!Number.isInteger(session.expires_in) || session.expires_in < 1) throw new ApiError(500);
        response = redirect(request, '/content');
        setCookie(response, request, sessionCookie, session.access_token, Math.min(session.expires_in, 3600));
      } catch { response = redirect(request, '/sign-in?error=failed'); }
      setCookie(response, request, flowCookie, '', 0, '/auth');
      return response;
    },
    async session(request) {
      if (request.method !== 'GET') return reply(405, null, 'GET');
      try {
        const { user, upstream } = await identity(request, cookie(request, sessionCookie));
        const profiles = await upstream(`/rest/v1/user_profiles?select=id,display_name&id=eq.${user.id}&limit=1`);
        if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].id !== user.id) throw new ApiError(403);
        const name = profiles[0].display_name;
        return reply(200, { authenticated: true, display_name: typeof name === 'string' ? name.trim().slice(0, 80) : null });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return reply(200, { authenticated: false, display_name: null });
        return reply(error instanceof ApiError ? error.status : 500);
      }
    },
    async signout(request) {
      if (request.method !== 'POST') return reply(405, null, 'POST');
      try { sameOrigin(request); } catch { return reply(403); }
      let revoked = true;
      const token = cookie(request, sessionCookie);
      if (tokenPattern.test(token ?? '')) {
        try { const result = await authFetch('logout?scope=local', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); revoked = result.ok; }
        catch { revoked = false; }
      }
      const response = redirect(request, revoked ? '/' : '/sign-in?error=signout');
      setCookie(response, request, sessionCookie, '', 0);
      setCookie(response, request, flowCookie, '', 0, '/auth');
      return response;
    },
  };
}
