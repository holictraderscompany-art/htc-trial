-- T23-B-ID2A SQL DESIGN DRAFT ONLY.
-- NOT EXECUTED / NOT APPROVED FOR MIGRATION.
-- This file is outside every Supabase migration directory; it must stay there.
-- No deployment tool, migration runner or application imports this file.
-- Existing TEST target: uzhkzhmncxjplrdtdzgd; no production target is authorized.
-- Fresh TEST catalog/history/Auth/session/owner verification is still BLOCKED.
-- Never replay root supabase/migrations or validation/test-db historical sources.
-- All fields, permissions and functions below remain proposals for later review.

BEGIN;

-- Accidental whole-file execution must abort before any proposed DDL is reached.
DO $draft_only$
BEGIN
  RAISE EXCEPTION 'DRAFT ONLY: separate migration approval and verified TEST prerequisites required';
END;
$draft_only$;

-- REVIEW SKETCH BELOW: no role creation, auth change, seed account or appointment.
-- No IF NOT EXISTS: an existing object/name collision is drift, never permission
-- to adopt or overwrite an unknown object. Schema exposure must be verified first.
CREATE SCHEMA community_private;
REVOKE ALL ON SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE community_private.delegations (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'discord')),
  community_scope_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  valid_from timestamptz,
  expires_at timestamptz,
  -- Historical approver reference, not a cascading FK that blocks Auth deletion.
  -- Only the future trusted Founder RPC may derive it; privacy handling is gated.
  appointed_by uuid,
  approved_at timestamptz,
  approval_ref uuid,
  verified_email_binding text,
  identity_checked_at timestamptz,
  -- Community identity-generation binding, NOT an existing Supabase Auth field.
  -- Authoritative generation source remains BLOCKED pending lifecycle design.
  identity_version bigint CHECK (identity_version > 0),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid,
  change_reason_code text NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (change_reason_code IN ('PENDING_REVIEW', 'FOUNDER_APPROVED',
      'FOUNDER_SUSPENDED', 'FOUNDER_REVOKED', 'IDENTITY_REVALIDATION_REQUIRED')),
  CHECK (appointed_by IS NULL OR appointed_by <> subject_user_id),
  CHECK (valid_from IS NULL OR pg_catalog.isfinite(valid_from)),
  CHECK (expires_at IS NULL OR pg_catalog.isfinite(expires_at)),
  CHECK (expires_at IS NULL OR valid_from IS NULL OR expires_at > valid_from),
  CHECK (verified_email_binding IS NULL OR
    (char_length(verified_email_binding) BETWEEN 1 AND 320 AND
      verified_email_binding = lower(btrim(verified_email_binding)))),
  CHECK (status <> 'active' OR
    (appointed_by IS NOT NULL AND approved_at IS NOT NULL AND approval_ref IS NOT NULL
      AND verified_email_binding IS NOT NULL AND identity_checked_at IS NOT NULL
      AND identity_version IS NOT NULL
      AND valid_from IS NOT NULL AND expires_at IS NOT NULL
      AND revoked_at IS NULL AND revoked_by IS NULL)),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

-- One pending/active/suspended binding per identity + exact destination. Revoked
-- history is terminal and cannot be resurrected by a permission update. Expiry
-- is derived from trusted database time in the future guard, not a CHECK using now().
CREATE UNIQUE INDEX community_delegations_current_scope
  ON community_private.delegations (subject_user_id, platform, community_scope_id)
  WHERE status <> 'revoked';

-- Normalized set instead of a caller-editable arbitrary role/capability array.
-- ID1's logical capabilities field is represented by this child relation;
-- duplicate capabilities are rejected by the composite primary key.
CREATE TABLE community_private.delegation_capabilities (
  delegation_id uuid NOT NULL REFERENCES community_private.delegations(id) ON DELETE CASCADE,
  capability text NOT NULL CHECK (capability IN (
    'case.read_assigned', 'case.review_assigned', 'case.escalate_assigned',
    'case.appeal_review_assigned', 'case.correction_review_assigned')),
  PRIMARY KEY (delegation_id, capability)
);

-- Restricted decision trail, not raw messages, identities, URLs or credentials.
-- delegation_id deliberately has no cascading FK: deleting active eligibility
-- must not silently delete the only audit trail. It is an opaque historical ref.
-- Retention/deletion/pseudonymization remain Founder-pending, not indefinite policy.
CREATE TABLE community_private.delegation_audit (
  id uuid PRIMARY KEY,
  delegation_id uuid NOT NULL,
  delegation_version bigint NOT NULL CHECK (delegation_version > 0),
  operation_id uuid NOT NULL UNIQUE,
  event_code text NOT NULL CHECK (event_code IN (
    'APPOINTMENT_PROPOSED', 'APPOINTMENT_APPROVED', 'SUSPENDED', 'REVOKED',
    'IDENTITY_REVALIDATION_REQUIRED')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'discord')),
  community_scope_id uuid NOT NULL,
  previous_status text CHECK (previous_status IN ('pending', 'active', 'suspended', 'revoked')),
  next_status text NOT NULL CHECK (next_status IN ('pending', 'active', 'suspended', 'revoked')),
  capabilities_added text[] NOT NULL DEFAULT '{}',
  capabilities_removed text[] NOT NULL DEFAULT '{}',
  approval_ref uuid,
  occurred_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (delegation_id, delegation_version),
  CHECK (cardinality(capabilities_added) <= 5 AND cardinality(capabilities_removed) <= 5),
  CHECK (array_position(capabilities_added, NULL) IS NULL AND array_position(capabilities_removed, NULL) IS NULL),
  CHECK (capabilities_added <@ ARRAY['case.read_assigned', 'case.review_assigned',
    'case.escalate_assigned', 'case.appeal_review_assigned', 'case.correction_review_assigned']::text[]),
  CHECK (capabilities_removed <@ ARRAY['case.read_assigned', 'case.review_assigned',
    'case.escalate_assigned', 'case.appeal_review_assigned', 'case.correction_review_assigned']::text[]),
  CHECK (NOT (capabilities_added && capabilities_removed))
);

ALTER TABLE community_private.delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_private.delegation_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_private.delegation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;

-- Deliberately no permissive client RLS policies, direct-table grants, invoker
-- views or public roster. RLS and grants must be reviewed together. The table
-- owner normally bypasses RLS; RLS here is NOT a claim to constrain that owner.
-- A separately approved non-login function owner with exact privileges/policies
-- is a future prerequisite, not a new application role or a role created here.
-- No changes to public.user_role, public.user_profiles, public.is_founder(),
-- existing role-sync functions, auth users/session tables or their triggers.

-- FOUNDER-ONLY RPC DESIGN: NOT AN EXECUTABLE AUTHORIZATION IMPLEMENTATION.
-- No CREATE FUNCTION/GRANT EXECUTE facade is supplied while dependencies below
-- remain unverified. Do not substitute a stub that accepts caller approvals.
-- Proposed externally reachable signatures (names not yet approved):
--   public.community_appoint_delegation(subject_user_id, platform,
--     community_scope_id, capabilities, valid_from, expires_at, operation_id)
--   public.community_revoke_delegation(delegation_id, expected_version,
--     operation_id)
-- Both must return only a minimal result/delegation version, never email bindings.
-- Actor UUID, approval time/reference, status and version are NOT trusted caller
-- parameters. A valid UUID is not evidence of appointment or approval.
--
-- Each future facade must implement, in one audited transaction:
-- 1. Derive actor from verified auth.uid(); validate trusted JWT project/audience/
--    expiry and matching current auth.sessions session_id for this actor. Current
--    Auth user existence/confirmation/session-freshness checks cannot be replaced
--    by stale JWT metadata or a merely successful Next.js wrapper.
-- 2. Require unchanged public.is_founder() IS TRUE for appointment/revocation.
--    An appointment target must be a verified current USER, not the actor or a
--    FOUNDER; reject unknown identities, unverified email and unapproved scope.
--    Resolve target from authoritative Auth/profile state, never an email string.
-- 3. Resolve approved community scope and capability allowlist, bounded validity,
--    approved identity binding and trusted human decision reference. These inputs
--    require separate Founder decisions; no default duration or new provider.
-- 4. Acquire locks in a documented common order. Lock affected delegation FOR
--    UPDATE, compare expected version, enforce terminal revoked state and unique
--    current binding. Appointment activation also requires at least one allowed
--    capability and all identity/lifecycle readiness checks.
-- 5. Persist permission/version change plus one minimal audit event atomically;
--    use operation_id uniqueness to reject/reconcile duplicate/replayed attempts.
--    Compare the payload/operation intent as well as ID. Audit failure must roll
--    back the permission change; never accept a caller-fabricated approval receipt.
-- 6. Revocation updates status/revoked_at/revoked_by and increments version once;
--    never revive that record. Suspension/reapproval require a new approved
--    version. Reapproval of a revoked subject requires a distinct new record.
--
-- Sensitive moderator operations need a separate future exact-scope guard:
-- current USER + confirmed Auth identity + valid matching session + current grant
-- status/time/version + capability + assignment + independent reviewer UUID.
-- AI tokens/roles do not pass. Original appeal/correction decision-maker cannot
-- independently review the decision; no eligible human means pause/escalate.
-- Reads and mutations revalidate current grants on every operation. Mutations
-- must serialize with revocation using the same grant-row lock and expected case
-- version, not check-then-act across requests. Operations committed before revoke
-- may already have happened; do not claim retroactive cancellation.
-- A trusted case/assignment ledger is not implemented by this draft or T23-B.

-- FUNCTION OWNERSHIP / GRANT REVIEW REQUIRED BEFORE ANY RPC CAN BE EXPOSED:
-- * Fresh TEST exposed-schema/default-grant/catalog review, exact owner privileges,
--   Auth/session field compatibility and approved schema migration context.
-- * SECURITY INVOKER where possible; if a narrowly privileged SECURITY DEFINER
--   bridge is necessary, approved non-login owner, SET search_path = '', fully
--   qualified static objects, no dynamic identifiers and no broad service role.
-- * Revoke facade/helper EXECUTE from PUBLIC/anon in the same transaction before
--   granting authenticated only the intended facade. Check effective/default
--   grants, overloads and views; RLS alone does not secure function execution.
-- * Private schema must stay out of the Data API exposure list. No browser grants
--   on these tables/sequences/helpers and no credentials supplied to clients.
-- * No global ALTER DEFAULT PRIVILEGES, auth role or existing RLS changes in ID2A.

-- BLOCKED HIGH-RISK DEPENDENCY: AUTH EMAIL/VERIFICATION LIFECYCLE INVALIDATION.
-- No auth.users trigger is proposed as executable code here. A later separately
-- approved additive mechanism must durably suspend/increment relevant grants on
-- effective email change or verification loss, including away-and-back changes.
-- It must preserve T03 role semantics, trigger bodies and signup/change behavior.
-- Email snapshot equality or a webhook/polling assumption is insufficient. Until
-- current schema compatibility and rollback/failure behavior are proved, live
-- appointment/activation remains BLOCKED. No fake lifecycle_verified=true bypass.

-- ROLLBACK DESIGN (SEPARATE APPROVAL REQUIRED; DO NOT EXECUTE):
-- 1. Disable only new community surfaces/dispatch; revoke only new facade EXECUTE
--    grants, suspend new active delegations and increment versions with audit.
-- 2. Stop/reconcile future queues/native rights separately; internal revocation
--    does not remove WhatsApp/Telegram/Discord native administrator privileges.
-- 3. Restore only approved new community objects through a reviewed migration;
--    never reset the database, replay historical migrations, cascade-drop shared
--    schemas, modify USER/FOUNDER, overwrite T03/T04 or use service-role fallback.
-- 4. Preserve/minimize audit records under approved privacy/deletion rules; any
--    destructive cleanup requires separate review. Verify no residual function
--    grants, public views, cached private pages or automatically restored rights.
--
-- Official guidance reviewed 1 November 2026 (documentation only):
-- https://supabase.com/docs/guides/api/securing-your-api
-- https://supabase.com/docs/guides/database/postgres/row-level-security
-- https://supabase.com/docs/guides/auth/sessions
-- Table DDL, constraints, RLS, grants and transaction behavior remain NOT TESTED
-- against PostgreSQL/Supabase; static review is not migration/integration PASS.

ROLLBACK;
