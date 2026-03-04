-- ============================================================================
-- MEDCLOUD SPRINT 3 MIGRATION — 004-sprint3-tables.sql
-- New tables: appeals, write_off_requests, notifications
-- Columns: denials (category, appeal_level), documents (extract-rates)
--
-- Run: psql -h medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com \
--      -U medcloud_admin -d medcloud -f 004-sprint3-tables.sql
-- ============================================================================

BEGIN;

-- ── Appeals ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appeals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id),
  client_id           UUID REFERENCES clients(id),
  denial_id           UUID NOT NULL REFERENCES denials(id),
  claim_id            UUID REFERENCES claims(id),
  appeal_level        INTEGER NOT NULL DEFAULT 1 CHECK (appeal_level BETWEEN 1 AND 3),
  appeal_type         TEXT,                       -- 'Internal Review (L1)', 'External Review (L2)', etc.
  appeal_letter       TEXT,                       -- full generated letter
  strategy            TEXT,                       -- AI strategy description
  supporting_evidence JSONB DEFAULT '[]',
  regulatory_citations JSONB DEFAULT '[]',
  success_probability DECIMAL(5,2),
  status              TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','ready','submitted','acknowledged','in_review',
    'overturned','partially_overturned','upheld','withdrawn'
  )),
  submitted_at        TIMESTAMPTZ,
  submitted_via       TEXT CHECK (submitted_via IN ('mail','fax','portal','edi','phone')),
  response_date       TIMESTAMPTZ,
  response_notes      TEXT,
  payer_reference     TEXT,                       -- payer appeal reference number
  deadline            DATE,                       -- appeal filing deadline
  generated_by        UUID REFERENCES users(id),
  generated_at        TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appeals_org ON appeals(org_id);
CREATE INDEX IF NOT EXISTS idx_appeals_denial ON appeals(denial_id);
CREATE INDEX IF NOT EXISTS idx_appeals_claim ON appeals(claim_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);

-- ── Write-Off Requests (Tiered Approval) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS write_off_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id),
  claim_id          UUID NOT NULL REFERENCES claims(id),
  amount            DECIMAL(12,2) NOT NULL,
  reason            TEXT,
  category          TEXT DEFAULT 'bad_debt' CHECK (category IN (
    'bad_debt','timely_filing','small_balance','charity','contractual',
    'medical_necessity','duplicate','other'
  )),
  approval_required TEXT DEFAULT 'none' CHECK (approval_required IN (
    'none','team_lead','manager','director','vp_finance'
  )),
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  requested_by      UUID REFERENCES users(id),
  approved_by       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  approval_notes    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_writeoff_org ON write_off_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_claim ON write_off_requests(claim_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_status ON write_off_requests(status);

-- ── Notifications ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  message       TEXT,
  type          TEXT DEFAULT 'info' CHECK (type IN (
    'info','success','warning','error','task','denial','payment','appeal','auth','system'
  )),
  priority      TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  entity_type   TEXT,                             -- 'claim','denial','task','appeal', etc.
  entity_id     UUID,                             -- ID of the referenced entity
  action_url    TEXT,                             -- deep link to relevant page
  read          BOOLEAN DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_org ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- ── Denials — add category + appeal tracking ───────────────────────────────────
DO $$ BEGIN
  ALTER TABLE denials ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
    'authorization','eligibility','coding','timely_filing','duplicate',
    'medical_necessity','contractual','other'
  ));
  ALTER TABLE denials ADD COLUMN IF NOT EXISTS appeal_level INTEGER DEFAULT 0;
  ALTER TABLE denials ADD COLUMN IF NOT EXISTS appeal_deadline DATE;
  ALTER TABLE denials ADD COLUMN IF NOT EXISTS first_denial_date DATE;
  ALTER TABLE denials ADD COLUMN IF NOT EXISTS payer_claim_number TEXT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_denials_category ON denials(category);

-- ── Claims — add write_off tracking ────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS write_off_amount DECIMAL(12,2);
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS write_off_date TIMESTAMPTZ;
  ALTER TABLE claims ADD COLUMN IF NOT EXISTS write_off_reason TEXT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

SELECT 'Sprint 3 migration complete' AS status,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS total_tables;
