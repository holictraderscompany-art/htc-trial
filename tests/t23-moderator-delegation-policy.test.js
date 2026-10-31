import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMMUNITY_CAPABILITIES, DELEGATION_DENIAL_CODES, evaluateCommunityDelegationPolicy as evaluate } from '../src/server/community-delegation-policy.js';

// All UUIDs are synthetic constants. There are no emails, JWTs or real accounts.
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const NOW = 2000;
function fixture(capability = 'case.read_assigned') {
  return {
    c: {
      synthetic: true, humanOversightAvailable: true,
      identity: { userId: id(1), coreRole: 'USER', emailConfirmed: true, exists: true, anonymous: false, identityVersion: 2, revalidationRequired: false },
      session: { id: id(2), subjectUserId: id(1), current: true, revoked: false, expiresAtMs: 5000 },
      delegation: { id: id(3), subjectUserId: id(1), appointedByUserId: id(4), founderApprovalVerified: true,
        platform: 'telegram', communityId: id(5), capabilities: [...COMMUNITY_CAPABILITIES], status: 'active',
        validFromMs: 1000, expiresAtMs: 4000, version: 3, identityVersion: 2, emailBindingMatches: true },
      resource: { id: id(6), platform: 'telegram', communityId: id(5), assignedUserId: id(1), version: 4,
        challengedDecisionMakerUserId: id(7), independenceConfirmed: true },
    },
    r: { caseId: id(6), platform: 'telegram', communityId: id(5), capability, expectedDelegationVersion: 3, expectedCaseVersion: 4 },
  };
}
function denied(result, code) {
  assert.equal(result.decision, 'deny'); assert.deepEqual(result.reasonCodes, [code]);
  assert.equal(result.liveAuthorization, false); assert.equal(result.enforcementAuthorized, false);
}
function permit(result) {
  assert.equal(result.decision, 'permit'); assert.deepEqual(result.reasonCodes, ['POLICY_SATISFIED']);
  assert.equal(result.simulationOnly, true); assert.equal(result.liveAuthorization, false);
  assert.equal(result.enforcementAuthorized, false); assert.equal(result.policyStatus, 'PROPOSED');
}

for (const capability of COMMUNITY_CAPABILITIES) test(`UNIT I01/C01/C06: exact delegated ${capability}`, () => {
  const { c, r } = fixture(capability); permit(evaluate(c, r, NOW));
});
for (const platform of ['whatsapp', 'telegram', 'discord']) test(`UNIT C03: exact synthetic ${platform} scope`, () => {
  const { c, r } = fixture(); c.delegation.platform = c.resource.platform = r.platform = platform;
  permit(evaluate(c, r, NOW));
});
const negative = [
  ['I03 anonymous', f => { f.c.identity.anonymous = true; }, 'UNVERIFIED_IDENTITY'],
  ['I06 unconfirmed email', f => { f.c.identity.emailConfirmed = false; }, 'UNVERIFIED_IDENTITY'],
  ['I07 deleted identity', f => { f.c.identity.exists = false; }, 'UNVERIFIED_IDENTITY'],
  ['D04 Founder role not inherited', f => { f.c.identity.coreRole = 'FOUNDER'; }, 'CORE_ROLE_DENIED'],
  ['D04 invented moderator role', f => { f.c.identity.coreRole = 'MODERATOR'; }, 'CORE_ROLE_DENIED'],
  ['I08 identity revalidation', f => { f.c.identity.revalidationRequired = true; }, 'IDENTITY_REVALIDATION_REQUIRED'],
  ['I05 wrong session subject', f => { f.c.session.subjectUserId = id(9); }, 'INVALID_SESSION'],
  ['I12 revoked session fixture', f => { f.c.session.revoked = true; }, 'INVALID_SESSION'],
  ['I13 stale session fixture', f => { f.c.session.current = false; }, 'INVALID_SESSION'],
  ['I02 expired session fixture', f => { f.c.session.expiresAtMs = NOW; }, 'SESSION_EXPIRED'],
  ['C07 no human oversight', f => { f.c.humanOversightAvailable = false; }, 'HUMAN_OVERSIGHT_UNAVAILABLE'],
  ['D02 no delegation', f => { f.c.delegation = null; }, 'NO_DELEGATION'],
  ['D02 self-appointed grant', f => { f.c.delegation.appointedByUserId = id(1); }, 'SELF_APPOINTMENT'],
  ['D05 wrong delegation subject', f => { f.c.delegation.subjectUserId = id(9); }, 'INVALID_DELEGATION'],
  ['D01 missing approved decision', f => { f.c.delegation.founderApprovalVerified = false; }, 'MISSING_FOUNDER_APPROVAL'],
  ['D06 empty capability grant', f => { f.c.delegation.capabilities = []; }, 'CAPABILITY_NOT_DELEGATED'],
  ['D06 duplicated capability', f => { f.c.delegation.capabilities = ['case.read_assigned', 'case.read_assigned']; }, 'INVALID_DELEGATION'],
  ['D06 invalid validity interval', f => { f.c.delegation.validFromMs = 4000; }, 'INVALID_DELEGATION'],
  ['D07 not started', f => { f.c.delegation.validFromMs = 3000; }, 'DELEGATION_NOT_STARTED'],
  ['D07 expired', f => { f.c.delegation.expiresAtMs = NOW; }, 'DELEGATION_EXPIRED'],
  ['D08 revoked current grant', f => { f.c.delegation.status = 'revoked'; }, 'DELEGATION_INACTIVE'],
  ['D07 suspended current grant', f => { f.c.delegation.status = 'suspended'; }, 'DELEGATION_INACTIVE'],
  ['D07 pending current grant', f => { f.c.delegation.status = 'pending'; }, 'DELEGATION_INACTIVE'],
  ['D12 stale delegation version', f => { f.r.expectedDelegationVersion = 2; }, 'STALE_DELEGATION_VERSION'],
  ['I09 old identity generation after email change', f => { f.c.identity.identityVersion = 3; }, 'STALE_IDENTITY_VERSION'],
  ['I08 wrong email binding fixture', f => { f.c.delegation.emailBindingMatches = false; }, 'STALE_IDENTITY_VERSION'],
  ['C03 wrong grant platform', f => { f.c.delegation.platform = 'discord'; }, 'SCOPE_MISMATCH'],
  ['C03 wrong grant community', f => { f.c.delegation.communityId = id(9); }, 'SCOPE_MISMATCH'],
  ['C04 capability not delegated', f => { f.c.delegation.capabilities = ['case.escalate_assigned']; }, 'CAPABILITY_NOT_DELEGATED'],
  ['C02 different case', f => { f.r.caseId = id(9); }, 'CASE_MISMATCH'],
  ['C03 wrong case platform', f => { f.c.resource.platform = 'discord'; }, 'SCOPE_MISMATCH'],
  ['C03 wrong case community', f => { f.c.resource.communityId = id(9); }, 'SCOPE_MISMATCH'],
  ['C01 stale case revision', f => { f.r.expectedCaseVersion = 3; }, 'STALE_CASE_VERSION'],
  ['C02 another assigned reviewer', f => { f.c.resource.assignedUserId = id(9); }, 'NOT_ASSIGNED'],
  ['C07 unassigned case', f => { f.c.resource.assignedUserId = null; }, 'NOT_ASSIGNED'],
];
for (const [name, change, reason] of negative) test(`UNIT predicate ${name}`, () => {
  const f = fixture(); change(f); const before = JSON.stringify(f);
  denied(evaluate(f.c, f.r, NOW), reason); assert.equal(JSON.stringify(f), before);
});

for (const capability of ['delegation.appoint', 'delegation.revoke', 'case.ban', 'founder.access', '*']) test(`UNIT D02/D03/C04: unsupported ${capability}`, () => {
  const { c, r } = fixture(); r.capability = capability; denied(evaluate(c, r, NOW), 'CAPABILITY_NOT_ALLOWED');
});
for (const capability of ['case.appeal_review_assigned', 'case.correction_review_assigned']) {
  test(`UNIT C05: ${capability} cannot review own original decision`, () => {
    const { c, r } = fixture(capability); c.resource.challengedDecisionMakerUserId = c.identity.userId;
    denied(evaluate(c, r, NOW), 'REVIEW_CONFLICT');
  });
  test(`UNIT C06/C07: ${capability} requires known decision-maker and independent human`, () => {
    for (const change of [c => { c.resource.challengedDecisionMakerUserId = null; }, c => { c.resource.independenceConfirmed = false; }]) {
      const { c, r } = fixture(capability); change(c); denied(evaluate(c, r, NOW), 'INDEPENDENCE_UNVERIFIED');
    }
  });
}

test('UNIT I04/D04/C08: email/role/receipt/AI fields are not authority', () => {
  for (const extra of [{ email: 'synthetic' }, { role: 'FOUNDER' }, { user_metadata: { role: 'FOUNDER' } },
    { approvedBy: id(4) }, { actor: { simulationOnly: true, id: 'sim-accountable' } }]) {
    const { c, r } = fixture(); denied(evaluate(c, { ...r, ...extra }, NOW), 'INVALID_INPUT');
  }
  const { c, r } = fixture(); denied(evaluate({ ...c, email: 'synthetic' }, r, NOW), 'INVALID_INPUT');
});
test('UNIT C05/C09 predicate: weaker requested capability cannot bypass known reviewer conflict', () => {
  for (const capability of ['case.read_assigned', 'case.review_assigned', 'case.escalate_assigned']) {
    const { c, r } = fixture(capability); c.resource.challengedDecisionMakerUserId = c.identity.userId;
    const before = JSON.stringify([c, r]); denied(evaluate(c, r, NOW), 'REVIEW_CONFLICT');
    assert.equal(JSON.stringify([c, r]), before);
    c.resource.challengedDecisionMakerUserId = id(7); c.resource.independenceConfirmed = false;
    denied(evaluate(c, r, NOW), 'INDEPENDENCE_UNVERIFIED');
  }
});
test('UNIT C01: ordinary case with no challenged decision does not invent an independence requirement', () => {
  const { c, r } = fixture(); c.resource.challengedDecisionMakerUserId = null; c.resource.independenceConfirmed = false;
  permit(evaluate(c, r, NOW));
});
test('UNIT I04/I11: incomplete identity never permits email-only authorization', () => {
  const { c, r } = fixture();
  for (const identity of [null, {}, 'synthetic', { emailConfirmed: true }, { ...c.identity, userId: 'synthetic' }])
    denied(evaluate({ ...c, identity }, r, NOW), 'INVALID_INPUT');
});
test('UNIT D06/D12: injected clock/version bounds are strict and do not coerce', () => {
  const { c, r } = fixture();
  for (const now of [undefined, null, '2000', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    denied(evaluate(c, r, now), 'INVALID_CLOCK');
  for (const version of [null, '3', 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    denied(evaluate(c, { ...r, expectedDelegationVersion: version }, NOW), 'INVALID_INPUT');
    denied(evaluate({ ...c, delegation: { ...c.delegation, version } }, r, NOW), 'INVALID_DELEGATION');
  }
});
test('UNIT D07: exact start inclusive and expiry exclusive', () => {
  const { c, r } = fixture(); permit(evaluate(c, r, 1000)); permit(evaluate(c, r, 3999));
  denied(evaluate(c, r, 999), 'DELEGATION_NOT_STARTED'); denied(evaluate(c, r, 4000), 'DELEGATION_EXPIRED');
});
test('UNIT malformed context/request, missing and contradictory fields fail closed', () => {
  const { c, r } = fixture();
  for (const input of [undefined, null, [], {}, 'synthetic', { ...c, synthetic: false }, { ...c, humanOversightAvailable: 'true' }])
    denied(evaluate(input, r, NOW), 'INVALID_INPUT');
  for (const input of [undefined, null, [], {}, 'synthetic', { ...r, platform: 'Telegram' }, { ...r, caseId: 'x'.repeat(10000) }])
    denied(evaluate(c, input, NOW), 'INVALID_INPUT');
  const missing = { ...c.identity }; delete missing.coreRole;
  denied(evaluate({ ...c, identity: missing }, r, NOW), 'INVALID_INPUT');
});
test('UNIT bounded capability lists reject sparse, excess, negative and unknown entries', () => {
  const f = fixture();
  const negative = new Proxy([], { getOwnPropertyDescriptor(target, key) {
    const d = Reflect.getOwnPropertyDescriptor(target, key); return key === 'length' ? { ...d, value: -1 } : d;
  } });
  for (const caps of [null, {}, new Array(2), Array(6).fill('case.read_assigned'), negative])
    denied(evaluate({ ...f.c, delegation: { ...f.c.delegation, capabilities: caps } }, f.r, NOW), 'INVALID_INPUT');
  denied(evaluate({ ...f.c, delegation: { ...f.c.delegation, capabilities: ['founder.access'] } }, f.r, NOW), 'CAPABILITY_NOT_ALLOWED');
});
test('UNIT I11: no getter invocation or sensitive exception/output echo', () => {
  const { c, r } = fixture(); let invoked = false;
  const context = { ...c }; Object.defineProperty(context, 'identity', { get() { invoked = true; throw Error('PRIVATE_CANARY'); } });
  denied(evaluate(context, r, NOW), 'INVALID_INPUT'); assert.equal(invoked, false);
  const proxy = new Proxy({}, { getPrototypeOf() { throw Error('PRIVATE_CANARY'); } });
  const result = evaluate(proxy, r, NOW); denied(result, 'INVALID_INPUT');
  assert(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  const forged = new Proxy({}, { getPrototypeOf() { throw 'POLICY_SATISFIED'; } });
  denied(evaluate(forged, r, NOW), 'INVALID_INPUT');
});
test('UNIT deterministic, non-mutating and fixed immutable result contains no identity', () => {
  const { c, r } = fixture(); const before = JSON.stringify([c, r]);
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } };
  freeze(c); freeze(r); const result = evaluate(c, r, NOW); permit(result);
  for (let i = 0; i < 10; i++) assert.deepEqual(evaluate(c, r, NOW), result);
  assert.equal(JSON.stringify([c, r]), before); assert(Object.isFrozen(result)); assert(Object.isFrozen(result.reasonCodes));
  assert(!JSON.stringify(result).includes(c.identity.userId));
  assert.deepEqual(Object.keys(result).sort(), ['prototype', 'simulationOnly', 'liveAuthorization', 'enforcementAuthorized', 'policyStatus', 'decision', 'reasonCodes'].sort());
  assert(DELEGATION_DENIAL_CODES.every(code => code !== 'POLICY_SATISFIED'));
});
test('UNIT no network, logging, timers, persistence, integrations or imports', t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', () => { calls.push('fetch'); throw Error('Unexpected network'); });
  for (const key of ['setTimeout', 'setInterval']) t.mock.method(globalThis, key, () => calls.push(key));
  for (const key of ['log', 'warn', 'error']) t.mock.method(console, key, () => calls.push(key));
  const { c, r } = fixture(); permit(evaluate(c, r, NOW)); denied(evaluate(null, r, NOW), 'INVALID_INPUT');
  assert.deepEqual(calls, []);
  const source = readFileSync(new URL('../src/server/community-delegation-policy.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s|\b(?:require|fetch|setTimeout|setInterval|writeFile|appendFile)\s*\(|\bconsole\.|\bprocess\.|Date\.now|\b(?:supabase|localStorage|sessionStorage)\b/m);
});
