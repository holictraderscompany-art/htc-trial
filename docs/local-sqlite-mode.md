# T13-only temporary SQLite fixture

Run pnpm build, then explicitly pnpm local:sqlite with a Node runtime supporting node:sqlite (existing Node 24). Normal start/dev retains Supabase; no fallback exists. Loopback fixture localhost:3103 adds X-HTC-Test-Mode: LOCAL-SQLITE-SYNTHETIC-AUTH-NO-STORAGE. OAuth routes are blocked.

Each invocation creates fresh OS-temp SQLite data and refuses existing databases. No credentials or real HTC records are copied. All fetches are intercepted, including the historical routing identifier; no remote database or Storage is contacted. UI, validation, cookie parsing, Origin checks, Founder handler and business logic remain shared; only test Auth/role/data transport is substituted.

T13 create/read/update/list, pagination, denial, rollback, ambiguous responses, DRAFT guards and SQLite locking are exercised. Foundation T06/T07 lifecycle/public/relation fixtures remain for regression. T14–T16 L3 operation RPCs, tests and navigation are excluded.

Run pnpm test:local:sqlite. Results are **LOCAL PASS** only. DB1/DB2 separately **PASS**, and Google OAuth **LIVE PASS** is retained independently; SQLite supplies none of those live results. T17 remains outside scope. DRAFT saves remain last-writer-wins. Stop the owned fixture with Ctrl+C; temporary databases stay outside Git and are not included in the candidate.
