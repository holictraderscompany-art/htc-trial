> Historical dated record. Current T14 FULL PASS acceptance: `t14-final-acceptance-20261018.md`. Earlier failures and blockers below are preserved history.

# T14 current LIVE checkpoint — 16 October 2026

Historical operational summary. Superseded by t14-acceptance-20261016.md and the
latest recovery-checkpoint.json; original evidence is retained for provenance.

This supersedes the operational blocker status in the earlier recovery report;
prior LOCAL, SQL and build PASS evidence is preserved. Scope remains T14 only.

## Genuine LIVE progress

Official Chrome accessibility controls now work with the existing normal Chrome
profile. Google TEST PKCE completed at approximately 05:41 UTC, with token/user
responses 200, callback 303 to `/content`, and HttpOnly session establishment.
The protected Founder asset page loaded a real Supabase database snapshot.
No cookie, OAuth code, session credential or signed capability was exported.

Both documented synthetic assets ending `0101` and `0102` were selected by exact
identity and deleted through the existing Founder UI / authenticated Storage
API sequence. Both UI operations confirmed success. Independent read-only TEST
database verification found zero assets, relations, content or trial-assets
Storage metadata. The existing two OAuth test accounts and nine migration
records remained. Available Storage logs returned one DELETE 200 receipt;
two independent HTTP receipts are not claimed.

Actual evidence is under `validation/t14/final-blocker/`:

- `oauth-current-20261016.json`: value-free OAuth transport/callback observations.
- `cleanup-live.json`: actual database result after both owned fixture deletions.
- `storage-cleanup-http.json`: actual available Storage HTTP log result.
- `browser-path.json`: official integration diagnosis and current upload gate.

## Current upload gate

The approved 70-byte 1×1 PNG is outside Git. Its SHA-256 is
`abc58d5127d7cdf313beb9ec8ee839860a9c6bfbc48c8b8eb6a3f7d8bb63de6f`.
No new upload reservation or binary transfer has started.

The supported `waitForEvent('filechooser')` / `setFiles` flow failed because the
ChatGPT extension lacked **Allow access to file URLs**. The official upload
documentation requires that setting for automatic file selection:
https://developers.openai.com/codex/app/chrome-extension#upload-files

The standard File control was tried without expanding permissions; the page
still displayed **No file chosen**. Native OS-app control is unavailable in this
session. Manual selection of the one file remains a narrower alternative.

Founder initially denied the broad setting; that denial was respected. Founder
then explicitly approved temporary permission for T14 only, followed by disabling
it again. However, the official browser URL policy rejected
`chrome://extensions` (http/https only), before any setting was read or changed.
There was no raw-CDP, registry or alternate-surface workaround. Manual toggle
activation is pending. The toggle must be turned off again after testing or
blockage; current permission state is **not enabled by the agent**.

## Evidence limits and preservation

Binary upload, signing compatibility, finalization, metadata/signature checks,
uploaded-binary cleanup, live relationships, USER denial, capability expiry and
remaining authenticated UI gates are not yet complete. T14 is **PARTIAL**, not
FULL PASS. Existing tests/build were not repeated because product code is
unchanged. Only TEST runner HTTP observations and checkpoint evidence changed.

No migration replay, production access, credential transfer, authorization
weakening, T15–T17 work, commit, push, merge or deployment occurred. Other
worktrees remain preserved. Commit/push remain gated on genuine T14 FULL PASS.
