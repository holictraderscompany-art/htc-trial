# Group 3 test database migration workspace

Target only `uzhkzhmncxjplrdtdzgd`. These seven migration versions and exact SQL SHA-256 values match its actual managed migration history, verified 12 October 2026. No remote history rewrite or schema replay was performed.

The original repository `supabase/migrations` is preserved. It is a separate historical lineage and MUST NOT be pushed to this test database. Use this isolated CLI work directory for test-project migration inspection: `supabase --workdir validation/test-db migration list --linked`, after explicitly linking THIS work directory to the test ref. Never link it to production. Existing seven entries require no push/replay.

`history.json` stores the independently read remote hashes. The core entry combines the original four migration statement arrays under the managed atomic wrapper. Hash equality establishes source/history alignment; it does not prove a fresh reset/replay or native password authentication.

`node validation/test-db/verify-history.mjs` verifies exact local manifest/file agreement and the test project ID. Supply a fresh independently exported remote snapshot as an argument to compare live versions and hashes. Live readback remains necessary before any future migration.
