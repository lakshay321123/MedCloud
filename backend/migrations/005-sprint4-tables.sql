-- ============================================================================
-- MEDCLOUD SPRINT 4 MIGRATION — 005-sprint4-tables.sql
-- New tables: messages, payer_config, credit_balances, bank_deposits,
--             bank_reconciliations, appeal_templates
-- Run: psql -h $MEDCLOUD_DB_HOST -U $MEDCLOUD_DB_USER -d medcloud -f 005-sprint4-tables.sql
-- ============================================================================

-- ─── Contextual Messages ─────────────────────────────────────────────────────
-- Messages attached to any entity (patient, claim, denial, submission, etc.)
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  entity_type       TEXT NOT NULL,               -- 'patient','claim','denial','encounter','document','submission','general'
  entity_id         UUID,                        -- ID of attached entity (NULL for general messages)
  parent_id         UUID REFERENCES messages(id),-- for threaded replies
  sender_id         UUID NOT NULL,               -- user who sent it
  sender_role       TEXT,                        -- 'admin','biller','coder','provider','client','system'
  recipient_ids     UUID[],                      -- specific recipients (NULL = visible to all with entity access)
  subject           TEXT,                        -- optional subject line (first message in thread)
  body              TEXT NOT NULL,
  attachments       JSONB DEFAULT '[]'::jsonb,   -- [{file_name, s3_key, file_type, size_bytes}]
  is_internal       BOOLEAN DEFAULT false,       -- true = staff only, not visible to client/provider
  is_system         BOOLEAN DEFAULT false,       -- auto-generated system messages
  read_by           UUID[] DEFAULT '{}',         -- array of user_ids who have read it
  priority          TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_entity ON messages(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ─── Payer Configuration (timely filing + phone + IVR) ───────────────────────
-- Consolidates payer-specific operational data
CREATE TABLE IF NOT EXISTS payer_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  payer_id          UUID NOT NULL REFERENCES payers(id),
  -- Timely filing limits (days)
  timely_filing_days_initial    INTEGER,         -- initial claim submission (e.g. 90, 120, 365)
  timely_filing_days_corrected  INTEGER,         -- corrected claim resubmission
  timely_filing_days_appeal     INTEGER,         -- appeal submission deadline
  timely_filing_days_reconsider INTEGER,         -- reconsideration deadline
  -- Contact info
  phone_claims      TEXT,                        -- phone number for claim inquiries
  phone_auth        TEXT,                        -- phone number for prior auth
  phone_eligibility TEXT,                        -- phone number for eligibility
  phone_appeals     TEXT,                        -- phone number for appeals
  fax_appeals       TEXT,                        -- fax for appeal submissions
  portal_url        TEXT,                        -- payer portal URL
  -- IVR navigation scripts
  ivr_script_claims JSONB DEFAULT '[]'::jsonb,   -- [{"step":1,"action":"Press 2","note":"Provider services"},...]
  ivr_script_auth   JSONB DEFAULT '[]'::jsonb,
  ivr_script_appeals JSONB DEFAULT '[]'::jsonb,
  -- Contract terms
  clean_claim_days  INTEGER,                     -- payer's clean claim payment window
  appeal_levels     INTEGER DEFAULT 3,           -- max appeal levels allowed
  era_enrollment_id TEXT,                        -- ERA enrollment ID with clearinghouse
  eft_enrollment_id TEXT,                        -- EFT enrollment ID
  -- Notes
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payer_config_org_payer ON payer_config(org_id, payer_id);

-- ─── Credit Balances ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_balances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  claim_id          UUID REFERENCES claims(id),
  patient_id        UUID REFERENCES patients(id),
  payer_id          UUID REFERENCES payers(id),
  amount            NUMERIC(12,2) NOT NULL,
  source            TEXT NOT NULL CHECK (source IN ('overpayment','duplicate_payment','refund_due','adjustment_error','patient_overpay')),
  status            TEXT DEFAULT 'identified' CHECK (status IN ('identified','under_review','refund_requested','refund_sent','applied_to_balance','written_off','resolved')),
  identified_date   DATE DEFAULT CURRENT_DATE,
  resolution_date   DATE,
  resolution_method TEXT,                        -- 'refund_check','refund_eft','applied_to_claim','written_off'
  resolution_claim_id UUID,                      -- if applied to another claim
  notes             TEXT,
  assigned_to       UUID,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_bal_org ON credit_balances(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_bal_status ON credit_balances(status);
CREATE INDEX IF NOT EXISTS idx_credit_bal_patient ON credit_balances(patient_id);

-- ─── Bank Deposits (for reconciliation) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_deposits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  deposit_date      DATE NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  bank_reference    TEXT,                        -- check number or EFT reference
  payer_id          UUID REFERENCES payers(id),
  deposit_method    TEXT DEFAULT 'eft' CHECK (deposit_method IN ('eft','check','virtual_card','ach')),
  reconciled        BOOLEAN DEFAULT false,
  reconciled_at     TIMESTAMPTZ,
  era_file_ids      UUID[] DEFAULT '{}',         -- matched ERA files
  variance          NUMERIC(12,2),               -- deposit - ERA total (0 = matched)
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bank_dep_org ON bank_deposits(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_dep_date ON bank_deposits(deposit_date);
CREATE INDEX IF NOT EXISTS idx_bank_dep_reconciled ON bank_deposits(reconciled);

-- ─── Appeal Templates (per payer + CARC, with win rates) ─────────────────────
CREATE TABLE IF NOT EXISTS appeal_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  payer_id          UUID REFERENCES payers(id),  -- NULL = generic template
  carc_code         TEXT,                        -- NULL = generic for payer
  denial_category   TEXT,                        -- authorization, eligibility, coding, etc.
  appeal_level      INTEGER DEFAULT 1,
  template_name     TEXT NOT NULL,
  template_body     TEXT NOT NULL,                -- template with {{placeholders}}
  placeholders      JSONB DEFAULT '[]'::jsonb,   -- ["patient_name","claim_number","dos_from",...]
  -- Win rate tracking
  times_used        INTEGER DEFAULT 0,
  times_won         INTEGER DEFAULT 0,
  win_rate          NUMERIC(5,2) DEFAULT 0,      -- auto-calculated: times_won/times_used * 100
  avg_days_to_resolution INTEGER,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appeal_tmpl_org ON appeal_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_appeal_tmpl_payer ON appeal_templates(payer_id, carc_code);

-- ─── Column additions to existing tables ─────────────────────────────────────

-- Claims: timely filing tracking
ALTER TABLE claims ADD COLUMN IF NOT EXISTS timely_filing_deadline DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS timely_filing_days_remaining INTEGER;

-- Denials: appeal deadline tracking
ALTER TABLE denials ADD COLUMN IF NOT EXISTS appeal_deadline_days INTEGER;
ALTER TABLE denials ADD COLUMN IF NOT EXISTS appeal_deadline_alert_sent BOOLEAN DEFAULT false;

-- Payers: quick-reference contact fields
ALTER TABLE payers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE payers ADD COLUMN IF NOT EXISTS portal_url TEXT;

-- Clients: health scoring
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INTEGER;  -- 0-100
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score_updated_at TIMESTAMPTZ;

-- ─── Done ────────────────────────────────────────────────────────────────────

-- ─── Coding QA Audits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_qa_audits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  coding_id         UUID NOT NULL,               -- coding_queue item audited
  encounter_id      UUID,
  auditor_id        UUID NOT NULL,                -- user who performed the audit
  coder_id          UUID,                         -- original coder
  -- AI vs human comparison
  ai_codes          JSONB DEFAULT '[]'::jsonb,    -- [{cpt, icd10, confidence}]
  coder_codes       JSONB DEFAULT '[]'::jsonb,    -- [{cpt, icd10}]
  auditor_codes     JSONB DEFAULT '[]'::jsonb,    -- [{cpt, icd10}] — gold standard
  ai_accuracy       NUMERIC(5,2),                 -- % match AI vs auditor
  coder_accuracy    NUMERIC(5,2),                 -- % match coder vs auditor
  discrepancies     JSONB DEFAULT '[]'::jsonb,    -- [{field, expected, actual, severity}]
  overall_result    TEXT CHECK (overall_result IN ('pass','minor_error','major_error','critical_error')),
  findings          TEXT,
  education_needed  BOOLEAN DEFAULT false,
  audit_date        DATE DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qa_audit_org ON coding_qa_audits(org_id);
CREATE INDEX IF NOT EXISTS idx_qa_audit_coder ON coding_qa_audits(coder_id);

-- ─── Client Onboarding Checklists ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_onboarding (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID NOT NULL REFERENCES clients(id),
  status            TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started','in_progress','completed','on_hold')),
  started_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  assigned_to       UUID,                        -- onboarding manager
  checklist         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{item_number, title, description, required, completed, completed_by, completed_at, notes}]
  go_live_target    DATE,
  go_live_actual    DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_client ON client_onboarding(org_id, client_id);

-- ─── Provider Note Addendums (legal requirement) ───────────────────────────
CREATE TABLE IF NOT EXISTS note_addendums (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  soap_note_id      UUID NOT NULL,
  encounter_id      UUID,
  provider_id       UUID NOT NULL,                -- provider adding the addendum
  addendum_text     TEXT NOT NULL,
  reason            TEXT,                         -- 'correction','clarification','additional_info','late_entry'
  original_text     TEXT,                         -- snapshot of what was changed (if correction)
  signed_off        BOOLEAN DEFAULT false,
  signed_off_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addendum_note ON note_addendums(soap_note_id);
CREATE INDEX IF NOT EXISTS idx_addendum_encounter ON note_addendums(encounter_id);

-- ─── Invoicing (Cosentus → Client billing) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID NOT NULL REFERENCES clients(id),
  pricing_model     TEXT NOT NULL CHECK (pricing_model IN ('per_claim','percentage','flat_monthly','hybrid')),
  per_claim_rate    NUMERIC(8,2),                 -- $ per claim submitted
  percentage_rate   NUMERIC(5,2),                 -- % of collections
  flat_rate         NUMERIC(12,2),                -- monthly flat fee
  minimum_monthly   NUMERIC(12,2),                -- minimum monthly charge
  effective_date    DATE NOT NULL,
  end_date          DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_config_client ON invoice_configs(org_id, client_id, effective_date);

CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID NOT NULL REFERENCES clients(id),
  invoice_number    TEXT NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled','disputed')),
  -- Line items
  claims_count      INTEGER DEFAULT 0,
  collections_total NUMERIC(12,2) DEFAULT 0,
  -- Calculated amounts
  per_claim_amount  NUMERIC(12,2) DEFAULT 0,
  percentage_amount NUMERIC(12,2) DEFAULT 0,
  flat_amount       NUMERIC(12,2) DEFAULT 0,
  adjustments       NUMERIC(12,2) DEFAULT 0,
  subtotal          NUMERIC(12,2) DEFAULT 0,
  tax               NUMERIC(12,2) DEFAULT 0,
  total             NUMERIC(12,2) DEFAULT 0,
  -- Payment
  paid_amount       NUMERIC(12,2) DEFAULT 0,
  paid_at           TIMESTAMPTZ,
  payment_method    TEXT,
  -- Dates
  issued_date       DATE,
  due_date          DATE,
  sent_at           TIMESTAMPTZ,
  line_items        JSONB DEFAULT '[]'::jsonb,    -- [{description, quantity, rate, amount}]
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number ON invoices(org_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);

-- ─── Patient Right of Access Requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_access_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  patient_id        UUID NOT NULL REFERENCES patients(id),
  request_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline_date     DATE NOT NULL,                -- 30 days from request
  status            TEXT DEFAULT 'received' CHECK (status IN ('received','in_progress','records_compiled','sent','completed','denied')),
  request_type      TEXT DEFAULT 'full_record' CHECK (request_type IN ('full_record','billing_only','specific_dates','specific_provider','amendment')),
  delivery_method   TEXT CHECK (delivery_method IN ('mail','email','portal','fax','pickup')),
  records_sent_date DATE,
  denied_reason     TEXT,
  assigned_to       UUID,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_access_org ON patient_access_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_patient_access_status ON patient_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_access_deadline ON patient_access_requests(deadline_date);

-- ─── HCC Tracking ───────────────────────────────────────────────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hcc_codes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hcc_raf_score NUMERIC(6,3);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hcc_last_assessed DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hcc_next_reassessment DATE;

