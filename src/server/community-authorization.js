import { types } from 'node:util';
import { ApiError, authorize } from './api-foundation.js';

if (typeof window !== 'undefined') throw new Error('Server module');

// Unwired TEST boundary, not an HTTP route or a reusable permission receipt.
// Auth verifies the bearer before its claims are inspected. The database RPC
// must independently verify current identity/session/delegation and perform the
// protected operation atomically; this module never grants from a precheck alone.
const testUrl = 'https://uzhkzhmncxjplrdtdzgd.supabase.co';
const id = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const version = value => Number.isSafeInteger(value) && value > 0;
const platforms = ['whatsapp', 'telegram', 'discord'];
const capabilities = ['case.read_assigned', 'case.review_assigned', 'case.escalate_assigned',
  'case.appeal_review_assigned', 'case.correction_review_assigned'];
const fieldsByAction = Object.freeze({
  propose_delegation: ['subjectUserId', 'platform', 'communityId', 'capabilities', 'validFrom', 'expiresAt'],
  approve_delegation: ['delegationId', 'expectedDelegationVersion'],
  revoke_delegation: ['delegationId', 'expectedDelegationVersion'],
  create_case: ['delegationId', 'expectedDelegationVersion'],
  assign_case: ['caseId', 'expectedCaseVersion', 'delegationId', 'expectedDelegationVersion', 'phase'],
  read_case: ['caseId', 'expectedCaseVersion', 'delegationId', 'expectedDelegationVersion'],
  review_case: ['caseId', 'expectedCaseVersion', 'delegationId', 'expectedDelegationVersion', 'decision'],
  escalate_case: ['caseId', 'expectedCaseVersion', 'delegationId', 'expectedDelegationVersion'],
  set_reviewer_governance: ['caseId', 'expectedCaseVersion', 'delegationId', 'expectedDelegationVersion',
    'reviewerSlot', 'reviewerStatus', 'personalAccount', 'available', 'conflictDeclared'],
});

export class CommunityAuthorizationError extends Error {
  constructor(code, status) {
    super(status === 503 ? 'Community operation outcome unavailable.' : 'Community operation denied.');
    this.name = 'CommunityAuthorizationError';
    this.code = code;
    this.status = status;
  }
}
const deny = (code = 'COMMUNITY_UNAVAILABLE', status = 503) => {
  throw new CommunityAuthorizationError(code, status);
};

function record(value, names, code, status) {
  if (!value || typeof value !== 'object' || types.isProxy(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) deny(code, status);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== names.length || !names.every(name => keys.includes(name))) deny(code, status);
  const copy = {};
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) deny(code, status);
    copy[name] = descriptor.value;
  }
  return copy;
}

const freshnessReasons = ['SESSION_ABSOLUTE_EXPIRED', 'SESSION_INACTIVITY_EXPIRED',
  'RECENT_AUTH_REQUIRED', 'SESSION_FRESHNESS_UNAVAILABLE'];

// Only a bounded denial from the fixed TEST database facades requests a new
// authentication. This is never an operation result or a permission receipt.
export function withCommunityFreshnessResponses(fetchImpl) {
  return async (url, options) => {
    const response = await fetchImpl(url, options);
    if (response.status !== 401 || ![`${testUrl}/rest/v1/rpc/htc_community_operation`,
      `${testUrl}/rest/v1/rpc/htc_community_workspace_access`].includes(url)) return response;
    if (!response.body || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) deny();
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 2048) { await reader.cancel(); deny(); }
        chunks.push(value);
      }
    } catch { deny(); }
    finally { reader.releaseLock(); }
    let raw;
    try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { deny(); }
    const denial = record(raw, ['reauthenticationRequired', 'reason', 'enforcementAuthorized',
      'dispatchAuthorized', 'code'], 'COMMUNITY_UNAVAILABLE', 503);
    if (denial.reauthenticationRequired !== true || denial.enforcementAuthorized !== false ||
        denial.dispatchAuthorized !== false || denial.code !== 'T23_REAUTHENTICATION_REQUIRED' ||
        !freshnessReasons.includes(denial.reason)) deny();
    deny('COMMUNITY_REAUTHENTICATION_REQUIRED', 401);
  };
}

function operationInput(value) {
  const code = 'INVALID_COMMUNITY_OPERATION';
  if (!value || typeof value !== 'object' || types.isProxy(value)) deny(code, 400);
  const action = Object.getOwnPropertyDescriptor(value, 'action');
  if (!action || !Object.hasOwn(action, 'value') || typeof action.value !== 'string' ||
      !Object.hasOwn(fieldsByAction, action.value)) deny(code, 400);
  const input = record(value, ['action', 'operationId', ...fieldsByAction[action.value]], code, 400);
  if (!id(input.operationId)) deny(code, 400);
  for (const name of ['subjectUserId', 'communityId', 'delegationId', 'caseId']) {
    if (Object.hasOwn(input, name) && !id(input[name])) deny(code, 400);
  }
  for (const name of ['expectedDelegationVersion', 'expectedCaseVersion']) {
    if (Object.hasOwn(input, name) && !version(input[name])) deny(code, 400);
  }
  if (['approve_delegation', 'revoke_delegation'].includes(input.action) &&
      input.expectedDelegationVersion === Number.MAX_SAFE_INTEGER) deny(code, 400);
  if (['assign_case', 'review_case', 'escalate_case', 'set_reviewer_governance'].includes(input.action) &&
      input.expectedCaseVersion === Number.MAX_SAFE_INTEGER) deny(code, 400);
  if (input.action === 'propose_delegation') {
    if (!platforms.includes(input.platform) || !Array.isArray(input.capabilities) ||
        types.isProxy(input.capabilities) || Object.getPrototypeOf(input.capabilities) !== Array.prototype)
      deny(code, 400);
    const length = Object.getOwnPropertyDescriptor(input.capabilities, 'length')?.value;
    if (!Number.isSafeInteger(length) || length < 1 || length > capabilities.length ||
        Reflect.ownKeys(input.capabilities).length !== length + 1) deny(code, 400);
    const allowed = [];
    for (let index = 0; index < length; index++) {
      const item = Object.getOwnPropertyDescriptor(input.capabilities, String(index));
      if (!item || !Object.hasOwn(item, 'value') || !capabilities.includes(item.value) ||
          allowed.includes(item.value)) deny(code, 400);
      allowed.push(item.value);
    }
    input.capabilities = allowed;
    for (const name of ['validFrom', 'expiresAt']) {
      if (typeof input[name] !== 'string' || input[name].length !== 24 ||
          !Number.isFinite(Date.parse(input[name])) || new Date(input[name]).toISOString() !== input[name])
        deny(code, 400);
    }
    if (Date.parse(input.expiresAt) <= Date.parse(input.validFrom)) deny(code, 400);
  }
  if (input.action === 'assign_case' && !['review', 'appeal', 'correction'].includes(input.phase)) deny(code, 400);
  if (input.action === 'review_case' && !['no_action', 'refer_to_authorized_human'].includes(input.decision)) deny(code, 400);
  if (input.action === 'set_reviewer_governance') {
    // These are governance data recorded by the trusted Founder-only database
    // operation. Caller flags do not authenticate an actor or grant approval.
    if (!['primary', 'backup'].includes(input.reviewerSlot) ||
        !['approved', 'revoked'].includes(input.reviewerStatus) ||
        ['personalAccount', 'available', 'conflictDeclared'].some(name => typeof input[name] !== 'boolean') ||
        (input.reviewerStatus === 'revoked' && input.available)) deny(code, 400);
  }
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 2048) deny(code, 400);
  return input;
}

function verifiedTokenClaims(request, userId, nowMs) {
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i
    .exec(request.headers.get('authorization') ?? '');
  if (!match || match[1].length > 8192) deny('UNAUTHENTICATED', 401);
  const decode = value => {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.toString('base64url') !== value) deny('UNAUTHENTICATED', 401);
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  };
  let header, claims;
  try {
    const parts = match[1].split('.');
    header = decode(parts[0]);
    claims = decode(parts[1]);
  } catch { deny('UNAUTHENTICATED', 401); }
  if (!header || !['RS256', 'ES256', 'HS256'].includes(header.alg) ||
      (header.typ !== undefined && header.typ !== 'JWT') || !claims ||
      claims.sub !== userId || !id(claims.session_id) || claims.aud !== 'authenticated' ||
      claims.iss !== `${testUrl}/auth/v1` || !Number.isSafeInteger(claims.exp) ||
      claims.exp * 1000 <= nowMs || !Number.isSafeInteger(claims.exp * 1000) ||
      (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf * 1000 > nowMs)))
    deny('UNAUTHENTICATED', 401);
}

function operationResult(raw, input) {
  const output = record(raw, ['operationId', 'outcome', 'caseId', 'caseVersion', 'delegationId',
    'delegationVersion', 'replayed', 'enforcementAuthorized', 'dispatchAuthorized'], 'COMMUNITY_UNAVAILABLE', 503);
  const isDelegation = ['propose_delegation', 'approve_delegation', 'revoke_delegation'].includes(input.action);
  const held = output.outcome === 'held';
  const mayHold = ['read_case', 'review_case', 'escalate_case'].includes(input.action) ||
    (input.action === 'assign_case' && ['appeal', 'correction'].includes(input.phase));
  if (output.operationId !== input.operationId || !id(output.delegationId) ||
      !version(output.delegationVersion) || typeof output.replayed !== 'boolean' ||
      output.enforcementAuthorized !== false || output.dispatchAuthorized !== false ||
      (held ? !mayHold || output.replayed : output.outcome !== (input.action === 'read_case' ? 'authorized' : 'recorded')) ||
      (input.delegationId !== undefined && output.delegationId !== input.delegationId) ||
      (isDelegation ? output.caseId !== null || output.caseVersion !== null :
        !id(output.caseId) || !version(output.caseVersion)) ||
      (input.caseId !== undefined && output.caseId !== input.caseId)) deny();
  const expectedDelegation = input.action === 'propose_delegation' ? input.capabilities.length + 1 :
    input.expectedDelegationVersion + (['approve_delegation', 'revoke_delegation'].includes(input.action) ? 1 : 0);
  const expectedCase = isDelegation ? null : input.action === 'create_case' ? 1 :
    input.expectedCaseVersion + (input.action === 'read_case' && !held ? 0 : 1);
  if (output.delegationVersion !== expectedDelegation || output.caseVersion !== expectedCase) deny();
  return Object.freeze(output);
}

// dependencies are server/test wiring only, never request body fields. No route
// imports this function until the database facade has passed its separate review.
export async function executeCommunityOperation(request, operation, {
  env = process.env, fetchImpl = fetch, nowMs = Date.now(),
} = {}) {
  try {
    const input = operationInput(operation);
    if (env.HTC_SUPABASE_TARGET !== 'test' || env.SUPABASE_URL !== testUrl ||
        !Number.isSafeInteger(nowMs) || nowMs < 0) deny();
    if (request.method !== 'POST') deny('INVALID_COMMUNITY_OPERATION', 400);
    const { user, upstream } = await authorize(request, 'authenticated', { env, fetchImpl: withCommunityFreshnessResponses(fetchImpl) });
    if (!id(user.id) || user.is_anonymous !== false || typeof user.email !== 'string' ||
        !user.email.trim() || user.email.length > 320 || typeof user.email_confirmed_at !== 'string' ||
        !Number.isFinite(Date.parse(user.email_confirmed_at)) || Date.parse(user.email_confirmed_at) > nowMs ||
        user.app_metadata?.provider !== 'google' || !Array.isArray(user.identities) ||
        !user.identities.some(identity => identity?.provider === 'google' && identity.user_id === user.id))
      deny('COMMUNITY_IDENTITY_DENIED', 403);
    verifiedTokenClaims(request, user.id, nowMs);
    if (input.action === 'propose_delegation' && input.subjectUserId === user.id)
      deny('COMMUNITY_IDENTITY_DENIED', 403);
    // A lost response may follow a committed transaction. Never retry here or
    // represent an unavailable response as proof of rollback; reconciliation
    // must retain the same operation ID and immutable intent.
    const result = await upstream('/rest/v1/rpc/htc_community_operation', {
      method: 'POST', body: JSON.stringify({ p_request: input }),
    });
    return operationResult(result, input);
  } catch (error) {
    if (error instanceof CommunityAuthorizationError) throw error;
    if (error instanceof ApiError && error.status === 401) deny('UNAUTHENTICATED', 401);
    deny();
  }
}
