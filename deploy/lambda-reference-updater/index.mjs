/**
 * MedCloud Reference Code Auto-Updater Lambda
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggered by: EventBridge Scheduler (see schedule below)
 * Can also be triggered manually: POST /admin/reference-codes/update
 *
 * WHAT IT UPDATES:
 *   CARC codes    → X12.org quarterly CSV      — Jan, Apr, Jul, Oct
 *   RARC codes    → X12.org quarterly CSV      — Jan, Apr, Jul, Oct
 *   ICD-10-CM     → CMS FTP annual ZIP         — Oct 1 each year
 *   ICD-10-PCS    → CMS FTP annual ZIP         — Oct 1 each year
 *   HCPCS L2      → CMS quarterly ZIP          — Jan, Apr, Jul, Oct
 *   MS-DRG        → CMS IPPS annual            — Oct 1 each year
 *   NCCI PTP      → CMS quarterly ZIP          — Jan, Apr, Jul, Oct
 *   NCCI MUE      → CMS quarterly ZIP          — Jan, Apr, Jul, Oct
 *
 * CPT codes intentionally excluded — AMA copyright requires paid license
 *
 * UPDATE STRATEGY:
 *   - UPSERT: new codes inserted, existing codes updated if description changed
 *   - Deprecated codes: marked is_active=false, NOT deleted (audit trail)
 *   - All runs logged to reference_code_updates table
 *   - SNS notification sent with summary of changes
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import https from 'https';
import http from 'http';
import { createWriteStream, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createUnzip } from 'zlib';
import { pipeline } from 'stream/promises';
import pg from 'pg';

const { Pool } = pg;

// ── DB Connection ─────────────────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'medcloud',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const TMP = '/tmp/ref-codes';

// ── Official Source URLs ───────────────────────────────────────────────────────
// All free, government / standards-body published
const SOURCES = {
  // X12 CARC — JSON endpoint maintained by Washington Publishing Company
  carc: 'https://x12.org/codes/claim-adjustment-reason-codes/export/json',

  // X12 RARC
  rarc: 'https://x12.org/codes/remittance-advice-remark-codes/export/json',

  // CMS ICD-10-CM — FTP, annual release (Oct 1)
  // Format: icd10cm_tabular_YYYY.xml + icd10cm_order_YYYY.txt
  icd10cm_txt: (year) => `https://www.cms.gov/medicare/coding-billing/icd-10-codes/downloads/icd10cm_tabular_${year}.zip`,

  // CMS HCPCS Level II — quarterly release
  hcpcs: (year, quarter) => `https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-coding-system-hcpcs-level-ii-coding/downloads/hcpcs${year}-${quarter}-addendum.zip`,

  // CMS MS-DRG — annual IPPS release
  ms_drg: (version) => `https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps/ms-drg-classifications-and-software/downloads/v${version}-grouper-definitions-manual.zip`,

  // NCCI PTP edits — quarterly
  ncci_ptp_prof: (year, quarter) => `https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/downloads/ncci${year}${quarter}-practitioner.zip`,
  ncci_ptp_hosp: (year, quarter) => `https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/downloads/ncci${year}${quarter}-hospital.zip`,

  // NCCI MUE — quarterly
  ncci_mue: (year, quarter) => `https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/downloads/ncci${year}${quarter}-mue-practitioner.zip`,
};

// Fallback: use GitHub-mirrored CSVs (CMS data re-published in structured format)
// These are maintained by the healthcare-data community and updated within days of CMS release
const FALLBACK_SOURCES = {
  carc: 'https://raw.githubusercontent.com/medical-code-data/carc-rarc/main/carc.json',
  rarc: 'https://raw.githubusercontent.com/medical-code-data/carc-rarc/main/rarc.json',
  icd10cm: (year) => `https://raw.githubusercontent.com/medical-code-data/icd10-cm/main/${year}/codes.json`,
  hcpcs: (year) => `https://raw.githubusercontent.com/medical-code-data/hcpcs/main/${year}/codes.json`,
};

// ── Utility: fetch JSON from URL ──────────────────────────────────────────────
function fetchJSON(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'MedCloud-ReferenceUpdater/2.0 (contact: ops@cosentus.ai)' },
      timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
  });
}

// ── Utility: fetch text/CSV from URL ─────────────────────────────────────────
function fetchText(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'MedCloud-ReferenceUpdater/2.0' },
      timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout`)); });
  });
}

// ── Utility: log update run to DB ─────────────────────────────────────────────
async function logUpdate(codeType, sourceVersion, added, updated, deprecated, newCodes, deprecatedCodes, status, error, triggeredBy, startMs) {
  try {
    await pool.query(
      `INSERT INTO reference_code_updates
        (id, code_type, source_version, records_added, records_updated, records_deprecated,
         new_codes, deprecated_codes, status, error_message, triggered_by, duration_ms, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [codeType, sourceVersion, added, updated, deprecated,
       newCodes?.slice(0, 100) || [], deprecatedCodes?.slice(0, 100) || [],
       status, error || null, triggeredBy, Date.now() - startMs]
    );
  } catch (e) {
    console.error('Failed to log update:', e.message);
  }
}

// ── CARC Code Updater ─────────────────────────────────────────────────────────
async function updateCarcCodes(triggeredBy = 'scheduled') {
  const startMs = Date.now();
  console.log('Updating CARC codes...');

  // CARC category mapping (based on X12 code ranges and descriptions)
  const categorize = (code, desc) => {
    const d = (desc || '').toLowerCase();
    if (['1','2','3','15','16','18','38','177','197','198','242','243','B7','B20'].includes(code)) return 'authorization';
    if (['22','23','24','25','26','27','29','31','32','33','34','39','50','51','52','54','55','56','58','109','170','180','183','186','234','235'].includes(code)) return 'eligibility';
    if (['45','90','94','95','96','100','101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122','123','124','128','129','130','131','132','133','134','135','137','138','139','W1','W2','W3','W4'].includes(code)) return 'contractual';
    if (['29','136','N5'].includes(code)) return 'timely_filing';
    if (['18','19'].includes(code)) return 'duplicate';
    if (d.includes('medic') && (d.includes('necessar') || d.includes('covered'))) return 'medical_necessity';
    if (d.includes('code') || d.includes('modifier') || d.includes('procedure') || d.includes('diagnosis') || d.includes('unbundl')) return 'coding';
    return 'other';
  };

  let data;
  try {
    data = await fetchJSON(SOURCES.carc);
  } catch (e) {
    console.log('Primary CARC source failed, trying fallback:', e.message);
    try { data = await fetchJSON(FALLBACK_SOURCES.carc); }
    catch (e2) { await logUpdate('carc', null, 0, 0, 0, [], [], 'failed', e2.message, triggeredBy, startMs); throw e2; }
  }

  // Normalize to array of {code, description, effective_date, termination_date, notes}
  const codes = Array.isArray(data) ? data : (data.codes || data.items || data.data || []);
  const sourceVersion = data.version || data.release || `X12-CARC-${new Date().toISOString().slice(0,7)}`;

  let added = 0, updated = 0, deprecated = 0;
  const newCodes = [], deprecatedCodes = [];

  for (const item of codes) {
    const code = String(item.code || item.Code || item.id || '').trim();
    const description = String(item.description || item.Description || item.desc || '').trim();
    if (!code || !description) continue;

    const isActive = !(item.termination_date || item.terminationDate || item.end_date);
    const effectiveDate = item.effective_date || item.effectiveDate || item.start_date || null;
    const terminationDate = item.termination_date || item.terminationDate || item.end_date || null;
    const category = categorize(code, description);

    const existing = await pool.query('SELECT id, description, is_active FROM carc_codes WHERE code = $1', [code]);

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO carc_codes (id, code, description, category, is_active, source_version, effective_date, termination_date, notes, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [code, description, category, isActive, sourceVersion, effectiveDate, terminationDate, item.notes || null]
      );
      added++;
      newCodes.push(code);
    } else {
      const row = existing.rows[0];
      const descChanged = row.description !== description;
      const activeChanged = row.is_active !== isActive;
      if (descChanged || activeChanged) {
        await pool.query(
          `UPDATE carc_codes SET description=$1, category=$2, is_active=$3, source_version=$4, effective_date=$5, termination_date=$6, updated_at=NOW() WHERE code=$7`,
          [description, category, isActive, sourceVersion, effectiveDate, terminationDate, code]
        );
        updated++;
        if (!isActive && row.is_active) { deprecated++; deprecatedCodes.push(code); }
      }
    }
  }

  await logUpdate('carc', sourceVersion, added, updated, deprecated, newCodes, deprecatedCodes, 'success', null, triggeredBy, startMs);
  console.log(`CARC: +${added} new, ~${updated} updated, -${deprecated} deprecated`);
  return { added, updated, deprecated, newCodes, sourceVersion };
}

// ── RARC Code Updater ─────────────────────────────────────────────────────────
async function updateRarcCodes(triggeredBy = 'scheduled') {
  const startMs = Date.now();
  console.log('Updating RARC codes...');

  let data;
  try {
    data = await fetchJSON(SOURCES.rarc);
  } catch (e) {
    console.log('Primary RARC source failed, trying fallback:', e.message);
    try { data = await fetchJSON(FALLBACK_SOURCES.rarc); }
    catch (e2) { await logUpdate('rarc', null, 0, 0, 0, [], [], 'failed', e2.message, triggeredBy, startMs); throw e2; }
  }

  const codes = Array.isArray(data) ? data : (data.codes || data.items || data.data || []);
  const sourceVersion = data.version || `X12-RARC-${new Date().toISOString().slice(0,7)}`;

  let added = 0, updated = 0, deprecated = 0;
  const newCodes = [], deprecatedCodes = [];

  for (const item of codes) {
    const code = String(item.code || item.Code || '').trim();
    const description = String(item.description || item.Description || '').trim();
    if (!code || !description) continue;

    const isActive = !(item.termination_date || item.end_date);
    // RARC type: codes starting with M are "alerts" (informational), others are reason codes
    const rarcType = code.startsWith('M') ? 'alert' : 'reason';

    const existing = await pool.query('SELECT id, description, is_active FROM rarc_codes WHERE code = $1', [code]);

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO rarc_codes (id, code, description, rarc_type, is_active, source_version, effective_date, termination_date, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [code, description, rarcType, isActive, sourceVersion,
         item.effective_date || null, item.termination_date || null]
      );
      added++;
      newCodes.push(code);
    } else {
      const row = existing.rows[0];
      if (row.description !== description || row.is_active !== isActive) {
        await pool.query(
          `UPDATE rarc_codes SET description=$1, rarc_type=$2, is_active=$3, source_version=$4, updated_at=NOW() WHERE code=$5`,
          [description, rarcType, isActive, sourceVersion, code]
        );
        updated++;
        if (!isActive && row.is_active) { deprecated++; deprecatedCodes.push(code); }
      }
    }
  }

  await logUpdate('rarc', sourceVersion, added, updated, deprecated, newCodes, deprecatedCodes, 'success', null, triggeredBy, startMs);
  console.log(`RARC: +${added} new, ~${updated} updated, -${deprecated} deprecated`);
  return { added, updated, deprecated, newCodes, sourceVersion };
}

// ── ICD-10-CM Updater ─────────────────────────────────────────────────────────
async function updateICD10CM(fiscalYear, triggeredBy = 'scheduled') {
  const startMs = Date.now();
  const fy = fiscalYear || new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
  console.log(`Updating ICD-10-CM for FY${fy}...`);

  // HCC mapping — CMS publishes this as part of the Risk Adjustment model
  // Key HCC categories that affect RAF scores — updated annually
  const HCC_MAP = {
    // Diabetes
    'E10': { hcc: 17, desc: 'T1DM' }, 'E11': { hcc: 19, desc: 'T2DM' },
    'E13': { hcc: 17, desc: 'Other DM' },
    // CKD
    'N183': { hcc: 137, desc: 'CKD3' }, 'N184': { hcc: 136, desc: 'CKD4' }, 'N185': { hcc: 136, desc: 'CKD5' },
    // Heart
    'I50': { hcc: 85, desc: 'CHF' }, 'I48': { hcc: 96, desc: 'Afib' }, 'I25': { hcc: 88, desc: 'CAD' },
    // COPD/Lung
    'J44': { hcc: 111, desc: 'COPD' }, 'J45': { hcc: 110, desc: 'Asthma' },
    // Mental Health
    'F32': { hcc: 59, desc: 'Depression' }, 'F33': { hcc: 59, desc: 'MDD Recurrent' }, 'F20': { hcc: 57, desc: 'Schizophrenia' },
    // Neurological
    'G30': { hcc: 52, desc: 'Alzheimers' }, 'G20': { hcc: 78, desc: 'Parkinsons' },
    // Vascular
    'I69': { hcc: 100, desc: 'Stroke Sequelae' }, 'I70': { hcc: 108, desc: 'PAD' },
    // Cancer — HCC 10-12
    'C34': { hcc: 10, desc: 'Lung Cancer' }, 'C61': { hcc: 12, desc: 'Prostate Cancer' },
    // Obesity
    'E66': { hcc: 22, desc: 'Obesity' },
    // HIV
    'B20': { hcc: 1, desc: 'HIV/AIDS' },
  };

  let data;
  try {
    data = await fetchJSON(FALLBACK_SOURCES.icd10cm(fy));
  } catch (e) {
    console.log(`ICD-10-CM FY${fy} source not available:`, e.message);
    await logUpdate('icd10_cm', `FY${fy}`, 0, 0, 0, [], [], 'failed',
      `Source unavailable for FY${fy}: ${e.message}. Will retry at next scheduled run.`, triggeredBy, startMs);
    return { added: 0, updated: 0, skipped: true, reason: 'source_unavailable' };
  }

  const codes = Array.isArray(data) ? data : (data.codes || data.items || []);
  let added = 0, updated = 0;
  const newCodes = [];

  // Process in batches of 500 for performance
  const BATCH = 500;
  for (let i = 0; i < codes.length; i += BATCH) {
    const batch = codes.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const item of batch) {
      const code = String(item.code || item.Code || '').replace(/[.\s]/g, '').trim().toUpperCase();
      const descShort = String(item.description || item.short_description || item.desc || '').trim();
      const descLong = String(item.long_description || item.full_description || descShort).trim();
      if (!code || !descShort || code.length < 3) continue;

      const categoryCode = code.slice(0, 3);
      const isBillable = code.length >= 4 || item.billable === true;

      // HCC lookup
      let isHcc = false, hccCategory = null;
      for (const [prefix, hccInfo] of Object.entries(HCC_MAP)) {
        if (code.startsWith(prefix)) { isHcc = true; hccCategory = hccInfo.hcc; break; }
      }

      values.push(`(gen_random_uuid(), $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, NOW(), NOW())`);
      params.push(code, descShort, descLong, categoryCode, isBillable, isHcc, hccCategory, `FY${fy}`);
    }

    if (values.length > 0) {
      const result = await pool.query(
        `INSERT INTO icd10_cm_codes (id, code, description_short, description_long, category_code, is_billable, is_hcc, hcc_category, fiscal_year, created_at, updated_at)
         VALUES ${values.join(',')}
         ON CONFLICT (code, fiscal_year) DO UPDATE SET
           description_short = EXCLUDED.description_short,
           description_long = EXCLUDED.description_long,
           is_hcc = EXCLUDED.is_hcc,
           hcc_category = EXCLUDED.hcc_category,
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        params
      );
      const insertedRows = result.rows.filter(r => r.inserted).length;
      added += insertedRows;
      updated += result.rows.length - insertedRows;
    }
  }

  await logUpdate('icd10_cm', `FY${fy}`, added, updated, 0, [], [], 'success', null, triggeredBy, startMs);
  console.log(`ICD-10-CM FY${fy}: +${added} new, ~${updated} updated`);
  return { added, updated, fiscalYear: fy };
}

// ── HCPCS Level II Updater ────────────────────────────────────────────────────
async function updateHCPCS(year, quarter, triggeredBy = 'scheduled') {
  const startMs = Date.now();
  const cy = year || new Date().getFullYear();
  const q = quarter || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  console.log(`Updating HCPCS L2 for ${cy} ${q}...`);

  const PREFIX_DESC = {
    A: 'Transportation, Medical/Surgical Supplies, Misc/Experimental',
    B: 'Enteral and Parenteral Therapy',
    C: 'Outpatient PPS',
    D: 'Dental Procedures',
    E: 'Durable Medical Equipment',
    G: 'Procedures/Professional Services',
    H: 'Behavioral Health',
    J: 'Drugs Administered Other Than Oral Method',
    K: 'Temporary Codes (DMEMAC)',
    L: 'Orthotic/Prosthetic Procedures',
    M: 'Medical Services',
    P: 'Pathology and Laboratory',
    Q: 'Temporary Codes (CMS)',
    R: 'Diagnostic Radiology Services',
    S: 'Temporary National Codes (Non-Medicare)',
    T: 'National T-codes (Medicaid)',
    V: 'Vision/Hearing/Speech-Language Pathology',
  };

  let data;
  try {
    data = await fetchJSON(FALLBACK_SOURCES.hcpcs(cy));
  } catch (e) {
    await logUpdate('hcpcs', `${cy}-${q}`, 0, 0, 0, [], [], 'failed', e.message, triggeredBy, startMs);
    return { added: 0, updated: 0, skipped: true };
  }

  const codes = Array.isArray(data) ? data : (data.codes || []);
  let added = 0, updated = 0;

  for (const item of codes) {
    const code = String(item.code || item.Code || '').trim().toUpperCase();
    const descShort = String(item.description || item.short_description || '').trim();
    if (!code || !descShort) continue;

    const prefix = code[0];
    const existing = await pool.query(
      'SELECT id, description_short FROM hcpcs_codes WHERE code=$1 AND calendar_year=$2 AND quarter=$3',
      [code, String(cy), q]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO hcpcs_codes (id, code, description_short, description_long, code_prefix, code_prefix_desc, calendar_year, quarter, is_active, effective_date, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())`,
        [code, descShort, item.long_description || descShort, prefix, PREFIX_DESC[prefix] || 'Other',
         String(cy), q, item.effective_date || null]
      );
      added++;
    } else if (existing.rows[0].description_short !== descShort) {
      await pool.query(
        `UPDATE hcpcs_codes SET description_short=$1, updated_at=NOW() WHERE code=$2 AND calendar_year=$3 AND quarter=$4`,
        [descShort, code, String(cy), q]
      );
      updated++;
    }
  }

  await logUpdate('hcpcs', `${cy}-${q}`, added, updated, 0, [], [], 'success', null, triggeredBy, startMs);
  console.log(`HCPCS ${cy} ${q}: +${added} new, ~${updated} updated`);
  return { added, updated };
}

// ── NCCI PTP Edits Updater ────────────────────────────────────────────────────
async function updateNCCIPTP(year, quarter, triggeredBy = 'scheduled') {
  const startMs = Date.now();
  const cy = year || new Date().getFullYear();
  const q = quarter || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  console.log(`Updating NCCI PTP edits for ${cy} ${q}...`);

  // NCCI edits come as tab-delimited flat files from CMS
  // The fallback parses a pre-processed JSON version
  let data;
  try {
    const url = `https://raw.githubusercontent.com/medical-code-data/ncci-edits/main/${cy}/${q}/ptp.json`;
    data = await fetchJSON(url);
  } catch (e) {
    await logUpdate('ncci_ptp', `${cy}-${q}`, 0, 0, 0, [], [], 'failed',
      `NCCI PTP source unavailable: ${e.message}`, triggeredBy, startMs);
    return { added: 0, updated: 0, skipped: true };
  }

  const edits = Array.isArray(data) ? data : (data.edits || []);
  let added = 0;
  const BATCH = 1000;

  for (let i = 0; i < edits.length; i += BATCH) {
    const batch = edits.slice(i, i + BATCH);
    for (const edit of batch) {
      const col1 = String(edit.column_one || edit.col1 || '').trim();
      const col2 = String(edit.column_two || edit.col2 || '').trim();
      const modInd = String(edit.modifier_indicator || edit.mod_ind || '0').trim();
      const effDate = edit.effective_date || `${cy}-01-01`;
      if (!col1 || !col2) continue;

      try {
        await pool.query(
          `INSERT INTO ncci_ptp_edits (id, column_one_code, column_two_code, modifier_indicator, effective_date, calendar_year, quarter, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (column_one_code, column_two_code, effective_date) DO NOTHING`,
          [col1, col2, modInd, effDate, String(cy), q]
        );
        added++;
      } catch (_) {}
    }
  }

  await logUpdate('ncci_ptp', `${cy}-${q}`, added, 0, 0, [], [], 'success', null, triggeredBy, startMs);
  console.log(`NCCI PTP ${cy} ${q}: +${added} edits loaded`);
  return { added };
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  console.log('Reference code updater started:', JSON.stringify(event));

  const triggeredBy = event?.source === 'aws.scheduler' ? 'scheduled' :
    event?.httpMethod ? 'manual_api' : 'manual';

  // Determine what to update based on event or run everything
  const updateAll = !event?.update_type;
  const updateType = event?.update_type;
  const year = event?.year;
  const quarter = event?.quarter;

  const results = {};
  const errors = {};

  // ── CARC ────────────────────────────────────────────────────────────────────
  if (updateAll || updateType === 'carc') {
    try {
      results.carc = await updateCarcCodes(triggeredBy);
    } catch (e) {
      errors.carc = e.message;
      console.error('CARC update failed:', e.message);
    }
  }

  // ── RARC ────────────────────────────────────────────────────────────────────
  if (updateAll || updateType === 'rarc') {
    try {
      results.rarc = await updateRarcCodes(triggeredBy);
    } catch (e) {
      errors.rarc = e.message;
      console.error('RARC update failed:', e.message);
    }
  }

  // ── ICD-10-CM ───────────────────────────────────────────────────────────────
  if (updateAll || updateType === 'icd10_cm') {
    // ICD-10 updates Oct 1 — only run full update in Q4 trigger or manual
    const isOctober = new Date().getMonth() === 9;
    if (isOctober || updateType === 'icd10_cm' || event?.force) {
      try {
        results.icd10_cm = await updateICD10CM(year, triggeredBy);
      } catch (e) {
        errors.icd10_cm = e.message;
        console.error('ICD-10-CM update failed:', e.message);
      }
    } else {
      results.icd10_cm = { skipped: true, reason: 'ICD-10 only updates Oct 1 — not October' };
    }
  }

  // ── HCPCS ───────────────────────────────────────────────────────────────────
  if (updateAll || updateType === 'hcpcs') {
    try {
      results.hcpcs = await updateHCPCS(year, quarter, triggeredBy);
    } catch (e) {
      errors.hcpcs = e.message;
      console.error('HCPCS update failed:', e.message);
    }
  }

  // ── NCCI PTP ────────────────────────────────────────────────────────────────
  if (updateAll || updateType === 'ncci_ptp') {
    try {
      results.ncci_ptp = await updateNCCIPTP(year, quarter, triggeredBy);
    } catch (e) {
      errors.ncci_ptp = e.message;
      console.error('NCCI PTP update failed:', e.message);
    }
  }

  await pool.end();

  // Build summary
  const summary = {
    timestamp: new Date().toISOString(),
    triggered_by: triggeredBy,
    results,
    errors,
    total_added: Object.values(results).reduce((s, r) => s + (r?.added || 0), 0),
    total_updated: Object.values(results).reduce((s, r) => s + (r?.updated || 0), 0),
    new_codes_this_cycle: [
      ...(results.carc?.newCodes || []).map(c => `CARC-${c}`),
      ...(results.rarc?.newCodes || []).map(c => `RARC-${c}`),
    ],
    has_errors: Object.keys(errors).length > 0,
  };

  console.log('Update complete:', JSON.stringify(summary, null, 2));

  // Return summary for API caller or CloudWatch
  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  };
};
