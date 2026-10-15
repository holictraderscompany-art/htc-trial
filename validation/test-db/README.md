# T13 TEST database history archive

Target: **uzhkzhmncxjplrdtdzgd** only. Read-only reconciliation on 15 October 2026 matched **eight existing migration records**, names and SHA-256 hashes to TEST.

This directory is an inspection archive, **not a Supabase CLI deployment workdir**. No config or link is supplied. Do not apply or replay these SQL files. Historical root supabase/migrations is a different lineage; do not push it to TEST. No migration history was rewritten; production was not accessed.

history.json preserves all eight actual records. remote-history-20261015.json records the independent read-only TEST query. Six exact SQL sources are included. source-scope.json identifies two previously applied operation migrations excluded from T13 by version/name/hash: 20261012062323 and 20261012062809. Their full SQL remains unchanged in the validated Group 3 worktree. They are historical dependencies, not missing migrations to apply.

Run: node validation/test-db/verify-history.mjs. This verifies 8/8 recorded history entries and 6/6 included source hashes with two explicit exclusions. Supply an optional fresh JSON snapshot path to compare a new independent read-only export. Offline verification does not query the live database or prove a fresh replay.

Combined DB1 has approved four-source provenance and **PASS**. DB2 security and independent-session concurrency **PASS**. Google Founder/USER OAuth **LIVE PASS** is separate from synthetic SQL identities and LOCAL SQLite. See docs/founder-content-workspace.md and validation/t13/evidence.
