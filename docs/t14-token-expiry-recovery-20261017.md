# T14 token expiry recovery — 17 October 2026 JST

> Historical recovery plan, completed18October. Actual signed capability expiry
> is LIVE PASS; see `t14-final-acceptance-20261018.md` and
> `validation/t14/final-blocker/token-expiry-live-pass-20261018.json`.

Status: PARTIAL. All prior corroborated PASS results are preserved. No commit or push is permitted until the remaining actual signed capability expiry gate passes.

## Evidence and cause

Founder confirmed the device restarted for maintenance/connectivity and all Chrome tabs closed before the two-hour probe. The signed capability existed only in the original document's memory and was deliberately never persisted. It cannot be recovered without violating the agreed credential boundary.

The original fixture `e276c472-dc7a-49f1-a3a2-7614c2177c83` has actual reservation expiry PASS: browser PUT400, Storage internal403/No active asset reservation, guarded cleanup200 and Storage DELETE200. Independent database readback at23:33:26UTC confirms exact fixture/object0, all assets/Storage/content/relations0 and ten migrations. A focused Storage log query21:41–23:40UTC returned no matching request; absence alone is not affirmative expiry proof. Elapsed time is not a PASS.

The local runner was unavailable after restart (ECONNREFUSED) and was relaunched once using the existing TEST-only command. Official browser inventory exposes only in-app/MCP Apps, not ordinary Chrome. No cookie, token, signed URL or credential was extracted or transferred.

## Narrow recovery mode

`http://localhost:3103/__t14-capability-check?mode=token-expiry-only`

This opt-in testing harness reuses existing production APIs and real HttpOnly Founder authorization. It checks the previous fixture404 and empty live TEST asset workspace before reserving exactly one PNG70-byte path. It then immediately deletes the reservation through the approved application API. It skips the already-PASS ten-minute reservation probe and all completed T14 suites.

The original7200-second capability TTL is unchanged. The signed URL remains only in document memory. After7205seconds, exactly one PUT is attempted without cookies. A denied HTTP status alone is insufficient: an explicit token-expiry error is required and must be corroborated against actual Storage logs. Known JOSE `"exp" claim timestamp check failed` is distinguished from generic InvalidJWT, malformed token, signature failure and reservation denial. No fixture/token is created by merely visiting the page.

Six local harness tests PASS using mocked time/network (`node --test validation/t14/capability-harness.test.mjs`). They verify one reserve/immediate cleanup, original TTL, one eventual PUT, no duplicate Start, authorization/previous-fixture guards, cleanup-failure STOP, and rejection of ambiguous errors. These are LOCAL PASS only. A discovered test-runner cleanup-failure continuation was corrected to stop automatic actions; no product auth, RLS, grant, SQL or TTL changed.

## Minimum personal interaction

In ordinary Chrome FOUNDER profile, check `http://localhost:3103/__t14-session-check`. Continue only with status200/authenticated=true/founder=true. If expired, perform one normal Google sign-in privately at `/sign-in`; never send credentials to Codex.

Open the new token-only URL and click **Start token-expiry-only once** once. Report only safe fixture ID, cleanup status and displayed deadline. Keep that tab and device running without reload/restart until the final result. Do not use old full-suite/expiry-only Start, export capability, or manually retry a failed PUT. If STOP/401/403 or cleanup failure appears, stop and report its safe status.

The agent will independently verify cleanup, actual Storage expiry rejection, final source/security scope, and conditional commit/push after FULL PASS. No production access, migration replay, deployment, or T15–T17 work is authorized here.
