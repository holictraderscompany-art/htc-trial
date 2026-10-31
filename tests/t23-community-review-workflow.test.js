import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCommunityReviewSimulation, REVIEW_LIMITS, REVIEW_REASON_CODES } from '../src/server/community-review-workflow.js';
import { evaluateCommunityMessage } from '../src/server/community-moderation.js';

const fresh = () => ({ synthetic: true, id: 'sim-case-1', events: [] });
const action = (type, revision, extra = {}) => ({
  id: `sim-action-${revision + 1}`, expectedRevision: revision, type, approval: true,
  evidenceRefs: ['sim-evidence-1'], decision: null, advisory: null, ...extra,
});
function setup(types = []) {
  const sim = createCommunityReviewSimulation(true);
  let c = fresh();
  for (const type of types) {
    const r = sim.evaluate(c, action(type, c.events.length, type === 'resolve' ? { decision: 'no_action' } : {}), sim.actors.moderator_a);
    assert.equal(r.accepted, true, JSON.stringify(r.reasonCodes)); c = r.nextCase;
  }
  return { ...sim, c };
}
function rejected(result, reason) {
  assert.equal(result.accepted, false);
  assert.deepEqual(result.reasonCodes, [reason]);
  assert.equal(result.nextCase, null);
  assert.equal(result.enforcementAuthorized, false);
  assert.equal(result.policyStatus, 'PROPOSED');
}
const reviewed = () => setup(['queue', 'begin_review']);
const resolved = () => setup(['queue', 'begin_review', 'resolve']);

test('reported -> pending_review -> under_review -> resolved uses human review and evidence', () => {
  const s = resolved();
  const result = s.evaluate(s.c, action('reopen', 3), s.actors.accountable);
  assert.equal(result.accepted, true);
  assert.equal(result.summary.status, 'pending_review');
  assert.equal(result.summary.outcome, null);
  assert.equal(result.summary.revision, 4);
});

for (const outcome of ['no_action', 'refer_to_authorized_human']) test(`human disposition ${outcome} grants no enforcement`, () => {
  const s = reviewed(); const r = s.evaluate(s.c, action('resolve', 2, { decision: outcome }), s.actors.moderator_a);
  assert.equal(r.summary.status, 'resolved'); assert.equal(r.summary.outcome, outcome);
  assert.equal(r.enforcementAuthorized, false); assert.equal(r.simulationOnly, true);
});

for (const [type, outcome] of [['withdraw', 'withdrawn'], ['close_unsupported', 'unsupported']]) test(`${type} closes allegation without punishment`, () => {
  const s = reviewed(); const r = s.evaluate(s.c, action(type, 2), s.actors.moderator_a);
  assert.equal(r.summary.status, 'resolved'); assert.equal(r.summary.outcome, outcome);
});

test('escalation pauses review until accountable human accepts', () => {
  const s = reviewed(); const r = s.evaluate(s.c, action('escalate', 2), s.actors.moderator_a);
  assert.equal(r.summary.status, 'escalated'); assert.equal(r.summary.reviewer, null);
  rejected(s.evaluate(r.nextCase, action('resolve', 3, { decision: 'no_action' }), s.actors.moderator_a), 'INVALID_TRANSITION');
  rejected(s.evaluate(r.nextCase, action('accept_escalation', 3), s.actors.moderator_b), 'ACCOUNTABLE_HUMAN_REQUIRED');
  const accepted = s.evaluate(r.nextCase, action('accept_escalation', 3), s.actors.accountable);
  assert.equal(accepted.summary.status, 'under_review'); assert.equal(accepted.summary.reviewer, s.actors.accountable.id);
});

test('appeal requires independent reviewer and preserves separate original decision', () => {
  const s = resolved(); const appeal = s.evaluate(s.c, action('appeal', 3), s.actors.moderator_a);
  assert.equal(appeal.summary.status, 'appeal_pending');
  rejected(s.evaluate(appeal.nextCase, action('begin_appeal', 4), s.actors.moderator_a), 'APPEAL_CONFLICT');
  const review = s.evaluate(appeal.nextCase, action('begin_appeal', 4), s.actors.moderator_b);
  rejected(s.evaluate(review.nextCase, action('resolve_appeal', 5, { decision: 'no_action' }), s.actors.moderator_a), 'REVIEWER_MISMATCH');
  const result = s.evaluate(review.nextCase, action('resolve_appeal', 5, { decision: 'no_action' }), s.actors.moderator_b);
  assert.equal(result.summary.status, 'resolved'); assert.equal(result.summary.decisionActor, s.actors.moderator_b.id);
  assert.equal(result.nextCase.events[2].actor, s.actors.moderator_a);
});

test('escalated appeal cannot use the original accountable decision-maker', () => {
  const s = reviewed();
  const escalated = s.evaluate(s.c, action('escalate', 2), s.actors.moderator_a);
  const assigned = s.evaluate(escalated.nextCase, action('accept_escalation', 3), s.actors.accountable);
  const closed = s.evaluate(assigned.nextCase, action('resolve', 4, { decision: 'no_action' }), s.actors.accountable);
  const appeal = s.evaluate(closed.nextCase, action('appeal', 5), s.actors.moderator_a);
  const review = s.evaluate(appeal.nextCase, action('begin_appeal', 6), s.actors.moderator_b);
  const again = s.evaluate(review.nextCase, action('escalate', 7), s.actors.moderator_b);
  rejected(s.evaluate(again.nextCase, action('accept_escalation', 8), s.actors.accountable), 'APPEAL_CONFLICT');
});

test('correction requires accountable human and keeps the previous decision in history', () => {
  const s = resolved();
  rejected(s.evaluate(s.c, action('request_correction', 3), s.actors.moderator_a), 'ACCOUNTABLE_HUMAN_REQUIRED');
  const pending = s.evaluate(s.c, action('request_correction', 3), s.actors.accountable);
  assert.equal(pending.summary.status, 'correction_pending');
  rejected(s.evaluate(pending.nextCase, action('correct', 4, { decision: 'no_action' }), s.actors.moderator_b), 'ACCOUNTABLE_HUMAN_REQUIRED');
  const corrected = s.evaluate(pending.nextCase, action('correct', 4, { decision: 'refer_to_authorized_human' }), s.actors.accountable);
  assert.equal(corrected.summary.outcome, 'refer_to_authorized_human');
  assert.equal(corrected.nextCase.events[2].action.decision, 'no_action');
});

test('AI advisory reuses actual T23-A schema and reason codes, without resolving case', () => {
  const s = reviewed();
  const advisory = evaluateCommunityMessage('Synthetic investment discussion.');
  const r = s.evaluate(s.c, action('recommend', 2, { approval: false, advisory }), s.actors.ai);
  assert.equal(r.accepted, true); assert.equal(r.summary.status, 'under_review');
  assert.deepEqual(r.nextCase.events[2].action.advisory, advisory);
  assert.equal(r.summary.decisionActor, null);
});

for (const type of ['queue', 'resolve', 'resolve_appeal', 'correct', 'escalate', 'reopen']) test(`AI cannot ${type}`, () => {
  const s = reviewed();
  rejected(s.evaluate(s.c, action(type, 2), s.actors.ai), 'HUMAN_ONLY');
});
for (const actor of [undefined, null, 'FOUNDER', { role: 'FOUNDER' }, { simulationOnly: true, id: 'sim-accountable' }])
  test(`missing/forged simulated authority ${JSON.stringify(actor)} fails closed`, () => {
    const s = setup(); rejected(s.evaluate(s.c, action('queue', 0), actor), 'UNKNOWN_AUTHORITY');
  });

test('tokens from a different simulation cannot grant authority', () => {
  const s = setup(); const other = createCommunityReviewSimulation(true);
  rejected(s.evaluate(s.c, action('queue', 0), other.actors.accountable), 'UNKNOWN_AUTHORITY');
});
test('missing simulated human approval fails closed', () => {
  const s = setup(); rejected(s.evaluate(s.c, action('queue', 0, { approval: false }), s.actors.moderator_a), 'MISSING_APPROVAL');
});
for (const available of [undefined, false, 'true', 1]) test(`oversight ${String(available)} fails closed`, () => {
  const s = createCommunityReviewSimulation(available);
  rejected(s.evaluate(fresh(), action('queue', 0), s.actors.accountable), 'HUMAN_OVERSIGHT_UNAVAILABLE');
});
test('duplicates, stale revisions and conflicting parallel decisions are rejected against current snapshot', () => {
  const s = reviewed();
  rejected(s.evaluate(s.c, action('escalate', 2, { id: 'sim-action-1' }), s.actors.moderator_a), 'DUPLICATE_ACTION');
  rejected(s.evaluate(s.c, action('resolve', 1, { id: 'sim-action-20', decision: 'no_action' }), s.actors.moderator_a), 'STALE_REVISION');
  const closed = s.evaluate(s.c, action('resolve', 2, { decision: 'no_action' }), s.actors.moderator_a);
  rejected(s.evaluate(closed.nextCase, action('resolve', 2, { id: 'sim-action-20', decision: 'refer_to_authorized_human' }), s.actors.moderator_a), 'STALE_REVISION');
  rejected(s.evaluate(closed.nextCase, action('resolve', 3, { decision: 'no_action' }), s.actors.moderator_a), 'INVALID_TRANSITION');
});
test('unassigned reviewer and missing evidence cannot decide', () => {
  const s = reviewed();
  rejected(s.evaluate(s.c, action('resolve', 2, { decision: 'no_action' }), s.actors.moderator_b), 'REVIEWER_MISMATCH');
  rejected(s.evaluate(s.c, action('resolve', 2, { decision: 'no_action', evidenceRefs: [] }), s.actors.moderator_a), 'EVIDENCE_REQUIRED');
});
test('ordinary moderator cannot reopen or skip review', () => {
  const s = resolved(); rejected(s.evaluate(s.c, action('reopen', 3), s.actors.moderator_a), 'ACCOUNTABLE_HUMAN_REQUIRED');
  rejected(s.evaluate(fresh(), action('resolve', 0, { decision: 'no_action' }), s.actors.accountable), 'INVALID_TRANSITION');
});
for (const input of [null, {}, [], 'synthetic', { ...fresh(), synthetic: false }, { ...fresh(), id: 'private-member' }, { ...fresh(), status: 'resolved' }])
  test(`malformed synthetic case ${JSON.stringify(input)} rejected`, () => {
    const s = setup(); assert.equal(s.evaluate(input, action('queue', 0), s.actors.moderator_a).accepted, false);
  });

test('history is replayed instead of trusting fabricated summaries or impossible events', () => {
  const s = setup();
  const c = { ...fresh(), events: [{ actor: s.actors.moderator_a, action: action('resolve', 0, { decision: 'no_action' }) }] };
  rejected(s.evaluate(c, action('queue', 1), s.actors.accountable), 'INVALID_TRANSITION');
});
for (const extra of [{ type: 'ban' }, { decision: 'mute' }, { expectedRevision: -1 }, { expectedRevision: 0.5 },
  { evidenceRefs: ['private@example.test'] }, { evidenceRefs: ['sim-evidence-1', 'sim-evidence-1'] }, { role: 'FOUNDER' }])
  test(`invalid or enforcement action ${JSON.stringify(extra)} rejected`, () => {
    const s = setup(); assert.equal(s.evaluate(s.c, action('queue', 0, extra), s.actors.accountable).accepted, false);
  });
test('malformed advisory and human attempts to submit AI advice are rejected', () => {
  const s = reviewed(); const advisory = evaluateCommunityMessage('Synthetic hello.');
  rejected(s.evaluate(s.c, action('recommend', 2, { approval: false, advisory: { ...advisory, enforcementAuthorized: true } }), s.actors.ai), 'INVALID_ADVISORY');
  rejected(s.evaluate(s.c, action('recommend', 2, { advisory }), s.actors.moderator_a), 'INVALID_ADVISORY');
});
test('sparse, negative, excessive context and evidence are bounded', () => {
  const s = setup();
  const negative = new Proxy([], { getOwnPropertyDescriptor(target, key) {
    const d = Reflect.getOwnPropertyDescriptor(target, key); return key === 'length' ? { ...d, value: -1 } : d;
  } });
  for (const events of [new Array(1), negative]) rejected(s.evaluate({ ...fresh(), events }, action('queue', 0), s.actors.accountable), 'INVALID_INPUT');
  rejected(s.evaluate({ ...fresh(), events: new Array(REVIEW_LIMITS.maxEvents + 1) }, action('queue', 0), s.actors.accountable), 'LIMIT_EXCEEDED');
  rejected(s.evaluate(s.c, action('queue', 0, { evidenceRefs: Array(5).fill('sim-evidence-1') }), s.actors.accountable), 'LIMIT_EXCEEDED');
});
test('getters are never invoked and hostile errors never escape or echo sensitive text', () => {
  const s = setup(); let invoked = false;
  const bad = { ...fresh() }; Object.defineProperty(bad, 'id', { get() { invoked = true; throw Error('PRIVATE_CANARY'); } });
  rejected(s.evaluate(bad, action('queue', 0), s.actors.accountable), 'INVALID_INPUT'); assert.equal(invoked, false);
  const error = new Proxy({}, { getOwnPropertyDescriptor() { throw Error('PRIVATE_CANARY'); } });
  const proxy = new Proxy({}, { getPrototypeOf() { throw error; } });
  const result = s.evaluate(proxy, action('queue', 0), s.actors.accountable);
  rejected(result, 'INVALID_INPUT'); assert(!JSON.stringify(result).includes('PRIVATE_CANARY'));
});
test('maximum valid event count is bounded without inventing retention or sanction policy', () => {
  const s = reviewed(); let c = s.c;
  for (let i = 2; i < REVIEW_LIMITS.maxEvents; i++) {
    const r = s.evaluate(c, action('recommend', i, { approval: false, advisory: evaluateCommunityMessage('Synthetic hello.') }), s.actors.ai);
    assert.equal(r.accepted, true); c = r.nextCase;
  }
  rejected(s.evaluate(c, action('escalate', REVIEW_LIMITS.maxEvents), s.actors.accountable), 'LIMIT_EXCEEDED');
});
test('hostile exception cannot fabricate an accepted transition', () => {
  const s = setup();
  const proxy = new Proxy({}, { getPrototypeOf() { throw Error('TRANSITION_ACCEPTED'); } });
  rejected(s.evaluate(proxy, action('queue', 0), s.actors.accountable), 'INVALID_INPUT');
});
test('unknown advice codes and contradictory advisory fields fail closed', () => {
  const s = reviewed(); const valid = evaluateCommunityMessage('Synthetic hello.');
  for (const change of [{ reasonCodes: ['UNKNOWN_CODE'] }, { requiresHumanReview: true },
    { recommendedAction: 'flag' }, { reasonCodes: [] }, { reasonCodes: ['NO_LISTED_INDICATOR', 'NO_LISTED_INDICATOR'] }]) {
    rejected(s.evaluate(s.c, action('recommend', 2, { approval: false, advisory: { ...valid, ...change } }), s.actors.ai), 'INVALID_ADVISORY');
  }
});
test('evaluation is deterministic, immutable, independent and has fixed result codes', () => {
  const s = setup(); const a = action('queue', 0); const original = JSON.stringify([s.c, a]);
  const first = s.evaluate(s.c, a, s.actors.moderator_a);
  for (let i = 0; i < 5; i++) assert.deepEqual(s.evaluate(s.c, a, s.actors.moderator_a), first);
  assert.equal(JSON.stringify([s.c, a]), original);
  assert(Object.isFrozen(first.nextCase.events)); assert(Object.isFrozen(first.nextCase.events[0].action));
  assert(first.reasonCodes.every(code => REVIEW_REASON_CODES.includes(code)));
  assert.throws(() => { first.nextCase.events[0].action.evidenceRefs.push('sim-evidence-2'); });
});
test('P2 original accountable decision-maker cannot correct own decision', () => {
  const s = setup(); let c = s.c;
  for (const [i, type] of ['queue', 'begin_review', 'resolve', 'request_correction'].entries()) {
    const r = s.evaluate(c, action(type, i, { decision: type === 'resolve' ? 'no_action' : null }), s.actors.accountable);
    assert.equal(r.accepted, true); c = r.nextCase;
  }
  const before = JSON.stringify(c);
  for (const decision of ['no_action', 'refer_to_authorized_human']) {
    const r = s.evaluate(c, action('correct', 4, { decision }), s.actors.accountable);
    rejected(r, 'CORRECTION_CONFLICT');
    assert.equal(r.summary, null); assert.equal(JSON.stringify(c), before);
  }
});

test('P2 independent accountable correction remains accepted without enforcement', () => {
  const s = resolved();
  const pending = s.evaluate(s.c, action('request_correction', 3), s.actors.accountable);
  const before = JSON.stringify(pending.nextCase);
  const r = s.evaluate(pending.nextCase, action('correct', 4, { decision: 'no_action' }), s.actors.accountable);
  assert.equal(r.accepted, true); assert.equal(r.summary.status, 'resolved');
  assert.notEqual(r.summary.decisionActor, s.c.events[2].actor.id);
  assert.equal(r.enforcementAuthorized, false);
  assert.equal(JSON.stringify(pending.nextCase), before);
});

test('P2 correction rejects missing and forged identity evidence without mutation', () => {
  const s = resolved(); const c = s.evaluate(s.c, action('request_correction', 3), s.actors.accountable).nextCase;
  const before = JSON.stringify(c); const a = action('correct', 4, { decision: 'no_action' });
  for (const actor of [undefined, null, 'FOUNDER', {}, { ...s.actors.accountable }, createCommunityReviewSimulation(true).actors.accountable]) {
    rejected(s.evaluate(c, a, actor), 'UNKNOWN_AUTHORITY');
    assert.equal(JSON.stringify(c), before);
  }
  for (const actor of [null, { ...s.actors.moderator_a }]) {
    const events = c.events.map((e, i) => i === 2 ? { ...e, actor } : e);
    rejected(s.evaluate({ ...c, events }, a, s.actors.accountable), 'UNKNOWN_AUTHORITY');
  }
});

test('P2 correction rejects missing, malformed and contradictory approval evidence', () => {
  const s = resolved(); const c = s.evaluate(s.c, action('request_correction', 3), s.actors.accountable).nextCase;
  const before = JSON.stringify(c);
  for (const approval of [false, null, undefined, 'true', 1]) {
    assert.equal(s.evaluate(c, action('correct', 4, { decision: 'no_action', approval }), s.actors.accountable).accepted, false);
  }
  const missing = action('correct', 4, { decision: 'no_action' }); delete missing.approval;
  rejected(s.evaluate(c, missing, s.actors.accountable), 'INVALID_INPUT');
  rejected(s.evaluate(c, action('correct', 4, { decision: 'no_action', approvedBy: 'sim-accountable' }), s.actors.accountable), 'INVALID_INPUT');
  rejected(s.evaluate(c, action('correct', 4, { decision: 'no_action' }), s.actors.moderator_a), 'ACCOUNTABLE_HUMAN_REQUIRED');
  assert.equal(JSON.stringify(c), before);
});

test('P2 correction cannot bypass a pending appeal or its independent reviewer', () => {
  const s = resolved(); const appeal = s.evaluate(s.c, action('appeal', 3), s.actors.moderator_a);
  const before = JSON.stringify(appeal.nextCase);
  rejected(s.evaluate(appeal.nextCase, action('correct', 4, { decision: 'no_action' }), s.actors.accountable), 'INVALID_TRANSITION');
  rejected(s.evaluate(appeal.nextCase, action('request_correction', 4), s.actors.accountable), 'INVALID_TRANSITION');
  rejected(s.evaluate(appeal.nextCase, action('begin_appeal', 4), s.actors.moderator_a), 'APPEAL_CONFLICT');
  assert.equal(JSON.stringify(appeal.nextCase), before);
});

test('no transport, timers, logging, persistence or platform enforcement', t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', () => { calls.push('fetch'); throw Error('Unexpected network'); });
  for (const name of ['setTimeout', 'setInterval']) t.mock.method(globalThis, name, () => { calls.push(name); });
  for (const name of ['log', 'warn', 'error']) t.mock.method(console, name, () => { calls.push(name); });
  const s = resolved(); assert.equal(s.c.events.length, 3); assert.deepEqual(calls, []);
  const source = readFileSync(new URL('../src/server/community-review-workflow.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:fetch|setTimeout|setInterval|require|writeFile|appendFile)\s*\(|\bconsole\.|\bprocess\.|\b(?:supabase|localStorage|sessionStorage)\b/);
  assert.deepEqual([...source.matchAll(/^import .* from '(.*)';$/gm)].map(m => m[1]), ['./community-moderation.js']);
});
