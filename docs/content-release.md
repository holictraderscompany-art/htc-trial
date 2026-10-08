# T06 Content Management & Release

T06 adds only Trial content lifecycle controls. It creates no UI, media, publishing automation, distribution, traffic tracking, or community features. September–December 2026 remains validation only; official curriculum begins January 2027. No lesson, course, module, quiz, enrollment, progress, or assessment entities exist.

## Server contracts

`GET /api/content` returns at most 100 released records. `GET /api/content?id=<uuid>` returns one released record or a controlled 404. Only `id`, `category`, `title`, and `body` are returned. Caller authorization headers do not elevate this path. Unknown or duplicate query fields are rejected. Responses are not cached.

`POST /api/content/manage` requires an existing Supabase bearer session and a true database `is_founder()` result. Exact JSON contracts are:

- Create: `{ "action": "create", "category": "INTRODUCTION", "title": "HTC", "body": "Trial introduction" }`
- Update: `{ "action": "update", "id": "<uuid>", "category": "INFORMATION", "title": "HTC Trial", "body": "Validation only" }`
- Release: `{ "action": "release", "id": "<uuid>" }`
- Withdraw: `{ "action": "withdraw", "id": "<uuid>" }`
- Internal read: `{ "action": "read", "id": "<uuid>" }`

Allowed categories are INTRODUCTION, INFORMATION, EDITORIAL, DISCOVERY, FUTURE_JOURNEY, and VALIDATION. Title is 1–200 characters; body is 1–8000 characters. Both must contain non-whitespace text and exclude angle brackets. Body is plain text, never HTML or executable markup. Later presentation must render it as text.

Creation produces DRAFT. DRAFT is private. Founder editing atomically returns content in any existing state to DRAFT and clears its release timestamp; manual withdrawal before editing is unnecessary. Edited content immediately leaves public read paths when the transaction commits and requires explicit release to become public again. Explicit release accepts DRAFT or WITHDRAWN; withdrawal accepts RELEASED only and remains a separate action. Internal reads retain all states. Every release is Founder-authorized and uses the constrained Trial content model. Category validation cannot determine prose meaning; human review must still exclude lessons/curriculum disguised as editorial content. There is no automatic curriculum activation in January.

## Database and Foundation boundaries

`20261008_content_release.sql` is additive and does not alter approved Foundation migrations or auth policies. `trial_content` has RLS enabled and no direct anon/authenticated table privileges. Its defensive RLS policy permits Founder only. Narrow security-definer RPCs have empty search paths and explicit execution grants: `read_released_content` projects four fields from RELEASED rows only; `manage_trial_content` rechecks `auth.uid()` and `is_founder()` before every operation. Mutations lock the affected row. The server forwards the caller token and never uses a service-role key.

The public read RPC is the database portion of the approved public boundary and can also be called through Supabase REST; it exposes the same safe projection. It does not expose internal table access. Founder RPC calls outside Next.js still face the same authoritative database check, input whitelist, and lifecycle rules. No email, metadata, or client role claim grants access.

T06 consumes shared T04 authorization, transport, bounded JSON parsing, and response helpers exported from `api-foundation.js`. L1 contains no content imports or business rules. No login/session UI or new role system is introduced. Invalid lifecycle operations fail closed at the database; upstream database errors produce a redacted 500. Missing management records produce 404.

## Validation

`pnpm test` includes the unchanged Foundation tests and focused T06 API tests. API tests use controlled Supabase responses; they do not establish actual SQL/RLS behavior. Node syntax checks and `pnpm build` are separate checks; this JavaScript repository has no configured type-check or lint script.

`tests/content-release.sql` is an executable database assertion suite for a disposable LOCAL Supabase database with the repository migrations applied. Run with `psql -v ON_ERROR_STOP=1 -f tests/content-release.sql`. It exercises actual grants, RLS, role denial, lifecycle transitions, public field projection, and direct identifier visibility. Fixtures and temporary grant probes are transactional and rolled back. Never run this fixture suite against the linked project or production.

Creating the local migration file does not apply it to the linked Supabase project. T06 cannot be declared PASS until the executable database checks pass. No remote migration application, commit, push, or deployment is authorized by this implementation.
