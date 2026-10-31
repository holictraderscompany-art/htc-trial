# T23-B — Offline human moderation workflow

Status: technical prototype for Founder review, 1 November 2026.
Every policy in this document is **PROPOSED / FOUNDER APPROVAL REQUIRED**.
No policy activation, real reporting route, staffed service or platform action
is established. Baseline: `9fed31a5f8e9328bb6d701fdddfb1cfece265f47`,
`holictraderscompany-art/htc-trial`, branch `codex/group04-t18`.

Reuse the [T23-A operations contract](t23-community-operations-contract.md),
[platform matrix](t23-platform-readiness-matrix.md), and existing offline
`community-moderation.js` advisory schema/reason catalogue without changing them.
T18–T22 and T23-A remain closed. T23-A policy proposals remain unapproved.
The website remains HTC's authoritative identity and educational destination.
WhatsApp, Telegram, Discord and Hybrid AI + Human Moderation are approved
directions only; there are no connections, accounts, invitations or bots here.

## Proposed lifecycle and responsibility

Primary path: `reported -> pending_review -> under_review -> resolved`.
An allegation is never a finding merely because it has been reported or flagged.
All responsibilities below describe synthetic fixtures, not real appointments.

| Action | Required current state | Next state | Simulated responsibility and requirement |
| --- | --- | --- | --- |
| `queue` | reported | pending_review | Human acknowledges intake; no real intake is created |
| `begin_review` | pending_review | under_review | Human takes review responsibility |
| `recommend` | pending_review, under_review, appeal_under_review | unchanged | AI attaches T23-A advisory only; cannot approve or decide |
| `escalate` | pending_review, under_review, appeal_under_review | escalated | Human supplies evidence-review reference; current assignment is cleared |
| `accept_escalation` | escalated | under_review or appeal_under_review | Accountable human accepts; original appeal decision-maker is excluded |
| `resolve` | under_review | resolved | Assigned human supplies evidence references and a non-enforcing disposition |
| `reopen` | resolved | pending_review | Accountable human supplies reconsideration/new-evidence reference; clears current disposition and assignment |
| `appeal` | resolved | appeal_pending | Human records a synthetic appeal reference; preserves challenged decision-maker |
| `begin_appeal` | appeal_pending | appeal_under_review | Different human takes appeal responsibility |
| `resolve_appeal` | appeal_under_review | resolved | Assigned independent human supplies evidence references and disposition |
| `request_correction` | resolved | correction_pending | Accountable human supplies erroneous-decision review reference |
| `correct` | correction_pending | resolved | Independent accountable human records corrected disposition with evidence reference; prior event remains |
| `withdraw` | under_review | resolved / withdrawn | Assigned human records reviewed withdrawal reference; no punishment |
| `close_unsupported` | under_review | resolved / unsupported | Assigned human records lack-of-support review reference; no punishment |

`resolved` means a simulated review disposition, not proof that any external
action occurred. Outcomes are `no_action`, `refer_to_authorized_human`,
`withdrawn`, or `unsupported`. There are no ban, mute, deletion, warning,
sanction-duration or delivery operations. Referral explicitly leaves sanction
authority unresolved. An AI `allow` advisory is not a safety guarantee and cannot
close a case. Human decisions must consider context, translations, authenticity,
benign explanations and conflicting evidence; the engine cannot verify those facts.

Reopening and appeal are distinct. A reopened ordinary review is reconsideration,
not an appeal shortcut. While an appeal is pending, ordinary resolution, correction
and reopening are blocked. Escalation preserves the appeal conflict marker; if the
only accountable fixture is the challenged decision-maker, the appeal stays stopped.
An additional independent appointment would need separate governance approval.
Corrections append events rather than erase earlier decisions or notices. Future
human operations must separately determine safe member notification and reversal.
`correct` rejects the original decision-maker with `CORRECTION_CONFLICT` even
when that actor is the accountable fixture. Requesting correction is not approval
to execute it. If no independent accountable fixture is available, the case stays
`correction_pending`; do not grant another fixture authority to bypass this stop.
Identity is derived from replayed events and the existing fixture tokens, never
from a new caller-provided identity/approval field. No real identity or delegation
architecture is implemented by this guard.

## Module contract — synthetic data only

`createCommunityReviewSimulation(humanOversightAvailable = false)` returns:

- `actors`: fixed frozen fixture tokens `moderator_a`, `moderator_b`,
  `accountable`, `ai`.
- `evaluate(caseInput, action, actorToken)`: synchronous, deterministic evaluator.

Only literal `true` enables **simulated** human availability. A caller-provided
`role: 'FOUNDER'`, a cloned token or a token from another factory is rejected.
Tokens are compared by identity, not by role strings. Anyone can call this factory
and obtain all its fixture tokens. **They are not authentication, credential,
verified identity, Founder delegation, or trusted human approval.** The module
must not be used as an authorization layer or imported into a live endpoint.

Case shape (exact own data properties):

```js
{ synthetic: true, id: 'sim-case-1', events: [] }
```

Action shape (all fields required):

```js
{
  id: 'sim-action-1', expectedRevision: 0, type: 'queue',
  approval: true, evidenceRefs: ['sim-evidence-1'],
  decision: null, advisory: null
}
```

Identifiers are synthetic labels only: `sim-case-`, `sim-action-` or
`sim-evidence-` followed by 1–6 digits. No message body, member identity,
URL, contact address, free-text rationale, attachment or personal data is accepted
as a field. Evidence references are placeholders; existence, quality, lawful
access and authenticity are not verified. Do not insert real evidence or hashes
of personal data into fixtures.

`expectedRevision` is a non-negative integer equal to the current event count.
All human actions require `approval: true` as a simulation condition only.
AI `recommend` requires `approval: false`, `decision: null`, and the existing
T23-A advisory fields: `recommendedAction`, `reasonCodes`, `requiresHumanReview`,
`prototype`, `enforcementAuthorized`, `policyStatus`. The three recommendations
remain `allow`, `flag`, `human_review`; known T23-A reason codes are reused.
The schema is checked, but cannot attest that an advisory truly came from T23-A
or is accurate. Human actions require `advisory: null`. Human `resolve`,
`resolve_appeal` and `correct` accept only `no_action` or
`refer_to_authorized_human` as `decision`; other actions require `decision: null`.

All actions except queue/start/acceptance/recommendation require at least one
evidence reference; a review-start can carry none. References are unique, bounded
to four per event. At most 32 events may be simulated. These are computational
bounds, not approved retention, sanction or staffing parameters.

Result fields:

```js
{
  prototype: true, simulationOnly: true, policyStatus: 'PROPOSED',
  enforcementAuthorized: false,
  accepted: false, reasonCodes: ['INVALID_TRANSITION'],
  nextCase: null, summary: null
}
```

Acceptance returns `TRANSITION_ACCEPTED`, a new frozen case/event history and
summary (`status`, `reviewer`, `decisionActor`, `appealedActor`, `outcome`,
`revision`). Error results return fixed codes, no input or exception text.
`REVIEW_REASON_CODES` exports the stable transition-error catalogue, separate
from the unchanged T23-A content-reason catalogue. No input is mutated. Replaying
the bounded history derives state rather than trusting caller-supplied state,
decision or authority-summary fields. Getters and sparse/malformed arrays are
rejected; unexpected exceptions fail closed. Arbitrary hostile JavaScript proxies
are not a CPU-isolation boundary: do not execute untrusted code to produce fixtures.

## Executable protections versus future requirements

Executable offline checks: valid lifecycle, matching revision, duplicate event IDs,
consistent history, allowed fixture identities, explicit simulated approval,
human-only actions, assigned reviewer, appeal independence, evidence-reference
shape, bounded input, fixed non-enforcing dispositions, and advisory shape.

Duplicate/stale/conflicting actions are checked **against the provided snapshot**.
The evaluator retains no ledger and cannot know that a newer snapshot exists.
Reusing an old snapshot can create an alternative simulation branch. There is no
global replay protection, atomic concurrency, tamper-proof history, audit storage,
credential validation, trusted receipt or proof of human action. Fabricated
synthetic histories can model valid sequences; they cannot authorize anything.
Future live integration would require a separately approved trusted authenticated
authority layer, current-case loading, atomic version checking, verified human
approval and revocation, privacy controls and reconciliation. None is implemented.

Stop conditions: unavailable human oversight; unknown or forged simulation token;
missing approval/evidence; conflicting review/appeal roles; malformed or excessive
input; invalid, duplicate or stale action; exhausted event bound; unsupported
enforcement request. Denial never changes the case and never triggers a fallback
action, provider call or data collection. There are no network requests,
persistence, logging of case contents, timers or services. No real report,
emergency promise, moderation queue, user-generated content or sanctions exist.

## Founder decision register

Every row remains **PROPOSED / FOUNDER APPROVAL REQUIRED**. The offline prototype
does not approve these policies or supply missing operational values.

| Decision | Unresolved prerequisite / proposed safe default pending approval |
| --- | --- |
| Moderator appointment and delegation | Named accountable humans, scoped authority, independent reviewer, revocation; no inferred authority |
| Reporting and appeal contacts | Verified private accessible destinations, conflict-of-interest route and ownership; no published placeholder |
| Privacy notice and processing basis | Reviewed ID/EN notice, lawful basis/consent, provider processing and access rules before any collection |
| Evidence retention and deletion | Approved durations, minimal fields, deletion verification, backups and justified exceptions; periods remain UNSET |
| Sanction authority, duration and reversal | Human authorization, evidence standard, expiry, correction/appeal and reversal; no autonomous sanctions or invented durations |
| Staffing and emergency contact | Verified coverage, availability notice, escalation custodian; pause when humans unavailable, no SLA claimed |
| Bot kill-switch ownership | Separately appointed human owner, revoke/drain/stop and explicit restart approval; no bot or kill switch implemented |
| Platform activation permissions | Verified ownership, least-privilege scopes, eligibility, privacy, tests and separate activation approval per platform |

T23-C, T24 and Group 05 are not implemented. T26/T27 own future automation
infrastructure; T28 owns future observability under the existing map. No account,
API key, paid resource, dependency, migration, role, endpoint, transport or
production configuration is introduced. Next step: Founder review of this
offline contract and test evidence; commit and subsequent tasks require separate
authorization. Live authority remains blocked even if the technical review passes.

## Targeted validation

Run only `node --test tests/t23-community-review-workflow.test.js`, plus static
scope/whitespace checks. The suite uses synthetic fixtures and the real module:
lifecycle, appeal independence including escalation, correction, unsupported and
withdrawn allegations, malformed inputs, forged authority, AI limits, stale and
duplicate actions, evidence bounds, determinism and absence of side effects.
T23-A's 43/43 evidence remains applicable because its files are unchanged; its
suite, T21/T22 tests and production builds are not repeated for this prototype.
