# T10 public/user Trial experience

The public shell, Trial entry, `/content` discovery, `/content/<uuid>` reading,
sign-in and UI states reuse the pushed T01–T09 contracts. `DESIGN.md` governs the
visual system: readable system typography, a neutral palette respecting the
system light/dark preference, one subdued green accent, consistent four-pixel
control corners, spacing and semantic lists.
No UI framework, font download, icon library, animation or new dependency is used.

## Rebaseline

Satisfied before T10: T06 lifecycle, T09 bounded discovery/detail/category/cursor,
T07B safe asset metadata, T03 Google identity/roles and T04 server authorization.
Partial: authentication had server boundaries but no durable application session
UI. Missing: public pages, navigation, filter/pagination controls, reading layout,
session controls and loading/empty/error/not-found presentation.

The initial public binary media conflict was resolved by explicit human decision:
T10 media is metadata-only. List pages show real reference counts. Detail pages
show permitted role, MIME type and available dimensions/duration, with an honest
statement that playback and downloads are unavailable. No fake thumbnail, player,
download link, private path or asset URL is constructed.

DEFERRED: Public binary media playback/download requires a separate approved task
because it changes the existing T07B media access boundary.

## Content and rendering

Server components call the existing public content handler through a presentation
adapter, without an HTTP call back into the application or duplicate query logic.
Discovery requests 12 records and one existing safe metadata batch. Category and
opaque cursor live in the URL; T09 validates both. Applying a category resets the
cursor. Next-page links remain available for short/empty expanded pages when T09
returns continuation. Back-to-first-page preserves the category. Detail responses
remain uniform for missing, invalid, DRAFT and WITHDRAWN identifiers.

Content is rendered as escaped text, with plain paragraphs and preserved newlines;
it is not interpreted as HTML/Markdown. Public reads never use session cookies to
elevate visibility. No invented publication date or private workflow field appears.
Reading width is bounded, long words wrap, native controls support keyboard/touch,
and the shell includes a skip link, named navigation and visible focus states.

## Existing Google Auth presentation

The new routes are a web presentation of the existing Supabase Google PKCE flow,
not a new identity provider, role model or authorization system. Same-origin POST
`/auth/start` stores a ten-minute HttpOnly PKCE verifier/correlation cookie and
redirects to the existing provider. `/auth/callback` exchanges a one-use code,
checks browser correlation and verifies the resulting identity with Foundation
`authorize`. Provider errors are redacted and the flow cookie is removed.

Only the access token is retained in an HttpOnly, SameSite=Lax cookie, Secure on
HTTPS, capped at one hour and never longer than the provider's expiry. Refresh
tokens are not persisted or returned to the browser. Session expiry requires a
fresh sign-in; there is no background refresh implementation. `/api/session`
verifies identity with Supabase on every check and reads only the existing own
profile ID/display name. The response exposes neither token, email nor role.
Navigation checks on page changes and offers sign-in, sign-out or a status retry.

Same-origin POST `/auth/sign-out` revokes the current Supabase session and clears
local cookies. On upstream failure it still clears local cookies and reports that
remote revocation could not complete. No token enters browser storage, HTML,
logs or repository files. Founder controls are absent for all public-shell users;
existing Founder APIs still require explicit Bearer authorization and authoritative
database checks. Session cookies do not create Founder API access.

The existing `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` server configuration is
reused. The application's `/auth/callback` must be allowed by the already approved
Supabase redirect configuration. No provider/redirect configuration is changed in
T10. Public reading works anonymously even when authentication is unavailable.

## Validation

Focused tests exercise real presentation adapters, React server rendering,
privacy/error projection and the Supabase session flow with controlled transport
fixtures. These fixtures are explicitly tests, not HTC published content or proof
of a fresh live Google login. Existing Foundation/runtime validation remains
applicable. All 153 tests pass: 22 T10 tests and all 131 existing regression tests.
The production build passes. Playwright checks cover the real anonymous entry and
empty public catalog, plus controlled transport fixtures for pagination, detail,
metadata privacy, loading, errors, denied access, USER navigation and sign-out.
No fresh live Google login was performed in this gate; authenticated browser
coverage uses controlled fixtures and does not prove provider redirect readiness.
Mobile (390px), tablet (768px) and desktop (1440px) checks found no horizontal
overflow. Keyboard skip navigation, light/dark themes and text contrast pass.
Controlled QA found zero broken internal links and zero page/runtime errors.
Content stays server-rendered with bounded reads and small client session controls;
production Core Web Vitals have not been measured.
No remote test rows/files, database writes, migration or storage changes are needed.
No curriculum/LMS, Founder UI, T11, deployment or push is included.
