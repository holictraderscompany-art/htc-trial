# Group 3 cloud continuation — 12 October 2026

This checkpoint supersedes the earlier NOT EXECUTED / missing-RPC statements for
the authorized test project only. Group 3 is **not CLOSED**. Production was not
accessed, main was not deployed, and password-based native login was not repaired.

## Actual remote work

Target: `uzhkzhmncxjplrdtdzgd`, HTC-Trial-Test-DB, PostgreSQL 17.11.
The Founder authorized procedural changes within Group 3 and autonomous execution.

The original DB1 file remains byte-identical in the handoff. An alternative atomic
DO retained its four original statement arrays, source hash checks and application
security assertions. The wrapper's manual history creation/checks were removed so
the supported `apply_migration` tool could own migration tracking. This alternative
was applied once successfully, under `htc_group3_core_auth_content_draft`.
This is managed DB1-equivalent schema execution, **not native psql authentication
PASS or completion of the original four-entry tracking contract**.

The original trial_assets, trial_content_assets, public_content_discovery and
founder_content_list migration bodies were subsequently applied, without changing
their SQL bytes. New additive Founder operation RPCs and the delete bridge were
implemented and applied to this test project.

Successful runtime SQL:

- Original `tests/content-draft-only.sql`: authorization, validation, DRAFT-only
  boundaries and rollback assertions completed; all fixtures rolled back.
- Original `tests/founder-content.sql`: private listing, pagination, role denial,
  catalog assertions and public visibility completed; fixtures rolled back.
- New Founder operations SQL: USER denial for all five RPCs; safe asset projection
  and grouped counts; PENDING rejection; READY relation guards; uniqueness;
  RELEASED/WITHDRAWN edit denial; release/withdraw visibility; linked-delete refusal;
  deletion cannot finish while Storage object metadata exists; definer ACL checks.
  Synthetic object catalog records only, no binary upload. Fixtures rolled back.
- Deliberate repeat-guard negative test: applying the managed core block again was
  rejected with `DB1 baseline mismatch; no migration may proceed`; history remained
  seven entries. This was a negative test, not a blind retry.
- Final counts: zero auth users, profiles, content, assets, relations and trial
  Storage objects. The private trial-assets bucket and application schema remain.

## Remote migration tracking — important

| Version | Name |
| --- | --- |
| 20261012061832 | htc_group3_core_auth_content_draft |
| 20261012062050 | trial_assets |
| 20261012062052 | trial_content_assets |
| 20261012062053 | public_content_discovery |
| 20261012062054 | founder_content_list |
| 20261012062323 | founder_operation_workspaces |
| 20261012062809 | founder_asset_delete_bridge |

The initial eight source migrations have historical local versions different from
these managed history versions. An atomic metadata alignment script was prepared.
Two attempts failed at the connector with `Invalid or expired requestState`.
Readback confirmed tracking remained unchanged. **History alignment remains OPEN.**
Do not run `supabase db push` against this test project or replay DB1 until that
history discrepancy is resolved through a working, reviewed execution path.
No attempt was made to modify production migration history.

## Code added

- Five narrow RPCs: read_trial_assets_for_founder, founder_operation_counts,
  manage_trial_content_asset_draft, transition_trial_content_checked and
  delete_trial_asset_for_founder. Existing T06/T07A/T07B semantics remain available.
- Relation and transition guards hold content locks and sorted asset locks inside
  the transaction. EXECUTE is restricted to authenticated; each definer checks the
  existing database Founder predicate and auth.uid, with empty search_path.
- Cookie-authenticated `/api/founder/assets` delegates to the existing Foundation
  media handler. `/api/founder/assets/upload` forwards a bounded private upload using
  the session token only on the server. It checks Origin, Founder, reservation,
  state/expiry, exact size/MIME and existing byte signature; no upsert or retry.
- UI reservation → cookie upload → separate existing finalize. The new UI transfer
  is a **server proxy**, not the old bearer-based browser direct upload. The existing
  bearer Foundation API is preserved. No browser session token or service key is
  exposed. Deletion uses begin_delete → authenticated Storage delete → finish_delete.
- Explicit test configuration: `HTC_SUPABASE_TARGET=test` together with the exact
  test SUPABASE_URL and its publishable key. Unknown targets/secret keys fail closed.
  Without that opt-in, the old configured production-target behavior is preserved.
  No production configuration was installed or contacted during these tests.

## Verification and remaining gates

- Frozen-lockfile dependencies installed; dependency versions/lockfile unchanged.
- Latest main suite 202/202 PASS (195 inherited + 7 meaningful bridge/config tests).
- SQLite suite 17/17 PASS. Latest compiled production build PASS.
- Browser validation of the new upload UI was not completed: this runtime lacks a
  browser executable; the attempted Chromium download failed. Earlier handoff's 23
  browser checks cover the earlier SQLite UI, not the newly added live upload form.
- Two-session PostgreSQL concurrency was attempted using connector calls and an
  observed PgSleep holder. The observer did not find the held session, so the test
  was stopped and fixtures cleaned. No DB-10/11 concurrency PASS is claimed, nor
  is connector serialization asserted as a proven cause. Use independently
  controllable native sessions / isolationtester or a reviewed equivalent harness.
- Real Google Founder/USER login, expired/revoked live sessions, binary Storage
  upload/finalize/delete and upload UI E2E remain unverified.
- Security advisors returned warnings about intentionally exposed definer RPCs:
  public RELEASED-only reads and signed-in operations with internal Founder checks.
  No RLS-disabled error was returned. Do not revoke these grants blindly; review
  guards/projection and rerun denial tests. References:
  https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
  https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Next executor actions

Reconcile this continuation with the local handoff; do not discard local work.
Preserve the migration history table above. Finish history alignment, independent
PostgreSQL concurrency and live authenticated storage/UI checks. Configure only the
test target explicitly. Do not replay DB1 or the new RPC migrations: they are already
applied to the test project. Continue from measured state, not old checkpoint labels.
T17 remains OPEN until the unresolved gates pass. Support ticket SU-503694 still has
no technical reply in the last checked email thread; managed execution did not fix
the previously rejected database password.
