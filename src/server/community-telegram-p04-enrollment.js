import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { ApiError, authorize, readJson, reply } from './api-foundation.js';
import { readTelegramP04PossessionProof } from './community-telegram-p04-dispatcher.js';
import { readSessionToken } from './session-token.js';

if (typeof window !== 'undefined') throw new Error('Server module');

const uuid = value => typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const digest = code => createHash('sha256').update(code).digest('hex');
const sameSession = (a, b) => b && a.actorId === b.actorId && a.sessionId === b.sessionId &&
  a.generation === b.generation;
const isEnrollmentPreview = env => env.VERCEL_ENV === 'preview' &&
  env.VERCEL_GIT_COMMIT_REF === 'codex/group04-t18' &&
  env.HTC_SUPABASE_TARGET === 'test' && env.SUPABASE_URL === 'https://uzhkzhmncxjplrdtdzgd.supabase.co';
const validCode = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

// Internal TEST host only. readCurrentOperator verifies the current Auth session
// and configured pilot appointment. The store must implement atomic consume
// plus binding and audit, with its own current session and expiry checks.
export function createTelegramP04Enrollment({
  env = process.env, readCurrentOperator, store, now = Date.now, fetchTelegram,
} = {}) {
  const enabled = isEnrollmentPreview(env);

  async function operator() {
    const current = await readCurrentOperator();
    if (!uuid(current?.actorId) || !uuid(current.sessionId) || current.coreRole !== 'USER' ||
        !Number.isSafeInteger(current.generation) || current.generation < 1) return null;
    return { actorId: current.actorId, sessionId: current.sessionId, generation: current.generation };
  }

  async function issue() {
    if (!enabled) return null;
    try {
      const current = await operator();
      if (!current) return null;
      const code = randomBytes(32).toString('base64url');
      const id = randomUUID();
      const stored = await store.issue({ ...current, id, digest: digest(code) });
      const expiresAt = stored?.expiresAt;
      if (!Number.isSafeInteger(expiresAt) || expiresAt <= now()) return null;
      return { id, code, expiresAt };
    } catch {
      return null;
    }
  }

  async function complete({ id, code } = {}) {
    if (!enabled || !uuid(id) || !validCode(code)) return false;
    try {
      const current = await operator();
      if (!current) return false;
      const challengeDigest = digest(code);
      const challenge = await store.load({ ...current, id, digest: challengeDigest });
      if (!sameSession(current, challenge) || challenge.id !== id || challenge.digest !== challengeDigest ||
          challenge.consumedAt !== null || challenge.expiresAt <= now()) return false;
      const proof = await readTelegramP04PossessionProof({ code, issuedAt: challenge.issuedAt,
        expiresAt: challenge.expiresAt }, { env, now, fetchTelegram });
      if (!proof || !sameSession(current, await operator())) return false;
      return await store.consumeAndBind({ ...current, id, digest: challengeDigest, ...proof }) === true;
    } catch {
      return false;
    }
  }

  return Object.freeze({ issue, complete });
}

// The query connection is provided only by the trusted HTC TEST host.
// The protected SQL candidate controls which operations can be granted.
export function createTelegramP04EnrollmentStore(query) {
  const parameters = ({ id, actorId, sessionId, generation, digest }) =>
    [id, actorId, sessionId, generation, Buffer.from(digest, 'hex')];
  const timestamps = row => ({ issuedAt: new Date(row.issued_at).getTime(), expiresAt: new Date(row.expires_at).getTime() });

  return Object.freeze({
    async issue(challenge) {
      const { rows } = await query(`SELECT issued_at, expires_at
        FROM community_private.telegram_p04_issue_enrollment($1,$2,$3,$4,$5)`, parameters(challenge));
      return rows.length === 1 ? timestamps(rows[0]) : null;
    },
    async load(challenge) {
      const { rows } = await query(`SELECT issued_at, expires_at
        FROM community_private.telegram_p04_load_enrollment($1,$2,$3,$4,$5)`, parameters(challenge));
      return rows.length === 1 ? { ...challenge, ...timestamps(rows[0]), consumedAt: null } : null;
    },
    async consumeAndBind(proof) {
      const { rows } = await query(`SELECT community_private.telegram_p04_consume_enrollment(
        $1,$2,$3,$4,$5,$6,$7,$8) AS bound`,
      [...parameters(proof), proof.botId, proof.nativeUserId, proof.updateId]);
      return rows.length === 1 && rows[0].bound === true;
    },
  });
}

// Bind upstream to the operator's server-verified HTC TEST bearer. Only the
// enrollment host may call this adapter with proof from the Telegram reader.
export function createTelegramP04PostgrestConsumer({ upstream, env = process.env, now = Date.now } = {}) {
  return async function consumeAndBind(proof) {
    const secret = env.HTC_T23_P04_ENROLLMENT_PROOF_KEY;
    if (!isEnrollmentPreview(env) ||
        typeof secret !== 'string' || !/^[a-f0-9]{64}$/.test(secret) || !proof ||
        ![proof.id, proof.actorId, proof.sessionId].every(uuid) ||
        typeof proof.digest !== 'string' || !/^[a-f0-9]{64}$/.test(proof.digest) ||
        ![proof.generation, proof.botId, proof.nativeUserId].every(n => Number.isSafeInteger(n) && n > 0) ||
        !Number.isSafeInteger(proof.updateId) || proof.updateId < 0) return false;
    const expires = Math.floor(now() / 1000) + 30;
    if (!Number.isSafeInteger(expires) || expires <= 30) return false;

    const { id, actorId, sessionId, generation, digest, botId, nativeUserId, updateId } = proof;
    const payload = ['htc-t23-p04-enrollment-v1', id, actorId, sessionId, generation, digest,
      botId, nativeUserId, updateId, expires].join('|');
    const signature = createHmac('sha256', Buffer.from(secret, 'hex')).update(payload).digest('hex');
    try {
      return await upstream('/rest/v1/rpc/htc_t23_p04_complete_enrollment', { method: 'POST', body: JSON.stringify({
        p_id: id, p_actor: actorId, p_session: sessionId, p_generation: generation, p_digest: digest,
        p_bot: botId, p_native: nativeUserId, p_update: updateId, p_expires: expires, p_signature: signature,
      }) }) === true;
    } catch {
      return false;
    }
  };
}

// Internal host entry point. The request's HTC cookie is verified by Supabase
// Auth. All enrollment RPCs use that same operator bearer and database context.
export async function connectTelegramP04PostgrestEnrollment(request, {
  env = process.env, fetchImpl = fetch, fetchTelegram, now = Date.now,
} = {}) {
  if (!isEnrollmentPreview(env) ||
      typeof env.HTC_T23_P04_ENROLLMENT_PROOF_KEY !== 'string' ||
      !/^[a-f0-9]{64}$/.test(env.HTC_T23_P04_ENROLLMENT_PROOF_KEY)) return null;
  try {
    if (request.method !== 'POST' || request.headers.get('origin') !== new URL(request.url).origin) return null;
    const headers = { authorization: `Bearer ${readSessionToken(request)}` };
    const { user, upstream } = await authorize(new Request(request.url, { headers }), 'authenticated', { env, fetchImpl });
    const rpc = (operation, payload = {}) => upstream(`/rest/v1/rpc/htc_t23_p04_${operation}`, {
      method: 'POST', body: JSON.stringify(payload),
    });
    const readCurrentOperator = async () => {
      const rows = await rpc('enrollment_context');
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0].actor_id !== user.id) return null;
      const row = rows[0];
      return { actorId: row.actor_id, sessionId: row.session_id, generation: row.identity_generation, coreRole: 'USER' };
    };
    async function readChallenge(operation, { id, actorId, sessionId, generation, digest }) {
      const rows = await rpc(operation, { p_id: id, p_actor: actorId, p_session: sessionId,
        p_generation: generation, p_digest: digest });
      if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0].issued_at !== 'string' ||
          typeof rows[0].expires_at !== 'string') return null;
      return { id, actorId, sessionId, generation, digest, issuedAt: Date.parse(rows[0].issued_at),
        expiresAt: Date.parse(rows[0].expires_at), consumedAt: null };
    }
    return createTelegramP04Enrollment({ env, now, fetchTelegram, readCurrentOperator, store: {
      issue: challenge => readChallenge('issue_enrollment', challenge),
      load: challenge => readChallenge('load_enrollment', challenge),
      consumeAndBind: createTelegramP04PostgrestConsumer({ upstream, env, now }),
    } });
  } catch {
    return null;
  }
}

export function createP04OperatorEnrollmentHandler(options = {}) {
  const { env = process.env } = options;
  return async function enroll(request) {
    if (!isEnrollmentPreview(env)) return reply(404);
    if (request.method !== 'POST') return reply(405, null, 'POST');
    const url = new URL(request.url);
    if (request.headers.get('origin') !== url.origin || url.search) return reply(403);

    try {
      const input = await readJson(request, 256);
      if (!input || Object.getPrototypeOf(input) !== Object.prototype) return reply(400);

      const fields = Object.keys(input).length;
      const issue = input.action === 'issue' && fields === 1;
      const complete = input.action === 'complete' && fields === 3 && uuid(input.id) && validCode(input.code);
      if (!issue && !complete) return reply(400);

      const enrollment = await connectTelegramP04PostgrestEnrollment(request, options);
      if (!enrollment) return reply(403);
      if (issue) {
        const challenge = await enrollment.issue();
        return challenge ? reply(200, challenge) : reply(403);
      }
      return await enrollment.complete({ id: input.id, code: input.code })
        ? reply(200, { state: 'suspended' }) : reply(403);
    } catch (error) {
      return reply(error instanceof ApiError ? error.status : 500);
    }
  };
}
