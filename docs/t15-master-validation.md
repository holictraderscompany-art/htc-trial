# T15 validation checkpoint — 18 October 2026 JST

Scope: T15 Publishing & Release Operations only. Branch `codex/t15-r1-reconciliation`; verified starting T14 commit `94981054f4fa2493205b44919e37802322312c3c`. T13 is preserved in its ancestry. **T15 FULL PASS**: LIVE gates, cleanup, regression, fresh build and scope/security checks passed. The completion checkpoint and commit manifest record the pre-commit gate; the final response supplies the resulting local commit SHA.

## Completed evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| R1 reconciliation | LOCAL PASS; all 23 reviewed snapshot hashes still match | `validation/t15-r1/file-manifest.json`, `validation/t15-master/scope-preservation.json` |
| R2C content/authorization concurrency | 10/10 native PostgreSQL PASS, preserved without rerun | `validation/t15-master/r2c-preserved/final-verification.json` |
| R2D asset concurrency | 7/7 native PostgreSQL PASS | `validation/t15-master/r2d-runtime.json` |
| R3 publishing and access control | 18 actual TEST HTTP/UI/readback checks PASS, including genuine USER denial | `validation/t15-master/r3-runtime.json` |
| Migration/source consistency | 10/10 exact SHA-256 matches, no migration replay | `validation/t15-master/final-db-verification.json` |
| Fixture/Storage cleanup | 0 content, assets, relations and trial-assets objects; security fingerprints unchanged | same database report; both runtime reports |
| Application regression | 216/216 PASS, including 8 focused T15 cases | `validation/t15-master/regression-and-security.json` |
| LOCAL browser/SQLite regression | Publishing 24, T14 browser 20, T13 SQLite 12, T14 SQLite 3 PASS | preserved R1 evidence and verified log hashes |
| Production build | Fresh `pnpm build` PASS; TypeScript phase and Publishing route PASS; T16 route absent | `validation/t15-master/build-evidence.json` |

The native R2D sessions had distinct PIDs **756037** and **748222**, Direct IPv6, psql 17.11 and TLS verify-full. Evidence records actual blocking, transaction overlap, SQLSTATE `55P03`, linked-state guard `23503`, rollback and committed state. Concurrent SHARE-lock compatibility is proved by failed NOWAIT upgrades against the peer's retained locks. The two-hour capability expiry and other completed T14 tests were not repeated.

R2D used two real signed uploads of the 70-byte synthetic PNG. The Founder browser signed/uploaded/finalized through the existing application and Storage APIs. Cleanup used checked DRAFT detachment plus the application deletion bridge and official Storage DELETE. No Storage catalog rows were inserted or deleted through SQL. The one committed released fixture had no committed relations, so cleanup required no illegal lifecycle reversal.

R3 exercised actual Founder UI release, withdrawal and double-clicks. Each UI action produced exactly one checked transition RPC, followed by browser confirmation and matching committed database/public-read state. Invalid transitions, field injection, missing content/assets, non-ready relations and T13 edits of RELEASED/WITHDRAWN content returned controlled errors. DRAFT and WITHDRAWN remained private. Empty asset relations are legal under the existing introductory-content contract and were not turned into a new prerequisite. The negative readiness fixture was an explicitly synthetic native PENDING relation; release was genuinely rejected by the Founder HTTP API, and it was subsequently detached and cleaned safely.

## Evidence limits and known behavior

- Native database authorization contexts are labeled synthetic SQL identities; genuine OAuth/HttpOnly evidence comes separately from the normal Chrome session and server-side `is_founder()` calls.
- R2C's original index is preserved. Its 214 immutable files still match. Two worker progress files (`A.running.json`, `B.running.json`) changed during connection recovery/reuse; these are not SQL result or acceptance records. The sealed final verification SHA-256 remains `64bbbcadb9b89780b166c6a86c1f68d78e88363167e9bc148c0db692b85e88c3`.
- Last-writer-wins remains the approved DRAFT-save behavior. No revision/ETag mechanism was invented. Publishing serializes authoritative transitions with row locks; stale non-DRAFT edits and duplicate transitions are rejected.
- Ambiguous transport failures and responsive/expired-session UI behavior retain explicit LOCAL fixture evidence. No LOCAL identity or fabricated failure is described as a live Google or PostgreSQL result.
- Existing Foundation contracts and history behavior are preserved; no new audit schema, role, state, scheduling, curriculum or public binary delivery was introduced.
- Only TEST was accessed. Production was not queried to prove non-modification; target restrictions, source review and unchanged original worktrees establish the execution boundary.

## Genuine USER gate closure

The existing normal Chrome USER profile completed `r3_user_denial` using its own HttpOnly session. The server independently recorded authenticated USER (`is_founder=false`), four API responses 403, and Access denied with no publishing controls. The page response is HTTP 200 for the existing denial UI, not permission to use the workspace. No transition or relationship mutation RPC was called in this job's interval. The receipt contains `[403,403,403,403,200]`; no fixture was created or session transferred.

After every mandatory gate and final review passes, the Master Directive permits one reviewed local T15 commit. Push, merge, deployment, T16 and T17 remain unauthorized. See the completion checkpoint for final status, build verification and the commit manifest; historical phase reports intentionally retain their original partial statuses.
