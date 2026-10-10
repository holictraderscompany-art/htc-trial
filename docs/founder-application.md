# T12 Founder application shell and protected access

## Scope and implementation choice

The local T12 approval covers one Founder entry, a minimal shell, existing
authentication integration, server authorization, safe denial and public isolation.
`/founder` is the route proposed in the approved implementation plan. Its name,
navigation labels and minimal landing copy are implementation choices, not newly
invented locked PRD decisions. The full PRD/Master Task Map is not in this checkout.

Baseline: `main`, `6d8342373c09677636b34c322b074386b85f10fc`, initially clean,
in `holictraderscompany-art/htc-trial`. No branch change or remote action occurs.

## Dependency direction and access

The L3 server adapter `src/server/founder-access.js` consumes L1's unchanged
`authorize(..., 'founder')`. It reads the existing HttpOnly access-token cookie
through `src/server/session-token.js`, validates identity with Supabase Auth, and
requires the database `is_founder()` result to be exactly true. It returns only
an access state, never an identity, email, token or upstream error.

The existing cookie name, parsing rules and token syntax are extracted unchanged
from `trial-session.js`. Google PKCE, cookie attributes, expiry, sign-out and the
public session response are preserved. No second authentication/role system exists.
USER/FOUNDER and the approved database identity synchronization remain unchanged.
No frontend email comparison or client claim grants access.

Both Founder layout and page request server authorization. Their Next.js adapter
uses React request memoization only, with no persistent cache across visitors or
requests. The route is dynamic and the Foundation transport remains no-store.
Each subsequent server request validates the current session and database role.
No background refresh/revocation notification is introduced; already delivered
static shell markup cannot be recalled after expiry. It contains no operational
data or mutation controls, and it grants no API authority.

## Access states and navigation

- Missing, ambiguous, malformed, invalid or expired session: redirect to the
  existing `/sign-in`, with no Founder shell or landing content.
- Validated USER: neutral access-denied panel; privileged children are suppressed.
- Authorized FOUNDER: Founder shell and minimal landing only.
- Uncertain authorization/configuration/upstream failure: neutral unavailable
  panel with retry/sign-out; no privileged rendering or internal disclosure.

Denied/unavailable page panels are presentation states and may return HTTP 200;
they are not represented as HTTP 403 responses. Existing protected APIs retain
their actual 401/403 responses and explicit bearer-token requirements. Cookie-only
management requests still fail. No cookie-authenticated mutation endpoint is added.

Founder navigation contains only Founder home, public content and existing
same-origin POST sign-out. Public navigation has no Founder controls. The OAuth
callback still returns to `/content`; the Founder revisits `/founder` after login.
There is no new return-to parameter or provider configuration change.

## Public presentation preservation

The shared root retains HTML, metadata, viewport and global stylesheet. Public
presentation lives in `src/components/public-shell.js`, consumed by the URL-neutral
`src/app/(public)/layout.js`. Entry, sign-in, content list/detail and loading files
move into that group with relative import corrections only; URL contracts remain
unchanged. Public error/not-found boundaries and root recovery wrappers preserve
the previous public shell without nested main/navigation landmarks.

Founder views reuse existing CSS classes and semantic controls. No stylesheet,
design source, UI dependency or lockfile changes are needed.

## Validation

Local validation on 2026-10-11:

- `pnpm test`: 178/178 pass, zero failures/skips (161 existing plus 17 T12).
- `pnpm build`: pass; existing public/API routes retained and `/founder` dynamic.
- No separate approved lint/typecheck script exists in package.json.
- Initial sandbox commands failed before execution with node_modules realpath
  EPERM; approved reruns used the existing dependencies without installation.
- Installed Playwright CLI checks passed against the compiled production app:
  anonymous/USER/Founder/expired/spoofed-claim/upstream-failure states, no protected
  payload for denied requests, non-cacheable Founder responses, sign-out then direct
  denial, all three public identity states, global/content not-found recovery,
  keyboard skip navigation and no overflow at 390px/768px/1440px. Mobile light and
  desktop dark screenshots were reviewed. Zero page/runtime exceptions occurred;
  deliberately denied API/missing-page requests produced expected HTTP console
  resource errors.
- All four privileged APIs returned 401 for cookie-only requests and 403 for
  fixture USER bearer requests. No Founder mutation was performed.
- Browser and server authentication used disposable process-local synthetic
  fixtures only. All Supabase calls were intercepted and unhandled calls rejected;
  external browser requests were blocked. No requests were forwarded to Supabase,
  no real credentials were used, and no remote rows/files/accounts were changed.
- The first sign-out browser check used 127.0.0.1 and received 403 from the existing
  same-origin guard. Comparing hostnames confirmed localhost returns 303 to home.
  The complete browser gate passed on localhost, the runtime's canonical request
  origin. No auth code/configuration was changed to bypass the guard. Real hosting
  origin alignment remains a validation dependency.
- Temporary browser cookies, QA scripts/screenshots and the fixture runtime were
  cleared/removed after validation; the named browser and server were stopped.

The new suite covers session ambiguity/expiry, USER and spoofed identity denial,
strict database approval, request revalidation, failure redaction, actual React
shell/denial rendering, independent route guards, public isolation and preservation
of all four existing privileged APIs' bearer boundary. Existing tests remain intact
apart from relocated public source paths and shell assertions split across root
and public presentation.

Tests use controlled transport and do not execute deployed PostgreSQL or establish
fresh live Google authentication. Current provider allowlisting, deployed policy
alignment and real Founder/USER sessions remain NOT VERIFIED by this local gate.

## Protected scope

Foundation authorization, API/auth routes, migrations, policies, grants, triggers,
role assignments, server configuration, deployment configuration, dependencies and
lockfile remain unchanged. Public content/media contracts remain unchanged.
Public media is metadata-only: no playback/download, signed URL, upload workflow,
Storage access change or binary endpoint is added.

No T13 content workspace, T14 media workspace, T15 publishing operations,
T16 dashboard, T17 release gate, curriculum, lessons, quizzes or monetization work.
Local changes remain uncommitted for Founder review. No push/deployment/remote
mutation is authorized or performed.

## Exact source-change manifest

Modified:

- `package.json`: register the focused T12 suite; dependencies unchanged.
- `src/server/trial-session.js`: import the unchanged extracted cookie primitives.
- `src/app/layout.js`: retain the common document wrapper and metadata.
- `src/app/error.js`: preserve global recovery with the extracted public shell.
- `src/app/not-found.js`: preserve global public not-found navigation.
- `tests/public-experience.test.js`: relocated source paths and root/public shell
  assertions; no behavior expectation weakened.

Moved (public URLs unchanged):

- `src/app/page.js` -> `src/app/(public)/page.js`.
- `src/app/sign-in/page.js` -> `src/app/(public)/sign-in/page.js`.
- `src/app/content/page.js` -> `src/app/(public)/content/page.js`.
- `src/app/content/loading.js` -> `src/app/(public)/content/loading.js`.
- `src/app/content/[id]/page.js` -> `src/app/(public)/content/[id]/page.js`.

Added:

- `src/server/session-token.js`: shared existing cookie/token primitives.
- `src/server/founder-access.js`: L3 adapter to existing L1 authorization.
- `src/app/founder/access.js`: request-local Next.js access bridge.
- `src/app/founder/layout.js`: guarded Founder shell boundary.
- `src/app/founder/page.js`: independently guarded minimal entry.
- `src/components/founder-views.js`: actual shell, denial/unavailable and entry views.
- `src/components/public-shell.js`: existing public shell extracted unchanged.
- `src/components/public-error.js`: existing error presentation extracted unchanged.
- `src/app/(public)/layout.js`: public-only presentation boundary.
- `src/app/(public)/error.js`: preserve public errors within their existing shell.
- `src/app/(public)/not-found.js`: preserve content not-found without nesting shells.
- `tests/founder-access.test.js`: 17 focused T12 security/regression tests.
- `docs/founder-application.md`: implementation decisions, evidence and limits.

No protected Foundation/API/database/media/dependency file differs from baseline.
