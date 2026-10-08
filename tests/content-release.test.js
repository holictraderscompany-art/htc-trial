import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContentHandler } from '../src/server/content-release.js';

const id = '00000000-0000-4000-8000-000000000010';
const otherId = '00000000-0000-4000-8000-000000000011';
const env = { SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' };
const content = { id, category: 'INTRODUCTION', title: 'HTC', body: 'Educate | Empower | Elevate' };
const draft = { ...content, state: 'DRAFT', created_at: '2026-10-08', updated_at: '2026-10-08', released_at: null };
function request(payload, { token = 'test-session', query = '', raw, headers = {} } = {}) {
  return new Request(`http://localhost/api/content/manage${query}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? JSON.stringify(payload),
  });
}
function harness({ founder = true, rows = [], result = draft, user = { id }, fail, status } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (fail) throw new Error('secret upstream details');
    if (status) return Response.json({ message: 'secret database error' }, { status });
    if (url.endsWith('/auth/v1/user')) return Response.json(user);
    if (url.endsWith('/rpc/is_founder')) return Response.json(founder);
    if (url.endsWith('/rpc/manage_trial_content')) return Response.json(result);
    if (url.endsWith('/rpc/read_released_content')) return Response.json(rows);
    throw new Error('Unexpected upstream path');
  };
  return { calls, public: createContentHandler('public', { env, fetchImpl }), founder: createContentHandler('founder', { env, fetchImpl }) };
}

test('public path exposes only safe fields and ignores privileged caller token', async () => {
  const h = harness({ rows: [{ ...content, state: 'RELEASED', created_at: 'internal', released_at: 'internal', secret: 'internal' }] });
  const response = await h.public(new Request('http://localhost/api/content', { headers: { Authorization: 'Bearer founder-session' } }));
  assert.deepEqual(await response.json(), { ok: true, data: [content] });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(h.calls[0].options.headers.Authorization, undefined);
  assert.equal(h.calls[0].options.redirect, 'error');
  assert.equal(h.calls[0].options.cache, 'no-store');
  assert.deepEqual(JSON.parse(h.calls[0].options.body), { content_id: null });
});
test('DRAFT and WITHDRAWN upstream records fail closed without exposing content', async () => {
  for (const state of ['DRAFT', 'WITHDRAWN', 'UNKNOWN', null]) {
    const h = harness({ rows: [{ ...content, state }] });
    const response = await h.public(new Request(`http://localhost/api/content?id=${id}`));
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes(content.body));
  }
});
test('non-released identifier returns 404 under the database read contract', async () => {
  const h = harness();
  assert.equal((await h.public(new Request(`http://localhost/api/content?id=${id}`))).status, 404);
  assert.deepEqual(JSON.parse(h.calls[0].options.body), { content_id: id });
});
test('released identifier returns the safe record; mismatched identifier fails closed', async () => {
  const h = harness({ rows: [content] });
  assert.deepEqual(await (await h.public(new Request(`http://localhost/api/content?id=${id}`))).json(), { ok: true, data: content });
  const response = await harness({ rows: [{ ...content, id: otherId }] }).public(new Request(`http://localhost/api/content?id=${id}`));
  assert.equal(response.status, 500);
});
test('public query cannot select state, internal fields, duplicate ids or injected filters', async () => {
  for (const query of ['?state=DRAFT', '?select=*', `?id=${id}&id=${id}`, '?id=not-a-uuid', '?role=FOUNDER']) {
    const h = harness();
    assert.equal((await h.public(new Request(`http://localhost/api/content${query}`))).status, 400);
    assert.equal(h.calls.length, 0);
  }
});
test('USER denied create, update, release, withdraw and internal read', async () => {
  for (const action of ['create', 'update', 'release', 'withdraw', 'read']) {
    const h = harness({ founder: false });
    assert.equal((await h.founder(request({ action, id, email: 'holictraderscompany@gmail.com', role: 'FOUNDER' }, {
      headers: { 'X-Email': 'holictraderscompany@gmail.com', 'X-Role': 'FOUNDER' },
    }))).status, 403);
    assert.equal(h.calls.length, 2);
    assert.ok(!h.calls.some(call => call.url.endsWith('/manage_trial_content')));
  }
});
test('email and metadata claims never substitute for authoritative Founder authorization', async () => {
  for (const founder of [false, 'true', 1, { role: 'FOUNDER' }, null]) {
    const h = harness({ founder, user: { id, email: 'holictraderscompany@gmail.com', user_metadata: { role: 'FOUNDER' } } });
    assert.equal((await h.founder(request({ action: 'withdraw', id }))).status, 403);
  }
});
test('unauthenticated, anonymous and invalid identities denied', async () => {
  const h = harness();
  assert.equal((await h.founder(request({ action: 'read', id }, { token: null }))).status, 401);
  assert.equal(h.calls.length, 0);
  for (const user of [{ id, is_anonymous: true }, { id: 'invalid' }]) {
    const denied = harness({ user });
    assert.equal((await denied.founder(request({ action: 'read', id }))).status, 401);
    assert.equal(denied.calls.length, 1);
  }
});
test('authorized Founder performs each permitted operation with the original token', async () => {
  for (const payload of [
    { action: 'create', category: content.category, title: content.title, body: content.body },
    { action: 'update', id, category: content.category, title: content.title, body: content.body },
    { action: 'release', id }, { action: 'withdraw', id }, { action: 'read', id },
  ]) {
    const h = harness();
    const response = await h.founder(request(payload));
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(h.calls[2].options.body), { payload });
    for (const call of h.calls) assert.equal(call.options.headers.Authorization, 'Bearer test-session');
  }
});
test('Founder payload rejects state/identity spoofing, HTML, invalid types and unapproved Trial categories', async () => {
  const create = { action: 'create', category: 'INTRODUCTION', title: 'HTC', body: 'Trial introduction' };
  for (const payload of [
    null, [], { action: 'toString' }, { action: 'delete', id },
    { ...create, state: 'RELEASED' }, { ...create, email: 'holictraderscompany@gmail.com' },
    { ...create, title: '<script>' }, { ...create, title: ' ' }, { ...create, title: 'x'.repeat(201) },
    { ...create, body: 'x'.repeat(8001) }, { ...create, body: 1 },
    ...['LESSON', 'COURSE', 'MODULE', 'QUIZ', 'CURRICULUM', 'ENROLLMENT', 'PROGRESS', 'ASSESSMENT'].map(category => ({ ...create, category })),
    { action: 'release', id, state: 'RELEASED' }, { action: 'withdraw', id: 'invalid' },
  ]) {
    const h = harness();
    assert.equal((await h.founder(request(payload))).status, 400);
    assert.equal(h.calls.length, 2);
  }
});
test('malformed, oversized and unexpected Founder request inputs denied', async () => {
  for (const options of [{ raw: '{' }, { raw: 'x'.repeat(32769) }, { query: '?state=DRAFT' }, { headers: { 'Content-Type': 'text/plain' } }]) {
    const h = harness();
    assert.equal((await h.founder(request({ action: 'read', id }, options))).status, 400);
    assert.equal(h.calls.length, 2);
  }
});
test('missing internal record and upstream errors are controlled and redacted', async () => {
  assert.equal((await harness({ result: null }).founder(request({ action: 'read', id }))).status, 404);
  for (const options of [{ fail: true }, { status: 500 }, { rows: {} }, { rows: [null] }]) {
    const response = await harness(options).public(new Request('http://localhost/api/content'));
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes('secret'));
  }
});
test('production routes bind only their approved methods and boundaries', async () => {
  const publicRoute = await import('../src/app/api/content/route.js');
  const founderRoute = await import('../src/app/api/content/manage/route.js');
  assert.equal(publicRoute.runtime, 'nodejs');
  assert.equal(publicRoute.dynamic, 'force-dynamic');
  assert.equal(founderRoute.runtime, 'nodejs');
  assert.equal((await founderRoute.POST(request({ action: 'read', id }, { token: null }))).status, 401);
  assert.equal((await createContentHandler('public')(request({}))).status, 405);
  assert.equal((await createContentHandler('founder')(new Request('http://localhost/api/content/manage'))).status, 405);
});
test('database contract has no direct API-role table grants or unsafe public projection', () => {
  // Static regression guard only; executable database checks live in content-release.sql.
  const sql = readFileSync(new URL('../supabase/migrations/20261008_content_release.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public.trial_content from public, anon, authenticated/);
  const read = sql.split('create function public.read_released_content')[1].split('create function public.manage_trial_content')[0];
  assert.match(read, /select c.id, c.category, c.title, c.body/);
  assert.match(read, /c.state = 'RELEASED'/);
  assert.doesNotMatch(sql, /grant\s+(?:all|select|insert|update|delete)\s+on\s+(?:table\s+)?public.trial_content/i);
});

test('Rule A: Founder update returns private DRAFT with cleared release metadata', async () => {
  const edited = { ...draft, title: 'Edited', body: 'Edited Trial text', updated_at: '2026-10-09' };
  const h = harness({ result: edited });
  const response = await h.founder(request({ action: 'update', id, category: content.category, title: edited.title, body: edited.body }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, edited);
  assert.equal(JSON.parse(h.calls[2].options.body).payload.action, 'update');
  // The RPC contract omits the edited draft from both public lookup forms.
  const reads = harness({ rows: [] });
  assert.equal((await reads.public(new Request(`http://localhost/api/content?id=${id}`))).status, 404);
  assert.deepEqual((await (await reads.public(new Request('http://localhost/api/content'))).json()).data, []);
});

test('Rule B: Founder release needs only action and identifier', async () => {
  const released = { ...draft, state: 'RELEASED', released_at: '2026-10-09', updated_at: '2026-10-09' };
  const h = harness({ result: released });
  const payload = { action: 'release', id };
  const response = await h.founder(request(payload));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, released);
  assert.deepEqual(JSON.parse(h.calls[2].options.body), { payload });
});

test('Rule A/B: USER denied edits of DRAFT/RELEASED, release and withdraw', async () => {
  for (const state of ['DRAFT', 'RELEASED']) {
    for (const action of ['update', 'release', 'withdraw']) {
      const h = harness({ founder: false, result: { ...draft, state } });
      const payload = action === 'update'
        ? { action, id, category: content.category, title: 'Unauthorized', body: 'Unauthorized' }
        : { action, id };
      assert.equal((await h.founder(request(payload))).status, 403);
      assert.equal(h.calls.length, 2);
    }
  }
});

test('Rule B: unknown legacy release fields neither grant access nor remain accepted inputs', async () => {
  for (const legacy of [true, false, 'true']) {
    const payload = { action: 'release', id, trial_approved: legacy };
    const founder = harness();
    assert.equal((await founder.founder(request(payload))).status, 400);
    assert.equal(founder.calls.length, 2);
    const user = harness({ founder: false });
    assert.equal((await user.founder(request(payload))).status, 403);
    assert.equal(user.calls.length, 2);
  }
  assert.equal((await harness({ founder: false }).founder(request({ action: 'release', id }))).status, 403);
});

test('Rule A/B: SQL contract keeps edits atomic, explicit release and separate withdrawal', () => {
  // Static contract guard; actual database transitions are asserted in the local SQL suite.
  const sql = readFileSync(new URL('../supabase/migrations/20261008_content_release.sql', import.meta.url), 'utf8');
  const update = sql.split(/if operation = 'update' then\r?\n/)[1].split("elsif operation = 'release' then")[0];
  assert.doesNotMatch(update, /raise exception|record\.state/);
  assert.equal((update.match(/update public\.trial_content/g) ?? []).length, 1);
  assert.match(update, /state = 'DRAFT',\s*released_at = null, updated_at = now\(\)/);
  assert.match(sql, /for update;/);
  assert.match(sql, /auth\.uid\(\) is null or not public\.is_founder\(\)/);
  assert.match(sql, /operation = 'release' then allowed_keys := array\['action', 'id'\]/);
  const release = sql.split(/elsif operation = 'release' then\r?\n/)[1].split("elsif operation = 'withdraw' then")[0];
  assert.match(release, /record\.state = 'RELEASED'/);
  assert.match(release, /state = 'RELEASED', released_at = now\(\), updated_at = now\(\)/);
  assert.match(sql, /record\.state <> 'RELEASED'/);
  assert.match(sql, /state = 'WITHDRAWN', updated_at = now\(\)/);
  assert.match(sql, /where c\.state = 'RELEASED'/);
  assert.doesNotMatch(sql, /trial_approved|trialApproved|Withdraw before editing|attest/i);
});

for (const [field, maximum] of [['title', 200], ['body', 8000]]) {
  const cases = [
    ['A normal', 'Valid', true],
    ['B minimum', 'x', true],
    ['C maximum', 'x'.repeat(maximum), true],
    ['D maximum plus one', 'x'.repeat(maximum + 1), false],
    ['E leading spaces', '   Valid', true],
    ['F trailing spaces', 'Valid   ', true],
    ['G surrounding spaces', '   Valid   ', true],
    ['H whitespace only', ' \t\n\r\u00A0', false],
    ['I raw over maximum due to padding', ' '.repeat(maximum) + 'Valid', true],
    ['J normalized over maximum', ' ' + 'x'.repeat(maximum + 1) + ' ', false],
  ];
  for (const [label, value, accepted] of cases) {
    test(`normalized ${field}: ${label} across create, update and public reads`, async () => {
      for (const action of ['create', 'update']) {
        const payload = { action, ...(action === 'update' ? { id } : {}), category: content.category, title: content.title, body: content.body, [field]: value };
        const h = harness();
        const response = await h.founder(request(payload));
        assert.equal(response.status, accepted ? 200 : 400);
        if (accepted) {
          const forwarded = JSON.parse(h.calls[2].options.body).payload;
          assert.equal(forwarded[field], value.trim());
        } else assert.equal(h.calls.length, 2);
      }
      const h = harness({ rows: [{ ...content, [field]: value }] });
      const response = await h.public(new Request('http://localhost/api/content'));
      assert.equal(response.status, accepted ? 200 : 500);
      if (accepted) assert.equal((await response.json()).data[0][field], value.trim());
    });
  }
}

test('SQL trim character sets match String.trim; RPC normalizes before bounded storage', async () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261008_content_release.sql', import.meta.url), 'utf8');
  const sets = [...sql.matchAll(/U&'([^']+)'/g)].map(match => match[1].replace(/\\([0-9A-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))));
  const whitespace = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF';
  assert.equal(sets.length, 3);
  for (const set of sets) assert.equal(set, whitespace);
  assert.match(sql, /title = btrim\(title, U&'[^']+'\) and char_length\(title\) between 1 and 200/);
  assert.match(sql, /body = btrim\(body, U&'[^']+'\) and char_length\(body\) between 1 and 8000/);
  assert.match(sql, /'title', btrim\(payload->>'title', trim_characters\)/);
  assert.match(sql, /'body', btrim\(payload->>'body', trim_characters\)/);
  for (const character of whitespace) {
    const h = harness();
    assert.equal((await h.founder(request({ action: 'create', category: content.category, title: character + 'HTC' + character, body: character + 'Trial' + character }))).status, 200);
    const payload = JSON.parse(h.calls[2].options.body).payload;
    assert.equal(payload.title, 'HTC');
    assert.equal(payload.body, 'Trial');
    const blank = harness();
    assert.equal((await blank.founder(request({ action: 'create', category: content.category, title: character, body: 'Trial' }))).status, 400);
  }
});

test('normalized character limits count Unicode code points without rewriting inner text', async () => {
  for (const [field, maximum] of [['title', 200], ['body', 8000]]) {
    for (const size of [maximum, maximum + 1]) {
      const h = harness();
      const response = await h.founder(request({ action: 'create', category: content.category, title: 'HTC', body: 'Trial', [field]: ' ' + '\u{1F680}'.repeat(size) + ' ' }));
      assert.equal(response.status, size === maximum ? 200 : 400);
    }
  }
  const value = '  MiXeD  inner\ttext\nline\u200B\u0085e\u0301  ';
  const h = harness();
  assert.equal((await h.founder(request({ action: 'create', category: content.category, title: value, body: value }))).status, 200);
  const payload = JSON.parse(h.calls[2].options.body).payload;
  assert.equal(payload.title, value.trim());
  assert.equal(payload.body, value.trim());
});
