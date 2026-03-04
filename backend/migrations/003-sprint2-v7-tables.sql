-- ============================================================================
-- MEDCLOUD SPRINT 2 v7 MIGRATION — 003-sprint2-v7-tables.sql
-- New tables: prior_auth_requests, patient_statements, charge_captures
-- Columns: claims (secondary/institutional), patients (secondary payer),
--          credentialing (expiry tracking)
--
-- Run: psql -h medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com \
--      -U medcloud_admin -d medcloud -f 003-sprint2-v7-tables.sql
-- ============================================================================

BEGIN;

-- ── Prior Authorization Requests ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prior_auth_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  claim_id          UUID REFERENCES claims(id),
  patient_id        UUID NOT NULL REFERENCES patients(id),
  payer_id          UUID NOT NULL REFERENCES payers(id),
  provider_id       UUID REFERENCES providers(id),
  auth_number       TEXT NOT NULL,                -- internal tracking number
  auth_number_payer TEXT,                         -- payer-assigned auth number
  cpt_codes         JSONB DEFAULT '[]',           -- requested procedures
  icd_codes         JSONB DEFAULT '[]',           -- supporting diagnoses
  urgency           TEXT DEFAULT 'standard' CHECK (urgency IN ('standard','urgent','emergent','retrospective')),
  clinical_rationale TEXT,
  dos_from          DATE,
  dos_to            DATE,
  approved_units    INTEGER,
  approved_from     DATE,
  approved_to       DATE,
  denial_reason     TEXT,
  peer_to_peer_date TIMESTAMPTZ,                  -- scheduled P2P review
  notes             TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','submitted','in_review','peer_to_peer_scheduled',
    'approved','partially_approved','denied','expired','cancelled'
  )),
  requested_by      UUID REFERENCES users(id),
  requested_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  updated_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prior_auth_org ON prior_auth_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_prior_auth_patient ON prior_auth_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_prior_auth_claim ON prior_auth_requests(claim_id);
CREATE INDEX IF NOT EXISTS idx_prior_auth_status ON prior_auth_requests(status);
CREATE INDEX IF NOT EXISTS idx_prior_auth_payer ON prior_auth_requests(payer_id);

-- ── Patient Statements ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_statements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id),
  client_id           UUID REFERENCES clients(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  statement_number    TEXT NOT NULL,
  statement_date      TIMESTAMPTZ DEFAULT NOW(),
  total_charges       DECIMAL(12,2) DEFAULT 0,
  insurance_payments  DECIMAL(12,2) DEFAULT 0,
  patient_payments    DECIMAL(12,2) DEFAULT 0,
  balance_due         DECIMAL(12,2) DEFAULT 0,
  line_items          JSONB DEFAULT '[]',
  status              TEXT DEFAULT 'generated' CHECK (status IN (
    'generated','sent','delivered','viewed','partial_paid','paid','payment_plan','collections','void'
  )),
  sent_via            TEXT CHECK (sent_via IN ('mail','email','portal','sms')),
  sent_at             TIMESTAMPTZ,
  due_date            DATE,
  payment_plan_id     TEXT,                       -- link to payment plan if applicable
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_stmt_org ON patient_statements(org_id);
CREATE INDEX IF NOT EXISTS idx_patient_stmt_patient ON patient_statements(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_stmt_status ON patient_statements(status);

-- ── Charge Captures (AI Feature #11) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS charge_captures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id),
  encounter_id    UUID REFERENCES encounters(id),
  patient_id      UUID REFERENCES patients(id),
  provider_id     UUID REFERENCES providers(id),
  dos             DATE,
  charges_json    JSONB DEFAULT '[]',             -- [{cpt_code, description, units, modifier, charge_amount, confidence}]
  diagnoses_json  JSONB DEFAULT '[]',             -- [{icd_code, description, is_primary, confidence}]
  em_level        TEXT,
  total_charge    DECIMAL(12,2) DEFAULT 0,
  ai_confidence   DECIMAL(5,2),
  model_id        TEXT,
  status          TEXT DEFAULT 'pending_review' CHECK (status IN (
    'pending_review','approved','rejected','partial_approved','converted_to_claim'
  )),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  claim_id        UUID REFERENCES claims(id),     -- link after conversion
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_charge_cap_encounter ON charge_captures(encounter_id);
CREATE INDEX IF NOT EXISTS idx_charge_cap_org ON charge_captures(org_id);
CREATE INDEX IF NOT EXISTS idx_charge_cap_status ON charge_captures(status);

-- ── Claims — add institutional + secondary claim fields ────────────────────────
DO $$ BEGIN
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS type_of_bill TEXT;          -- UB-04: 0111, 0121, etc.
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS admit_type TEXT;            -- 1=Emergency, 2=Urgent, 3=Elective
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS admit_source TEXT;          -- 1=Physician referral, etc.
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS patient_status TEXT;        -- 01=Discharged home, etc.
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS occurrence_code TEXT;
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS principal_procedure TEXT;   -- ICD-10-PCS for inpatient
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS drg_code TEXT;
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS primary_claim_id UUID REFERENCES claims(id);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS secondary_claim_id UUID REFERENCES claims(id);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS primary_payer_paid DECIMAL(12,2);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS primary_allowed_amount DECIMAL(12,2);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS billing_sequence TEXT DEFAULT 'primary'
    CHECK (billing_sequence IN ('primary','secondary','tertiary'));
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS patient_responsibility DECIMAL(12,2);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS allowed_amount DECIMAL(12,2);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Claim Lines — add revenue code for institutional ───────────────────────────
DO $$ BEGIN
  ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS revenue_code TEXT;     -- UB-04 revenue codes
  ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS prior_auth_number TEXT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Patients — add secondary payer ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS secondary_payer_id UUID REFERENCES payers(id);
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS secondary_member_id TEXT;
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS secondary_group_number TEXT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Payments — add payment source for patient vs insurance ─────────────────────
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'insurance'
    CHECK (payment_source IN ('insurance','patient','other'));
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Credentialing — add expiry tracking fields ─────────────────────────────────
DO $$ BEGIN
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS credential_type TEXT DEFAULT 'initial'
    CHECK (credential_type IN ('initial','recredentialing','revalidation','group_enrollment','individual_enrollment'));
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS application_date DATE;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS effective_date DATE;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS expiry_date DATE;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS last_verified DATE;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS caqh_id TEXT;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS pecos_enrolled BOOLEAN DEFAULT FALSE;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS recred_due_date DATE;
  ALTER TABLE credentialing ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_cred_expiry ON credentialing(expiry_date);
CREATE INDEX IF NOT EXISTS idx_cred_status ON credentialing(status);

-- ── Documents — add AI classification field (if not exists from 002) ───────────
DO $$ BEGIN
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,2);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- ── Verify ─────────────────────────────────────────────────────────────────────
SELECT 'Sprint 2 v7 migration complete' AS status,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS total_tables;
