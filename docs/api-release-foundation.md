# T04 API, Access Control and Release Foundation

The API-only Next.js runtime serves three foundation endpoints. `GET /api/health` is public liveness only; it does not claim database or release readiness. `POST /api/access` requires a Supabase user session. `POST /api/founder` additionally calls T03's `is_founder()` with the caller's token. Both protected endpoints accept exactly `{ "probe": "access" }` and return an access confirmation without profile details. They are non-business boundary probes.

## Authentication and authorization

Send an existing Supabase access token using `Authorization: Bearer <session token>`. The server validates it through Supabase Auth's `/auth/v1/user`, rejects anonymous identities, and uses only the resulting UUID for profile lookup. This foundation does not implement cookie sessions, login, or token storage.

All database requests forward the same user token so the approved T03 RLS policies remain authoritative. Founder authorization uses the database helper, not client email, role claims, user metadata, request bodies, query parameters, local storage, or UI visibility. The API never uses service-role credentials and performs no database writes. Authenticated users can probe only their own profile's availability. No privileges, roles, policies, triggers, or previous migrations are changed.

## Configuration and errors

Provide `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the process environment. The URL must be `https://vzkbcgfywyhtvprxpwfb.supabase.co`; the key must be a publishable key. Never place session tokens, OAuth secrets, passwords, secret keys, or service-role keys in repository content or logs. No environment file is required or created.

Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, then `pnpm start` locally. Tests use Node's built-in runner. Next.js, React, and React DOM are the only direct runtime dependencies; React packages satisfy Next.js requirements. There are no development dependencies.

Requests reject unexpected query fields, malformed JSON, extra payload fields, protected-field/role input, and bodies over 1 KiB. Upstream calls have a timeout and do not follow redirects. Responses use `ok/data` or `ok/error` with controlled 400, 401, 403, 404, 405, and 500 outcomes. Authentication runs before protected input validation. Responses are not cached. Internal exception messages, upstream errors, credentials, and tokens are never returned or logged.

## Proof and release gate

Focused T04 tests cover these route handlers with controlled Supabase responses, including denial, authoritative Founder checks, token forwarding, input rejection, and error redaction. These tests are not live Google sign-in or populated-database RLS tests. Live USER/Founder proof requires real, authorized sessions kept outside repository files and logs; do not manufacture authentication records or weaken policies for tests.

Approved validation status: T04 is approved and T05 passed. All 15 focused tests, the production build, 38 live validation checks, and seven production HTTP checks passed. The HTTP checks covered public health (200), invalid public query (400), both unauthenticated protected requests (401), and unsupported methods on the three routes (405). The dependency audit reported zero vulnerabilities.

Live validation used fresh Google OAuth sessions for the authorized Founder and two distinct ordinary USER accounts. It proved permitted USER and Founder access, USER rejection at the Founder boundary, bidirectional cross-user read/write isolation, protected-role and protected-field mutation rejection, and permitted display-name updates under the approved policies. Connected-project inspection confirmed three linked auth users/profiles, no orphan profiles or role mismatches, and preservation of the approved schema, RLS, policies, triggers, and grants. Required Supabase environment configuration was available during validation without printing its values.

The two known Supabase security advisories were reviewed as non-blocking for the approved Foundation: authenticated execution of the intentionally approved `is_founder()` helper, and disabled leaked-password protection. No Supabase configuration or approved authorization behavior was changed to clear them.

Temporary OAuth/session material was kept only in memory and cleared after validation. Temporary callback and runtime processes were stopped. No live credentials were stored in repository files or exposed in validation output. Completed live validation is not blocked by the intentional absence of retained sessions. No UI, product features, commit, push, or deployment was introduced by T04/T05 validation; the final repository release gate remains separate.

Future release requires the focused tests and production build to pass; live USER/Founder and cross-user RLS validation to pass; no exposed secrets; both environment variables present; local migrations reconciled with registered Supabase migrations; security review and dependency audit completed; advisor findings resolved or explicitly reviewed; human review and approval; and separate explicit deployment authorization. A liveness response alone does not satisfy this gate.

T04 does not deploy or create CI/CD. T05 remains the comprehensive foundation validation layer. Trial is September–December 2026; curriculum begins January 2027. This foundation implements no UI, dashboard, lessons, quizzes, curriculum, community, content, analytics, or monetization features.
