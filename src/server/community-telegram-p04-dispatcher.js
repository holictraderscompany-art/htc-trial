import { randomUUID } from 'node:crypto';
import { get as httpsGet } from 'node:https';
import { executeCommunityOperation } from './community-authorization.js';
import { ApiError, authorize, reply } from './api-foundation.js';
import { readSessionToken } from './session-token.js';

if (typeof window !== 'undefined') throw new Error('Server module');

const uuid = value => typeof value === 'string' && value.length === 36 &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const denied = () => ({ status: 'DENIED' });
const previewBranch = 'codex/group04-t18';
const testSupabaseUrl = 'https://uzhkzhmncxjplrdtdzgd.supabase.co';
const isPreview = env => env?.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === previewBranch;
const isTest = env => env?.HTC_SUPABASE_TARGET === 'test' && env.SUPABASE_URL === testSupabaseUrl;
const validChatId = value => typeof value === 'string' && /^-[1-9]\d{0,15}$/.test(value) &&
  Number.isSafeInteger(Number(value));

// Next.js fetch traces include the URL path, where Telegram requires the token.
// A one-shot Node HTTPS request avoids that trace and never follows redirects.
function readTelegramHttps(url, { signal }) {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new Error('Telegram TEST verification unavailable'));
    const request = httpsGet(url, { agent: false, signal }, async response => {
      try {
        const status = response.statusCode;
        if (status !== 200) {
          resolve({ status });
          response.destroy();
          return;
        }
        const chunks = [];
        let length = 0;
        for await (const chunk of response) {
          length += chunk.length;
          if (length > 65_536) throw new Error('Telegram TEST response exceeds limit');
          chunks.push(chunk);
        }
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve({ status, json: () => data });
      } catch {
        fail();
      }
    });
    request.on('error', fail);
  });
}

export async function readPreviewTelegramRights(destination, env, fetchTelegram = readTelegramHttps) {
  const g1 = env.HTC_T23_TELEGRAM_G1_CHAT_ID;
  const g2 = env.HTC_T23_TELEGRAM_G2_CHAT_ID;
  const chatId = destination === 'HTC-T23-TEST-G1' ? g1 :
    destination === 'HTC-T23-TEST-G2' ? g2 : null;
  const token = env.HTC_TELEGRAM_TEST_BOT_TOKEN;
  if (!chatId || !validChatId(g1) || !validChatId(g2) || g1 === g2 ||
      typeof token !== 'string' || !/^[1-9]\d{0,19}:[A-Za-z0-9_-]{20,128}$/.test(token)) return null;
  const botId = token.split(':', 1)[0];
  if (!Number.isSafeInteger(Number(botId))) return null;

  const signal = AbortSignal.timeout(10_000);
  async function read(method, params) {
    const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
    url.search = new URLSearchParams(params);
    const response = await fetchTelegram(url, { method: 'GET', cache: 'no-store', redirect: 'error', signal });
    if (response.status !== 200 || response.redirected || signal.aborted) return null;
    const payload = await response.json();
    return payload?.ok === true && !signal.aborted ? payload.result : null;
  }

  const chat = await read('getChat', { chat_id: chatId });
  if (!Number.isSafeInteger(chat?.id) || String(chat.id) !== chatId || chat.title !== destination ||
      !['group', 'supergroup'].includes(chat.type) || chat.username ||
      (chat.active_usernames != null && (!Array.isArray(chat.active_usernames) || chat.active_usernames.length))) {
    return null;
  }
  const member = await read('getChatMember', { chat_id: chatId, user_id: botId });
  if (member?.status !== 'administrator' || member.can_manage_chat !== true ||
      !Number.isSafeInteger(member.user?.id) || String(member.user.id) !== botId ||
      member.user.is_bot !== true || typeof member.user.username !== 'string' ||
      member.user.username.toLowerCase() !== 'htct23testbot') return null;
  return { chatId, botId };
}

// Internal read only. The host must load the challenge from trusted storage
// for the current HTC session, and atomically consume it before binding.
export async function readTelegramP04PossessionProof(challenge, {
  env = process.env, fetchTelegram = readTelegramHttps, now = Date.now,
} = {}) {
  const token = env?.HTC_TELEGRAM_TEST_BOT_TOKEN;
  const { code, issuedAt, expiresAt } = challenge ?? {};
  const start = now();
  if (!isPreview(env) || !isTest(env) || typeof token !== 'string' ||
      !/^[1-9]\d{0,19}:[A-Za-z0-9_-]{20,128}$/.test(token) || typeof code !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(code) || ![issuedAt, expiresAt, start].every(Number.isSafeInteger) ||
      issuedAt > start || start >= expiresAt) return null;
  const botId = Number(token.split(':', 1)[0]);
  if (!Number.isSafeInteger(botId)) return null;

  const signal = AbortSignal.timeout(10_000);
  async function read(method, query) {
    const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
    url.search = new URLSearchParams(query);
    const response = await fetchTelegram(url, { method: 'GET', cache: 'no-store', redirect: 'error', signal });
    if (response.status !== 200 || response.redirected || signal.aborted) return null;
    const payload = await response.json();
    return payload?.ok === true && !signal.aborted ? payload.result : null;
  }

  try {
    if ((await read('getWebhookInfo'))?.url !== '') return null;
    // Omit offset and allowed_updates so this probe neither acknowledges
    // queued updates nor changes the bot's update subscription.
    const updates = await read('getUpdates', { limit: '100', timeout: '0' });
    const observedAt = now();
    if (!Array.isArray(updates) || updates.length >= 100 || !Number.isSafeInteger(observedAt) ||
        observedAt < start || observedAt >= expiresAt) return null;
    const matching = updates.filter(update => update?.message?.text === `HTC-G1 ${code}`);
    if (matching.length !== 1) return null;
    const update = matching[0];
    const { message } = update;
    const sender = message.from;
    if (!Number.isSafeInteger(update.update_id) || update.update_id < 0 ||
        message.chat?.type !== 'private' || sender?.is_bot !== false ||
        !Number.isSafeInteger(sender.id) || sender.id <= 0 || sender.id === botId ||
        message.chat.id !== sender.id || message.forward_origin || message.sender_chat || message.via_bot ||
        !Number.isSafeInteger(message.date) || message.date < Math.floor(issuedAt / 1000) ||
        message.date > Math.floor(observedAt / 1000)) return null;
    return Object.freeze({ botId, nativeUserId: sender.id, updateId: update.update_id });
  } catch {
    return null;
  }
}

export function createTelegramP04PreviewVerification({ env = process.env, fetchImpl = fetch, fetchTelegram = readTelegramHttps } = {}) {
  return async function verify(request) {
    if (!isPreview(env) || !isTest(env)) return reply(404);
    if (request.method !== 'POST') return reply(405, null, 'POST');
    try {
      if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403);
      const headers = new Headers({ authorization: `Bearer ${readSessionToken(request)}` });
      await authorize(new Request(request.url, { headers }), 'founder', { env, fetchImpl });
      const evidence = await Promise.allSettled(['HTC-T23-TEST-G1', 'HTC-T23-TEST-G2']
        .map(destination => readPreviewTelegramRights(destination, env, fetchTelegram)));
      return reply(200, { status: evidence.every(result => result.status === 'fulfilled' && result.value)
        ? 'VERIFIED' : 'UNVERIFIED' });
    } catch (error) {
      return reply(error instanceof ApiError ? error.status : 500);
    }
  };
}

function authorized(intent, authority, now) {
  return authority?.allowed === true && authority.intentId === intent.id &&
    authority.grantVersion === intent.grantVersion && authority.bindingVersion === intent.bindingVersion &&
    authority.approvalRef === intent.approvalRef &&
    [intent.expiresAt, authority.sessionExpiresAt, authority.grantExpiresAt,
      authority.bindingExpiresAt, authority.approvalExpiresAt]
      .every(expiry => Number.isSafeInteger(expiry) && now < expiry);
}

// Internal fake-only boundary. The host owns all transport and connects only
// authenticated channels. The store must synchronously commit state + audit
// atomically, fence older owners, and return only after commit is known.
// A worker sees neither transport, authority snapshots, nor a send permit.
export function createTelegramP04Dispatcher({
  mode, store, readAuthority, startFake, ownsEgress, now = Date.now,
} = {}) {
  const epoch = randomUUID();
  let healthy = mode === 'fake-test';

  function transaction(update) {
    if (!healthy) return denied();
    try {
      if (ownsEgress() !== true) throw Error('Egress ownership unavailable');
      return store.transact(update);
    } catch {
      healthy = false;
      return denied();
    }
  }

  function owned(state) {
    if (state.epoch !== epoch) throw Error('Coordinator generation changed');
  }

  function transition(state, intent, status) {
    intent.status = status;
    state.audit.push({ kind: status, attempt: intent.attempt });
    return { status };
  }

  transaction(state => {
    state.epoch = epoch;
    if (state.gate === 'OPEN') state.gate = 'CLOSED';
    for (const intent of Object.values(state.intents)) {
      if (intent.status === 'RESERVED' || intent.status === 'IN_FLIGHT') {
        transition(state, intent, 'UNKNOWN');
      }
    }
    return { status: state.gate };
  });

  function open() {
    return transaction(state => {
      owned(state);
      if (state.gate !== 'CLOSED') return denied();
      state.gate = 'OPEN';
      state.audit.push({ kind: 'OPEN' });
      return { status: 'OPEN' };
    });
  }

  function cancelUnsent(id, attempt) {
    transaction(state => {
      owned(state);
      const intent = state.intents[id];
      if (!intent || intent.attempt !== attempt ||
          !['RESERVED', 'IN_FLIGHT'].includes(intent.status)) return denied();
      return transition(state, intent, 'CANCELLED');
    });
  }

  async function dispatch(channel, id) {
    if (!healthy || !uuid(id) || channel.isConnected() !== true) return denied();
    const reservation = transaction(state => {
      owned(state);
      const intent = state.intents[id];
      if (state.gate !== 'OPEN' || channel.isConnected() !== true ||
          !intent || intent.status !== 'QUEUED') return denied();
      intent.attempt = randomUUID();
      transition(state, intent, 'RESERVED');
      return { ...intent };
    });
    if (reservation.status !== 'RESERVED') return denied();

    let authority;
    try {
      authority = await readAuthority(channel, id, reservation.destination);
    } catch {
      cancelUnsent(id, reservation.attempt);
      return denied();
    }
    const admitted = transaction(state => {
      owned(state);
      const intent = state.intents[id];
      if (state.gate !== 'OPEN' || channel.isConnected() !== true ||
          !intent || intent.status !== 'RESERVED' || intent.attempt !== reservation.attempt ||
          intent.destination !== reservation.destination ||
          !authorized(intent, authority, now())) return denied();
      transition(state, intent, 'IN_FLIGHT');
      return { ...intent };
    });
    if (admitted.status !== 'IN_FLIGHT') {
      cancelUnsent(id, reservation.attempt);
      return denied();
    }

    // Deliberately no await between this guard and the coordinator's fake
    // invocation. A real asynchronous network writer needs its own fence.
    let eligible;
    try {
      eligible = healthy && ownsEgress() === true && channel.isConnected() === true &&
        authorized(admitted, authority, now());
    } catch {
      eligible = false;
    }
    if (!eligible) {
      cancelUnsent(id, reservation.attempt);
      return denied();
    }
    try {
      startFake(Object.freeze({
        intentId: id, attempt: admitted.attempt, destination: admitted.destination,
        marker: 'HTC TEST ' + admitted.attempt,
      }));
    } catch {
      const outcome = settle(id, admitted.attempt, 'UNKNOWN');
      return outcome.status === 'DENIED' ? { status: 'UNKNOWN' } : outcome;
    }
    return { status: 'IN_FLIGHT' };
  }

  // Host-only path. Close send admission durably before invoking HTC revoke.
  // A failed or ambiguous revoke stays closed for reconciliation.
  async function revoke(commitAuthorityRevoke) {
    const begin = transaction(state => {
      owned(state);
      if (state.gate !== 'OPEN') return denied();
      state.gate = 'REVOKING';
      state.audit.push({ kind: 'REVOKE_BEGIN' });
      for (const intent of Object.values(state.intents)) {
        if (intent.status === 'RESERVED') transition(state, intent, 'CANCELLED');
      }
      return { status: 'REVOKING' };
    });
    if (begin.status !== 'REVOKING') return begin;
    try {
      if (await commitAuthorityRevoke() !== true) return { status: 'REVOKING' };
    } catch {
      return { status: 'REVOKING' };
    }
    return transaction(state => {
      owned(state);
      state.gate = 'REVOKED';
      state.audit.push({ kind: 'REVOKE_COMMIT' });
      return { status: 'REVOKED' };
    });
  }

  // The host validates provider receipts or independent reconciliation
  // evidence before projecting these outcomes. Worker IPC cannot settle.
  function settle(id, attempt, status) {
    let outcomeMayHaveStarted = false;
    const result = transaction(state => {
      owned(state);
      const intent = state.intents[id];
      if (!uuid(attempt) || !intent || intent.attempt !== attempt ||
          !((intent.status === 'IN_FLIGHT' && ['ACKED', 'UNKNOWN'].includes(status)) ||
            (intent.status === 'UNKNOWN' && status === 'RECONCILED_SENT'))) return denied();
      outcomeMayHaveStarted = true;
      return transition(state, intent, status);
    });
    return !healthy && outcomeMayHaveStarted ? { status: 'UNKNOWN' } : result;
  }

  return Object.freeze({ dispatch, open, revoke, settle, stop: () => { healthy = false; } });
}

// Internal Next.js TEST composition. Only the host supplies the current
// dispatch authority reader. The community role/operation receipt by itself
// cannot authorize Telegram, and the transport remains synthetic.
export function createTelegramP04TestServer({
  mode, store, readCurrentAuthority, startFake, ownsEgress, now = Date.now,
  env = process.env, fetchImpl = fetch, fetchTelegram = readTelegramHttps,
} = {}) {
  const preview = isPreview(env);
  const local = env?.VERCEL == null && env?.VERCEL_ENV == null && env?.VERCEL_GIT_COMMIT_REF == null;
  const enabled = mode === 'fake-test' && isTest(env) && (local || preview);
  const dispatcher = createTelegramP04Dispatcher({
    mode: enabled ? 'fake-test' : undefined,
    store, startFake, ownsEgress, now,
    async readAuthority(channel, id, destination) {
      const precheck = await readCurrentAuthority?.(channel, id);
      if (!preview) return precheck ?? null;
      if (precheck?.db_precheck_ok !== true) return null;
      const native = await readPreviewTelegramRights(destination, env, fetchTelegram);
      // The Telegram read cannot upgrade a deny from the database. If both
      // sources pass, re-read the HTC authority after the network round trips.
      if (!native || precheck.dispatch_allowed !== true) return null;
      const current = await readCurrentAuthority(channel, id);
      return current?.db_precheck_ok === true && current.dispatch_allowed === true &&
        current.native_rights_verified === true && current.destination === destination &&
        current.chatId === native.chatId && current.botId === native.botId ? current : null;
    },
  });

  return Object.freeze({
    open: dispatcher.open,
    dispatch: dispatcher.dispatch,
    settle: dispatcher.settle,
    stop: dispatcher.stop,
    revokeDelegation(request, { operationId, delegationId, expectedDelegationVersion } = {}) {
      return dispatcher.revoke(async () => {
        // Admission is already closed. An unavailable RPC response keeps it
        // closed, since the database may have committed the operation.
        await executeCommunityOperation(request, {
          action: 'revoke_delegation', operationId, delegationId, expectedDelegationVersion,
        }, { env, fetchImpl, nowMs: now() });
        return true;
      });
    },
  });
}
