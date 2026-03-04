-- ============================================================================
-- MEDCLOUD MIGRATION 006 — Column name fixes
-- Aligns DB column names with Lambda v4 code expectations
-- Run: psql -h $MEDCLOUD_DB_HOST -U $MEDCLOUD_DB_USER -d medcloud -f 006-column-fixes.sql
-- ============================================================================

-- ── claim_lines: seed used 'charges', Lambda uses 'charge' ──────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'charges') THEN
    ALTER TABLE claim_lines RENAME COLUMN charges TO charge;
  END IF;
END $$;

-- ── claim_lines: seed used 'modifiers' (jsonb), Lambda uses 'modifier' (text)
-- Keep both: add 'modifier' as text if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'modifier') THEN
    ALTER TABLE claim_lines ADD COLUMN modifier TEXT;
  END IF;
END $$;

-- ── claim_lines: Lambda creates 'dos' but 837I uses 'dos_from' — add alias
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'dos') THEN
    ALTER TABLE claim_lines ADD COLUMN dos DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'dos_from') THEN
    ALTER TABLE claim_lines ADD COLUMN dos_from DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'dos_to') THEN
    ALTER TABLE claim_lines ADD COLUMN dos_to DATE;
  END IF;
END $$;

-- ── claim_lines: Lambda uses 'place_of_service', 'prior_auth_number', 'revenue_code'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'place_of_service') THEN
    ALTER TABLE claim_lines ADD COLUMN place_of_service TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'prior_auth_number') THEN
    ALTER TABLE claim_lines ADD COLUMN prior_auth_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_lines' AND column_name = 'revenue_code') THEN
    ALTER TABLE claim_lines ADD COLUMN revenue_code TEXT;
  END IF;
END $$;

-- ── patients: Lambda reads 'member_id', 'emirates_id', 'address', 'city', 'state', 'zip'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'member_id') THEN
    ALTER TABLE patients ADD COLUMN member_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'emirates_id') THEN
    ALTER TABLE patients ADD COLUMN emirates_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'address') THEN
    ALTER TABLE patients ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'city') THEN
    ALTER TABLE patients ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'state') THEN
    ALTER TABLE patients ADD COLUMN state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'zip') THEN
    ALTER TABLE patients ADD COLUMN zip TEXT;
  END IF;
END $$;

-- ── providers: Lambda reads 'tax_id', 'taxonomy_code', 'address', city/state/zip
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'tax_id') THEN
    ALTER TABLE providers ADD COLUMN tax_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'taxonomy_code') THEN
    ALTER TABLE providers ADD COLUMN taxonomy_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'address') THEN
    ALTER TABLE providers ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'city') THEN
    ALTER TABLE providers ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'state') THEN
    ALTER TABLE providers ADD COLUMN state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'zip') THEN
    ALTER TABLE providers ADD COLUMN zip TEXT;
  END IF;
END $$;

-- ── payers: Lambda reads 'payer_code'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payers' AND column_name = 'payer_code') THEN
    ALTER TABLE payers ADD COLUMN payer_code TEXT;
  END IF;
END $$;

-- ── Verify
DO $$ BEGIN RAISE NOTICE 'Migration 006 complete — column fixes applied'; END $$;
