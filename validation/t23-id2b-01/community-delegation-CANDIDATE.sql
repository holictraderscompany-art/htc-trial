-- T23-B-ID2B-01: CANDIDATE ONLY — NOT APPROVED FOR EXECUTION.
-- LOCAL REVIEW ARTIFACT ONLY. NOT EXECUTED. PostgreSQL 17 design target.
-- Future target: HTC-Trial-Test-DB (uzhkzhmncxjplrdtdzgd) only.
-- PRODUCTION FORBIDDEN. Keep outside active AND archived migration directories.
-- No runner/import/automatic execution command is supplied or authorized.
-- Original validation/t23-id2a/community-delegation-DRAFT.sql stays unchanged.
-- A future executable migration needs separate Founder approval and fresh target,
-- exposure, owner/default-ACL, Auth/session and rollback verification.

BEGIN;

-- Whole-file execution must fail before any schema/table/function DDL is reached.
DO $candidate_only$
BEGIN
  RAISE EXCEPTION 'CANDIDATE ONLY: execution requires separate Founder approval';
END;
$candidate_only$;

-- REVIEWABLE DDL BELOW, NOT EXECUTED. No IF NOT EXISTS or OR REPLACE: collisions
-- are drift, not authority to reuse/replace an unknown object. No role is created.
-- Object owner would be the approved execution role; no existing owner/default
-- privileges may be assumed safe. Approve that role before making an executable
-- migration. RLS does not constrain an owner/BYPASSRLS administrator by itself.
CREATE SCHEMA community_private;
REVOKE ALL ON SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE community_private.delegations (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'discord')),
  community_scope_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  valid_from timestamptz,
  expires_at timestamptz,
  -- Historical references are not Auth FKs: deleting an approver must not break
  -- unrelated Auth deletion or remove the only delegation audit reference.
  -- Authoritative Founder identity/approval must come from the later trusted RPC.
  appointed_by uuid,
  approved_at timestamptz,
  approval_ref uuid,
  verified_email_binding text,
  identity_checked_at timestamptz,
  -- Proposed community binding, not a pre-existing Supabase Auth field.
  -- Its authoritative generation source is BLOCKED pending lifecycle review.
  identity_version bigint CHECK (identity_version > 0),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid,
  change_reason_code text NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (change_reason_code IN ('PENDING_REVIEW', 'FOUNDER_APPROVED',
      'PENDING_CAPABILITIES_CHANGED', 'FOUNDER_SUSPENDED', 'FOUNDER_REVOKED',
      'IDENTITY_REVALIDATION_REQUIRED')),
  CHECK (appointed_by IS NULL OR appointed_by <> subject_user_id),
  CHECK (valid_from IS NULL OR pg_catalog.isfinite(valid_from)),
  CHECK (expires_at IS NULL OR pg_catalog.isfinite(expires_at)),
  CHECK (approved_at IS NULL OR pg_catalog.isfinite(approved_at)),
  CHECK (identity_checked_at IS NULL OR pg_catalog.isfinite(identity_checked_at)),
  CHECK (revoked_at IS NULL OR pg_catalog.isfinite(revoked_at)),
  CHECK (pg_catalog.isfinite(created_at) AND pg_catalog.isfinite(updated_at)),
  CHECK (expires_at IS NULL OR valid_from IS NULL OR expires_at > valid_from),
  CHECK (verified_email_binding IS NULL OR
    (pg_catalog.char_length(verified_email_binding) BETWEEN 1 AND 320
      AND verified_email_binding = pg_catalog.lower(pg_catalog.btrim(verified_email_binding)))),
  CHECK (status <> 'pending' OR
    (appointed_by IS NULL AND approved_at IS NULL AND approval_ref IS NULL)),
  CHECK (status <> 'active' OR
    (appointed_by IS NOT NULL AND approved_at IS NOT NULL AND approval_ref IS NOT NULL
      AND verified_email_binding IS NOT NULL AND identity_checked_at IS NOT NULL
      AND identity_version IS NOT NULL AND valid_from IS NOT NULL AND expires_at IS NOT NULL
      AND change_reason_code = 'FOUNDER_APPROVED')),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CHECK ((status = 'revoked') = (revoked_by IS NOT NULL)),
  CHECK ((status = 'revoked') = (change_reason_code = 'FOUNDER_REVOKED'))
);

-- Conservative one-current-binding rule includes pending and suspended rows.
-- Expired active records still occupy the slot until a later authorized revocation.
-- Concurrent inserts contend on this index; no application check-then-insert rule.
CREATE UNIQUE INDEX community_delegations_current_scope
  ON community_private.delegations (subject_user_id, platform, community_scope_id)
  WHERE status <> 'revoked';
CREATE INDEX community_delegations_subject_status
  ON community_private.delegations (subject_user_id, status, expires_at);

CREATE TABLE community_private.delegation_capabilities (
  delegation_id uuid NOT NULL REFERENCES community_private.delegations(id) ON DELETE CASCADE,
  capability text NOT NULL CHECK (capability IN (
    'case.read_assigned', 'case.review_assigned', 'case.escalate_assigned',
    'case.appeal_review_assigned', 'case.correction_review_assigned')),
  PRIMARY KEY (delegation_id, capability)
);

-- Minimal restricted audit design. No raw messages, real identities, session
-- payloads, tokens, URLs or credentials are inserted by this candidate.
-- No cascading delegation FK: eligibility deletion must not erase the only trail.
-- Actor/subject SET NULL permits Auth deletion under separately approved privacy
-- rules. There is deliberately no blanket audit UPDATE guard that breaks it.
CREATE TABLE community_private.delegation_audit (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  delegation_id uuid NOT NULL,
  delegation_version bigint NOT NULL CHECK (delegation_version > 0),
  operation_id uuid NOT NULL UNIQUE,
  event_code text NOT NULL CHECK (event_code IN ('APPOINTMENT_PROPOSED',
    'PROPOSAL_UPDATED', 'APPOINTMENT_APPROVED', 'SUSPENDED', 'REVOKED',
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
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
  UNIQUE (delegation_id, delegation_version),
  CHECK (pg_catalog.isfinite(occurred_at)),
  CHECK (pg_catalog.cardinality(capabilities_added) <= 5
    AND pg_catalog.cardinality(capabilities_removed) <= 5),
  CHECK (pg_catalog.array_position(capabilities_added, NULL) IS NULL
    AND pg_catalog.array_position(capabilities_removed, NULL) IS NULL),
  CHECK (capabilities_added <@ ARRAY['case.read_assigned', 'case.review_assigned',
    'case.escalate_assigned', 'case.appeal_review_assigned', 'case.correction_review_assigned']::text[]),
  CHECK (capabilities_removed <@ ARRAY['case.read_assigned', 'case.review_assigned',
    'case.escalate_assigned', 'case.appeal_review_assigned', 'case.correction_review_assigned']::text[]),
  CHECK (NOT (capabilities_added && capabilities_removed))
);
CREATE INDEX community_delegation_audit_scope_time
  ON community_private.delegation_audit (platform, community_scope_id, occurred_at);

-- Data-model constraint trigger only, not a callable appointment/revocation RPC.
-- No Auth reads, role assignment, session validation or Founder authority here.
-- Future trusted writers must independently establish those facts before DML.
CREATE FUNCTION community_private.guard_delegation_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $transition_guard$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Invalid initial delegation state' USING ERRCODE = '23514';
    END IF;
    NEW.created_at := pg_catalog.transaction_timestamp();
    NEW.updated_at := NEW.created_at;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.subject_user_id IS DISTINCT FROM OLD.subject_user_id
    OR NEW.platform IS DISTINCT FROM OLD.platform
    OR NEW.community_scope_id IS DISTINCT FROM OLD.community_scope_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable delegation binding' USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'revoked' THEN
    RAISE EXCEPTION 'Revoked delegation is terminal' USING ERRCODE = '23514';
  END IF;
  IF NEW.version IS DISTINCT FROM OLD.version + 1 THEN
    RAISE EXCEPTION 'Invalid delegation version increment' USING ERRCODE = '23514';
  END IF;
  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('pending', 'active', 'revoked')) OR
    (OLD.status = 'active' AND NEW.status IN ('suspended', 'revoked')) OR
    (OLD.status = 'suspended' AND NEW.status IN ('suspended', 'active', 'revoked'))
  ) THEN
    RAISE EXCEPTION 'Invalid delegation transition' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'active' THEN
    IF NEW.approval_ref IS NOT DISTINCT FROM OLD.approval_ref
      OR NEW.approved_at IS NULL OR NEW.approved_at < OLD.updated_at
      OR NEW.approved_at > pg_catalog.clock_timestamp()
      OR NEW.expires_at <= pg_catalog.clock_timestamp() THEN
      RAISE EXCEPTION 'New current approval required' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM community_private.delegation_capabilities c
      WHERE c.delegation_id = OLD.id) THEN
      RAISE EXCEPTION 'Active delegation requires capability' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$transition_guard$;
REVOKE ALL ON FUNCTION community_private.guard_delegation_transition()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER community_delegations_transition_guard
  BEFORE INSERT OR UPDATE ON community_private.delegations
  FOR EACH ROW EXECUTE FUNCTION community_private.guard_delegation_transition();

-- Only a pending proposal's capability set may change. Locking the parent and
-- bumping its version prevents a stale approval from silently approving a changed
-- capability set. Each affected child row increments once; failed child statements
-- roll back the parent increment in the same transaction. Active/suspended grants
-- need revoke + a new pending record for capability changes. No new RPC is supplied.
CREATE FUNCTION community_private.guard_delegation_capability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $capability_guard$
DECLARE
  target_id uuid;
  parent_status text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.delegation_id IS DISTINCT FROM OLD.delegation_id THEN
      RAISE EXCEPTION 'Immutable capability delegation' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN target_id := OLD.delegation_id;
  ELSE target_id := NEW.delegation_id;
  END IF;
  SELECT d.status INTO parent_status FROM community_private.delegations d
    WHERE d.id = target_id FOR UPDATE;
  IF NOT FOUND THEN
    -- Parent already removed by its FK cascade: there is no surviving eligibility
    -- to mutate. This avoids breaking auth.users deletion. INSERT/UPDATE still deny.
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Delegation parent unavailable' USING ERRCODE = '23503';
  END IF;
  IF parent_status <> 'pending' THEN
    RAISE EXCEPTION 'Capability set is frozen' USING ERRCODE = '23514';
  END IF;
  UPDATE community_private.delegations
    SET version = version + 1, change_reason_code = 'PENDING_CAPABILITIES_CHANGED'
    WHERE id = target_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$capability_guard$;
REVOKE ALL ON FUNCTION community_private.guard_delegation_capability()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER community_delegation_capability_guard
  BEFORE INSERT OR UPDATE OR DELETE ON community_private.delegation_capabilities
  FOR EACH ROW EXECUTE FUNCTION community_private.guard_delegation_capability();

ALTER TABLE community_private.delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_private.delegation_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_private.delegation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA community_private FROM PUBLIC, anon, authenticated, service_role;

-- No client RLS policies, schema exposure, direct CRUD/TRUNCATE/REFERENCES grants,
-- live API/RPC, SECURITY DEFINER function, role or Auth trigger is created here.
-- Explicit revokes cover creator-specific default ACLs for the objects above;
-- do not assume postgres hardening covers another future owner or later objects.
-- Owner/BYPASSRLS can still bypass RLS or disable/alter constraints/triggers. The
-- candidate does not certify administrator tamper resistance. Private schema must
-- be verified absent from actual Data API exposure before any future execution.

-- STATUS MATRIX: pending -> pending/active/revoked;
-- active -> suspended/revoked; suspended -> suspended/active/revoked;
-- revoked -> no UPDATE. No active->active privilege edit or suspended->pending.
-- Pending INSERT is the only initial state. Resume requires a distinct approval
-- reference and a current approval timestamp plus nonempty frozen capabilities;
-- those fields are NOT proof of a Founder decision without the later trusted RPC.
-- This conservative matrix is a proposed technical constraint, not live policy.

-- DELETION/RETENTION LIMIT: no blanket parent DELETE trigger is used, preserving
-- approved auth.users ON DELETE CASCADE and capability cleanup. Application roles
-- have no DELETE/TRUNCATE grants. The owner can still remove/reinsert a UUID;
-- future trusted writers must never reuse a delegation ID and must reconcile a
-- retained audit reference before creating a record. No tombstone/retention policy
-- is silently invented here. Audit actor/subject SET NULL does not anonymize all
-- remaining metadata; approved retention/deletion rules are still required.

-- FOUNDER RPC / ATOMIC REVOCATION DEPENDENCIES (NOT IMPLEMENTED):
-- 1. Derive actor from validated Auth/database context; unchanged is_founder()
--    must be exactly true. Target must be a verified current USER, never self.
-- 2. Resolve verified exact community, capability subset, identity binding,
--    required human decision and expiry; caller role/email/receipt never authorizes.
-- 3. Lock the same delegation parent used by capability edits/revocation and compare
--    current expected version in the same transaction as the permission operation.
-- 4. Append minimal audit records atomically for proposal/version/capability and
--    status changes. Trigger version increments do not themselves create audits.
--    Audit failure must abort permission changes; operation IDs need intent checks.
-- 5. Revoke with status+revocation fields+version in one UPDATE; never revive that
--    record. Actual moderator case writes need a shared lock order and case version.
-- 6. Prove current session existence/expiry/assurance and stable-UUID independent
--    review. No trusted case/assignment ledger or actual guard is supplied here.

-- HIGH-RISK LIFECYCLE DEPENDENCY: email-change/verification-loss/change-back must
-- durably suspend/increment relevant grants while preserving T03 signup/profile/
-- Founder synchronization. No auth.users trigger or polling workaround is supplied.
-- Authoritative identity_generation, current-session semantics, verified email
-- binding and explicit reapproval remain BLOCKED until separately designed/tested.

-- ROLLBACK (SEPARATE REVIEW/APPROVAL, NOT EXECUTED): disable only new surfaces and
-- revoke new facade grants if later introduced; suspend/reconcile delegations,
-- preserve/minimize audits under approved privacy rules, remove only reviewed new
-- objects through an additive rollback. Never reset shared schemas, replay old
-- migrations, alter USER/FOUNDER, modify existing Auth triggers or use a broad
-- service-role fallback. External native rights require separate confirmation.

-- STATIC REVIEW REFERENCES: PostgreSQL17 trigger-definition, CREATE FUNCTION and
-- row-security docs; Supabase API security guidance. Table-local guards are not
-- Founder authorization. No PostgreSQL parser/runtime/concurrency test was run.
-- https://www.postgresql.org/docs/17/trigger-definition.html
-- https://www.postgresql.org/docs/17/sql-createfunction.html
-- https://www.postgresql.org/docs/17/ddl-rowsecurity.html
-- https://supabase.com/docs/guides/api/securing-your-api

ROLLBACK;
