# T14 current acceptance — 16 October 2026 JST

> Historical run record. Superseded by `t14-final-acceptance-20261018.md`:
> all mandatory T14 gates, including actual signed-token expiry, are now PASS.

**PARTIAL — not eligible for commit/push.** Scope T14 only; TEST project
uzhkzhmncxjplrdtdzgd; branch codex/t14-signed-direct; T13 HEAD
3b3417d8b7b273fb1b60b10c37c2ea437711a0aa. This checkpoint supersedes earlier
operational summaries while preserving their original evidence.

## Verified results

- Genuine Founder HttpOnly authorization, signed PNG70 upload, PENDING to READY,
  matching MIME/size/ETag, and guarded asset deletion: LIVE PASS.
- Assets403 and Operations403: authenticated auth/user200 followed by database
  is_founder=false. USER session/locked two-role model independently confirmed.
  Founder reported Access denied on /founder/assets; server role=false agrees.
  HTML status was not captured and is not claimed403.
- USER private Storage: same existing READY object denied400/NoSuchKey/internal404
  at08:05UTC; identical fixed-path/Range probe as Founder succeeded206 at08:10UTC.
  Both returned binary_forwarded=false. Object/metadata readback confirms a valid
  PNG70 with matching ETag, so a malformed request or missing object is excluded.
- Invalid MIME/oversize reservations400; corrupt-signature finalize400 and
  compensation; wrong signed path400; duplicate relation/link-delete409;
  actual DRAFT attach/detach and public DRAFT isolation: LIVE PASS.
- Missing-object finalize404 then guarded deletion200/confirmed, independently
  verified absent. Logout/stale session401 and responsive mobile UI preserved.
- Existing final208/208 application tests and production build PASS, after both
  UI recovery corrections. No subsequent product-source edits; current changes
  are validation harness, evidence and documentation only.

See validation/t14/final-blocker/user403-live.json, user-role-readback.json,
private-storage-user-live.json, http-final-authorization.json and
final-regression.json. Earlier upload/relationship/negative evidence remains.

## Why USER Storage400 is a valid denial

[Storage1.80.2 applies caller RLS to private object lookup](https://github.com/supabase/storage/blob/v1.80.2/src/http/routes/object/getObject.ts#L59-L71).
[Its legacy error wire status is400 for non500 errors](https://github.com/supabase/storage/blob/v1.80.2/src/internal/errors/storage-error.ts#L16-L20).
Actual logs identify NoSuchKey/internal404. Positive Founder206 against the
identical existing object establishes the negative control. No RLS/auth change
or credential transfer was required; status400 alone was not counted as proof.

## Approved correction and actual affected-case results

Actual MIME-mismatched signed PUT and replay on READY returned500. Existing
guards rejected both, but strict expected400/403/409 tests remain unsuccessful.
Logs identified P0001 from Object does not match reservation and No active asset
reservation. Those failures are retained as historical evidence, not waived.

[Deployed Storage maps P0001 to DatabaseError500 and42501 to AccessDenied](https://github.com/supabase/storage/blob/v1.80.2/src/storage/database/errors.ts#L14-L70).
AccessDenied has internal403; legacy wire400 remains possible and is allowed by
the unchanged strict mismatch assertion. Forcing HTTP403 is not proposed.

Approved SQL: validation/t14/guard-sqlstate-correction-review.sql. Only the
two observed RAISE sites gain42501. Predicates, shared locks, expiry, metadata
checks, immutable UPDATE branch, owner/ACL, SECURITY DEFINER, empty search_path,
triggers, policies and bucket are preserved by aborting assertions. Original
migrations/history were not rewritten/replayed. Founder explicitly approved the
correction for TEST. It was applied once as atomic migration20261016084813,
t14_guard_rejection_sqlstate. Supabase owns transactional migration tracking.
All10/10 archived source/history SHA-256 hashes match; the original nine records
remain unchanged. The exact applied SQL archive is
validation/test-db/supabase/migrations/20261016084813_t14_guard_rejection_sqlstate.sql,
SHA-256 c2f461b1d84ce3ca265f6dacc439d1df0a17118e25b592360dd7e2d3bbb08abe.
The unchanged full review artifact SHA-256 is
c6bc5a6bd10c74be8678f4c0ae6c0731598dba2f776040c04df21e44661ea6a3.

Postconditions verify guard definition MD5=11420ee8d31b28780791285b6a0493f9,
body MD5=bc179d40465c4269ef4b731dc275fbc7, and unchanged upload-predicate
MD5=743855b05523b214ce6880cfb4e3056f. Owner postgres, existing EXECUTE ACL,
SECURITY DEFINER, empty search_path, trigger, RLS and private bucket restrictions
remain unchanged. No broader authorization or guard change was made.

Actual Founder Chrome recheck at08:53UTC: wrong MIME400, wrong size400, valid
control upload200, finalize200/READY, replay400, and guarded control deletion200.
Strict status assertions were not weakened. See final-blocker/
sqlstate-migration-applied.json and sqlstate-correction-live.json.

## Remaining gates and cleanup

1. Actual natural reservation-expiry signed PUT remains NOT TESTED.
2. Actual two-hour signed-token expiry remains NOT TESTED. No shortened TTL,
   clock manipulation or forged token is permitted.
The earlier capability document disappeared after a browser integration timeout;
the current page initializes an empty module-local Set and timed=null. Founder
confirmed Owned fixtures0 and disabled controls. This does not mean the database
was empty. Exact navigation/closure cause is not established, and no credential
or capability recovery from cookies/history/logs was attempted.

The one retained fixture8505a112-842f-4307-bc63-536ccde1bcfa was independently
observed PENDING, expired09:03:37UTC, with no Storage object. Founder removed it
through the existing UI. Readback09:20:01UTC verifies exact-ID and global asset,
Storage, content and relation counts0, with10 migration records intact.
See validation/t14/final-blocker/expiry-state-loss.json.

A minimal opt-in expiry-only harness is ready at
http://localhost:3103/__t14-capability-check?mode=expiry-only. The one-underscore
spelling /_t14-capability-check now
redirects303 to this canonical route with the query preserved. The test runner
was restarted with capability-check enabled; exact current HTML200 and the
expiry-only button initialization were verified without clicking Start or
calling Supabase. See final-blocker/expiry-route-readiness.json. Before creating a
new fixture it requires the old fixture404 and the real Founder TEST asset list
to be empty. One Start opts into one natural ten-minute reservation probe,
guarded cleanup, then one two-hour token probe. No HTTP retry occurs. Capability
stays only in that ordinary Chrome document's module memory. Reload loses it.
Status-only loopback observations cannot establish PASS without independent
database/Storage corroboration. LOCAL harness checks and telemetry input bounds
PASS; the replacement LIVE flow has not yet been started.

Old DELETING fixtures and earlier binary/relationship/DRAFT fixtures are gone.
New missing-object fixture8cf93347-31db-4510-ad58-f09db6b4086a was deleted200 and
verified absent. The final owned READY control fixture was:
d66c3442-570a-461d-8a2a-19e3d2da5509, filename
t14-cap-17a3c332-3919-422f-b5da-d49ac825ef6f.png,
path image/d66c3442-570a-461d-8a2a-19e3d2da5509/asset.png, PNG70, unlinked.

Official Chrome provider IDs changed with the same extension instance; a later
cleanup tab creation timed out/reset. Founder removed this exact fixture through
the existing UI. Server logs confirm authenticated Founder operations200 around
08:23UTC. Independent TEST readback at08:25UTC shows zero assets, trial-bucket
Storage catalog rows, content and relations; both test profiles and nine migration
records remain. Guard and upload-predicate definition hashes are unchanged.
The new focused raw Storage HTTP query returned no rows, so no independent
DELETE receipt is invented. Cleanup evidence is the actual guarded application
flow plus independent catalog absence; underlying S3 was not directly inspected.
See validation/t14/final-blocker/final-owned-cleanup-live.json. No direct SQL
Storage deletion, RLS/trigger bypass or browser-security workaround was used.

No commit/push/merge/deployment or production access. Only the specifically
approved correction migration20261016084813 was executed in this continuation.
T13/main and T15/T16 are preserved; see recovery-manifest.json and
final-blocker/scope-security.json. No FULL PASS while mandatory gates remain.

## 17 October JST — expiry preflight401 diagnosis

The two actual expiry-only attempts logged401 on16 October18:36 and18:38JST,
before any recorded Supabase auth/user or role request. Existing operations code
parses the HttpOnly session before authorize(). This identifies a failed local
cookie precondition, not a verified USER role denial or missing database object.
Historical logs do not distinguish missing, duplicated or malformed cookie, nor
prove expiry versus a different Chrome profile/hostname. The session cookie has
an existing Max-Age cap3600; no renewal/security change has been introduced.

The owned runner was stopped when inspected and was restarted on loopback3103
with the existing TEST-only flags. Exact public TEST configuration and healthy
project identity were verified without printing configuration values. Readback
17 October06:14JST shows assets/Storage/content/relations0 and migration history10.

GET http://localhost:3103/__t14-session-check is an opt-in read-only harness
diagnostic. It reports only cookie parser state, HTTP status, authenticated and
Founder booleans. It reuses server-side Foundation authorization against TEST;
it cannot create fixtures, sign uploads, renew cookies or disclose tokens/IDs.
An intentional credential-free CLI check returned401/missing/no upstream call;
that is readiness evidence only, not the actual Chrome session result.

Current ordinary Chrome Founder authorization remains NOT VERIFIED. The local
Chrome controller is not exposed in this session's available tools. One manual
opening of the diagnostic in the original normal Chrome profile at localhost
is required before deciding whether private sign-in is needed. Do not start or
repeat expiry, create fixtures or claim a session PASS before that evidence.
See final-blocker/expiry-401-diagnosis.json and session-preflight-readiness.json.

Subsequent Founder report confirms cookie_state=missing and authenticated=false,
consistent with safe server events21:16 and21:19UTC. Canonical diagnostic uses
/__t14-session-check and field upstream_checked. Single-underscore spelling404
and a paraphrased field name are not evidence of a different auth implementation.
The current host-only HTC session is absent; exact Chrome profile and whether
expiry/logout/profile/hostname caused the absence remain unproven. Existing
Foundation persists no refresh token and requires private sign-in after expiry.
Recovery is one normal Chrome Founder TEST sign-in at localhost3103, followed
by the same-profile read-only diagnostic200/authenticated=true/founder=true.
No expiry retry or fixture is allowed before that result. Authentication code
and cookie scope/lifetime remain unchanged. See session-recovery-plan-20261017.json.

Current update: genuine Founder session recovery is now LIVE PASS. New private
OAuth callback21:22:47UTC set the HttpOnly session and redirected303 to/content.
At21:23:38UTC (17 October06:23:38JST), Auth user200, is_founder200/true and the
read-only session-check200/authenticated=true/founder=true corroborate the
Founder's actual Chrome result. No credential or cookie was exported. TEST
readback21:27:12UTC contains assets0, Storage0, expiry candidates0 and history10.
No login repetition is needed. Expiry remains NOT STARTED until one manual Start
in a new ordinary Chrome expiry-only tab; local Chrome control is unavailable in
the current tool catalog. See expiry-founder-session-verified-20261017.json.

Expiry-only was subsequently started once in the legitimate ordinary Founder
Chrome. Sole fixture e276c472-dc7a-49f1-a3a2-7614c2177c83 expired21:39:10UTC.
Actual signed PUT21:40:02UTC returned400; independent Storage1.80.2 log confirms
internal403 and No active asset reservation. Guarded cleanup21:40:11UTC returned
200/confirmed; independent Storage DELETE200 and database21:41:33UTC verify
exact-ID and global assets/Storage/content/relations0, history10. Natural
reservation expiry is LIVE PASS; underlying S3 was not directly inspected.
The signed capability remains only in the original page memory for the actual
two-hour probe around17 October08:29:15JST. No new fixture or sign-in is needed.
Time elapsed or a generic400 cannot establish token-expiry PASS. Commit/push
remain withheld until actual JWT expiry evidence and final cleanup verification.
See expiry-runtime-start-20261017.json and expiry-reservation-live-20261017.json.
