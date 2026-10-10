import { ApiError, authorize } from './api-foundation.js';
import { readSessionToken } from './session-token.js';

if (typeof window !== 'undefined') throw new Error('Server module');

// L3 adapter: cookie authentication consumes the unchanged L1 Founder contract.
// Return only an access outcome, never the session token or upstream identity.
export async function founderAccess(request, dependencies) {
  try {
    const token = readSessionToken(request);
    await authorize(new Request(request.url, { headers: { Authorization: `Bearer ${token}` } }), 'founder', dependencies);
    return { state: 'founder' };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { state: 'anonymous' };
    if (error instanceof ApiError && error.status === 403) return { state: 'denied' };
    return { state: 'unavailable' };
  }
}
