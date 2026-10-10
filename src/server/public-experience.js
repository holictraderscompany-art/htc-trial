import { createContentHandler } from './content-release.js';

// Presentation adapter only: T09 remains the sole discovery/query authority.
export async function publicContent(search, { handler = createContentHandler('public') } = {}) {
  const response = await handler(new Request(`https://htc.internal/api/content?${search}`));
  const body = await response.json();
  return { status: response.status, data: body.ok ? body.data : null };
}

export async function discoveryContent(parameters, dependencies) {
  const query = new URLSearchParams({ paged: '1', limit: '12', assets: '1' });
  for (const [key, value] of Object.entries(parameters)) {
    if (!['category', 'cursor'].includes(key) || typeof value !== 'string') return { status: 400, data: null };
    if (key === 'category' && value === '') continue;
    query.set(key, value);
  }
  return publicContent(query, dependencies);
}

export function detailContent(id, dependencies) {
  return publicContent(new URLSearchParams({ id, assets: '1' }), dependencies);
}
