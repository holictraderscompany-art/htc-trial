# T11 Group 02 release validation

Validated on 2026-10-10 against pushed T10 baseline
`e22532a319e51dd05f088da63bebf3fe5f5b22ca` on `main` in
`holictraderscompany-art/htc-trial`. Preflight was clean and aligned with
`origin/main`; `DESIGN.md` and T01–T10 remained authoritative.

## Result and scope

PASS for the approved Group 02 Trial scope. No implementation defect requiring a
fix was found. T11 changes are eight integration tests, their test-command entry,
and this validation record. No production implementation, migration, dependency,
auth configuration, RLS, database, Storage, deployment configuration or design
source changed. No push, deployment or Group 03 work is included.

Public media remains metadata-only. Public binary playback/download is deferred
to a separately approved task because it changes the T07B access boundary.
No public bucket, signed URL, binary endpoint, private path, fabricated thumbnail,
player or download control was added. Trial remains introductory/educational;
the interface states that official curriculum begins in January 2027.

## Automated validation

`pnpm test`: 161/161 PASS, zero failures/skips.

| Suite | Passed |
| --- | ---: |
| Group 01 | 15 |
| T06 | 41 |
| T07A | 24 |
| T07B | 21 |
| T08 | 8 |
| T09 | 22 |
| T10 | 22 |
| T11 | 8 |

`pnpm build`: PASS using the existing production webpack build command.

The new tests integrate actual Founder/public handlers, T09 discovery/cursors,
T10 presentation adapters and React server rendering. Controlled transport models
the reviewed SQL contract; tests do not execute Postgres or replace previous
remote migration/runtime evidence. Coverage includes immediate edit-to-DRAFT,
release and withdrawal visibility, withdrawal during metadata resolution,
pagination through 13 records, bounded batch reads, private-field projection,
PENDING/DELETING rejection, USER/anonymous denial across Group 02 management
handlers, and preservation of explicit Founder bearer authorization.

## Production-build browser validation

Playwright CLI ran against the local production server. A disposable process-local
fetch shim intercepted every Supabase request and rejected unhandled requests;
none were forwarded remotely. Synthetic sessions and content existed only in the
local fixture process/browser. There were no live rows, uploads, remote mutation,
new accounts or role changes.

Passed: Trial entry, navigation, 12-item discovery and one-item continuation,
category filtering, readable detail, metadata-only presentation, empty/loading/
error/not-found states, invalid navigation, anonymous navigation, server-validated
fixture USER identity, sign-out, denied-session recovery, session retry, Founder
isolation, same-origin sign-in checks and redacted invalid OAuth callback handling.
Local Founder fixture edits/releases/withdrawals immediately changed public
visibility on the next request. DRAFT/WITHDRAWN records stayed unavailable.

At 390px, 768px and 1440px, reading, metadata and USER navigation had no horizontal
overflow. A 200-character unbroken title and 8,000-character body also fit these
viewports. Tested filter/session controls and navigation links had usable touch
targets. Desktop heading position stayed stable across anonymous/USER states.
Mobile light and desktop dark screenshots were visually reviewed against
`DESIGN.md`: restrained reading layout, real metadata and no decorative media.

Keyboard skip navigation focused main content; tabbing from the labelled category
select reached the filter button with a visible outline. Semantic headings,
native controls, accessible status/error messages and no hover-only controls were
reviewed with the
[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
There are no public binary images requiring an invented alt description.
Measured body/muted contrast was 13.98/5.86 in light mode and 14.38/9.02 in dark
mode, exceeding 4.5:1 for normal text.

Broken visible internal links: 0. Page/runtime errors: 0. Normal-flow console
errors/warnings: 0. Fault injection produced three expected HTTP resource errors
for deliberately denied/missing/failing responses; unexpected console errors: 0.

## Review limits and cleanup

USER/provider behavior was tested with controlled transport fixtures; no fresh
live Google login or provider redirect-allowlist verification was performed.
This record does not assert new remote catalog/policy validation. Existing
T01–T10 remote approval/evidence remains applicable and unchanged.
Production Core Web Vitals, cross-browser coverage and assistive-technology user
testing were not measured. Performance review confirms bounded 12-record reads,
one metadata batch per nonempty page, server rendering, existing minimal client
session controls and zero new runtime dependencies.

Security/scope review found no private field/error disclosure, client-side secrets,
service-role exposure, public binary delivery, authorization bypass, speculative
feature, LMS behavior or AI-slop addition. Temporary browser cookies, QA scripts,
screenshots and the local fixture server are cleaned up before commit. Local
Playwright skills remain installed and ignored. Only the reviewed T11 test,
test-command update and this document belong in the local validation commit.
