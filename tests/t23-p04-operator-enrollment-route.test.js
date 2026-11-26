import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createP04OperatorEnrollmentHandler } from '../src/server/community-telegram-p04-enrollment.js';

const origin = 'https://preview.example.invalid';
const actor = '00000000-0000-4000-8000-000000000001';
const session = '00000000-0000-4000-8000-000000000002';
const env = {
  VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/group04-t18', HTC_SUPABASE_TARGET: 'test',
  SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  HTC_T23_P04_ENROLLMENT_PROOF_KEY: 'ab'.repeat(32), HTC_TELEGRAM_TEST_BOT_TOKEN: '123:synthetic_not_a_real_token',
};

function request(data, { from = origin, search = '', cookie = 'htc_trial_session=fixture' } = {}) {
  return new Request(origin + '/api/community/telegram-test-enrollment' + search, {
    method: 'POST', headers: { origin: from, cookie, 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function fixture({ appointed = true, completeAllowed = true, config } = {}) {
  const h = { upstream: [], telegram: [], consumed: false };
  const window = [{ issued_at: new Date(99_000).toISOString(), expires_at: new Date(399_000).toISOString() }];
  h.handler = createP04OperatorEnrollmentHandler({
    env: { ...env, ...config }, now: () => 100_000,
    async fetchImpl(url, options) {
      const path = new URL(url).pathname.split('/').at(-1);
      const body = JSON.parse(options.body ?? '{}');
      h.upstream.push({ path, body });
      assert.equal(options.headers.Authorization, 'Bearer fixture');
      switch (path) {
        case 'user': return Response.json({ id: actor });
        case 'htc_t23_p04_enrollment_context':
          return Response.json(appointed ? [{ actor_id: actor, session_id: session, identity_generation: 4 }] : []);
        case 'htc_t23_p04_issue_enrollment':
          h.challengeDigest = body.p_digest;
          return Response.json(window);
        case 'htc_t23_p04_load_enrollment':
          return Response.json(!h.consumed && body.p_digest === h.challengeDigest ? window : []);
        case 'htc_t23_p04_complete_enrollment':
          if (completeAllowed) h.consumed = true;
          return Response.json(completeAllowed);
        default: assert.fail('Unexpected RPC');
      }
    },
    async fetchTelegram(url) {
      const method = url.pathname.split('/').at(-1);
      h.telegram.push(method);
      if (method === 'getWebhookInfo') return Response.json({ ok: true, result: { url: '' } });
      assert.equal(method, 'getUpdates');
      return Response.json({ ok: true, result: [{ update_id: 10, message: {
        date: 100, text: 'HTC-G1 ' + h.code, chat: { type: 'private', id: 456 },
        from: { id: 456, is_bot: false },
      } }] });
    },
  });
  return h;
}

async function issue(h) {
  const response = await h.handler(request({ action: 'issue' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { data } = await response.json();
  assert.deepEqual(Object.keys(data).sort(), ['code', 'expiresAt', 'id']);
  assert.equal(h.challengeDigest, createHash('sha256').update(data.code).digest('hex'));
  assert.deepEqual(h.telegram, []);
  h.code = data.code;
  return { action: 'complete', id: data.id, code: data.code };
}

test('operator can issue and complete, exposing only the suspended state, and replay never calls Telegram again', async () => {
  const h = fixture();
  const completion = await issue(h);
  const response = await h.handler(request(completion));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: { state: 'suspended' } });
  assert.deepEqual(h.telegram, ['getWebhookInfo', 'getUpdates']);
  assert.ok(h.upstream.every(({ body }) => !JSON.stringify(body).includes(h.code)));
  assert.equal((await h.handler(request(completion))).status, 403);
  assert.equal(h.telegram.length, 2);
  assert.equal(h.upstream.filter(({ path }) => path.endsWith('_complete_enrollment')).length, 1);
});

test('unguarded requests and client-supplied identity or scope are denied before upstream', async () => {
  for (const [config, input, status] of [
    [{ VERCEL_GIT_COMMIT_REF: 'main' }, request({ action: 'issue' }), 404],
    [{}, request({ action: 'issue' }, { from: 'https://other.example.invalid' }), 403],
    [{}, request({ action: 'issue' }, { search: '?scope=other' }), 403],
    [{}, request({ action: 'issue' }, { cookie: '' }), 403],
    [{}, request({ action: 'issue', actorId: actor }), 400],
    [{}, request({ action: 'complete', id: actor, code: 'a'.repeat(43), scope: 'G2' }), 400],
  ]) {
    const h = fixture({ config });
    assert.equal((await h.handler(input)).status, status);
    assert.deepEqual(h.upstream, []);
    assert.deepEqual(h.telegram, []);
  }
});

test('only a database-authorized operator can issue and database denial never returns suspended', async () => {
  const outsider = fixture({ appointed: false });
  assert.equal((await outsider.handler(request({ action: 'issue' }))).status, 403);
  assert.deepEqual(outsider.upstream.map(x => x.path), ['user', 'htc_t23_p04_enrollment_context']);
  assert.deepEqual(outsider.telegram, []);

  const rejected = fixture({ completeAllowed: false });
  const completion = await issue(rejected);
  assert.equal((await rejected.handler(request(completion))).status, 403);
  assert.equal(rejected.consumed, false);
});
