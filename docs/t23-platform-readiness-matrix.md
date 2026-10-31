# T23-A — Platform feasibility and readiness matrix

Reviewed 31 October 2026. Documentation research only; no accounts, API keys,
bots, invitations, member data or integrations created or tested. Baseline:
`5d0fb1b938ec36afb624bf7bf964830529d93e1a`, `codex/group04-t18`.

## Evidence and decision labels

- APPROVED PRINCIPLE: WhatsApp, Telegram, Discord and Hybrid AI + Human Moderation
  are Founder-approved directions. HTC's website is the identity/education source
  of truth. This grants no platform access or activation approval.
- DOCUMENTED: a capability is described by a readable official source below.
  It is not proof of HTC eligibility, permission grants or a successful integration.
- PROPOSED / FOUNDER APPROVAL REQUIRED: HTC design/permission/cost recommendation.
- UNVERIFIED: provider detail, account-specific entitlement or operational fact not
  established. Unknowns block the dependent action; they are not assumed PASS.

Every platform's live HTC readiness is BLOCKED / NOT ACTIVATED in this task.
No comparison below is authorization to create an account or run a bot.

## Comparative matrix

| Area | WhatsApp | Telegram | Discord |
| --- | --- | --- | --- |
| Official route | Business Platform messaging APIs exist [W1]. Exact Groups API coverage for HTC is UNVERIFIED [W3]. | Official Bot API [T1]; ordinary bot integration, not a personal-account userbot. | Official app/bot APIs and application commands [D1, D4]. |
| Least-privilege starting proposal | No automated permission grant until exact official scopes and account eligibility are verified. Human management only after separate approval. | Command/FAQ-only, privacy-preserving bot membership first [T2]; escalate message visibility/admin rights only for a justified approved capability. | Approved-channel bot role: VIEW_CHANNEL and SEND_MESSAGES only where required [D2]; application-command scope if commands are selected. No ADMINISTRATOR. |
| Moderation proposal | Human-only fallback; do not assume ordinary groups/Communities can be read, moderated or migrated through business APIs. | Future reviewed deletion/restriction uses appropriate admin rights [T1]; AI remains advisory under the operations contract. | Future human-approved removal/timeout may need MANAGE_MESSAGES / MODERATE_MEMBERS [D2]. Do not grant these for a FAQ-only role. |
| Initial Rp0 option | Offline fixtures/policy work now. Test-number/sandbox entitlement and free limits UNVERIFIED; production messaging may incur charges [W2]. | Bot platform has free basic use [T3]; bounded offline fixtures now. Runtime/model costs remain separate. Do not enable paid broadcasts [T2]. | Offline fixtures now; official quickstart is a development route [D1], not a hosting price guarantee. HTC-specific fees/quotas and any free runtime allocation remain UNVERIFIED. |
| Future hosting dependencies | Verified business setup, official transport and supported callback route, where applicable; exact permissions/provider terms unresolved. | Running receiver: long polling or HTTPS webhook [T2]; credential custody and approved execution environment required. | Command receiver and/or Gateway process [D3, D4]; approved credential custody and hosting required. |
| Privacy/security concern | Group/member visibility, AI processing terms, account/phone exposure and opt-in requirements need review. Do not assume direct-message consent authorizes group analysis. | Privacy mode is not a blanket shield: administrator bots have broader visibility [T2]. No scraping, background archiving or identity linking. | Broad message analysis may require MESSAGE_CONTENT; enable only necessary intents and obtain review when required [D3]. No unnecessary member/presence collection. |
| Human-only fallback | Required; automated group moderation is blocked pending official evidence. | Required for outages, ambiguity, severe actions and appeals. | Required for outages, ambiguity, severe actions and appeals. |
| HTC readiness | BLOCKED: integration route/eligibility, privacy, cost and activation unverified. | Feasible in principle from official documentation; HTC deployment, permissions and operational readiness unverified. NOT ACTIVATED. | Feasible in principle from official documentation; HTC deployment, intents and operational readiness unverified. NOT ACTIVATED. |

The capability/permission choices are conditional proposals, not preconfigured
permission sets. Platform permissions can bundle powers beyond the desired action;
a future trusted executor must enforce HTC's narrower action allowlist and human
approval gates. A model must not hold a broadly privileged platform token.

## WhatsApp evidence and limitations

[W1] confirms a business messaging API product; it does not establish HTC group
moderation rights. [W2] describes delivered-message/category/market pricing and
some free categories; no HTC quote or universally free production use is inferred.

[W3] returned HTTP 429 on this review. It was not repeatedly requested. Groups
API eligibility, supported group/community types, membership limits, moderation
endpoints, minimum scopes, test-number coverage and HTC entitlement remain
UNVERIFIED. Do not hardcode third-party claims about badges or volume thresholds.
This is not a claim that WhatsApp has no Groups API; it is a limit of the verified
evidence available for this HTC design.

PROPOSED / FOUNDER APPROVAL REQUIRED: use human-only operations if separately
approved, until the official account-specific API route is demonstrated. Unofficial
Web/session-replay or personal-account automation libraries are not official APIs
and are not recommended for HTC production without documented provider-policy,
compliance, privacy and security review plus explicit approval. Do not bypass
eligibility using an unofficial client or copy an existing personal session.

## Telegram evidence and limitations

[T1] ties deletion to chat type/admin rights and message constraints; restriction
requires suitable supergroup administrator authority. Deletion is not universal
and is not proof every copy can be removed. No autonomous deletion is proposed.
[T2] distinguishes privacy-enabled command visibility from administrator access;
default privacy assumptions must be reconsidered before any admin grant. Webhook
and polling are alternative receiver designs, not simultaneous fallback scraping.
[T3] identifies free basic bot-platform use; [T2] also documents optional paid
broadcasts. No such option is enabled or budgeted for HTC.

UNVERIFIED for HTC: approved bot ownership, target chat type, exact effective rights,
privacy notices, allowed update types, safe transport authentication, runtime quota,
language staffing, model/provider processing and shutdown tests. Restriction rights
can allow broader sanctions; do not grant promotion, invitation or unrelated powers
merely for FAQ detection. Separate platform technical limits from HTC retention
and sanction policy, which remain unset. SDKs are third-party implementations of
an official API, not evidence that a capability or permission is available.

## Discord evidence and limitations

[D2] documents channel permission overwrites and role hierarchy. READ_MESSAGE_HISTORY
is only a future opt-in need if history access is justified, not a default grant.
Do not grant MANAGE_GUILD, MANAGE_ROLES, MANAGE_WEBHOOKS, KICK_MEMBERS or BAN_MEMBERS
to satisfy an advisory FAQ use case. Permanent bans remain human decisions.
[D3] makes message content a privileged data-access issue; HTTP access also has
restrictions. A working slash command does not prove passive chat scanning works.
[D4] supports user-invoked interactions as a less invasive starting proposal.
[D5] defines interaction payloads, which may contain identifiers and tokens: future
processing must minimize and authenticate them rather than log entire requests.

UNVERIFIED for HTC: server/app ownership, installation scope, effective permissions,
required intent approvals, current review thresholds at activation, quotas, hosting,
privacy/retention configuration and safe receiver setup. No bot account or command
was registered. Native platform AutoMod, if considered, is a separate scoped option;
its configuration/capabilities were not verified or enabled here. Community SDKs
do not remove official permission, data-access or human-review requirements.

## Common dependencies, costs and next gate

The [operations contract](t23-community-operations-contract.md) governs proposed
roles, uncertainty, appeals, privacy, kill switch and failure behavior. No current
member reporting destination is established by these documents. A future webhook
must authenticate provider-origin requests, handle replay/duplicates and keep
secrets out of logs; the exact provider-specific verification contract is deferred.
Do not feed messages to AI/n8n or create reporting storage before approval.

PROPOSED / FOUNDER APPROVAL REQUIRED: prefer explicit-invocation FAQ plus human
review before broad message surveillance. Human-only moderation is a required
fallback, not an assertion of a staffed service. Synthetic offline development
can target Rp0; public API documentation is not a promise that hosting, AI usage,
messaging, staffing or operations are free. No live service or spend is activated.

Before any paid proposal, document need, manual/free alternatives, current provider
unit prices, estimated volume/currency/tax, total monthly cost and cap, benefits,
privacy/security/lock-in risks and shutdown plan. Founder must separately approve
billing. Additional infrastructure follows T26/T27; observability follows T28.
No T23-B, T23-C or T24 work is started. Provider evidence must be refreshed and
account-specific readiness demonstrated at a separately authorized next gate.

## Official sources checked — 31 October 2026

Documentation references only; these are not HTC invitations or community links.

- [W1 — WhatsApp Business Platform](https://whatsappbusiness.com/products/business-platform/): official product overview; readable.
- [W2 — WhatsApp Business Platform pricing](https://whatsappbusiness.com/products/platform-pricing/): readable; no account-specific cost estimate derived.
- [W3 — Meta WhatsApp Groups documentation](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/): attempted once; HTTP 429, detailed capabilities UNVERIFIED.
- [T1 — Telegram Bot API](https://core.telegram.org/bots/api): deletion/restriction permissions and limitations.
- [T2 — Telegram Bots FAQ](https://core.telegram.org/bots/faq): visibility, receiver alternatives and optional paid broadcasts.
- [T3 — Telegram bot introduction](https://core.telegram.org/bots): basic bot-platform availability/free use.
- [D1 — Discord official quickstart](https://docs.discord.com/developers/quick-start/getting-started): development route, not an HTC deployment.
- [D2 — Discord permissions](https://docs.discord.com/developers/topics/permissions): scoped permissions and hierarchy.
- [D3 — Discord Gateway/intents](https://docs.discord.com/developers/events/gateway): necessary intents and access-review conditions.
- [D4 — Discord interactions overview](https://docs.discord.com/developers/interactions/overview): user-invoked interaction model.
- [D5 — Discord receiving/responding](https://docs.discord.com/developers/interactions/receiving-and-responding): interaction payload and receiver contract.

No unofficial mirror, library README or forum post is treated as authority for
provider capabilities. This matrix establishes documentation feasibility only;
it does not claim operational, privacy, integration or moderation readiness PASS.
