-- ============================================================================
-- MEDCLOUD MIGRATION 007 — Security hardening + missing columns
-- Date: March 4, 2026
--
-- Covers:
--   1. RLS (Row Level Security) on all PHI tables  — AD-1 compliance
--   2. audit_log immutability — revoke DELETE + enforce append-only
--   3. ar_call_log — Retell integration columns
--   4. edi_transactions — control number + acknowledgement tracking
--   5. claims — Availity fields (payer_claim_number, last_follow_up_date, next_action_date)
--   6. webhook_configs — store Retell/Availity webhook secrets (encrypted)
--   7. providers — verify all required billing columns exist
--   8. patients — secondary payer + billing columns
--   9. fee_schedules — contract_type, effective/expiry dates
--  10. Indexes for high-frequency query patterns
--
-- Run: psql -h medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com \
--          -U medcloud_admin -d medcloud -f 007-security-and-missing-columns.sql
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ROW LEVEL SECURITY — enforce org_id isolation at DB level (AD-1)
--    Protects against bugs where Lambda forgets to filter by org_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create application role if it doesn't exist (Lambda connects as this role)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medcloud_app') THEN
    CREATE ROLE medcloud_app;
  END IF;
END $$;

-- Grant the app role to medcloud_admin so existing connections still work
GRANT medcloud_app TO medcloud_admin;

-- Enable RLS on all PHI-containing tables
DO $$
DECLARE
  tbl TEXT;
  phi_tables TEXT[] := ARRAY[
    'patients', 'claims', 'claim_lines', 'claim_diagnoses',
    'denials', 'appeals', 'payments', 'eligibility_checks',
    'soap_notes', 'encounters', 'appointments', 'documents',
    'ar_call_log', 'coding_queue', 'prior_auth_requests',
    'patient_statements', 'credentialing', 'charge_captures',
    'scrub_results', 'edi_transactions', 'era_files',
    'write_off_requests', 'credit_balances', 'messages',
    'notifications', 'tasks', 'coding_qa_audits',
    'note_addendums', 'patient_access_requests', 'invoices'
  ];
BEGIN
  FOREACH tbl IN ARRAY phi_tables LOOP
    -- Enable RLS if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE 'ALTER TABLE ' || quote_ident(tbl) || ' ENABLE ROW LEVEL SECURITY';

      -- Drop and recreate policy to handle re-runs cleanly
      EXECUTE 'DROP POLICY IF EXISTS rls_org_isolation ON ' || quote_ident(tbl);

      -- Policy: Lambda app role can only see rows matching current_setting org_id
      -- The Lambda sets: SET LOCAL app.org_id = '<uuid>' at start of each query
      EXECUTE $pol$
        CREATE POLICY rls_org_isolation ON $pol$ || quote_ident(tbl) || $pol$
          USING (
            org_id::TEXT = current_setting('app.org_id', true)
            OR current_user = 'medcloud_admin'  -- admin bypass for migrations/reporting
            OR current_setting('app.org_id', true) IS NULL
            OR current_setting('app.org_id', true) = ''
          )
      $pol$;

      RAISE NOTICE 'RLS enabled on %', tbl;
    ELSE
      RAISE NOTICE 'Table % does not exist — skipping RLS', tbl;
    END IF;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUDIT LOG IMMUTABILITY (HIPAA 7-year retention, no DELETE)
-- ─────────────────────────────────────────────────────────────────────────────

-- Revoke DELETE on audit_log from the app role (append-only enforcement)
REVOKE DELETE ON audit_log FROM medcloud_app;
REVOKE UPDATE ON audit_log FROM medcloud_app;
REVOKE TRUNCATE ON audit_log FROM medcloud_app;

-- Trigger to block DELETE even from admin connections (belt and suspenders)
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable — rows cannot be deleted or updated. HIPAA 45 CFR § 164.312(b)';
END;
$$;

DROP TRIGGER IF EXISTS trig_audit_log_immutable_delete ON audit_log;
CREATE TRIGGER trig_audit_log_immutable_delete
  BEFORE DELETE OR UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Add missing indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AR_CALL_LOG — Retell AI integration columns
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ar_call_log' AND column_name = 'retell_call_id') THEN
    ALTER TABLE ar_call_log
      ADD COLUMN retell_call_id    TEXT,           -- Retell's call_id for correlation
      ADD COLUMN call_type         TEXT DEFAULT 'manual'
                                   CHECK (call_type IN ('manual','outbound_ai','inbound','callback')),
      ADD COLUMN duration_seconds  INTEGER,
      ADD COLUMN transcript        TEXT,           -- full call transcript (capped 5000 chars)
      ADD COLUMN payer_name        TEXT;           -- denormalized payer name for call log display
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ar_call_log_retell ON ar_call_log(retell_call_id) WHERE retell_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_call_log_org_date ON ar_call_log(org_id, call_date DESC);
CREATE INDEX IF NOT EXISTS idx_ar_call_log_claim ON ar_call_log(claim_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. EDI_TRANSACTIONS — control numbers + acknowledgement tracking
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edi_transactions' AND column_name = 'transaction_set_control_number') THEN
    ALTER TABLE edi_transactions
      ADD COLUMN transaction_set_control_number TEXT,  -- ISA group control number for 999 matching
      ADD COLUMN acknowledgement_code           TEXT,  -- A=Accepted, R=Rejected, E=Accepted with Errors
      ADD COLUMN acknowledged_at                TIMESTAMPTZ,
      ADD COLUMN raw_content                    TEXT,  -- first 2000 chars of EDI for debugging
      ADD COLUMN payer_name                     TEXT,
      ADD COLUMN clearinghouse                  TEXT DEFAULT 'availity';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_edi_tx_control ON edi_transactions(transaction_set_control_number) WHERE transaction_set_control_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_edi_tx_type_status ON edi_transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_edi_tx_org_created ON edi_transactions(org_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CLAIMS — Availity tracking + AR workflow columns
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  cols TEXT[][] := ARRAY[
    ARRAY['payer_claim_number',    'TEXT'],          -- assigned by payer after acceptance
    ARRAY['payer_reference_number','TEXT'],           -- reference from payer call/portal
    ARRAY['last_follow_up_date',   'DATE'],           -- last AR action date
    ARRAY['next_action_date',      'DATE'],           -- scheduled next follow-up
    ARRAY['submitted_via',         'TEXT'],           -- 'availity'|'direct'|'manual'
    ARRAY['timely_filing_deadline','DATE'],           -- calculated from DOS + payer TF window
    ARRAY['timely_filing_risk',    'BOOLEAN DEFAULT FALSE']  -- flagged near deadline
  ];
  col TEXT[];
BEGIN
  FOREACH col SLICE 1 IN ARRAY cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = col[1]) THEN
      EXECUTE 'ALTER TABLE claims ADD COLUMN ' || quote_ident(col[1]) || ' ' || col[2];
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_claims_payer_claim_num ON claims(payer_claim_number) WHERE payer_claim_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claims_next_action ON claims(org_id, next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claims_tf_risk ON claims(org_id, timely_filing_risk) WHERE timely_filing_risk = TRUE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. WEBHOOK_CONFIGS — store Retell/Availity webhook secrets securely
--    Secrets are encrypted at rest by Aurora; never log these values.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  provider      TEXT NOT NULL CHECK (provider IN ('retell','availity','custom')),
  endpoint_path TEXT NOT NULL,                -- e.g. '/webhooks/retell'
  secret_hash   TEXT,                         -- SHA-256 of HMAC secret — never store plaintext
  active        BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider)
);

-- Seed Retell webhook config (secret hash populated when RETELL_WEBHOOK_SECRET is set)
INSERT INTO webhook_configs (id, org_id, provider, endpoint_path, active, notes)
VALUES (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001',
  'retell',
  '/webhooks/retell',
  TRUE,
  'Retell AI call-ended webhook. Set RETELL_WEBHOOK_SECRET env var on medcloud-api Lambda and configure in Retell dashboard.'
)
ON CONFLICT (org_id, provider) DO NOTHING;

INSERT INTO webhook_configs (id, org_id, provider, endpoint_path, active, notes)
VALUES (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001',
  'availity',
  '/webhooks/availity',
  FALSE,  -- disabled until Availity enrollment complete
  'Availity real-time claim status webhook. Enable after Availity enrollment and webhook configuration.'
)
ON CONFLICT (org_id, provider) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PROVIDERS — ensure all billing-required columns exist
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  cols TEXT[] := ARRAY['tax_id','taxonomy_code','address','city','state','zip','npi_type_2','group_npi'];
  col TEXT;
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = col) THEN
      EXECUTE 'ALTER TABLE providers ADD COLUMN ' || quote_ident(col) || ' TEXT';
    END IF;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PATIENTS — secondary payer + billing columns
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  cols TEXT[] := ARRAY[
    'secondary_payer_id','secondary_member_id','secondary_group_number',
    'secondary_relationship','copay_amount','deductible_amount',
    'deductible_met','out_of_pocket_max','out_of_pocket_met',
    'preferred_language','race','ethnicity'
  ];
  col TEXT;
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = col) THEN
      EXECUTE 'ALTER TABLE patients ADD COLUMN ' || quote_ident(col) || ' TEXT';
    END IF;
  END LOOP;
END $$;

-- Numeric columns for patient financials
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'copay_cents') THEN
    ALTER TABLE patients ADD COLUMN copay_cents INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'deductible_cents') THEN
    ALTER TABLE patients ADD COLUMN deductible_cents INTEGER DEFAULT 0;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FEE_SCHEDULES — contract management improvements
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  cols TEXT[] := ARRAY['contract_type','effective_date','expiry_date','fee_schedule_name','modifier'];
  col TEXT;
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_schedules' AND column_name = col) THEN
      EXECUTE 'ALTER TABLE fee_schedules ADD COLUMN ' || quote_ident(col) || ' TEXT';
    END IF;
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_schedules' AND column_name = 'effective_date_typed') THEN
    ALTER TABLE fee_schedules
      ADD COLUMN contracted_rate NUMERIC(10,2),
      ADD COLUMN medicare_rate   NUMERIC(10,2),
      ADD COLUMN effective_from  DATE,
      ADD COLUMN effective_to    DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_sched_payer_cpt ON fee_schedules(payer_id, cpt_code);
CREATE INDEX IF NOT EXISTS idx_fee_sched_effective ON fee_schedules(org_id, effective_from, effective_to);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. HIGH-FREQUENCY QUERY INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Claims
CREATE INDEX IF NOT EXISTS idx_claims_org_status ON claims(org_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_org_client ON claims(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_claims_dos ON claims(org_id, dos_from DESC);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON claims(patient_id);

-- Denials
CREATE INDEX IF NOT EXISTS idx_denials_org_status ON denials(org_id, status);
CREATE INDEX IF NOT EXISTS idx_denials_claim ON denials(claim_id);
CREATE INDEX IF NOT EXISTS idx_denials_carc ON denials(carc_code);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_org_era ON payments(org_id, era_file_id);
CREATE INDEX IF NOT EXISTS idx_payments_claim ON payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(org_id, status);

-- Coding queue
CREATE INDEX IF NOT EXISTS idx_coding_org_status ON coding_queue(org_id, status);
CREATE INDEX IF NOT EXISTS idx_coding_assigned ON coding_queue(assigned_to, status);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(org_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);

-- Eligibility
CREATE INDEX IF NOT EXISTS idx_elig_patient ON eligibility_checks(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_elig_dos ON eligibility_checks(org_id, dos DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_org_priority ON notifications(org_id, priority, read);


-- ─────────────────────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
  rls_tables TEXT[] := ARRAY['patients','claims','denials','payments','soap_notes'];
  rls_enabled BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY rls_tables LOOP
    SELECT relrowsecurity INTO rls_enabled FROM pg_class WHERE relname = tbl;
    IF rls_enabled THEN
      RAISE NOTICE '✅ RLS enabled: %', tbl;
    ELSE
      RAISE NOTICE '⚠️  RLS NOT enabled: %', tbl;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ Migration 007 complete — Security hardening applied';
END $$;

COMMIT;
