import assert from 'node:assert/strict';
import { generateKeyPairSync, publicEncrypt, constants } from 'node:crypto';
import test from 'node:test';
import { createP04BootstrapHandler, createP04BootstrapRegistration, registerP04BootstrapProof } from '../src/server/community-telegram-p04-bootstrap.js';

const keys = generateKeyPairSync('rsa', { modulusLength: 3072 });
const nonce = 'a'.repeat(43);
const key = '12'.repeat(32);
const now = () => 100_000;
const origin = 'https://preview.example.invalid';
const env = {
  VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/group04-t18', HTC_SUPABASE_TARGET: 'test',
  SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock',
  HTC_TELEGRAM_TEST_BOT_TOKEN: '123:fixture_synthetic_bot_token', HTC_T23_TELEGRAM_G1_CHAT_ID: '-1001111',
  HTC_T23_TELEGRAM_G2_CHAT_ID: '-1002222', HTC_T23_P04_ENROLLMENT_PROOF_KEY: key,
  HTC_T23_P04_PROVISION_NONCE: nonce, HTC_T23_P04_PROVISION_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'pem' }),
};
const request = (from = origin, body) => new Request(origin + '/api/founder/telegram-test-bootstrap', {
  method: 'POST', headers: { origin: from, cookie: 'htc_trial_session=fixture' }, body, duplex: 'half',
});
const emptyStream = () => new ReadableStream({ start(controller) { controller.close(); } });

function fixture({ founder = true, config, failNative = false } = {}) {
  const calls = [];
  const handler = createP04BootstrapHandler({ env: { ...env, ...config }, now,
    async fetchImpl(url) {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: '00000000-0000-4000-8000-000000000001' });
      return Response.json(founder);
    },
    async fetchTelegram(url) {
      const method = url.pathname.split('/').at(-1);
      calls.push([method, url.searchParams.get('chat_id')]);
      const result = method === 'getChat' ? {
        id: -1001111, title: failNative ? 'Wrong' : 'HTC-T23-TEST-G1', type: 'supergroup',
      } : { status: 'administrator', can_manage_chat: true, user: { id: 123, is_bot: true, username: 'Htct23TestBot' } };
      return Response.json({ ok: true, result });
    },
  });
  return { handler, calls };
}

test('only verified G1 goes into a sealed Founder response and the registration boundary consumes once', async () => {
  const h = fixture();
  const response = await h.handler(request(origin, emptyStream()));
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(Object.keys(data), ['sealedProof']);
  assert.deepEqual(h.calls, [['getChat', '-1001111'], ['getChatMember', '-1001111']]);
  let recorded;
  const options = { privateKey: keys.privateKey, nonce, key, now, async registerOnce(input) {
    if (recorded) return false;
    recorded = input;
    return true;
  } };
  assert.equal(await registerP04BootstrapProof(data.sealedProof, options), true);
  assert.equal(recorded.chatId, '-1001111');
  assert.equal(await registerP04BootstrapProof(data.sealedProof, options), false);
});

test('wrong nonce, expiry, bad signing key and fabricated ciphertext are rejected before registration', async () => {
  const { data } = await (await fixture().handler(request())).json();
  const options = { privateKey: keys.privateKey, nonce, key, now, registerOnce: () => assert.fail('registration called') };
  for (const overrides of [{ nonce: 'b'.repeat(43) }, { now: () => 160_000 }, { key: '34'.repeat(32) }]) {
    assert.equal(await registerP04BootstrapProof(data.sealedProof, { ...options, ...overrides }), false);
  }
  const forged = publicEncrypt({ key: keys.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from('htc-t23-p04-g1-provision-v1|uzhkzhmncxjplrdtdzgd|HTC-T23-TEST-G1|' + nonce + '|123|-1001111|100|160|' + '00'.repeat(32)));
  assert.equal(await registerP04BootstrapProof(forged.toString('base64url'), options), false);
});

test('cross-origin, non-Founder, wrong branch and mismatched native identity cannot obtain a proof', async () => {
  for (const [h, input, status, nativeCalls] of [
    [fixture(), request('https://wrong.example.invalid'), 403, 0],
    [fixture({ founder: false }), request(origin, emptyStream()), 403, 0],
    [fixture({ config: { VERCEL_GIT_COMMIT_REF: 'main' } }), request(), 404, 0],
    [fixture({ failNative: true }), request(), 403, 1],
  ]) {
    assert.equal((await h.handler(input)).status, status);
    assert.equal(h.calls.length, nativeCalls);
  }
});

test('nonempty, errored, and stalled request streams are rejected before upstream checks', async () => {
  const handler = createP04BootstrapHandler({
    env,
    fetchImpl: () => assert.fail('Supabase must not be called'),
    fetchTelegram: () => assert.fail('Telegram must not be called'),
  });
  const bodies = [
    new Uint8Array([0]),
    new ReadableStream({ start(controller) { controller.error(new Error('stream failure')); } }),
    new ReadableStream(),
  ];
  for (const body of bodies) {
    assert.equal((await handler(request(origin, body))).status, 403);
  }
});

test('registration sends no sensitive binds until the same-session log and privilege guard succeeds', async () => {
  const input = { destination: 'HTC-T23-TEST-G1', botId: '123', chatId: '-1001111', expiresAt: 160 };
  const scopeId = '00000000-0000-4000-8000-000000000002';
  const operatorId = '00000000-0000-4000-8000-000000000003';
  for (const safe of [false, true]) {
    const calls = [];
    const register = createP04BootstrapRegistration({ key, scopeId, operatorId, async query(sql, parameters) {
      calls.push({ sql, parameters });
      return { rows: [calls.length === 1 ? { safe, backend_pid: 42 } : { registered: true }] };
    } });
    assert.equal(await register(input), safe);
    assert.equal(calls.length, safe ? 2 : 1);
    assert.equal(calls[0].parameters, undefined);
    if (safe) {
      assert.match(calls[1].sql, /pg_backend_pid\(\)=\$6/);
      assert.match(calls[1].sql, /ON CONFLICT \(alias\) DO NOTHING/);
      assert.ok(!calls[1].sql.includes(input.chatId) && !calls[1].sql.includes(key));
      assert.deepEqual(calls[1].parameters, [scopeId, input.botId, input.chatId, operatorId, Buffer.from(key, 'hex'), 42, 160]);
    }
  }
});
