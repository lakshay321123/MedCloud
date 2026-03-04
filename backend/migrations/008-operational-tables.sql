-- ============================================================
-- Migration 008: Operational Tables + Indexes
-- All tables needed by new Lambda v4 routes
-- No external API dependencies — pure internal DB
-- ============================================================

-- ─── Write-off Requests (tiered approval workflow) ────────────────────────────
CREATE TABLE IF NOT EXISTS write_off_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id),
  claim_id        UUID REFERENCES claims(id),
  amount          NUMERIC(10,2) NOT NULL,
  reason          TEXT,
  write_off_type  VARCHAR(50) DEFAULT 'bad_debt',   -- bad_debt | contractual | administrative
  status          VARCHAR(30) DEFAULT 'pending_approval', -- pending_approval | approved | rejected
  approval_tier   VARCHAR(20),                        -- auto | supervisor | director
  requested_by    UUID,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  rejected_by     UUID,
  rejected_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Patient Statements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_statements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id),
  patient_id      UUID REFERENCES patients(id),
  statement_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  total_balance   NUMERIC(10,2) DEFAULT 0,
  line_items      JSONB DEFAULT '[]',
  status          VARCHAR(30) DEFAULT 'generated',   -- generated | sent | paid | overdue
  delivery_method VARCHAR(30) DEFAULT 'portal',       -- portal | mail | email
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  user_id         UUID,                               -- NULL = org-wide broadcast
  type            VARCHAR(60) NOT NULL,               -- timely_filing_risk | denial_alert | write_off_approval | etc
  priority        VARCHAR(20) DEFAULT 'normal',       -- normal | high | urgent
  title           VARCHAR(255) NOT NULL,
  message         TEXT,
  entity_type     VARCHAR(60),
  entity_id       UUID,
  read            BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Messages (internal) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id),
  sender_id       UUID,
  recipient_id    UUID,
  subject         VARCHAR(255),
  body            TEXT NOT NULL,
  message_type    VARCHAR(40) DEFAULT 'general',      -- general | clinical | billing | auth | urgent
  priority        VARCHAR(20) DEFAULT 'normal',
  entity_type     VARCHAR(60),
  entity_id       UUID,
  read            BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  parent_id       UUID REFERENCES messages(id),       -- for threading
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Prior Auth Requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prior_auth_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id),
  client_id           UUID REFERENCES clients(id),
  patient_id          UUID REFERENCES patients(id),
  payer_id            UUID REFERENCES payers(id),
  claim_id            UUID REFERENCES claims(id),
  procedure_codes     JSONB DEFAULT '[]',
  diagnosis_codes     JSONB DEFAULT '[]',
  dos                 DATE,
  urgency             VARCHAR(20) DEFAULT 'routine',  -- routine | urgent | emergency
  status              VARCHAR(40) DEFAULT 'pending_submission',
  auth_number         VARCHAR(100),
  denial_reason       TEXT,
  submission_deadline DATE,
  decision_date       DATE,
  expiry_date         DATE,
  requested_by        UUID,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Credit Balances ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_balances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  claim_id          UUID REFERENCES claims(id),
  patient_id        UUID REFERENCES patients(id),
  payer_id          UUID REFERENCES payers(id),
  amount            NUMERIC(10,2) NOT NULL,
  source            VARCHAR(40) DEFAULT 'overpayment', -- overpayment | duplicate | adjustment
  status            VARCHAR(30) DEFAULT 'open',        -- open | resolved | pending_refund
  resolution_type   VARCHAR(40),                       -- refund | apply_to_balance | write_off
  resolution_notes  TEXT,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID,
  identified_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Client Onboarding Checklist ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_onboarding (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  client_id             UUID REFERENCES clients(id),
  status                VARCHAR(30) DEFAULT 'in_progress', -- in_progress | completed | on_hold
  checklist             JSONB DEFAULT '{}',
  baa_signed            BOOLEAN DEFAULT FALSE,
  baa_signed_date       DATE,
  baa_expiry_date       DATE,
  baa_signatory         VARCHAR(255),
  baa_signatory_email   VARCHAR(255),
  baa_version           VARCHAR(20) DEFAULT '1.0',
  npi_verified          BOOLEAN DEFAULT FALSE,
  tax_id_verified       BOOLEAN DEFAULT FALSE,
  go_live_approved      BOOLEAN DEFAULT FALSE,
  go_live_date          DATE,
  started_by            UUID,
  completed_at          TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Coding QA Audits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_qa_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id),
  coding_item_id  UUID,
  auditor_id      UUID,
  audit_date      DATE DEFAULT CURRENT_DATE,
  result          VARCHAR(30) DEFAULT 'pending_review', -- pending_review | passed | error_found
  accuracy_score  NUMERIC(5,2),
  errors_found    JSONB DEFAULT '[]',
  feedback        TEXT,
  status          VARCHAR(30) DEFAULT 'pending_review',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Fee Schedules (add missing columns if table exists) ─────────────────────
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS contract_type VARCHAR(40) DEFAULT 'contracted';
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS contracted_rate NUMERIC(10,2);
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS medicare_rate NUMERIC(10,2);
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── Tasks (add missing columns) ──────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS entity_type VARCHAR(60);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id UUID;

-- ─── Payer Config (add missing columns) ───────────────────────────────────────
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES payers(id);
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS availity_payer_id VARCHAR(50);
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS payer_name VARCHAR(255);
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS timely_filing_days INTEGER DEFAULT 365;
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS isvr_script TEXT;
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS prior_auth_required BOOLEAN DEFAULT FALSE;
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS auto_verification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS region VARCHAR(10) DEFAULT 'us';
ALTER TABLE payer_config ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── RLS Policies for new tables ─────────────────────────────────────────────
ALTER TABLE write_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_auth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_qa_audits ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'write_off_requests','patient_statements','notifications',
    'messages','prior_auth_requests','credit_balances',
    'client_onboarding','coding_qa_audits'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', t);
    EXECUTE format('CREATE POLICY org_isolation ON %I USING (org_id = current_setting(''app.org_id'', TRUE)::UUID)', t);
  END LOOP;
END $$;

-- ─── Audit log immutability — extend to new PHI tables ───────────────────────
REVOKE DELETE, UPDATE ON write_off_requests FROM medcloud_app;
REVOKE DELETE ON patient_statements FROM medcloud_app;
REVOKE DELETE ON messages FROM medcloud_app;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_write_off_org ON write_off_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_write_off_claim ON write_off_requests(claim_id);
CREATE INDEX IF NOT EXISTS idx_write_off_status ON write_off_requests(status);

CREATE INDEX IF NOT EXISTS idx_statements_org ON patient_statements(org_id);
CREATE INDEX IF NOT EXISTS idx_statements_patient ON patient_statements(patient_id);
CREATE INDEX IF NOT EXISTS idx_statements_date ON patient_statements(statement_date);

CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON notifications(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(org_id, user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_entity ON messages(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_prior_auth_org ON prior_auth_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_prior_auth_patient ON prior_auth_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_prior_auth_status ON prior_auth_requests(status);

CREATE INDEX IF NOT EXISTS idx_credit_org ON credit_balances(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_status ON credit_balances(status);
CREATE INDEX IF NOT EXISTS idx_credit_claim ON credit_balances(claim_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_org ON client_onboarding(org_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_client ON client_onboarding(client_id);

CREATE INDEX IF NOT EXISTS idx_coding_qa_org ON coding_qa_audits(org_id);
CREATE INDEX IF NOT EXISTS idx_coding_qa_status ON coding_qa_audits(status);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_cpt ON fee_schedules(cpt_code);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_payer ON fee_schedules(payer_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_payer_config_availity ON payer_config(availity_payer_id);
CREATE INDEX IF NOT EXISTS idx_payer_config_region ON payer_config(region);

