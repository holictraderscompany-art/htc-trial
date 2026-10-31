# T23-A — Community operations and moderation contract

Status: PROPOSED / FOUNDER APPROVAL REQUIRED. Contract design only, 31 October 2026.
No policy engine, reporting channel, bot, moderator roster or operational service
is implemented or activated by this document.

## 1. Authority, baseline and existing assets

Required and verified baseline: `5d0fb1b938ec36afb624bf7bf964830529d93e1a`,
branch `codex/group04-t18`, repository `holictraderscompany-art/htc-trial`.
Preflight found a clean worktree and tracking 0 ahead / 0 behind. No existing
T23 contract was found in the repository documentation inventory.

Reuse, without editing, the following authoritative repository contracts:

- `HTC-TRIAL-PRD-TASK-MAP-v3.0.md`: Trial rules; T23 owns community operations
  and moderation. T26 owns Automation Foundation, T27 Content & Operational
  Automation, and T28 Observability, Logging & Alerts. Their infrastructure is
  not created by T23-A. The map supplies high-level scope, not invented APIs.
- `t22-community-entry.md`: website entry is informational, sign-in is not
  membership, target platforms and the hybrid moderation concept are approved
  direction only. HTC's website remains the authoritative identity and educational
  destination. Production domain ownership and official channel destinations must
  be independently verified before publishing any operational links.
- `security-baseline.md`, `auth-role-foundation.md`, `api-release-foundation.md`
  and `public-experience.md`: least privilege, server-side authorization,
  protected credentials and separation of public sessions from Founder APIs.
- `t18-content-strategy-and-taxonomy.md`: truthful educational Trial content;
  no guaranteed outcomes. T19/T20 approvals and T21 protections remain unchanged.

Approved principles: WhatsApp, Telegram and Discord as target platforms; Hybrid
AI + Human Moderation as a concept; cost-conscious development. These do not
approve the proposed rules below, any account, bot, integration, member-data
processing, sanction, paid service or live activation. T18–T22 remain CLOSED.

## 2. Identity and Trial purpose

PROPOSED / FOUNDER APPROVAL REQUIRED: use the display-name pattern
`Holic Traders Company | Community | ID` or `Holic Traders Company | Community | EN`.
Mixed-language spaces may use an approved ID/EN label. These are naming proposals,
not registered names, reserved handles or invitations; provider length/format
limits and actual ownership remain unverified. Protect locked brand identities;
do not recreate logo/character masters or expose private asset locations.

After separate approval, the verified website should identify official spaces,
approved rules, available report/appeal routes and service availability. A logo,
display name or claimed moderator badge alone is not proof of authority. Do not
publish unverified platform destinations or invent a canonical domain.

Purpose during September–December 2026: introductions, market literacy, general
news discussion and HTC brand engagement under Educate • Empower • Elevate.
Keep news sources, dates, uncertainty and the difference between fact and opinion
clear. Education and general discussion are permitted proposals; individualized
investment instructions, guaranteed trade signals and performance guarantees are
not. No fabricated trading results, profit claims, solicitation or impersonation.
Disclose relevant affiliations/conflicts; promotional permission is a separate
Founder decision, not inferred from membership.

No curriculum, lessons, quizzes, assessments, enrollment, learning progress or
LMS functionality during Trial. January 2027 is future curriculum context, not
automatic activation authority. T24 monetization is outside this task.

## 3. Proposed member rules — English / Bahasa Indonesia

All rows: PROPOSED / FOUNDER APPROVAL REQUIRED. Both languages must be reviewed
by an accountable bilingual human before use. Neither has automatic precedence;
an ambiguity pauses enforcement and is escalated for a consistent translation.
Other languages require human support or an honest availability notice, not a
claim of global coverage. Do not infer nationality or risk from language.

| Rule | English member-facing proposal | Usulan Bahasa Indonesia |
| --- | --- | --- |
| C01 Respect | Discuss ideas respectfully; no harassment, threats or discrimination. | Diskusikan gagasan dengan hormat; dilarang melecehkan, mengancam atau mendiskriminasi. |
| C02 Trial purpose | Share introductions, market-literacy questions and sourced news; no paid signals or individualized trade instructions. | Bagikan perkenalan, pertanyaan literasi pasar dan berita bersumber; bukan sinyal berbayar atau instruksi transaksi personal. |
| C03 Truthfulness | No fabricated trading performance or guaranteed profit. Distinguish opinion from verified information. | Dilarang memalsukan kinerja trading atau menjamin keuntungan. Bedakan opini dari informasi terverifikasi. |
| C04 Identity | Do not impersonate HTC, a moderator or another person. Verify official destinations through HTC's website. | Jangan menyamar sebagai HTC, moderator atau orang lain. Verifikasi tujuan resmi melalui website HTC. |
| C05 Credentials | Never request or share passwords, OTPs, seed phrases, private keys or login/payment access. | Jangan meminta atau membagikan kata sandi, OTP, seed phrase, private key atau akses akun/pembayaran. |
| C06 Abuse | No phishing, malware, spam or unauthorized promotions. Do not repost suspicious links to warn others. | Dilarang phishing, malware, spam atau promosi tanpa izin. Jangan menyebarkan ulang tautan mencurigakan untuk memperingatkan orang lain. |
| C07 Privacy | Do not post another person's private details, reports or conversations. | Jangan memublikasikan data pribadi, laporan atau percakapan orang lain. |
| C08 Reporting | Use only a verified reporting route after it is available; do not publish sensitive reports in public chat. | Gunakan hanya jalur pelaporan terverifikasi setelah tersedia; jangan kirim laporan sensitif di percakapan publik. |

These rules are educational/community conduct proposals, not individualized
financial or legal advice. Jurisdiction-specific compliance, age eligibility and
privacy obligations require competent review before an international launch.

## 4. Proposed role and responsibility matrix

The existing website database roles remain exactly USER and FOUNDER. Human
moderator, AI assistant and member are proposed community responsibilities, not
new database roles. Platform administrator status never grants website Founder,
GitHub, production database, deployment or credential access. Verify operational
identity and delegation separately; never trust a display name or model claim.

All capabilities below are proposals, disabled until separately approved and
implemented. No permissions are granted by this table.

| Activity | Founder / explicitly delegated human authority | Human moderator | AI assistant | Regular member |
| --- | --- | --- | --- | --- |
| Governance, policy versions, appointments, budgets | Approve; retain accountable ownership | Propose; cannot self-elevate | No changes or approval | Read approved policy, propose feedback through approved route |
| Verified FAQ and safety information | Approve sources and templates | Review/correct; publish within delegation | Draft or answer only from approved public HTC sources; abstain when stale/unknown | Read and ask through approved routes |
| Spam/link/fraud/impersonation detection | Approve scope and evidence rules | Verify context; avoid opening unsafe links | Flag suspicion, explain uncertainty, create restricted review items | Report concerns without exposing secrets |
| Incident summaries and queues | Approve access and processing | Need-to-know review and correction | Nonbinding redacted summaries; no public accusation | No access to other members' reports |
| Reversible educational warning | Approve exact rules/templates and reversal procedure | Issue/correct within approved delegation | Only a separately enabled deterministic rule; otherwise draft for review | Receive explanation and access to appeal |
| Message removal or temporary restriction | Approve powers and parameters | Human decision within defined authority | Recommendation only; no autonomous deletion/restriction | No enforcement power |
| Permanent ban, ambiguous/severe case, appeal | Founder or explicitly designated accountable human decision-maker | Review; escalate outside delegation; independent reviewer for own decisions | No final decision, ban, appeal denial or override | Appeal without retaliation through approved route |
| Sensitive-report disclosure | Accountable human authorization and lawful/privacy basis | Minimum necessary, verified recipient only | Never autonomously disclose or cross-post | Cannot authorize disclosure of others' data |
| Credential rotation / emergency shutdown | Authorized human custodian | Invoke shutdown only if explicitly delegated | Cannot obtain secrets, re-enable itself or widen rights | Report compromise |

## 5. Evidence and enforcement decision contract

PROPOSED / FOUNDER APPROVAL REQUIRED:

1. Treat a report as an allegation. Identify policy version/rule and verify the
   relevant event, context, authenticity and authorized access. Do not treat model
   confidence, report volume, screenshots or a matching name alone as proof.
2. Obvious indicators may create a review item. Ambiguous intent, satire,
   quoted material, translation uncertainty and suspected impersonation require
   human review. Do not execute links, download attachments or fetch arbitrary
   URLs for verification; any safe analysis environment is separately approved.
3. Consider benign explanations and duplicate/brigaded reports. Uncertainty means
   abstain/escalate, not automatic punishment. No sanction solely on AI scoring.
4. A warning must not remove access. It needs an approved rule, verified evidence,
   an approved neutral template, human override, rate/duplicate limits and a
   correction/withdrawal path. Deleting a warning cannot erase that it was seen;
   provide a correction where appropriate. If these controls are unset, AI only
   drafts warnings for human review.
5. Require a human before destructive removal/restriction, severe actions or
   sensitive disclosure. Proposed temporary measures need approved durations,
   scope and review/expiry rules. Permanent bans require an accountable human
   decision and an appeal path; there are no approved sanction durations here.
6. Preserve a minimal decision trail, notify the affected member safely, and allow
   an independent human appeal. Do not reveal a reporter's identity to explain a
   decision. Appeal windows, response targets and staffing are unsettled, not SLAs.

## 6. Reporting, safety announcements and escalation

No live report address, intake form, staffed rota or appeal destination is
established here. Before activation, Founder must approve a private, accessible
reporting route and a distinct conflict-of-interest escalation/appeal route.
Members must not be told that an unstaffed channel provides emergency support.

Proposed intake: non-public case reference, rule/category, minimal incident
reference and preferred policy language; optional redacted context only when
needed and lawfully authorized. Do not request passwords, account access,
financial account records, identity documents or unrelated conversation exports.
This is an information-minimization proposal, not a schema or collection consent.

Proposed flow: report -> restricted human triage -> context/evidence review ->
authorized decision -> redacted notice -> independent appeal -> disposition and
deletion review. Imminent harm, suspected credential compromise or severe fraud
goes to a designated human immediately when staffed; pause automation and avoid
amplifying harmful content. Escalation contacts, coverage and response times all
remain PROPOSED / FOUNDER APPROVAL REQUIRED. Platform-native reporting guidance
must be verified before publication; do not invent support contacts or hotlines.

Proposed report notice EN: "Do not include credentials or private financial data.
Use only the reporting destination verified by HTC when it becomes available."
ID: "Jangan sertakan kredensial atau data keuangan pribadi. Gunakan hanya tujuan
pelaporan yang diverifikasi HTC setelah tersedia."

Proposed safety announcement EN: "Verify official HTC destinations through the
website. Do not share OTPs or account access. Report suspected impersonation
privately through the verified route when available."
ID: "Verifikasi tujuan resmi HTC melalui website. Jangan bagikan OTP atau akses
akun. Laporkan dugaan penyamaran secara privat melalui jalur terverifikasi setelah
tersedia." A human approves factual safety notices; never publish report details,
suspect identities or allegations as established facts.

## 7. Privacy and unresolved data parameters

Before collection, publish a reviewed ID/EN notice describing controller/contact,
purposes, minimum fields, visibility, platform processing, processors/AI providers,
international transfers, user rights and deletion/reporting routes. Membership is
not blanket consent to AI analysis, cross-platform identity linking or marketing.
Determine the lawful basis and any required consent; neither is approved here.
Do not send reports to an external model/n8n instance before processing, access,
provider retention/training and cross-border terms have been reviewed.

| Parameter | Proposed approach | Approval status |
| --- | --- | --- |
| Raw messages | No bulk chat archive or background scraping; minimum necessary event context only | PROPOSED / FOUNDER APPROVAL REQUIRED |
| Reports/evidence and audit metadata | Separate access; redaction, minimal references, expiry and deletion verification | PROPOSED / FOUNDER APPROVAL REQUIRED; all retention periods UNSET |
| Deletion, backups and appeal/legal holds | Define scope, approvals, bounded exception handling and provider limits before collection | PROPOSED / FOUNDER APPROVAL REQUIRED; no automatic legal-hold assumption |
| Identity linking, age eligibility and international support | No cross-platform member profiling; approve required checks and staffed languages | PROPOSED / FOUNDER APPROVAL REQUIRED |
| Consent, response targets and sanction/appeal durations | Set only after privacy/operational review; no numeric defaults | PROPOSED / FOUNDER APPROVAL REQUIRED |

UNSET retention/consent/processing controls block collection and live intake.
Do not invent a zero-day, indefinite or fixed-day retention policy. Platform-side
retention/deletion may differ; do not promise removal of every external copy.
No actual member information is handled in T23-A.

## 8. AI security, auditability and failures

Future implementation requirements, not executable guarantees in these Markdown files:

- Prompt-injection defense: keep trusted rules and verified public FAQ sources
  separate from member text,
  retrieved documents, quoted messages, links and attachments. Those are untrusted
  data, never instructions. A request to ignore policy or impersonate Founder must
  not change permissions. Never place private Founder packages, tokens or report
  archives in an unrestricted model context. Withdrawn/stale sources must stop
  being used; unknown answers escalate instead of inventing HTC facts.
- The model proposes structured actions only. A trusted server must independently
  check actor/delegation, platform destination, allowed action, policy version,
  evidence and required human approval before execution. Prevent replay, duplicate
  sanctions, out-of-order actions and reactivation after revocation. Website
  server-side authorization remains unchanged; no bot may call Founder APIs.
- Separate future bot credentials per platform/environment from Founder/Admin,
  GitHub, production database/service-role and deployment credentials. No direct
  privileged tools or secrets for the model. Restrict egress, recipients and
  mention/link expansion; avoid logging token-bearing API URLs or raw webhooks.
- Human override must stop pending actions, correct false positives and revoke
  access. A human-operated kill switch must disable the executor/transport, drain
  or quarantine pending actions and prevent automatic restart. Test shutdown and
  require explicit human approval to resume. This control is not implemented here.
- Audit minimal case/action IDs, policy/model/source versions, evidence category,
  uncertainty, decision actor, approval/result and reversal. Avoid raw transcripts,
  credentials and personal payloads. Counts or hashes alone do not prove provider
  delivery; record acknowledged results and reconcile unknown outcomes. Hashes of
  predictable personal content are not anonymous data.
- If AI fails or is uncertain: stop automated action, use staffed human review and
  approved static FAQ only. If n8n/hosting/provider fails: do not forward elsewhere,
  broaden permission or replay stale actions. Bound retries; uncertain delivery
  needs reconciliation. No n8n service, AI provider or queue is currently approved.
- Human unavailability means pause new participation/automation where necessary
  and publish an accurate availability notice through an approved route. Never
  silently accept reports into an ungoverned storage fallback. A human-only plan
  is mandatory on every platform; it is a future readiness requirement, not a
  claim that humans are staffed or external communities are live.

## 9. Cost and activation gates

Current T23-A target and activity: Rp0 additional service cost; repository
documentation and public source review only. No account, hosting allocation,
model call, paid trial, billing enablement or package installation is performed.
Future paid proposals must identify technical need, free/manual alternatives,
current unit prices/currency/tax and quotas, monthly volume/budget estimate,
benefits, privacy/security/lock-in risks, budget cap, shutdown and rollback plan.
No spend or billing activation without explicit Founder approval.

Before any future activation, require all of: approved policy/translation and
operational delegation; verified channel ownership/destinations and provider
eligibility; separate implementation approval; member notice/processing/retention
decisions; human coverage/report/appeal readiness; least-privilege authorization,
override and kill-switch validation; outage fallback; permission/abuse and
false-positive testing; cost approval and a distinct activation decision.

The [platform readiness matrix](t23-platform-readiness-matrix.md) separates
documented capabilities from unverified HTC readiness. No T23-B, T23-C or T24
implementation is authorized. No commit, push, merge, deployment or live service
activation is part of T23-A.
