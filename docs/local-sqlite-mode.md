# Temporary Group 3 SQLite development mode

Explicit opt-in: `pnpm local:sqlite`. Requires Node with `node:sqlite` (verified
Node 24.21.0, SQLite 3.53.4) and the existing application build. This is a separate
localhost-only test launcher, never a deployment configuration or automatic
fallback from Supabase. Without `--sqlite` the existing in-memory fixture remains;
normal application start/dev still uses its unchanged Supabase integration.

Open `http://localhost:3103/` for the clearly labelled local fixture landing page,
then its synthetic Founder link to the shared T13 UI. Every response includes
`X-HTC-Test-Mode: LOCAL-SQLITE-SYNTHETIC-AUTH-NO-STORAGE`. OAuth routes are blocked.
The synthetic HttpOnly cookie is checked by the existing server authorization
handler through injected fixture Auth/role responses; it is not live Auth or RBAC.
No user email or real credential is used. All unimplemented RPC/storage requests
fail closed. The production project URL is only the fixed transport routing
identifier required by existing Foundation validation; all fetches are intercepted
and never forwarded to it or any remote host.

Each launcher invocation creates a fresh database beneath the OS temp directory
`htc-sqlite-fixture-*`, logs its exact path and retains it after shutdown for
inspection. It refuses to open an existing database. It never reads a production
database. Stop the owned launcher with Ctrl+C; remove only its logged disposable
directory when finished. Automated tests create their own temporary databases and
verify ownership boundaries before cleanup.

The minimum adapter replaces only test transport. UI, cookie parsing, Origin
checks, input validation and HTTP error behavior are shared. No application route,
Foundation authentication, PostgreSQL migration, storage integration or deployment
file is changed for this mode. Node's built-in SQLite needs no package installation.

Represented contracts:

- T13 create/read/update/list, draft-only updates, forbidden fields, pagination,
  missing records, rollback, ambiguous committed responses, USER/expired denial.
- Existing T06 release/withdraw and anonymous RELEASED-only projections, for local
  T15 development. Legacy T06 updates intentionally retain their existing reset to
  DRAFT behavior; T13 exclusively uses its draft-only operation.
- Existing T07B attach/detach/list, unique roles, restricted foreign keys, linked
  asset deletion/state guards and content reset to DRAFT. Asset/object metadata is
  explicitly synthetic, including the `object_matches` fixture flag; no object
  storage, upload, download, signed URL, MIME-byte verification or storage RLS is
  implemented. Asset CRUD helpers are fixture controls, not application endpoints.
- Local fixture counts support inspection only, not a completed T16 dashboard.

Content deletion is deliberately unsupported because existing content contracts do
not include it. No T14–T16 UI requirements are invented from task titles.

Validation: `pnpm test:local:sqlite` exercises actual SQLite file transactions and
two database connections against existing server handlers; `pnpm test` runs
existing regressions sequentially to reduce RAM consumption. The SQLite suite is
separate so normal application tests retain their existing Node version contract.
The local SQLite mode requires the documented newer Node runtime explicitly.
Successful results are **LOCAL PASS** only. SQLite serializes writers and uses
short busy timeouts; busy failures return existing redacted 500 responses without
automatic retries. Draft writes retain last-writer-wins. PostgreSQL row locks,
Supabase RLS, grants, SECURITY DEFINER and live identity/storage integration cannot
be validated by this adapter. DB1/DB2 and T17 remain pending required Supabase
authentication and PostgreSQL validation. UI browser validation remains a separate
gate; handler tests alone do not prove browser interactions.

## Subsequent UI validation and T14–T16 local work

The supplied `HTC-GROUP3-IMPLEMENTATION-CONTRACT.md` now defines additional local
workspace scope. See `founder-operation-workspaces.md` for exact routes, narrow
local RPC contracts, and remaining live prerequisites. Legacy T07B fixture
behavior is preserved; the T14 UI uses an atomic DRAFT-only operation and cannot
reset RELEASED/WITHDRAWN content through relation edits.

Final local evidence: regressions 195/195 PASS, SQLite suite 17/17 PASS, production
build PASS, and browser LOCAL PASS for scoped implemented flows. Browser testing
found and fixed T13 HTTP400 handling: invalid input allows correction without
being treated as an ambiguous committed save. Uncertain writes and conflicts
still require reload. Role deny, session expiry, read-only content, pagination,
lifecycle conflict, metadata relations, publishing visibility and snapshot
empty/stale handling have separately recorded evidence. Native PostgreSQL,
live upload/storage and T17 gates remain pending.
