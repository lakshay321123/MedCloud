-- ============================================================================
-- MEDCLOUD SPRINT 2 MIGRATION — 002-sprint2-tables.sql
-- Run: psql -h medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com \
--      -U medcloud_admin -d medcloud -f 002-sprint2-tables.sql
-- ============================================================================

BEGIN;

-- ── SOAP Notes ─────────────────────────────────────────────────────────────────
-- AI Scribe output → consumed by AI Coding
CREATE TABLE IF NOT EXISTS soap_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  client_id     UUID REFERENCES clients(id),
  encounter_id  UUID REFERENCES encounters(id),
  patient_id    UUID REFERENCES patients(id),
  provider_id   UUID REFERENCES providers(id),
  dos           DATE,
  subjective    TEXT,
  objective     TEXT,
  assessment    TEXT,
  plan          TEXT,
  transcript    TEXT,                          -- raw audio transcript
  audio_s3_key  TEXT,                          -- S3 key for recording
  signed_off    BOOLEAN DEFAULT FALSE,
  signed_off_at TIMESTAMPTZ,
  signed_off_by UUID REFERENCES users(id),
  ai_generated  BOOLEAN DEFAULT FALSE,        -- true if from AI Scribe
  confidence    DECIMAL(5,2),                  -- AI confidence score 0-100
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','signed','amended')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_soap_notes_encounter ON soap_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_patient ON soap_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_org_client ON soap_notes(org_id, client_id);

-- ── Scrub Results ──────────────────────────────────────────────────────────────
-- Persists claim scrubbing output for audit trail
CREATE TABLE IF NOT EXISTS scrub_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  claim_id      UUID NOT NULL REFERENCES claims(id),
  rule_id       UUID REFERENCES scrub_rules(id),
  rule_code     TEXT,
  rule_name     TEXT,
  severity      TEXT CHECK (severity IN ('error','warning','info')),
  passed        BOOLEAN NOT NULL,
  message       TEXT,
  auto_fixed    BOOLEAN DEFAULT FALSE,        -- rule engine auto-corrected
  scrubbed_at   TIMESTAMPTZ DEFAULT NOW(),
  scrubbed_by   UUID REFERENCES users(id),    -- NULL = system/auto
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scrub_results_claim ON scrub_results(claim_id);
CREATE INDEX IF NOT EXISTS idx_scrub_results_org ON scrub_results(org_id);

-- ── AR Call Log ────────────────────────────────────────────────────────────────
-- Every payer/patient follow-up call gets logged
CREATE TABLE IF NOT EXISTS ar_call_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  client_id     UUID REFERENCES clients(id),
  claim_id      UUID REFERENCES claims(id),
  denial_id     UUID REFERENCES denials(id),
  caller_id     UUID REFERENCES users(id),
  call_type     TEXT CHECK (call_type IN ('payer','patient','provider','other')),
  payer_id      UUID REFERENCES payers(id),
  phone_number  TEXT,
  call_date     TIMESTAMPTZ DEFAULT NOW(),
  duration_sec  INTEGER,
  outcome       TEXT CHECK (outcome IN (
    'claim_status_obtained','payment_promised','resubmit_required',
    'submit_appeal','no_answer','voicemail','on_hold_timeout',
    'transferred','escalated','resolved','other'
  )),
  reference_number TEXT,                      -- payer call ref #
  next_action   TEXT,
  next_follow_up DATE,
  notes         TEXT,
  recording_s3_key TEXT,                      -- Voice AI recording
  ai_generated  BOOLEAN DEFAULT FALSE,        -- Voice AI made the call
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_call_log_claim ON ar_call_log(claim_id);
CREATE INDEX IF NOT EXISTS idx_ar_call_log_org_client ON ar_call_log(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ar_call_log_date ON ar_call_log(call_date DESC);

-- ── EDI Transactions ───────────────────────────────────────────────────────────
-- Tracks every EDI file sent/received (837, 835, 270, 271, 277, 999)
CREATE TABLE IF NOT EXISTS edi_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  client_id       UUID REFERENCES clients(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    '837P','837I','835','270','271','276','277','999','DHA_ECLAIM'
  )),
  direction       TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  clearinghouse   TEXT DEFAULT 'availity',
  file_name       TEXT,
  s3_key          TEXT,
  claim_id        UUID REFERENCES claims(id),  -- for single-claim transactions
  claim_count     INTEGER DEFAULT 0,           -- for batch files
  status          TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','submitted','accepted','rejected','acknowledged','error'
  )),
  response_code   TEXT,                        -- 999/277 response
  response_detail TEXT,
  submitted_at    TIMESTAMPTZ,
  response_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edi_tx_org ON edi_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_edi_tx_claim ON edi_transactions(claim_id);
CREATE INDEX IF NOT EXISTS idx_edi_tx_type ON edi_transactions(transaction_type, direction);

-- ── AI Coding Suggestions ──────────────────────────────────────────────────────
-- Stores Bedrock AI suggestions per coding queue item
CREATE TABLE IF NOT EXISTS ai_coding_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  coding_queue_id UUID NOT NULL REFERENCES coding_queue(id),
  encounter_id    UUID REFERENCES encounters(id),
  soap_note_id    UUID REFERENCES soap_notes(id),
  suggested_cpt   JSONB,          -- [{code, description, confidence, modifier}]
  suggested_icd   JSONB,          -- [{code, description, confidence, is_primary}]
  suggested_em    TEXT,            -- E/M level suggestion
  em_confidence   DECIMAL(5,2),
  model_id        TEXT,            -- Bedrock model used
  prompt_version  TEXT,            -- prompt template version
  total_confidence DECIMAL(5,2),  -- overall confidence 0-100
  processing_ms   INTEGER,        -- latency
  accepted        BOOLEAN,         -- coder accepted AI suggestion?
  overrides       JSONB,           -- what coder changed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_coding_queue ON ai_coding_suggestions(coding_queue_id);

-- ── Documents — add missing columns ────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_key TEXT;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_bucket TEXT;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'manual'
    CHECK (upload_source IN ('manual','scan_submit','ai_scribe','voice_ai','textract','era_import'));
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS textract_job_id TEXT;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS textract_status TEXT DEFAULT 'none'
    CHECK (textract_status IN ('none','processing','completed','failed'));
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS textract_result JSONB;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification TEXT;  -- superbill, insurance_card, eob, clinical_note, etc
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Claims — add EDI tracking columns ──────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS edi_transaction_id UUID REFERENCES edi_transactions(id);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS clearinghouse TEXT DEFAULT 'availity';
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS payer_claim_number TEXT;    -- assigned by payer
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS last_status_check TIMESTAMPTZ;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Coding Queue — add AI fields ───────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE coding_queue ADD COLUMN IF NOT EXISTS soap_note_id UUID REFERENCES soap_notes(id);
  ALTER TABLE coding_queue ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id);
  ALTER TABLE coding_queue ADD COLUMN IF NOT EXISTS ai_suggestion_id UUID;
  ALTER TABLE coding_queue ADD COLUMN IF NOT EXISTS coding_method TEXT DEFAULT 'manual'
    CHECK (coding_method IN ('manual','ai_assisted','ai_auto'));
  ALTER TABLE coding_queue ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','scan_submit','ai_scribe','encounter'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Eligibility — add real 270/271 fields ──────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES edi_transactions(id);
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS member_id TEXT;
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS group_number TEXT;
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS plan_name TEXT;
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS effective_date DATE;
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS termination_date DATE;
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS coinsurance DECIMAL(5,2);
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS out_of_pocket_max DECIMAL(12,2);
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS deductible_met DECIMAL(12,2);
  ALTER TABLE eligibility_checks ADD COLUMN IF NOT EXISTS benefits_json JSONB;   -- full 271 response
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Payments — add ERA line detail fields ──────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS claim_line_id UUID REFERENCES claim_lines(id);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS cpt_code TEXT;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS billed_amount DECIMAL(12,2);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS allowed_amount DECIMAL(12,2);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(12,2);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS adj_reason_code TEXT;     -- CARC
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS adj_remark_code TEXT;     -- RARC
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_responsibility DECIMAL(12,2);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'pending'
    CHECK (action IN ('pending','posted','review','denied','appealed'));
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES users(id);
EXCEPTION WHEN others THEN NULL;
END $$;

COMMIT;

-- ── Verify ─────────────────────────────────────────────────────────────────────
SELECT 'Sprint 2 migration complete' AS status,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS total_tables;
