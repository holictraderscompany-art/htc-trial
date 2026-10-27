import { supabaseConfiguration } from './api-foundation.js';
import { discoveryContent } from './public-experience.js';

if (typeof window !== 'undefined') throw new Error('Server module');
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const brand = 'Holic Traders Company';
const noIndex = () => ({ index: false, follow: false });
const text = v => typeof v === 'string' && v.trim().length > 0 && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const excerpt = value => Array.from(value.replace(/\s+/gu, ' ').trim()).slice(0, 160).join('');
const pageCopy = {
  home: { path: '/', title: 'Introduction to HTC', description: 'Discover Holic Traders Company during the September–December 2026 Trial. Introductory content only; curriculum begins January 2027.' },
  content: { path: '/content', title: 'Introductory content', description: 'Browse released introductory and educational HTC Trial content. Lessons, enrollment and learning progress are not part of this Trial.' },
};

// These server-only settings must be provisioned from verified Founder domain
// evidence. Syntax, environment labels and this policy do not verify ownership.
// Request headers can veto configuration, never supply a canonical origin.
export function searchPolicy(env = {}, requestHost = null) {
  const closed = { indexable: false, origin: null };
  try {
    if (env.NODE_ENV !== 'production' || env.HTC_SEO_INDEXING !== 'enabled'
      || env.HTC_SUPABASE_TARGET !== undefined
      || (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== 'production')
      || (env.CONTEXT !== undefined && env.CONTEXT !== 'production')
      || env.CF_PAGES === '1') return closed;
    supabaseConfiguration(env); // Existing production-project guard, not a new project/credential contract.
    if (typeof env.HTC_SEO_CANONICAL_ORIGIN !== 'string') return closed;
    const raw = env.HTC_SEO_CANONICAL_ORIGIN, url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
      || url.pathname !== '/' || ![url.origin, `${url.origin}/`].includes(raw)
      || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname)
      || /(?:^|\.)(?:localhost|local|test|invalid|example)$/.test(url.hostname)
      || /(?:^|\.)(?:workers\.dev|pages\.dev|vercel\.app|netlify\.app)$/.test(url.hostname)
      || typeof requestHost !== 'string' || requestHost.toLowerCase() !== url.host) return closed;
    return { indexable: true, origin: url.origin };
  } catch { return closed; }
}

function canonical(policy, path) {
  if (!policy.indexable || !policy.origin) return null;
  if (!['/', '/content'].includes(path) && !/^\/content\/[a-f0-9-]{36}$/.test(path)) return null;
  return `${policy.origin}${path}`;
}

function metadata(policy, { path, title, description, article = false, discoverable = true }) {
  const url = discoverable ? canonical(policy, path) : null;
  const sharing = { title: `${title} | HTC Trial`, description };
  return {
    title, description, robots: url ? { index: true, follow: true } : noIndex(),
    alternates: url ? { canonical: url } : {},
    openGraph: { ...sharing, type: article ? 'article' : 'website', siteName: brand, ...(url ? { url } : {}) },
    twitter: { card: 'summary', ...sharing },
  };
}

export function publicPageMetadata(page, policy, parameters = {}, available = true) {
  const copy = typeof page === 'string' && Object.hasOwn(pageCopy, page) ? pageCopy[page] : null;
  if (!copy) return { title: 'Page unavailable', robots: noIndex(), alternates: {} };
  if (!available) return { title: 'Content unavailable', description: 'Browse currently released HTC Trial content when it becomes available.', robots: noIndex(), alternates: {} };
  // Filter/cursor/unknown query variants do not become duplicate search targets.
  return metadata(policy, { ...copy, discoverable: parameters && typeof parameters === 'object' && !Array.isArray(parameters) && Object.keys(parameters).length === 0 });
}

export function articleMetadata(id, result, policy) {
  const item = result?.data;
  if (result?.status !== 200 || typeof id !== 'string' || !uuid.test(id) || !item || item.id !== id
    || (Object.hasOwn(item, 'state') && item.state !== 'RELEASED') || !text(item.title) || !text(item.body))
    return { title: 'Content unavailable', description: 'This content is unavailable. Browse currently released HTC Trial content.', robots: noIndex(), alternates: {} };
  return metadata(policy, { path: `/content/${id}`, title: item.title, description: excerpt(item.body), article: true });
}

const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const urlset = urls => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${xml(url)}</loc></url>`).join('')}</urlset>\n`;
const response = (body, type, status = 200) => new Response(body, { status, headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });

export function createRobotsHandler({ env = process.env } = {}) {
  return function GET(request) {
    const policy = searchPolicy(env, request.headers.get('host'));
    // Public crawlers must be able to read the HTML noindex directive even on
    // preview/test. Disallow-all would prevent that; robots is not access control.
    const rules = 'User-agent: *\nAllow: /\nDisallow: /founder\nDisallow: /api/\nDisallow: /auth/\nDisallow: /sign-in\n';
    return response(rules + (policy.indexable ? `Sitemap: ${policy.origin}/sitemap.xml\n` : ''), 'text/plain');
  };
}

export function createSitemapHandler({ env = process.env, readPage = discoveryContent } = {}) {
  return async function GET(request) {
    const policy = searchPolicy(env, request.headers.get('host'));
    if (!policy.indexable) return response(urlset([]), 'application/xml');
    try {
      const ids = new Set(), cursors = new Set(); let cursor = null;
      for (let page = 0; page < 20; page++) {
        // Reuse T09 + T07B's anonymous RELEASED/READY/object recheck. No Founder session.
        const result = await readPage(cursor === null ? {} : { cursor });
        if (result?.status !== 200 || !Array.isArray(result.data?.items) || result.data.items.length > 12) throw Error();
        for (const row of result.data.items) {
          if (!row || typeof row.id !== 'string' || !uuid.test(row.id) || ids.has(row.id)
            || (Object.hasOwn(row, 'state') && row.state !== 'RELEASED')) throw Error();
          ids.add(row.id);
        }
        const next = result.data.next_cursor;
        if (next === null) return response(urlset([canonical(policy, '/'), canonical(policy, '/content'), ...[...ids].map(id => canonical(policy, `/content/${id}`))]), 'application/xml');
        if (typeof next !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(next) || cursors.has(next)) throw Error();
        cursors.add(next); cursor = next;
      }
      throw Error(); // Bounded scan exhausted: never advertise an incomplete inventory as complete.
    } catch { return response(urlset([]), 'application/xml', 503); }
  };
}
