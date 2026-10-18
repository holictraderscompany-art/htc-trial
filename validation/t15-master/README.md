# T15 TEST validation checkpoint

Target is exclusively `uzhkzhmncxjplrdtdzgd`. Never point these runners at another project. No migration replay is part of this validation.

The product snapshot is the existing T15-R1 reconciliation against T14 `94981054f4fa2493205b44919e37802322312c3c`. Product source has not been rewritten for the LIVE tests. Original worktrees, including mixed T15/T16 work, remain intact.

## Evidence and boundaries

- `r2d-runtime.json`: seven actual independent-session asset concurrency scenarios, real signed uploads and official Storage API cleanup. Native sessions use synthetic authorization contexts matching the existing TEST profiles; this is distinct from Google OAuth.
- `r3-runtime.json`: 18 actual TEST acceptance checks, including Founder HttpOnly browser session, production application handlers, UI release/withdrawal, PostgreSQL readback, anonymous public reads and genuine USER HTTP/route denial. `r3-founder-phase.json` preserves the earlier checkpoint before the USER result was correlated.
- `live-http-evidence.json`: frozen sanitized server log, including real role checks, official Storage deletion responses, and USER denials before any privileged mutation RPC.
- `r2c-preserved/`: exact copies of completed content concurrency evidence. `r2c-integrity.json` records the original index and the two mutable worker progress files which subsequently changed; accepted SQL, results and final verification remain unchanged. No historical evidence was rewritten and R2C was not rerun.
- `final-db-verification.json`: all ten exact SQL source/history hashes plus independent zero-fixture/Storage readback.
- `scope-preservation.json`: original dirty-file hashes, protected Foundation/T13/T14 paths and T16 isolation.
- `regression-and-security.json`: executed tests and applicability of preserved LOCAL browser/build evidence. LOCAL evidence is never labeled LIVE.

## Execution safety

`start-live.mjs` is an explicit loopback-only TEST runner. It loads the previously prepared local TEST public configuration; it does not contain database passwords or privileged keys. `/__t14-session-check` reuses the original read-only T14 diagnostic. A normal, legitimately authenticated browser starts `__t15-live` manually. The browser uses its own HttpOnly session directly; no cookie or token is exported. Signed upload capabilities remain in browser memory, and logs exclude query strings and credential values.

`native.mjs` communicates with already authenticated native psql workers through the existing local operator mailbox. Passwords are entered only at hidden native prompts. No automatic reconnect or credential retry is performed. Two distinct backend PIDs and actual overlapping transactions are required for concurrency evidence.

`r2d.mjs` and `r3.mjs` refuse to replay an existing runtime checkpoint. Inspect actual database state before any recovery; do not delete a checkpoint to bypass this protection. `fixture-manifest.json` lists exact UUIDs, request IDs, bucket paths and synthetic ownership. PENDING seeds are native TEST fixtures; READY is obtained only by genuine signed upload and finalization. R3 deliberately seeds one invalid PENDING relation to test the authoritative readiness guard, explicitly separate from normal application creation.

Cleanup detaches only owned DRAFT relations through the checked RPC, uses Founder HTTP `delete_asset` through the official Storage API, then verifies exact-path absence independently. Owned unlinked content is removed narrowly after checking UUID, body marker and no relations. No Storage catalog SQL deletion, lifecycle reset, RLS/grant change, auth-user deletion or security bypass is used.

No job should be retried after an ambiguous result. Inspect its claim, receipt, server evidence and committed database state. Expired sessions require legitimate private authentication; they must not be replaced with fixture authentication for LIVE acceptance.

Operator mailbox files and mutable live logs are ignored by this directory's `.gitignore`. Acceptance reports retain sanitized receipts and authoritative database outcomes. Keep credentials, `.env`, browser profiles, SQLite databases, dependencies and build outputs outside the commit.

T16/T17, production, push, merge and deployment are outside this execution. Commit is permitted only after all T15 gates pass.
