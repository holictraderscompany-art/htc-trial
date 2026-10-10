import { cache } from 'react';
import { headers } from 'next/headers';
import { founderAccess } from '../../server/founder-access.js';

// React request memoization shares this check between layout and page only.
// No persistent/cross-request cache and no Foundation import of L3.
export const getFounderAccess = cache(async () => {
  const request = new Request('https://htc.internal/founder', { headers: await headers() });
  return founderAccess(request);
});
