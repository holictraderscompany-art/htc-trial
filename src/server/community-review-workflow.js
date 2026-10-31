import { MODERATION_REASON_CODES } from './community-moderation.js';

// Offline fixtures only. Tokens below are NOT authentication or Founder delegation.
export const REVIEW_LIMITS = Object.freeze({ maxEvents: 32, maxEvidenceRefs: 4 });
export const REVIEW_REASON_CODES = Object.freeze([
  'TRANSITION_ACCEPTED', 'INVALID_INPUT', 'INVALID_CASE', 'INVALID_ACTION',
  'UNKNOWN_AUTHORITY', 'HUMAN_OVERSIGHT_UNAVAILABLE', 'HUMAN_ONLY',
  'ACCOUNTABLE_HUMAN_REQUIRED', 'MISSING_APPROVAL', 'INVALID_ADVISORY',
  'DUPLICATE_ACTION', 'STALE_REVISION', 'INVALID_TRANSITION',
  'EVIDENCE_REQUIRED', 'REVIEWER_MISMATCH', 'APPEAL_CONFLICT', 'LIMIT_EXCEEDED',
  'CORRECTION_CONFLICT',
]);
const TYPES = ['queue', 'begin_review', 'recommend', 'escalate', 'accept_escalation',
  'resolve', 'reopen', 'appeal', 'begin_appeal', 'resolve_appeal',
  'request_correction', 'correct', 'withdraw', 'close_unsupported'];
const OUTCOMES = ['no_action', 'refer_to_authorized_human'];
const ACTION_KEYS = ['id', 'expectedRevision', 'type', 'approval', 'evidenceRefs', 'decision', 'advisory'];
const flags = { prototype: true, simulationOnly: true, policyStatus: 'PROPOSED', enforcementAuthorized: false };
const response = (code, nextCase = null, summary = null) => ({
  ...flags, accepted: code === 'TRANSITION_ACCEPTED', reasonCodes: [code], nextCase, summary,
});

// Read own data properties only; never invoke accessors or stringify input/errors.
function record(value, keys) {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw Error('INVALID_INPUT');
  const names = Reflect.ownKeys(value);
  if (names.length !== keys.length || !keys.every(k => names.includes(k))) throw Error('INVALID_INPUT');
  const copy = {};
  for (const key of keys) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !Object.hasOwn(field, 'value')) throw Error('INVALID_INPUT');
    copy[key] = field.value;
  }
  return copy;
}
function list(value, maximum) {
  if (!Array.isArray(value)) throw Error('INVALID_INPUT');
  const size = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isInteger(size) || size < 0) throw Error('INVALID_INPUT');
  if (size > maximum) throw Error('LIMIT_EXCEEDED');
  const copy = [];
  for (let i = 0; i < size; i++) {
    const item = Object.getOwnPropertyDescriptor(value, String(i));
    if (!item || !Object.hasOwn(item, 'value')) throw Error('INVALID_INPUT');
    copy.push(item.value);
  }
  return copy;
}
const fixtureId = (value, prefix) => typeof value === 'string' &&
  value.length <= 24 && new RegExp(`^sim-${prefix}-[0-9]{1,6}$`).test(value);

function advisory(value) {
  const a = record(value, ['recommendedAction', 'reasonCodes', 'requiresHumanReview',
    'prototype', 'enforcementAuthorized', 'policyStatus']);
  const codes = list(a.reasonCodes, MODERATION_REASON_CODES.length);
  if (!['allow', 'flag', 'human_review'].includes(a.recommendedAction) ||
    a.requiresHumanReview !== (a.recommendedAction !== 'allow') || a.prototype !== true ||
    a.enforcementAuthorized !== false || a.policyStatus !== 'PROPOSED' || !codes.length ||
    new Set(codes).size !== codes.length || codes.some(code => !MODERATION_REASON_CODES.includes(code)) ||
    (a.recommendedAction === 'allow' ? codes.length !== 1 || codes[0] !== 'NO_LISTED_INDICATOR' :
      codes.includes('NO_LISTED_INDICATOR'))) throw Error('INVALID_ADVISORY');
  return Object.freeze({ ...a, reasonCodes: Object.freeze(codes) });
}

// Each factory creates an isolated fixture vocabulary. Evaluation retains nothing.
// Anyone can create these fixtures; possession proves NO real identity or approval.
export function createCommunityReviewSimulation(humanOversightAvailable = false) {
  const actors = Object.freeze(Object.fromEntries(['moderator_a', 'moderator_b', 'accountable', 'ai']
    .map(id => [id, Object.freeze({ simulationOnly: true, id: `sim-${id}` })])));
  const roleOf = actor => Object.values(actors).includes(actor) ?
    (actor === actors.ai ? 'ai' : actor === actors.accountable ? 'accountable' : 'human') : null;

  function apply(state, raw, actor) {
    const role = roleOf(actor);
    if (!role) throw Error('UNKNOWN_AUTHORITY');
    const action = record(raw, ACTION_KEYS);
    if (!fixtureId(action.id, 'action') || !Number.isInteger(action.expectedRevision) ||
      action.expectedRevision < 0 || !TYPES.includes(action.type) || typeof action.approval !== 'boolean')
      throw Error('INVALID_ACTION');
    if (state.ids.includes(action.id)) throw Error('DUPLICATE_ACTION');
    if (action.expectedRevision !== state.ids.length) throw Error('STALE_REVISION');
    if (humanOversightAvailable !== true) throw Error('HUMAN_OVERSIGHT_UNAVAILABLE');
    if (role === 'ai' && action.type !== 'recommend') throw Error('HUMAN_ONLY');
    if (role !== 'ai' && action.approval !== true) throw Error('MISSING_APPROVAL');
    if (role === 'ai' && action.approval !== false) throw Error('MISSING_APPROVAL');
    const refs = list(action.evidenceRefs, REVIEW_LIMITS.maxEvidenceRefs);
    if (new Set(refs).size !== refs.length || refs.some(ref => !fixtureId(ref, 'evidence')))
      throw Error('INVALID_ACTION');
    const isRecommendation = action.type === 'recommend';
    if ((isRecommendation && role !== 'ai') || (!isRecommendation && action.advisory !== null))
      throw Error('INVALID_ADVISORY');
    const note = isRecommendation ? advisory(action.advisory) : null;
    const isDecision = ['resolve', 'resolve_appeal', 'correct'].includes(action.type);
    if (isDecision ? !OUTCOMES.includes(action.decision) : action.decision !== null)
      throw Error('INVALID_ACTION');
    if (!['queue', 'begin_review', 'begin_appeal', 'accept_escalation', 'recommend'].includes(action.type) && !refs.length)
      throw Error('EVIDENCE_REQUIRED');
    const requireState = (...allowed) => { if (!allowed.includes(state.status)) throw Error('INVALID_TRANSITION'); };
    const requireAccountable = () => { if (role !== 'accountable') throw Error('ACCOUNTABLE_HUMAN_REQUIRED'); };
    const requireReviewer = () => { if (state.reviewer !== actor.id) throw Error('REVIEWER_MISMATCH'); };
    const next = { ...state };
    switch (action.type) {
      case 'queue': requireState('reported'); next.status = 'pending_review'; break;
      case 'begin_review':
        requireState('pending_review'); next.status = 'under_review'; next.reviewer = actor.id; break;
      case 'recommend': requireState('pending_review', 'under_review', 'appeal_under_review'); break;
      case 'escalate':
        requireState('pending_review', 'under_review', 'appeal_under_review');
        // Appeal independence survives escalation and correction, not just begin_appeal.
        next.status = 'escalated'; next.reviewer = null; break;
      case 'accept_escalation':
        requireState('escalated'); requireAccountable();
        if (state.appealedActor === actor.id) throw Error('APPEAL_CONFLICT');
        next.status = state.appealedActor ? 'appeal_under_review' : 'under_review';
        next.reviewer = actor.id; break;
      case 'resolve':
        requireState('under_review'); requireReviewer();
        next.status = 'resolved'; next.decisionActor = actor.id; next.outcome = action.decision; break;
      case 'reopen':
        requireState('resolved'); requireAccountable();
        next.status = 'pending_review'; next.reviewer = null; next.appealedActor = null; next.outcome = null; break;
      case 'appeal':
        requireState('resolved'); next.status = 'appeal_pending';
        next.appealedActor = state.decisionActor; next.reviewer = null; break;
      case 'begin_appeal':
        requireState('appeal_pending');
        if (state.appealedActor === actor.id) throw Error('APPEAL_CONFLICT');
        next.status = 'appeal_under_review'; next.reviewer = actor.id; break;
      case 'resolve_appeal':
        requireState('appeal_under_review'); requireReviewer();
        if (state.appealedActor === actor.id) throw Error('APPEAL_CONFLICT');
        next.status = 'resolved'; next.decisionActor = actor.id; next.outcome = action.decision;
        next.appealedActor = null; break;
      case 'request_correction':
        requireState('resolved'); requireAccountable(); next.status = 'correction_pending'; next.reviewer = null; break;
      case 'correct':
        requireState('correction_pending'); requireAccountable();
        if (state.appealedActor === actor.id) throw Error('APPEAL_CONFLICT');
        if (state.decisionActor === actor.id) throw Error('CORRECTION_CONFLICT');
        next.status = 'resolved'; next.decisionActor = actor.id; next.outcome = action.decision;
        next.appealedActor = null; break;
      case 'withdraw': case 'close_unsupported':
        requireState('under_review'); requireReviewer(); next.status = 'resolved';
        next.decisionActor = actor.id;
        next.outcome = action.type === 'withdraw' ? 'withdrawn' : 'unsupported'; break;
    }
    next.ids = [...state.ids, action.id];
    return { state: next, event: Object.freeze({
      action: Object.freeze({ ...action, evidenceRefs: Object.freeze(refs), advisory: note }), actor,
    }) };
  }

  function evaluate(caseInput, action, actor) {
    try {
      const c = record(caseInput, ['synthetic', 'id', 'events']);
      if (c.synthetic !== true || !fixtureId(c.id, 'case')) return response('INVALID_CASE');
      const events = list(c.events, REVIEW_LIMITS.maxEvents);
      if (events.length === REVIEW_LIMITS.maxEvents) return response('LIMIT_EXCEEDED');
      let state = { status: 'reported', reviewer: null, decisionActor: null, appealedActor: null, outcome: null, ids: [] };
      const history = [];
      // Replay prevents contradictory states/decisions being injected as summary fields.
      for (const item of events) {
        const e = record(item, ['action', 'actor']);
        const replayed = apply(state, e.action, e.actor);
        state = replayed.state; history.push(replayed.event);
      }
      const next = apply(state, action, actor);
      const { ids, ...summary } = next.state;
      return response('TRANSITION_ACCEPTED', Object.freeze({
        synthetic: true, id: c.id, events: Object.freeze([...history, next.event]),
      }), Object.freeze({ ...summary, revision: ids.length }));
    } catch (error) {
      // Only our fixed codes may leave the boundary, never attacker exception text.
      let code = 'INVALID_INPUT';
      try {
        const descriptor = error && typeof error === 'object' ?
          Object.getOwnPropertyDescriptor(error, 'message') : null;
        if (descriptor && descriptor.value !== 'TRANSITION_ACCEPTED' &&
          REVIEW_REASON_CODES.includes(descriptor.value)) code = descriptor.value;
      } catch { /* Hostile exception objects also fail closed. */ }
      return response(code);
    }
  }
  return Object.freeze({ actors, evaluate });
}
