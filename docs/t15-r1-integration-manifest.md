# T15-R1 integration manifest — 18 October 2026

Scope: local code reconciliation only. No R2/R3, live publishing, PostgreSQL
mutations/concurrency, migrations, commit, push, merge, deployment or T16/T17.

Verified baseline: T14 local/remote `94981054f4fa2493205b44919e37802322312c3c`.
The supplied SHA with `2493285` was a transcription error; actual Git agrees on
`2493205`. T14 is one commit after the continuation's T13 ancestor
`3b3417d8b7b273fb1b60b10c37c2ea437711a0aa`.

Source worktree: `C:/Users/ASUS/.codex/worktrees/htc-t15-t16-continuation/FOUNDER HTC GRUP ( M.DEVRY HANDOYO )`.
Its10 modified/55 untracked files remain untouched. All64 recorded manifest hashes
match. An exclusive-create inventory of all five original worktrees is sealed by
SHA256 `e1c8d88ff60d91a84971d273258e907c0422c0a0785d0bd4ff5febd3de4e5a1f`
in `validation/t15-r1/baseline-inventory.json` (v2; preserves porcelain leading
spaces). The earlier inventory is retained externally and is not used for checks.

## File-level extraction, before product changes

| Ownership | Exact path | Planned extraction / preservation |
| --- | --- | --- |
| T15-owned | `src/app/founder/publishing/page.js` | Reuse existing protected publishing page unchanged |
| Shared T14/T15 | `src/server/founder-operations.js` | Only release/withdraw keys, checked RPC dispatch and validated content result; no summary/counts branch |
| Shared T14/T15 | `src/components/founder-operation-workspace.js` | Only publishing kind, transition payload/buttons and confirmed readback; retain every T14 reservation recovery fix |
| Shared navigation | `src/components/founder-views.js`, `tests/founder-access.test.js` | Add Publishing destination and update exact destination assertion; no Operations overview |
| Shared local adapter | `tests/local-sqlite-adapter.js` | Recover checked transition rules/RPC only; no counts RPC |
| Shared T14 tests | `tests/founder-assets.test.js` | Preserve role-denial assertions; move approved publishing acceptance into T15 tests while retaining rejection of summary/client-role fields |
| T15-focused tests | `tests/founder-publishing.test.js` | Extract relevant existing T15 cases; verify denial/strict inputs, readiness, invalid/duplicate transition, non-DRAFT edit guards and ambiguous/rollback behavior; LOCAL evidence only |
| Local fixture infrastructure | `tests/founder-content.fixture.mjs` | Only existing3104 port selection for isolated local browser validation; no T16 unavailable/empty control recovery |
| Test wiring | `package.json` | Include T15-focused suite; preserve all existing regression suites, dependencies and lockfile |
| Proven checkout-integrity correction | `.gitattributes` | Add LF rules for the four already-approved T14 archive files; their committed SQL bytes/hash remain unchanged. Required after strict verifier exposed automatic CRLF checkout conversion. No database/security configuration change |
| R1 evidence | `docs/t15-r1-reconciliation.md`, `validation/t15-r1/*` | Inventory, exact hashes, LOCAL test/build/scope results and explicit R2/R3 limits |

## Baseline dependencies retained unchanged

T13 content API/workspace, Foundation authorization/is_founder/session modules,
T14 direct-upload helper/media handler and all three T14 recovery regressions,
Storage policies/guards, all SQL/migration files and10-entry history. Existing
`transition_trial_content_checked` is already deployed; no migration is needed
or authorized here. No binary workflow or public delivery change.

## T16 excluded and preserved at the source

`src/app/founder/operations/page.js`; summary/counts branches in shared server,
component and adapter; Operations overview navigation; T16 portions of
`tests/founder-publishing-overview.test.js`, mixed browser tests and all
`validation/t15-t16/*` evidence. Shared historical SQL remains untouched in both
worktrees. The original mixed worktree is never switched/reset/merged/replaced.

## Regression risks and gates

Blind replacement would lose T14 exact-404 recovery and reservation idempotency
handling. Shared test extraction could accidentally enable T16 or remove denial
coverage. Mitigate with selective hunks, unchanged T14 helper/test hashes,
focused publishing denial/fail-closed tests, full regression, local UI checks,
fresh production build and final original-worktree inventory comparison.

Native PostgreSQL concurrency and genuine authenticated live publishing remain
R2/R3 dependencies. LOCAL SQLite and synthetic browser identity cannot close them.
