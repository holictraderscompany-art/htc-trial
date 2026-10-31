// ID2A: pure policy simulation only. NOT a JWT/session validator or live guard.
// No route may use this module as proof of authenticated moderator authority.
export const COMMUNITY_CAPABILITIES = Object.freeze([
  'case.read_assigned', 'case.review_assigned', 'case.escalate_assigned',
  'case.appeal_review_assigned', 'case.correction_review_assigned',
]);
export const DELEGATION_DENIAL_CODES = Object.freeze([
  'INVALID_INPUT', 'INVALID_CLOCK', 'UNVERIFIED_IDENTITY', 'CORE_ROLE_DENIED',
  'IDENTITY_REVALIDATION_REQUIRED', 'INVALID_SESSION', 'SESSION_EXPIRED',
  'HUMAN_OVERSIGHT_UNAVAILABLE', 'NO_DELEGATION', 'INVALID_DELEGATION',
  'SELF_APPOINTMENT', 'MISSING_FOUNDER_APPROVAL', 'DELEGATION_INACTIVE',
  'DELEGATION_NOT_STARTED', 'DELEGATION_EXPIRED', 'STALE_DELEGATION_VERSION',
  'STALE_IDENTITY_VERSION', 'SCOPE_MISMATCH', 'CAPABILITY_NOT_ALLOWED',
  'CAPABILITY_NOT_DELEGATED', 'CASE_MISMATCH', 'STALE_CASE_VERSION',
  'NOT_ASSIGNED', 'REVIEW_CONFLICT', 'INDEPENDENCE_UNVERIFIED',
]);
const platforms = ['whatsapp', 'telegram', 'discord'];
const uuid = value => typeof value === 'string' && value.length === 36 &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => integer(value) && value > 0;
const boolean = value => typeof value === 'boolean';
const reject = code => { throw code; }; // Fixed codes only, never input/error text.

function fields(value, keys) {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    reject('INVALID_INPUT');
  const names = Reflect.ownKeys(value);
  if (names.length !== keys.length || !keys.every(key => names.includes(key))) reject('INVALID_INPUT');
  const copy = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) reject('INVALID_INPUT');
    copy[key] = descriptor.value;
  }
  return copy;
}

function capabilities(value) {
  if (!Array.isArray(value)) reject('INVALID_INPUT');
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!integer(length) || length > COMMUNITY_CAPABILITIES.length) reject('INVALID_INPUT');
  const copy = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) reject('INVALID_INPUT');
    if (!COMMUNITY_CAPABILITIES.includes(descriptor.value)) reject('CAPABILITY_NOT_ALLOWED');
    if (copy.includes(descriptor.value)) reject('INVALID_DELEGATION');
    copy.push(descriptor.value);
  }
  return copy;
}

const result = code => Object.freeze({
  prototype: true, simulationOnly: true, liveAuthorization: false,
  enforcementAuthorized: false, policyStatus: 'PROPOSED',
  decision: code === 'POLICY_SATISFIED' ? 'permit' : 'deny',
  reasonCodes: Object.freeze([code]),
});

// nowMs is an injected synthetic clock value, not a client-controlled live clock.
// The context shape models future trusted readers; all fields are fixtures here.
export function evaluateCommunityDelegationPolicy(context, request, nowMs) {
  try {
    if (!integer(nowMs)) reject('INVALID_CLOCK');
    const c = fields(context, ['synthetic', 'identity', 'session', 'delegation', 'resource', 'humanOversightAvailable']);
    if (c.synthetic !== true || !boolean(c.humanOversightAvailable)) reject('INVALID_INPUT');
    const i = fields(c.identity, ['userId', 'coreRole', 'emailConfirmed', 'exists', 'anonymous', 'identityVersion', 'revalidationRequired']);
    if (!uuid(i.userId) || !positive(i.identityVersion) || ![i.emailConfirmed, i.exists, i.anonymous, i.revalidationRequired].every(boolean))
      reject('INVALID_INPUT');
    if (!i.exists || i.anonymous || !i.emailConfirmed) reject('UNVERIFIED_IDENTITY');
    if (i.coreRole !== 'USER') reject('CORE_ROLE_DENIED');
    if (i.revalidationRequired) reject('IDENTITY_REVALIDATION_REQUIRED');
    const s = fields(c.session, ['id', 'subjectUserId', 'current', 'revoked', 'expiresAtMs']);
    if (!uuid(s.id) || !uuid(s.subjectUserId) || !integer(s.expiresAtMs) || !boolean(s.current) || !boolean(s.revoked))
      reject('INVALID_INPUT');
    if (s.subjectUserId !== i.userId || !s.current || s.revoked) reject('INVALID_SESSION');
    if (nowMs >= s.expiresAtMs) reject('SESSION_EXPIRED');
    if (!c.humanOversightAvailable) reject('HUMAN_OVERSIGHT_UNAVAILABLE');

    const r = fields(request, ['caseId', 'platform', 'communityId', 'capability', 'expectedDelegationVersion', 'expectedCaseVersion']);
    if (!uuid(r.caseId) || !uuid(r.communityId) || !platforms.includes(r.platform) ||
      !positive(r.expectedDelegationVersion) || !positive(r.expectedCaseVersion)) reject('INVALID_INPUT');
    if (!COMMUNITY_CAPABILITIES.includes(r.capability)) reject('CAPABILITY_NOT_ALLOWED');
    if (c.delegation === null) reject('NO_DELEGATION');
    const d = fields(c.delegation, ['id', 'subjectUserId', 'appointedByUserId', 'founderApprovalVerified',
      'platform', 'communityId', 'capabilities', 'status', 'validFromMs', 'expiresAtMs',
      'version', 'identityVersion', 'emailBindingMatches']);
    if (![d.id, d.subjectUserId, d.appointedByUserId, d.communityId].every(uuid) ||
      !platforms.includes(d.platform) || !['pending', 'active', 'suspended', 'revoked'].includes(d.status) ||
      !positive(d.version) || !positive(d.identityVersion) || !integer(d.validFromMs) ||
      !integer(d.expiresAtMs) || d.validFromMs >= d.expiresAtMs ||
      !boolean(d.founderApprovalVerified) || !boolean(d.emailBindingMatches)) reject('INVALID_DELEGATION');
    const granted = capabilities(d.capabilities);
    if (d.subjectUserId !== i.userId) reject('INVALID_DELEGATION');
    if (d.appointedByUserId === d.subjectUserId) reject('SELF_APPOINTMENT');
    if (!d.founderApprovalVerified) reject('MISSING_FOUNDER_APPROVAL');
    if (d.status !== 'active') reject('DELEGATION_INACTIVE');
    if (nowMs < d.validFromMs) reject('DELEGATION_NOT_STARTED');
    if (nowMs >= d.expiresAtMs) reject('DELEGATION_EXPIRED');
    if (r.expectedDelegationVersion !== d.version) reject('STALE_DELEGATION_VERSION');
    if (d.identityVersion !== i.identityVersion || !d.emailBindingMatches) reject('STALE_IDENTITY_VERSION');
    if (d.platform !== r.platform || d.communityId !== r.communityId) reject('SCOPE_MISMATCH');
    if (!granted.includes(r.capability)) reject('CAPABILITY_NOT_DELEGATED');

    const a = fields(c.resource, ['id', 'platform', 'communityId', 'assignedUserId', 'version',
      'challengedDecisionMakerUserId', 'independenceConfirmed']);
    if (![a.id, a.communityId].every(uuid) || !platforms.includes(a.platform) ||
      (a.assignedUserId !== null && !uuid(a.assignedUserId)) || !positive(a.version) ||
      (a.challengedDecisionMakerUserId !== null && !uuid(a.challengedDecisionMakerUserId)) ||
      !boolean(a.independenceConfirmed)) reject('INVALID_INPUT');
    if (a.id !== r.caseId) reject('CASE_MISMATCH');
    if (a.platform !== r.platform || a.communityId !== r.communityId) reject('SCOPE_MISMATCH');
    if (r.expectedCaseVersion !== a.version) reject('STALE_CASE_VERSION');
    if (a.assignedUserId !== i.userId) reject('NOT_ASSIGNED');
    // A weaker requested capability must not bypass a known review conflict.
    if (a.challengedDecisionMakerUserId !== null ||
      ['case.appeal_review_assigned', 'case.correction_review_assigned'].includes(r.capability)) {
      if (a.challengedDecisionMakerUserId === null || !a.independenceConfirmed) reject('INDEPENDENCE_UNVERIFIED');
      if (a.challengedDecisionMakerUserId === i.userId) reject('REVIEW_CONFLICT');
    }
    return result('POLICY_SATISFIED');
  } catch (code) {
    return result(typeof code === 'string' && DELEGATION_DENIAL_CODES.includes(code) ? code : 'INVALID_INPUT');
  }
}
