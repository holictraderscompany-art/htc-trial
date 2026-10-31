# T22 — Community Entry & Engagement Foundation

## Approved delivery and closure scope

Baseline: `f18d4ec4107340b44a16cd0736be969bbdb54bbe` on
`codex/group04-t18`, synchronized with the approved remote. T18–T21 remain
closed. Master Task Map v3.0 names T22 but explicitly does not supply detailed
contracts for T12–T39. The Founder's controlled implementation instruction
authorizes an informational community entry, not a new community service.

The initial foundation is `/community`, available anonymously and to signed-in
users through the existing Public/User shell. It introduces the four HTC
pillars, Educate • Empower • Elevate, respectful participation and ways to read
and reflect during Trial. Both calls to action lead to real HTC pages:
`/content` and `/`. Registration, questions, comments, feedback and notifications
are explicitly unavailable. Signing in does not create community membership.

### Founder scope clarification — 31 October 2026

T22 delivers the Trial's public community entry and engagement-information
foundation. Closure review covers that approved informational deliverable, not
working participation services. Active participation workflows require separately
approved implementation, privacy/security contracts and moderation readiness.
The Master Task Map v3.0 supplies no additional detailed T22 workflow contract;
this boundary follows the Founder's explicit scope rather than inferring features
from the task title. Formal closure remains a Founder decision after this review.

WhatsApp, Telegram and Discord are approved future target channels. They are not
integrated or published by T22. This direction does not authorize external account
creation, invitations, channel links, live integrations, data collection or service
activation. HTC's website remains the authoritative identity and educational
destination; messaging platforms do not replace that authority.

Hybrid AI + Human Moderation is approved in principle. Operational authority,
moderation policy, reporting, escalation and implementation belong to T23, subject
to its own contract and approval. No AI agent, human moderation workflow or T23
code is activated here. Additional automation infrastructure belongs to Group 05:
T26 Automation Foundation, T27 Content & Operational Automation and, where relevant,
T28 Observability, Logging & Alerts. Those mapped tasks require separate scope and
authorization; T22 creates none of that infrastructure.

## Reused design and security contracts

The design reference is HTC's existing `DESIGN.md` and T10 entry, not a new
visual identity. The page's job is orientation; its primary action is browsing
introductory content. Existing typography, reading width, light/dark tokens,
buttons, wrapping navigation, touch targets, focus outlines and skip/main
landmarks are reused. Static sections explain present participation, inactive
tools and Trial timing. There are no decorative media, invented statistics,
testimonials, placeholder links or external community destinations.

`public-shell.js` adds one normal Community link. T10 session navigation stays
unchanged, including its anonymous, loading, error, USER and sign-out behavior.
No Founder link or capability is added. Authentication remains independent of
community participation; the existing server authorization remains authoritative.

The page is a server component with explicit route-local noindex/nofollow and
no canonical or Open Graph URL. It never calls the T21 indexing policy. T21
metadata helpers, robots, sitemap, SSR verifier, framework backport, dependencies
and workflow are unchanged. `/community` is not added to the sitemap or canonical
allowlist, including when production indexing is configured in the future.

There is no new data read/write, form, browser storage, tracker, API, cookie,
session mechanism, private asset reference or external service. The shared T10
session control still performs its existing same-origin session check; T22 does
not claim that authentication has been disabled or that the whole application
has no network activity.

September–December 2026 remains introductory/educational Trial. The January 2027
curriculum statement does not activate curriculum, lessons, quizzes, assessments,
enrollment or progress functionality. T18 editorial dimensions and categories,
T19 production approval and T20 publication boundaries are preserved.

## Deferred engagement contracts — Founder review required

| Decision needed | Required boundary before implementation |
| --- | --- |
| Participation mechanism and user journey | Define whether any questions, registration, comments or feedback are wanted and what an actual submission means. |
| Identity and personal data | Approve required identity, allowed fields, consent, retention, deletion and access. Existing sign-in is not enrollment approval. |
| Persistence and transport | Approve any API, storage, schema/migration, RLS, authorization, validation and abuse controls before collecting data. |
| Community operations | The Hybrid AI + Human Moderation concept is approved in principle; T23 owns operational authority, moderation policy, reporting, escalation and implementation. None is active here. |
| Notifications and integrations | WhatsApp, Telegram and Discord are approved targets only. Verified destinations, accounts, credentials, invitations, transport/data handling and any notifications/email/webhooks still need separate implementation and activation approval. |
| Additional automation infrastructure | Group 05 owns T26 Automation Foundation, T27 Content & Operational Automation and applicable T28 logging/alerts; no automation infrastructure or agent is implemented in T22. |
| Service activation | Approve operational readiness and user-facing availability before presenting an active community service. |

Active workflows remain unimplemented dependencies for future service activation.
They are not acceptance claims for this informational foundation. Closure review
uses the explicit Founder scope above; it does not approve the deferred workflows
or certify moderation, integrations or automation as ready. No T23 implementation
is included.

## Validation

Focused test command:

`pnpm exec node --test tests/t22-community.test.js tests/public-experience.test.js`

The T22 tests render the actual server component, check truthful Trial and
availability copy, resolve CTA destinations, reject collection/privileged or
external surfaces, and check explicit noindex/no canonical metadata. T10 is the
affected shared-shell/session regression. Production HTTP and browser checks
are recorded after execution; no T21 SSR matrix is required for this static route.

### Executed evidence — 29 October 2026

Private sandbox: `htc-t22-community-20261029`, session
`sbx_ioaXP573LSnzys6QZdMxkkIjxwT9`, in the existing HTC Vercel validation
project. Ubuntu 26.04.1 LTS, Node 24.21.0 and pnpm 11.25.0 were used. Node's
download was checked against its official SHA-256 list. This is disposable cloud
validation, not a deployment: no public ports, no production credentials, no live
Supabase transport and no GitHub workflow trigger.

- Command `cmd_e805b377b9f442fcb9888356a04b`: frozen install with
  `--ignore-scripts`, the focused command above (8 T22 + 22 T10 cases), and one
  production `pnpm run build`; exit code 0. The existing build command and pinned
  backport ran unchanged. No dependency or lockfile version was changed.
- Command `cmd_4a65d1e391d84ede8ac604cc205d`: production HTTP/Chromium checks;
  exit code 0 and structured result `PASS`. The existing T21 synthetic custom
  server fixture was reused outside application source, without executing its
  SSR matrix or changing the verifier. All upstream transport was intercepted
  in memory with no forwarding.
- Actual HTTP 200 includes the Community heading and accurate title in server
  HTML. Explicit noindex/nofollow and no canonical/OG URL remain present even
  with a configured reserved synthetic production origin. Community rendering
  performs zero upstream reads and exposes no private fixture canaries. The
  unchanged sitemap excludes `/community`.
- Anonymous Founder access still redirects to sign-in. A synthetic USER is
  denied Founder UI access and receives HTTP 403 from the Founder API. This
  verifies the existing boundary; it is not evidence of a fresh live Google login.
- Chromium at 320, 390, 768 and 1440 px: Community navigation and both real CTA
  journeys pass; navigation touch targets are at least 44 px, with no horizontal
  overflow. JavaScript-disabled reading/navigation and keyboard skip-to-main
  focus pass. Controlled USER long-name/dark/mobile and session error/retry
  states pass without Founder links or new community forms. The USER browser
  session display is an isolated UI fixture, not a new authentication contract.
- Zero browser page errors, hydration errors or external browser requests.
  Seventy snapshot source/configuration/test/document files matched their hashes
  before and after cloud execution. This validation record was completed afterward;
  executable application and test inputs remain unchanged.

The T21 16-scenario SSR matrix and unrelated closed-task suites were not rerun.
Production domain ownership, live community operations, actual publishing and
external provider integrations are not validated or activated by this work.

Final audit recommendation — 31 October 2026: **READY FOR CLOSURE** of the approved
Trial public entry and engagement-information foundation, subject to Founder
acceptance. This recommendation does not mark active participation, target-channel
integrations, moderation operations or automation as implemented or operational.
It does not itself close T22 or authorize staging, commit, push or deployment.

No commit, push, merge, deployment, content publication or T23 work was performed.
