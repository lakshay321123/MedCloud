-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Reference Code Tables + Auto-Update Infrastructure
-- CARC, RARC, ICD-10-CM, ICD-10-PCS, HCPCS L2, MS-DRG, NCCI Edits
-- All codes sourced from CMS / X12 official releases (free, no license required)
-- CPT codes intentionally excluded — AMA copyright requires paid license
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── CARC Codes (Claim Adjustment Reason Codes) ───────────────────────────────
-- Source: X12.org — updated quarterly (Jan, Apr, Jul, Oct)
-- Used by: denials, auto-appeals, denial categorization engine
CREATE TABLE IF NOT EXISTS carc_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL,
  category            TEXT,                    -- authorization, eligibility, coding, timely_filing, medical_necessity, contractual, duplicate, other
  is_active           BOOLEAN DEFAULT TRUE,
  notes               TEXT,                    -- implementation notes from X12
  source_version      TEXT,                    -- e.g., "X12 24.0 Q1-2025"
  effective_date      DATE,
  termination_date    DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carc_code ON carc_codes(code);
CREATE INDEX IF NOT EXISTS idx_carc_category ON carc_codes(category);
CREATE INDEX IF NOT EXISTS idx_carc_active ON carc_codes(is_active);

-- ── RARC Codes (Remittance Advice Remark Codes) ──────────────────────────────
-- Source: X12.org — updated quarterly
-- Used by: auto-appeals (provide context beyond CARC), posting module
CREATE TABLE IF NOT EXISTS rarc_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL,
  rarc_type           TEXT,                    -- 'alert' (informational) or 'reason' (used standalone)
  is_active           BOOLEAN DEFAULT TRUE,
  source_version      TEXT,
  effective_date      DATE,
  termination_date    DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rarc_code ON rarc_codes(code);
CREATE INDEX IF NOT EXISTS idx_rarc_type ON rarc_codes(rarc_type);

-- ── ICD-10-CM Diagnosis Codes ─────────────────────────────────────────────────
-- Source: CMS FTP — released annually Oct 1 (fiscal year)
-- Used by: auto-coding, charge capture, AI scribe, claim scrubbing
CREATE TABLE IF NOT EXISTS icd10_cm_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL,
  description_short   TEXT NOT NULL,
  description_long    TEXT,
  category_code       TEXT,                    -- first 3 chars (e.g., E11)
  category_desc       TEXT,                    -- e.g., "Type 2 diabetes mellitus"
  is_billable         BOOLEAN DEFAULT TRUE,    -- false = header code, cannot bill
  is_hcc              BOOLEAN DEFAULT FALSE,   -- maps to HCC for RAF scoring
  hcc_category        INTEGER,                 -- HCC number (e.g., 19 for diabetes)
  gender_specific     TEXT,                    -- 'M', 'F', or NULL
  age_range_min       INTEGER,
  age_range_max       INTEGER,
  requires_7th_char   BOOLEAN DEFAULT FALSE,
  valid_7th_chars     TEXT[],
  fiscal_year         TEXT NOT NULL,           -- e.g., "FY2025"
  is_active           BOOLEAN DEFAULT TRUE,
  effective_date      DATE,
  termination_date    DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, fiscal_year)
);
CREATE INDEX IF NOT EXISTS idx_icd10_code ON icd10_cm_codes(code);
CREATE INDEX IF NOT EXISTS idx_icd10_category ON icd10_cm_codes(category_code);
CREATE INDEX IF NOT EXISTS idx_icd10_hcc ON icd10_cm_codes(is_hcc, hcc_category);
CREATE INDEX IF NOT EXISTS idx_icd10_active ON icd10_cm_codes(is_active, is_billable);
CREATE INDEX IF NOT EXISTS idx_icd10_desc_search ON icd10_cm_codes USING gin(to_tsvector('english', description_short || ' ' || COALESCE(description_long, '')));

-- ── ICD-10-PCS Procedure Codes (inpatient) ───────────────────────────────────
-- Source: CMS FTP — released annually Oct 1
CREATE TABLE IF NOT EXISTS icd10_pcs_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL,
  description         TEXT NOT NULL,
  section             TEXT,                    -- first char section (0=Medical, 1=Obstetrics, etc.)
  fiscal_year         TEXT NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  effective_date      DATE,
  termination_date    DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, fiscal_year)
);
CREATE INDEX IF NOT EXISTS idx_icd10pcs_code ON icd10_pcs_codes(code);
CREATE INDEX IF NOT EXISTS idx_icd10pcs_section ON icd10_pcs_codes(section);

-- ── HCPCS Level II Codes ──────────────────────────────────────────────────────
-- Source: CMS — updated quarterly (some codes) and annually
-- Used by: coding module, claim scrubbing, charge capture
-- Includes: DME, drugs (J-codes), ambulance (A-codes), orthotics, etc.
CREATE TABLE IF NOT EXISTS hcpcs_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL,
  description_short   TEXT NOT NULL,
  description_long    TEXT,
  code_prefix         TEXT,                    -- A, B, C, D, E, G, H, J, K, L, M, P, Q, R, S, T, V
  code_prefix_desc    TEXT,                    -- e.g., "J = Drugs administered other than oral method"
  coverage            TEXT,                    -- 'Medicare', 'Medicaid', 'Both', 'Private'
  multiple_pricing    TEXT,                    -- pricing indicator
  add_on_code         BOOLEAN DEFAULT FALSE,
  bilateral           TEXT,
  cov_code            TEXT,                    -- coverage code
  quarter             TEXT,                    -- Q1/Q2/Q3/Q4
  calendar_year       TEXT NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  effective_date      DATE,
  termination_date    DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, calendar_year, quarter)
);
CREATE INDEX IF NOT EXISTS idx_hcpcs_code ON hcpcs_codes(code);
CREATE INDEX IF NOT EXISTS idx_hcpcs_prefix ON hcpcs_codes(code_prefix);
CREATE INDEX IF NOT EXISTS idx_hcpcs_desc_search ON hcpcs_codes USING gin(to_tsvector('english', description_short));

-- ── MS-DRG Codes (Medicare Severity Diagnosis Related Groups) ─────────────────
-- Source: CMS IPPS Final Rule — released annually Oct 1
-- Used by: inpatient billing, contract manager (per-diem vs DRG contracts)
CREATE TABLE IF NOT EXISTS ms_drg_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drg_code            TEXT NOT NULL,
  description         TEXT NOT NULL,
  mdc                 TEXT,                    -- Major Diagnostic Category (0-25)
  mdc_description     TEXT,
  type                TEXT,                    -- 'MED' (medical) or 'SURG' (surgical)
  has_mcc             BOOLEAN DEFAULT FALSE,   -- has MCC (Major Complication/Comorbidity) variant
  has_cc              BOOLEAN DEFAULT FALSE,   -- has CC (Complication/Comorbidity) variant
  geometric_mean_los  DECIMAL(6,2),            -- geometric mean length of stay
  arithmetic_mean_los DECIMAL(6,2),
  relative_weight     DECIMAL(8,4),            -- RW for payment calculation
  fiscal_year         TEXT NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drg_code, fiscal_year)
);
CREATE INDEX IF NOT EXISTS idx_drg_code ON ms_drg_codes(drg_code);
CREATE INDEX IF NOT EXISTS idx_drg_mdc ON ms_drg_codes(mdc);

-- ── NCCI Procedure-to-Procedure (PTP) Edits ───────────────────────────────────
-- Source: CMS — updated quarterly
-- Used by: claim scrubbing (50-rule engine), auto-coding modifier guidance
CREATE TABLE IF NOT EXISTS ncci_ptp_edits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_one_code     TEXT NOT NULL,           -- comprehensive (primary) code
  column_two_code     TEXT NOT NULL,           -- component (bundled) code
  modifier_indicator  TEXT NOT NULL,           -- '0'=modifier not allowed, '1'=modifier allowed, '9'=not applicable
  effective_date      DATE NOT NULL,
  deletion_date       DATE,
  edit_type           TEXT DEFAULT 'ptp',      -- 'ptp' or 'mue'
  quarter             TEXT,
  calendar_year       TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(column_one_code, column_two_code, effective_date)
);
CREATE INDEX IF NOT EXISTS idx_ncci_col1 ON ncci_ptp_edits(column_one_code);
CREATE INDEX IF NOT EXISTS idx_ncci_col2 ON ncci_ptp_edits(column_two_code);
CREATE INDEX IF NOT EXISTS idx_ncci_pair ON ncci_ptp_edits(column_one_code, column_two_code);
CREATE INDEX IF NOT EXISTS idx_ncci_active ON ncci_ptp_edits(deletion_date) WHERE deletion_date IS NULL;

-- ── NCCI MUE (Medically Unlikely Edits) ──────────────────────────────────────
-- Source: CMS — updated quarterly
-- Used by: claim scrubbing (catches impossible unit counts)
CREATE TABLE IF NOT EXISTS ncci_mue_edits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcpcs_code          TEXT NOT NULL,
  mue_value           INTEGER NOT NULL,        -- max units allowed per day per claim
  mue_adjudication    TEXT,                    -- '1'=claim line, '2'=date of service, '3'=per beneficiary per day
  rationale           TEXT,                    -- 'Anatomic', 'CMS Policy', 'Clinical', 'PyxisCode'
  quarter             TEXT,
  calendar_year       TEXT NOT NULL,
  effective_date      DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hcpcs_code, calendar_year, quarter)
);
CREATE INDEX IF NOT EXISTS idx_mue_code ON ncci_mue_edits(hcpcs_code);

-- ── Reference Code Update Log ─────────────────────────────────────────────────
-- Tracks every auto-update run: source, records added/updated/deprecated
CREATE TABLE IF NOT EXISTS reference_code_updates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_type           TEXT NOT NULL,           -- 'carc', 'rarc', 'icd10_cm', 'icd10_pcs', 'hcpcs', 'ms_drg', 'ncci_ptp', 'ncci_mue'
  source_url          TEXT,
  source_version      TEXT,                    -- e.g., "FY2025", "X12 Q2-2025", "CY2025 Q2"
  records_added       INTEGER DEFAULT 0,
  records_updated     INTEGER DEFAULT 0,
  records_deprecated  INTEGER DEFAULT 0,
  new_codes           TEXT[],                  -- codes that are brand new this cycle
  deprecated_codes    TEXT[],                  -- codes removed this cycle
  status              TEXT DEFAULT 'success',  -- 'success', 'partial', 'failed'
  error_message       TEXT,
  triggered_by        TEXT DEFAULT 'scheduled', -- 'scheduled', 'manual', 'startup'
  duration_ms         INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refupdate_type ON reference_code_updates(code_type, created_at DESC);

-- ── Update this table if carc_codes already existed with different schema ─────
-- Safe: adds columns only if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carc_codes' AND column_name='category') THEN
    ALTER TABLE carc_codes ADD COLUMN category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carc_codes' AND column_name='source_version') THEN
    ALTER TABLE carc_codes ADD COLUMN source_version TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carc_codes' AND column_name='effective_date') THEN
    ALTER TABLE carc_codes ADD COLUMN effective_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carc_codes' AND column_name='is_active') THEN
    ALTER TABLE carc_codes ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rarc_codes' AND column_name='rarc_type') THEN
    ALTER TABLE rarc_codes ADD COLUMN rarc_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rarc_codes' AND column_name='source_version') THEN
    ALTER TABLE rarc_codes ADD COLUMN source_version TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rarc_codes' AND column_name='is_active') THEN
    ALTER TABLE rarc_codes ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 008 complete — Reference code tables created';
  RAISE NOTICE '   Tables: carc_codes, rarc_codes, icd10_cm_codes, icd10_pcs_codes, hcpcs_codes, ms_drg_codes, ncci_ptp_edits, ncci_mue_edits, reference_code_updates';
  RAISE NOTICE '   Next step: Deploy reference-updater Lambda + EventBridge schedule';
END $$;

COMMIT;
