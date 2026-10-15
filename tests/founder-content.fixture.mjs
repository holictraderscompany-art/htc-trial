// TEST-ONLY production-build fixture. No real Auth/DB/Storage calls are forwarded.
// Run after pnpm build: node tests/founder-content.fixture.mjs
// This validates application behavior with synthetic transport, NOT PostgreSQL.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const origin = 'http://localhost:3103';
const stamp = '2026-10-11T00:00:00Z';
const identifier = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const records = Array.from({ length: 53 }, (_, i) => ({ id: identifier(i + 10), category: 'INFORMATION',
  title: i === 51 ? 'Released fixture' : i === 52 ? 'Withdrawn fixture' : `Draft fixture ${i + 1}`,
  body: 'Synthetic plain text only.', state: i === 51 ? 'RELEASED' : i === 52 ? 'WITHDRAWN' : 'DRAFT',
  created_at: stamp, updated_at: stamp, released_at: i >= 51 ? stamp : null }));
let sequence = 1000;
let uncertain = false;
const sqliteMode = process.argv.includes('--sqlite');
const sqliteFilename = sqliteMode ? join(mkdtempSync(join(tmpdir(), 'htc-sqlite-fixture-')), 'fixture.sqlite') : null;
const local = sqliteMode ? (await import('./local-sqlite-adapter.js')).createLocalSqlite({
  mode: 'sqlite', filename: sqliteFilename,
}) : null;
if (local) records.forEach(row => local.fixture.seedContent(row));
if (local) {
  local.fixture.asset(identifier(70),'READY');
  local.fixture.asset(identifier(71),'PENDING','audio/mpeg');
  local.fixture.asset(identifier(72),'DELETING','video/mp4');
}
process.env.SUPABASE_URL = 'https://vzkbcgfywyhtvprxpwfb.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic_fixture_only';
globalThis.fetch = async (input, options = {}) => {
  if (local) {
    return local.fetchImpl(input, options);
  }
  const url = new URL(String(input));
  if (url.origin !== process.env.SUPABASE_URL) throw Error('Fixture blocks external transport');
  const token = options.headers?.Authorization;
  if (url.pathname === '/auth/v1/user') return Response.json({ id: identifier(1), is_anonymous: false },
    { status: token === 'Bearer synthetic-expired' ? 401 : 200 });
  if (url.pathname === '/rest/v1/rpc/is_founder') return Response.json(token === 'Bearer synthetic-founder');
  if (token !== 'Bearer synthetic-founder' && !url.pathname.includes('read_released')) throw Error('Fixture denies unexpected identity');
  const args = JSON.parse(options.body ?? '{}');
  const payload = args.payload;
  if (url.pathname.endsWith('/list_trial_content_for_founder')) return Response.json(records
    .filter(row => !args.after_id || row.id > args.after_id).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 51));
  if (url.pathname.endsWith('/manage_trial_content')) {
    if (payload.action === 'read') return Response.json(records.find(row => row.id === payload.id) ?? null);
    if (payload.action !== 'create') throw Error('Fixture denies legacy mutation');
    const row = { id: identifier(sequence++), category: payload.category, title: payload.title, body: payload.body,
      state: 'DRAFT', created_at: stamp, updated_at: stamp, released_at: null };
    records.push(row);
    if (uncertain) { uncertain = false; throw Error('Synthetic ambiguous save'); }
    return Response.json(row);
  }
  if (url.pathname.endsWith('/update_trial_content_draft')) {
    const row = records.find(row => row.id === payload.id);
    if (!row) return Response.json({ outcome: 'not_found' });
    if (row.state !== 'DRAFT') return Response.json({ outcome: 'not_draft' });
    Object.assign(row, { category: payload.category, title: payload.title, body: payload.body });
    if (uncertain) { uncertain = false; throw Error('Synthetic ambiguous save'); }
    return Response.json({ outcome: 'saved', content: row });
  }
  if (url.pathname.endsWith('/read_released_content')) return Response.json(records.filter(row => row.state === 'RELEASED')
    .map(({ id, category, title, body }) => ({ id, category, title, body })));
  throw Error('Fixture blocks unhandled transport');
};
const next = require('next');
const app = next({ dev: false, hostname: 'localhost', port: 3103 });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((request, response) => {
  const url = new URL(request.url, origin);
  response.setHeader('X-HTC-Test-Mode', local ? 'LOCAL-SQLITE-SYNTHETIC-AUTH-NO-STORAGE' : 'SYNTHETIC-MEMORY');
  if (local && url.pathname === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('<h1>HTC LOCAL SQLite fixture</h1><p>Synthetic identities only. No live Supabase, OAuth, storage or PostgreSQL validation.</p><a href="/__fixture/session?role=founder">Open shared T13 UI as fixture Founder</a>'); return;
  }
  if (url.pathname.startsWith('/auth/')) { response.writeHead(403); response.end('Live OAuth disabled in fixture'); return; }
  if (url.pathname === '/__fixture/session') {
    const role = url.searchParams.get('role');
    const value = ['founder', 'user', 'expired'].includes(role) ? `synthetic-${role}` : '';
    response.writeHead(303, { 'Set-Cookie': `htc_trial_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value ? 3600 : 0}`,
      Location: '/founder/content', 'Cache-Control': 'no-store' }); response.end(); return;
  }
  if (url.pathname === '/__fixture/transition') {
    if (local) {
      void local.fetchImpl(`${local.env.SUPABASE_URL}/rest/v1/rpc/manage_trial_content`, {
        headers: { Authorization: 'Bearer synthetic-founder' },
        body: JSON.stringify({ payload: { action: 'release', id: url.searchParams.get('id') } }),
      }).then(() => response.end('LOCAL synthetic transition'), () => { response.writeHead(409); response.end('Fixture transition rejected'); }); return;
    }
    // Simulated fixture transition only; never an application publishing endpoint.
    const row = records.find(row => row.id === url.searchParams.get('id'));
    if (row) Object.assign(row, { state: 'RELEASED', released_at: stamp });
    response.end('synthetic transition'); return;
  }
  if (url.pathname === '/__fixture/uncertain') { if (local) local.fixture.failNextWrite('after-commit'); else uncertain = true; response.end('synthetic failure enabled'); return; }
  return handle(request, response);
});
server.listen(3103, '127.0.0.1', () => {
  console.log(`${local ? 'LOCAL SQLite with synthetic auth; no live storage' : 'T13 synthetic memory'} fixture ready at http://localhost:3103`);
  if (local) console.log(`Disposable local database: ${sqliteFilename}`);
});
process.on('SIGINT', () => server.close(() => { local?.close(); process.exit(0); }));
process.on('SIGTERM', () => server.close(() => { local?.close(); process.exit(0); }));
