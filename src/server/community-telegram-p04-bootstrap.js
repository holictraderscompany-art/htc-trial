import { constants, createHmac, createPublicKey, privateDecrypt, publicEncrypt, timingSafeEqual } from 'node:crypto';
import { ApiError, authorize, reply } from './api-foundation.js';
import { readPreviewTelegramRights } from './community-telegram-p04-dispatcher.js';
import { readSessionToken } from './session-token.js';

if (typeof window !== 'undefined') throw new Error('Server module');

const project = 'uzhkzhmncxjplrdtdzgd';
const destination = 'HTC-T23-TEST-G1';
const domain = 'htc-t23-p04-g1-provision-v1';
const sign = (value, key) => createHmac('sha256', Buffer.from(key, 'hex')).update(value).digest('hex');
const isKey = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isNonce = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const isUuid = value => typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const isId = (value, sign) => typeof value === 'string' && String(Number(value)) === value &&
  Number.isSafeInteger(Number(value)) && sign * Number(value) > 0;
const rsa = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' };

export function createP04BootstrapHandler({ env = process.env, fetchImpl = fetch, fetchTelegram, now = Date.now } = {}) {
  return async function bootstrap(request) {
    if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== 'codex/group04-t18' ||
        env.HTC_SUPABASE_TARGET !== 'test' || env.SUPABASE_URL !== `https://${project}.supabase.co`) return reply(404);
    if (request.method !== 'POST') return reply(405, null, 'POST');
    try {
      if (request.headers.get('origin') !== new URL(request.url).origin || new URL(request.url).search || request.body) return reply(403);
      const headers = { authorization: `Bearer ${readSessionToken(request)}` };
      await authorize(new Request(request.url, { headers }), 'founder', { env, fetchImpl });

      const key = env.HTC_T23_P04_ENROLLMENT_PROOF_KEY;
      const nonce = env.HTC_T23_P04_PROVISION_NONCE;
      if (!isKey(key) || !isNonce(nonce)) return reply(404);
      const recipient = createPublicKey(env.HTC_T23_P04_PROVISION_PUBLIC_KEY);
      if (recipient.asymmetricKeyType !== 'rsa' || recipient.asymmetricKeyDetails.modulusLength !== 3072) return reply(404);

      const rights = await readPreviewTelegramRights(destination, env, fetchTelegram);
      if (!isId(rights?.botId, 1) || !isId(rights?.chatId, -1)) return reply(403);
      const issued = Math.floor(now() / 1000);
      const statement = [domain, project, destination, nonce, rights.botId, rights.chatId, issued, issued + 60].join('|');
      const sealed = publicEncrypt({ key: recipient, ...rsa }, Buffer.from(`${statement}|${sign(statement, key)}`));
      return reply(200, { sealedProof: sealed.toString('base64url') });
    } catch (error) {
      return reply(error instanceof ApiError ? error.status : 500);
    }
  };
}

// Provisioning host only. The database registration operation must consume
// the nonce atomically with its insert and reject conflicting G1 rows.
export async function registerP04BootstrapProof(sealedProof, {
  privateKey, nonce, key, registerOnce, now = Date.now,
} = {}) {
  if (!isKey(key) || !isNonce(nonce) || typeof sealedProof !== 'string' ||
      !/^[A-Za-z0-9_-]{512}$/.test(sealedProof)) return false;
  try {
    const data = privateDecrypt({ key: privateKey, ...rsa }, Buffer.from(sealedProof, 'base64url')).toString('utf8');
    const fields = data.split('|');
    if (fields.length !== 9) return false;
    const [observedDomain, observedProject, observedDestination, observedNonce, botId, chatId, issued, expires, signature] = fields;
    const current = Math.floor(now() / 1000);
    const issuedAt = Number(issued);
    const expiresAt = Number(expires);
    if (observedDomain !== domain || observedProject !== project || observedDestination !== destination ||
        observedNonce !== nonce || !isId(botId, 1) || !isId(chatId, -1) ||
        !Number.isSafeInteger(issuedAt) || issuedAt > current || expiresAt !== issuedAt + 60 ||
        current >= expiresAt || !isKey(signature)) return false;
    const expected = sign(fields.slice(0, -1).join('|'), key);
    if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) return false;
    return await registerOnce({ nonce, destination, botId, chatId, expiresAt }) === true;
  } catch {
    return false;
  }
}

// query must be pinned to one already authenticated, verify-full TEST backend.
// Never send the bind values before the separate read-only preflight succeeds.
export function createP04BootstrapRegistration({ query, scopeId, operatorId, key } = {}) {
  return async function registerOnce({ destination: alias, botId, chatId, expiresAt } = {}) {
    if (!isUuid(scopeId) || !isUuid(operatorId) || !isKey(key) || alias !== destination ||
        !isId(botId, 1) || !isId(chatId, -1) || !Number.isSafeInteger(expiresAt)) return false;
    const { rows: [session] } = await query(`SELECT pg_backend_pid() AS backend_pid,
      current_user = 'postgres' AND current_database() = 'postgres'
        AND current_setting('log_parameter_max_length') = '0'
        AND current_setting('auto_explain.log_parameter_max_length') = '0'
        AND current_setting('log_parameter_max_length_on_error') = '0'
        AND current_setting('pgaudit.log_parameter', true) = 'off'
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
        AND has_table_privilege(current_user,'community_private.telegram_test_destinations','INSERT')
        AND has_table_privilege(current_user,'community_private.telegram_p04_enrollment_authority','INSERT') AS safe`);
    if (session?.safe !== true || !Number.isSafeInteger(session.backend_pid)) return false;

    // G1's primary key and the authority singleton are durable one-shot gates.
    // A conflict inserting the authority rolls back the destination insert.
    const { rows } = await query(`WITH registered AS (
      INSERT INTO community_private.telegram_test_destinations(alias,scope_id,bot_id,chat_id)
      SELECT 'HTC-T23-TEST-G1',$1::uuid,$2::bigint,$3::bigint
      WHERE pg_backend_pid()=$6::integer AND pg_catalog.clock_timestamp()<pg_catalog.to_timestamp($7::double precision)
        AND NOT EXISTS (SELECT 1 FROM community_private.telegram_p04_enrollment_authority)
      ON CONFLICT (alias) DO NOTHING RETURNING alias
    ) INSERT INTO community_private.telegram_p04_enrollment_authority(singleton,operator_id,proof_key)
      SELECT true,$4::uuid,$5::bytea FROM registered RETURNING singleton AS registered`,
    [scopeId, botId, chatId, operatorId, Buffer.from(key, 'hex'), session.backend_pid, expiresAt]);
    return rows.length === 1 && rows[0].registered === true;
  };
}
