import { ApiError } from './api-foundation.js';

if (typeof window !== 'undefined') throw new Error('Server module');

// Shared web-session primitives; no role or application presentation dependency.
export const sessionCookie = 'htc_trial_session';
export const tokenPattern = /^[A-Za-z0-9._~+/=-]{1,3500}$/;

export function readCookie(request, name) {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}

export function readSessionToken(request) {
  const token = readCookie(request, sessionCookie);
  if (!tokenPattern.test(token ?? '')) throw new ApiError(401);
  return token;
}
