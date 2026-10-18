# T14 final acceptance — 18 October 2026 JST

**T14 FULL PASS.** This is the current acceptance record. Earlier dated reports,
failed attempts and historical manifests are retained as history and do not
supersede this closure. Scope: T14 only, TEST `uzhkzhmncxjplrdtdzgd`, branch
`codex/t14-signed-direct`, T13 base `3b3417d8b7b273fb1b60b10c37c2ea437711a0aa`.

## Acceptance evidence

Paths below are relative to `validation/t14/`.

| Gate | Result and evidence |
| --- | --- |
| Real Founder session and server authorization | LIVE PASS; `final-blocker/expiry-founder-session-verified-20261017.json`, signed upload and real browser runs. No fixture identity substituted for live authorization. |
| Anonymous/USER denial | LIVE PASS; `live-anonymous-results.json`, `final-blocker/user403-live.json`, `user-role-readback.json`, `http-final-authorization.json`. USER route Access denied corroborated by server role=false; HTML403 status itself was not captured. |
| Private Storage | LIVE PASS; `final-blocker/private-storage-user-live.json`: valid existing object, same fixed-path probe Founder206 versus USER400/NoSuchKey/internal404. Generic400 alone was never accepted. |
| Signed direct upload and READY | LIVE PASS; `final-blocker/upload-ready-live.json`, `upload-storage-http.json`, `sqlstate-correction-live.json`. PNG70 bytes, matching MIME/size/ETag, no binary transfer through Next.js. |
| MIME/signature/size/path/missing objects | LIVE PASS; `final-blocker/negative-files-live.json`, `invalid-signature-live.json`, `capability-mismatch-live.json`, `sqlstate-correction-live.json`. Existing strict guards retained. |
| READY-only relationships, uniqueness, linked delete, DRAFT-only mutations | PASS; real attach/detach/conflict evidence in `final-blocker/relationship-live.json`, `duplicate-attach-live.json`, `linked-delete-conflict.json`; PostgreSQL runtime suite `relations-runtime.sql` / `relations-runtime-result.json`; fresh LOCAL SQLite3/3 covers non-DRAFT/read-model/error boundaries. |
| Public isolation | PASS; `final-blocker/public-draft-isolation.json` and preserved/fresh public regression tests. No public binary delivery. |
| Duplicate/ambiguous/conflict and session expiry | PASS; existing request identity/recovery UI, `final-blocker/replay-guard-live.json`, `sqlstate-correction-live.json`, `http-final-authorization.json` and focused transport tests. No blind upload retry/upsert. |
| UI metadata/state/loading/error/responsiveness | PASS; genuine LIVE upload/error/cleanup UI evidence in `final-blocker/browser-path.json` and related HTTP records; separate `browser-local-results.json`20/20 LOCAL PASS. No claim that local fixture UI is live integration. |
| Natural reservation expiry | LIVE PASS; `final-blocker/expiry-reservation-live-20261017.json`: signed PUT400 with actual internal403/No active asset reservation, then API/Storage cleanup200. |
| Natural signed capability expiry | LIVE PASS; `final-blocker/token-expiry-live-pass-20261018.json`. Fixture4752746e-96f0-487c-9e3b-08b0c78f49cd: sign200 at00:25:36UTC, signed PUT400 at02:25:42UTC, InvalidJWT and explicit `"exp"` claim timestamp failure. Browser explicit_token_expiry_reported=true independently corroborated. Original7200s TTL; no clock/TTL manipulation. |
| Final cleanup | LIVE PASS; independent18October02:33:36UTC exact fixture/object0, global assets/private-bucket objects/content/relations0. No test account deletion. |
| Migration/security integrity | PASS; fresh TEST history10/10 matches exact archived SHA256; private bucket6000000-byte cap/six MIME types, RLS, RPC ACLs, guard/predicate hashes unchanged. No migration execution in final review. |

## Final code validation

18 October: application208/208 PASS; T14 SQLite3/3 LOCAL PASS; T13 SQLite12/12
LOCAL PASS; expiry harness6/6 LOCAL PASS; fresh live-history/source verifier10/10
PASS. Application suite includes Foundation/Public/T12/T13 and T14 transport
security regressions. The two-hour expiry result is genuine runtime evidence,
not the harness's mocked-clock test.

Production build PASS is reused from `final-blocker/final-regression.json`.
All14 changed/new product, package and test files match that validated snapshot
byte-for-byte. Later edits concern TEST harness/evidence/docs only. No redundant
build or completed UI/login/upload suite is required for unchanged product code.

## Scope and limitations

T13 auth/session/Foundation contracts remain unchanged. The minimal existing
media target selector fix enables the explicit TEST configuration while
preserving default behavior and fail-closed validation. T15/T16 source remains
in its separate worktree;64/64 checkpoint hashes match. Two shared operation SQL
files are exact previously applied historical dependencies required for T14,
not new publishing/dashboard implementation or replay authorization.

Signed capabilities have the provider's fixed two-hour duration and are not
revoked merely by HTC logout. Deleted/expired/non-PENDING reservations are still
blocked by unchanged catalog guards, now also demonstrated at runtime. Refresh
or device restart loses harness capabilities by design; historical lost-state
attempts are not counted PASS. Underlying S3 was not inspected directly; cleanup
uses application/Storage evidence and independent catalog absence. Existing
T13 draft writes retain documented last-writer-wins behavior; T14 does not alter it.

Final commit manifest records exact included hashes and excludes mutable callback
logs, mutable observation sink, stale manifests, and the obsolete automated
Google-login runner. No credentials, local databases, dependencies, build outputs,
browser profiles or unrelated work belong in the commit. No production access,
deployment, main merge, T15/T16/T17 implementation or migration replay occurred.

Git publication is conditional on final staged review and a normal push to the
dedicated branch. The post-push SHA and remote/deployment readback are reported
separately; this document does not fabricate a future push result.
