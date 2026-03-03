-- Sprint 2 v3 Migration: AR Call Logs + Document/SOAP fixes
-- Run against: medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com

-- ═══════════════════════════════════════════════════════════════
-- 1. AR Call Logs table (new)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ar_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  claim_id UUID REFERENCES claims(id),
  denial_id UUID REFERENCES denials(id),
  client_id UUID REFERENCES clients(id),
  payer_id UUID REFERENCES payers(id),
  call_type TEXT DEFAULT 'outbound' CHECK (call_type IN ('outbound','inbound','transfer')),
  duration_seconds INT DEFAULT 0,
  outcome TEXT DEFAULT 'no_answer' CHECK (outcome IN (
    'no_answer','voicemail','got_status','transferred','promise_to_pay',
    'denied','escalated','resolved','callback_scheduled'
  )),
  notes TEXT DEFAULT '',
  reference_number TEXT,
  called_by UUID REFERENCES users(id),
  called_at TIMESTAMPTZ DEFAULT NOW(),
  follow_up_date DATE,
  follow_up_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_call_logs_claim ON ar_call_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_ar_call_logs_followup ON ar_call_logs(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_call_logs_org ON ar_call_logs(org_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. Documents table — ensure all columns exist
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_upload';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_data JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'application/pdf';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES encounters(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. SOAP Notes table — ensure all columns exist
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS signed_off BOOLEAN DEFAULT false;
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMPTZ;
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

CREATE INDEX IF NOT EXISTS idx_soap_notes_encounter ON soap_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_patient ON soap_notes(patient_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. Appeals table — ensure denial_id + supporting_docs columns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS appeal_letter TEXT DEFAULT '';
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS supporting_docs JSONB;
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);

-- ═══════════════════════════════════════════════════════════════
-- 5. Denials — ensure source columns for Payment Posting link
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE denials ADD COLUMN IF NOT EXISTS source_era_id UUID REFERENCES era_files(id);
ALTER TABLE denials ADD COLUMN IF NOT EXISTS source_line_item TEXT;
ALTER TABLE denials ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_denials_client ON denials(client_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. Payments — ensure posted tracking columns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- ═══════════════════════════════════════════════════════════════
-- 7. Coding queue — ensure client_id for region filtering
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE coding_queue ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_coding_queue_client ON coding_queue(client_id);

-- Done. All new tables + columns for Sprint 2 v3 endpoints.
