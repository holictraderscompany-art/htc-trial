# Group 03 baseline resolution and T16 closure

Audit resolution date: 22 October 2026. Scope: three final audit blockers only.
No application behavior, historical report, SQL, database, Auth or Storage change.

## Baseline decision and provenance

The current specification is **HTC Trial PRD & Master Task Map v3.0 — Rebased
Actual Build**, with **HTC-GROUP3-IMPLEMENTATION-CONTRACT.md** as its approved
operational companion and subsequent explicit Founder amendments in their scope.
This follows the Founder's earlier T12 authoritative-context instruction, the
later supply of both documents, and the explicit approval to use the contract
alongside the PRD. It does not create a new architecture decision.

The supplied PRD, section 9, lines 300–313, distinguishes MASTER v2 as the
historical transition baseline and v3.0 as the current source after approval.
The prior audit's reference to "HTC TRIAL v2" is historical provenance, not an
instruction to replace approved implementations or restore an obsolete task map.
No separate original MASTER v2 document was found; none has been reconstructed.

Both supplied documents are included byte-for-byte, including their historical
status and permission paragraphs:

| Repository source | SHA-256 of supplied bytes |
| --- | --- |
| [PRD v3.0](HTC-TRIAL-PRD-TASK-MAP-v3.0.md) | `c2b3bddad0ec34e4de96c8c9641da78c3e670b14440604010e6836ffeb819995` |
| [Implementation contract](HTC-GROUP3-IMPLEMENTATION-CONTRACT.md) | `a74fd929920d61f2167cdaf20fc259bc8419661f1661ece6091e8436012d0730` |

The contract's opening section establishes it as an operational companion, not
a verbatim video transcript. Dated pending-work statements describe that date.
Later runtime evidence determines completion. Historical broad authorizations
do not override the current prohibition on staging, commit, push, deployment or
T17. The baseline clarification grants no new execution permission.

LOCKED boundaries remain: Foundation reused by Founder UI; server/database
Founder authorization; Google OAuth and HttpOnly sessions; T13 DRAFT-only edits;
T15-only publication transitions; T14 signed direct upload and private Storage;
public metadata-only media restrictions; no lessons, curriculum, quizzes or LMS.

## Historical EOL evidence

All 18 R1 entries and 27 R2 entries still match their original raw SHA-256 seals.
Their manifests are unchanged. R2 contains mixed historical LF/CRLF bytes; it
must use `validation/t16-r2/** -text`, not normalization to a newly chosen EOL.
The source documents also use `-text` to preserve supplied bytes.

The previous `.gitattributes` prefix remains byte-identical to R1 SHA-256
`395e0ad83cc7d9391ae185826348e6f3f62b89d9ebcc5abad862fecadac6ddce`.
Only an additive suffix establishes these new rules and LF for new audit files.
The new verifier checks that exact delta. No historical hash was regenerated.
Original R1/R2 validators remain dated phase validators; their old exact-HEAD,
attribute and PARTIAL expectations are preserved rather than weakened.

## T16 evidence closure

[Portable closure](../validation/t16-final/closure.json) consolidates the
unchanged R1/R2 reports and subsequent R2B/R3 runtime evidence. Its provenance
records the final original report SHA-256
`f837771e041ba3bc90fcafbca8393805f24c8a0ca402d1177d64a51ecb8e49fa`
and all 13 independently checked linked source hashes. Sanitized sections are
whitelisted projections, not byte-identical archive copies. Original archives,
including failed jobs, STOP, claim and receipt evidence, remain preserved locally.
Session bindings, account IDs, cookies, JWTs and private profile paths are omitted.

| Gate | Evidence and result |
| --- | --- |
| Reconciled application/local regressions | R1: 223/223 tests; T16 7/7; SQLite T13 12/12 and T14 3/3; 36/36 local browser; production build PASS |
| LIVE Founder/USER/anonymous and empty SQL/API/UI | R2 reports preserved; Founder 200, USER API 403, anonymous API 401; six zero counts match |
| Disposable official logout/natural expiry | R2B: one local logout 204; protected API 401 afterward and after natural expiry; provider explicitly reported expiry; no count RPC after denial |
| Nonempty SQL/API/UI with refresh | R3 successful ALL111 successor: all six counts 1, two snapshot timestamps and source SUPABASE_DATABASE match; old timeout retained FAILED |
| Three assets and PNG cleanup | R3 official asset/Storage workflows, each HTTP 200, independent reconciliation after each; no Storage SQL deletion |
| Three content cleanup | Separately approved corrected atomic batch, one submission, exact CD/CR/CW, no automatic retry; original failed batch remains FAILED |
| Final empty database and unchanged security | Independent snapshot 22 October 2026 07:57:00.723003 JST: all six counters, relations and Storage objects 0; ten migrations and all security fingerprints unchanged |

**T16 FULL PASS is supported by this existing evidence.** Historical R2 PARTIAL
remains accurate for its date; only its three pending gates are closed by later
evidence. Consolidation does not run a new LIVE test. Final zero is a PostgreSQL/
Storage catalog observation; no fresh post-cleanup browser/API zero check is
claimed. R2 fault tests used controlled faults with real authorization, not a real
Supabase outage. SQLite/browser fixture results remain labelled LOCAL.

Known approved limitations remain recorded: T13 last-writer-wins, the fixed T14
7,200-second scoped upload capability, and the dashboard's snapshot nature rather
than a service-health claim. T17 has not started.

## Read-only verification and commit candidate

Run:

```powershell
node --test validation/t16-final/verify-final.test.mjs
node validation/t16-final/verify-final.mjs
```

The verifier never regenerates reports or calls a database/network API. It checks
the baseline ancestry, raw historical seals, exact EOL delta, source documents,
runtime closure, ten archived SQL hashes, protected paths, candidate hashes and
sensitive-value exclusions. It checks actual Git clean filters with autocrlf true
and false on Windows; this is not a claim of an actual Linux OS test.

[Exact candidate manifest](../validation/t16-final/commit-manifest.json) lists
54 paths: 47 curated existing T16 paths and seven audit-resolution additions.
The manifest excludes itself from its digest list explicitly. Mutable
`validation/t16-r2/server-http.json` remains local and excluded, as its original
manifest requires. Logs, runtime configs, profiles, local databases, dependencies,
build outputs, raw Auth binding and one-use administrative SQL are excluded.

Only `.gitattributes` changes among pre-existing candidate files in this audit.
All other validated candidate bytes and other worktrees remain preserved. Prior
tests/build are reused because application source is unchanged. No staging,
commit, push, merge, deployment, production access or T17 is authorized here.
