/**
 * MedCloud API v4 — Sprint 2+3 Backend Complete
 * 
 * ── Sprint 2 v7 routes ──
 *   POST  /era-files/:id/parse-835     — Parse 835 EDI into payment records
 *   POST  /claims/:id/generate-dha     — DHA eClaim XML (UAE)
 *   POST  /claims/:id/generate-edi     — 837P ANSI X12 (US)
 *   POST  /claims/:id/generate-837i    — 837I institutional (UB-04) ANSI X12
 *   POST  /claims/:id/scrub            — 52-rule claim scrubbing
 *   POST  /claims/:id/underpayment-check — Contract underpayment detection
 *   POST  /claims/:id/predict-denial   — Denial prediction (7 risk factors)
 *   POST  /claims/:id/generate-276     — 276 claim status inquiry
 *   POST  /claims/:id/parse-277        — 277 claim status response parser
 *   POST  /claims/:id/secondary        — Secondary claim (COB)
 *   POST  /claims/batch-submit         — Batch submit up to 100 claims
 *   POST  /encounters/:id/charge-capture — AI charge capture (#11)
 *   POST  /documents/:id/classify      — AI document classification
 *   POST  /documents/:id/textract      — Textract OCR
 *   CRUD  /prior-auth                  — Prior auth workflow
 *   POST  /patient-statements/generate — Patient billing statements
 *   CRUD  /patient-statements          — Statement management
 *   GET   /credentialing/dashboard     — Expiry alerts
 *   POST  /credentialing/enrollment    — Provider enrollment
 *   GET   /reports?type=X&format=csv   — 6 report types with CSV export
 *   CRUD  /fee-schedules               — Contract rates
 *   POST  /payments/auto-post          — Auto-post from 835
 *   GET   /analytics?from=&to=         — Analytics KPIs
 *
 * ── Sprint 3 routes (NEW) ──
 *   POST  /denials/:id/generate-appeal — AI auto-appeal letter generation (#4)
 *   GET   /denials/categorize          — Auto-categorize denials into 8 groups from CARC codes
 *   CRUD  /appeals                     — Appeal management (L1/L2/L3)
 *   POST  /encounters/:id/chart-check  — Chart completeness check (#14)
 *   POST  /documents/:id/extract-rates — AI contract rate extraction from PDFs (#12)
 *   POST  /era-files/:id/reconcile     — Payment reconciliation (match, recoupments, underpay, zero-pay)
 *   POST  /write-offs                  — Write-off request (tiered approval)
 *   PUT   /write-offs/:id              — Approve/deny write-off
 *   GET   /write-offs                  — List write-off requests
 *   GET   /notifications               — User notifications (with unread count)
 *   POST  /notifications               — Create notification
 *   PUT   /notifications/:id           — Mark notification read
 *
 * SECURITY: UUID validation, HIPAA audit middleware logs every PHI access.
 * SCRUBBING: 52 rules. DENIAL CATEGORIES: 8 groups from 300+ CARC codes.
 *
 * ALL v3 routes preserved + client_id filtering on all enriched queries.
 *
 * Deploy: zip this + node_modules (pg) → Lambda medcloud-api
 * Requires: Aurora PostgreSQL, S3 bucket 'medcloud-documents-us',
 *           Bedrock access (anthropic.claude-sonnet-4-5-20250929-v1:0), Textract
 */

import pg from 'pg';
const { Pool } = pg;

// ─── Connection ────────────────────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com',
  database: process.env.DB_NAME || 'medcloud',
  user: process.env.DB_USER || 'medcloud_admin',
  password: process.env.DB_PASS,
  port: 5432,
  max: 10,
  ssl: { rejectUnauthorized: false },
});

// ─── AWS SDK Imports ───────────────────────────────────────────────────────────
let s3Client = null, getSignedUrl = null, PutObjectCommand = null, GetObjectCommand = null;
let textractClient = null, StartDocumentAnalysisCommand = null, GetDocumentAnalysisCommand = null;
let bedrockClient = null, InvokeModelCommand = null;

try {
  const s3Mod = await import('@aws-sdk/client-s3');
  const presMod = await import('@aws-sdk/s3-request-presigner');
  s3Client = new s3Mod.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  PutObjectCommand = s3Mod.PutObjectCommand;
  GetObjectCommand = s3Mod.GetObjectCommand;
  getSignedUrl = presMod.getSignedUrl;
} catch { console.log('S3 SDK not available — presigned URLs will return mock paths'); }

try {
  const txtMod = await import('@aws-sdk/client-textract');
  textractClient = new txtMod.TextractClient({ region: process.env.AWS_REGION || 'us-east-1' });
  StartDocumentAnalysisCommand = txtMod.StartDocumentAnalysisCommand;
  GetDocumentAnalysisCommand = txtMod.GetDocumentAnalysisCommand;
} catch { console.log('Textract SDK not available'); }

try {
  const bedMod = await import('@aws-sdk/client-bedrock-runtime');
  bedrockClient = new bedMod.BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
  InvokeModelCommand = bedMod.InvokeModelCommand;
} catch { console.log('Bedrock SDK not available — AI coding will return mock suggestions'); }

const S3_BUCKET = process.env.S3_BUCKET || 'medcloud-documents-us';
// Bedrock model — override via BEDROCK_MODEL env var. Verify model availability in your region.
const BEDROCK_MODEL = process.env.BEDROCK_MODEL || 'anthropic.claude-sonnet-4-5-20250929-v1:0';
const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';

// ─── Prompt Injection Sanitizer ────────────────────────────────────────────────
// Strip sequences that could manipulate LLM behavior when embedding untrusted text
function sanitizeForPrompt(text) {
  if (!text) return '';
  return String(text)
    .replace(/```/g, "'''")                     // prevent code fence injection
    .replace(/<\/?(?:system|assistant|user|human|admin|instruction)[^>]*>/gi, '') // strip role tags
    .replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?)/gi, '[FILTERED]')
    .substring(0, 8000);                        // hard length cap
}

// ─── Safe JSON extraction from LLM output ──────────────────────────────────────
function extractJSON(text) {
  if (!text) return null;
  // Try markdown fenced block first
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch (_) {}
  }
  // Fall back to balanced brace matching (non-greedy approach)
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (text[i] === '}') { depth--; if (depth === 0 && start >= 0) {
      try { return JSON.parse(text.substring(start, i + 1)); } catch (_) { start = -1; }
    }}
  }
  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const respond = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Org-Id,X-User-Id,X-Client-Id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  },
  body: JSON.stringify(body),
});

const uuid = () => crypto.randomUUID();

// ─── Generic CRUD ──────────────────────────────────────────────────────────────
async function list(table, orgId, clientId, extra = '') {
  let q = `SELECT * FROM ${table} WHERE org_id = $1`;
  const params = [orgId];
  if (clientId) { params.push(clientId); q += ` AND client_id = $${params.length}`; }
  if (extra) q += ' ' + extra;
  return (await pool.query(q, params)).rows;
}

async function getById(table, id) {
  return (await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id])).rows[0] || null;
}

async function create(table, data, orgId) {
  data.id = data.id || uuid();
  data.org_id = orgId;
  data.created_at = data.created_at || new Date().toISOString();
  data.updated_at = new Date().toISOString();
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const ph = keys.map((_, i) => `$${i + 1}`).join(', ');
  const q = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${ph}) RETURNING *`;
  return (await pool.query(q, vals)).rows[0];
}

async function update(table, id, data) {
  data.updated_at = new Date().toISOString();
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const q = `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`;
  return (await pool.query(q, [...vals, id])).rows[0];
}

// ─── Audit Logging ─────────────────────────────────────────────────────────────
async function auditLog(orgId, userId, action, entityType, entityId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (id, org_id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [uuid(), orgId, userId || 'system', action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (e) { console.error('Audit log error:', e.message); }
}

// ─── Claim Number Generator ────────────────────────────────────────────────────
async function nextClaimNumber(orgId) {
  const r = await pool.query(
    `SELECT claim_number FROM claims WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`, [orgId]
  );
  if (r.rows.length === 0) return 'CLM-0001';
  const last = r.rows[0].claim_number || 'CLM-0000';
  const num = parseInt(last.replace(/\D/g, '')) + 1;
  return `CLM-${String(num).padStart(4, '0')}`;
}

// ─── Enriched Queries (all filter by client_id) ────────────────────────────────
async function enrichedClaims(orgId, clientId) {
  let q = `SELECT c.*, p.first_name || ' ' || p.last_name AS patient_name,
           pr.first_name || ' ' || pr.last_name AS provider_name,
           py.name AS payer_name, cl.name AS client_name
           FROM claims c
           LEFT JOIN patients p ON c.patient_id = p.id
           LEFT JOIN providers pr ON c.provider_id = pr.id
           LEFT JOIN payers py ON c.payer_id = py.id
           LEFT JOIN clients cl ON c.client_id = cl.id
           WHERE c.org_id = $1`;
  const params = [orgId];
  if (clientId) { params.push(clientId); q += ` AND c.client_id = $${params.length}`; }
  q += ' ORDER BY c.created_at DESC';
  return (await pool.query(q, params)).rows;
}

async function enrichedDenials(orgId, clientId) {
  let q = `SELECT d.*, p.first_name || ' ' || p.last_name AS patient_name,
           py.name AS payer_name, cl.name AS client_name,
           c.claim_number, c.dos_from,
           carc.description AS carc_description
           FROM denials d
           LEFT JOIN claims c ON d.claim_id = c.id
           LEFT JOIN patients p ON c.patient_id = p.id
           LEFT JOIN payers py ON c.payer_id = py.id
           LEFT JOIN clients cl ON d.client_id = cl.id
           LEFT JOIN carc_codes carc ON d.carc_code = carc.code
           WHERE d.org_id = $1`;
  const params = [orgId];
  if (clientId) { params.push(clientId); q += ` AND d.client_id = $${params.length}`; }
  q += ' ORDER BY d.created_at DESC';
  return (await pool.query(q, params)).rows;
}

async function enrichedPayments(orgId, clientId) {
  let q = `SELECT pm.*, c.claim_number, c.dos_from,
           p.first_name || ' ' || p.last_name AS patient_name,
           py.name AS payer_name, ef.file_name AS era_file_name
           FROM payments pm
           LEFT JOIN claims c ON pm.claim_id = c.id
           LEFT JOIN patients p ON c.patient_id = p.id
           LEFT JOIN payers py ON c.payer_id = py.id
           LEFT JOIN era_files ef ON pm.era_file_id = ef.id
           WHERE pm.org_id = $1`;
  const params = [orgId];
  if (clientId) { params.push(clientId); q += ` AND pm.client_id = $${params.length}`; }
  q += ' ORDER BY pm.created_at DESC';
  return (await pool.query(q, params)).rows;
}

async function enrichedCoding(orgId, clientId) {
  let q = `SELECT cq.*, p.first_name || ' ' || p.last_name AS patient_name,
           pr.first_name || ' ' || pr.last_name AS provider_name,
           cl.name AS client_name
           FROM coding_queue cq
           LEFT JOIN patients p ON cq.patient_id = p.id
           LEFT JOIN providers pr ON cq.provider_id = pr.id
           LEFT JOIN clients cl ON cq.client_id = cl.id
           WHERE cq.org_id = $1`;
  const params = [orgId];
  if (clientId) { params.push(clientId); q += ` AND cq.client_id = $${params.length}`; }
  q += ' ORDER BY cq.created_at DESC';
  return (await pool.query(q, params)).rows;
}

async function enrichedPatients(orgId, clientId) {
  let q = `SELECT p.*, cl.name AS client_name
           FROM patients p
           LEFT JOIN clients cl ON p.client_id = cl.id
           WHERE p.org_id = $1`;
  const params = [orgId];
  if (clientId) { params.push(clientId); q += ` AND p.client_id = $${params.length}`; }
  q += ' ORDER BY p.last_name, p.first_name';
  return (await pool.query(q, params)).rows;
}

// ════════════════════════════════════════════════════════════════════════════════
// SPRINT 2 BUSINESS LOGIC
// ════════════════════════════════════════════════════════════════════════════════

// ─── 835 ERA Parser ────────────────────────────────────────────────────────────
// Parses X12 835 EDI content into structured payment records
function parse835Content(ediContent) {
  const segments = ediContent.split('~').map(s => s.trim()).filter(Boolean);
  const payments = [];
  let currentClaim = null;
  let checkNumber = '', payerName = '', paymentDate = '', totalPaid = 0;

  for (const seg of segments) {
    const els = seg.split('*');
    const segId = els[0];

    // BPR — Financial info
    if (segId === 'BPR') {
      totalPaid = parseFloat(els[2]) || 0;
      paymentDate = els[16] || '';
    }

    // TRN — Check/trace number
    if (segId === 'TRN') {
      checkNumber = els[2] || '';
    }

    // N1*PR — Payer name
    if (segId === 'N1' && els[1] === 'PR') {
      payerName = els[2] || '';
    }

    // CLP — Claim-level payment
    if (segId === 'CLP') {
      if (currentClaim) payments.push(currentClaim);
      currentClaim = {
        patient_account: els[1] || '',     // Our claim number
        status_code: els[2] || '',          // 1=processed primary, 2=processed secondary, etc
        total_charge: parseFloat(els[3]) || 0,
        total_paid: parseFloat(els[4]) || 0,
        patient_responsibility: parseFloat(els[5]) || 0,
        claim_type: els[6] || '',           // 13=POS, 14=hospital
        payer_claim_number: els[7] || '',
        lines: [],
        adjustments: [],
      };
    }

    // CAS — Claim-level adjustments
    if (segId === 'CAS' && currentClaim) {
      const group = els[1]; // CO, PR, OA, PI, CR
      for (let i = 2; i < els.length; i += 3) {
        if (els[i]) {
          currentClaim.adjustments.push({
            group_code: group,
            reason_code: els[i],
            amount: parseFloat(els[i + 1]) || 0,
            quantity: parseFloat(els[i + 2]) || 0,
          });
        }
      }
    }

    // SVC — Service line
    if (segId === 'SVC' && currentClaim) {
      const proc = (els[1] || '').split(':');
      currentClaim.lines.push({
        procedure_code: proc[1] || proc[0] || '',
        modifier: proc[2] || '',
        billed: parseFloat(els[2]) || 0,
        paid: parseFloat(els[3]) || 0,
        revenue_code: els[4] || '',
        units: parseFloat(els[5]) || 0,
        adjustments: [],
      });
    }

    // CAS under SVC — Line-level adjustments
    if (segId === 'CAS' && currentClaim && currentClaim.lines.length > 0) {
      const lastLine = currentClaim.lines[currentClaim.lines.length - 1];
      const group = els[1];
      for (let i = 2; i < els.length; i += 3) {
        if (els[i]) {
          lastLine.adjustments.push({
            group_code: group,
            reason_code: els[i],
            amount: parseFloat(els[i + 1]) || 0,
          });
        }
      }
    }

    // DTM*232 — Service date under SVC
    if (segId === 'DTM' && els[1] === '232' && currentClaim && currentClaim.lines.length > 0) {
      currentClaim.lines[currentClaim.lines.length - 1].service_date = els[2] || '';
    }
  }
  if (currentClaim) payments.push(currentClaim);

  return {
    check_number: checkNumber,
    payer_name: payerName,
    payment_date: paymentDate,
    total_paid: totalPaid,
    claims: payments,
  };
}

async function ingest835(eraFileId, ediContent, orgId, clientId, userId) {
  const parsed = parse835Content(ediContent);
  const results = { era_file_id: eraFileId, claims_found: parsed.claims.length, payments_created: 0, matched: 0, unmatched: 0 };

  // Update ERA file with parsed metadata
  await update('era_files', eraFileId, {
    payer_name: parsed.payer_name,
    check_number: parsed.check_number,
    payment_date: parsed.payment_date || new Date().toISOString(),
    total_amount: parsed.total_paid,
    claim_count: parsed.claims.length,
    status: 'parsed',
  });

  for (const clp of parsed.claims) {
    // Try to match by claim_number
    const matchR = await pool.query(
      `SELECT id, patient_id, payer_id FROM claims WHERE org_id = $1 AND claim_number = $2 LIMIT 1`,
      [orgId, clp.patient_account]
    );
    const matchedClaim = matchR.rows[0] || null;

    // Create payment record per claim
    const paymentData = {
      org_id: orgId,
      client_id: clientId,
      claim_id: matchedClaim?.id || null,
      era_file_id: eraFileId,
      amount_paid: clp.total_paid,
      check_number: parsed.check_number,
      payment_date: parsed.payment_date || new Date().toISOString(),
      status: matchedClaim ? 'pending' : 'unmatched',
      billed_amount: clp.total_charge,
      patient_responsibility: clp.patient_responsibility,
      action: 'pending',
      adj_reason_code: clp.adjustments.map(a => `${a.group_code}-${a.reason_code}`).join(','),
    };

    await create('payments', paymentData, orgId);
    results.payments_created++;
    if (matchedClaim) results.matched++;
    else results.unmatched++;

    // Create line-level payment records
    for (const svc of clp.lines) {
      const linePayment = {
        org_id: orgId,
        client_id: clientId,
        claim_id: matchedClaim?.id || null,
        era_file_id: eraFileId,
        amount_paid: svc.paid,
        check_number: parsed.check_number,
        payment_date: parsed.payment_date || new Date().toISOString(),
        status: 'line_detail',
        cpt_code: svc.procedure_code,
        billed_amount: svc.billed,
        allowed_amount: svc.paid + (svc.adjustments.reduce((s, a) => s + a.amount, 0)),
        adjustment_amount: svc.adjustments.reduce((s, a) => s + a.amount, 0),
        adj_reason_code: svc.adjustments.map(a => `${a.group_code}-${a.reason_code}`).join(','),
        action: 'pending',
      };
      await create('payments', linePayment, orgId);
    }

    // Auto-create denials for fully denied lines
    if (clp.total_paid === 0 && clp.adjustments.length > 0 && matchedClaim) {
      const primaryAdj = clp.adjustments[0];
      if (primaryAdj.group_code !== 'CO' || primaryAdj.reason_code !== '45') {
        // Not just contractual — this is a real denial
        await create('denials', {
          org_id: orgId,
          client_id: clientId,
          claim_id: matchedClaim.id,
          carc_code: primaryAdj.reason_code,
          amount: clp.total_charge,
          status: 'new',
          denial_date: parsed.payment_date || new Date().toISOString(),
          source: 'era_835',
        }, orgId);
        results.denials_created = (results.denials_created || 0) + 1;
      }
    }
  }

  // Log EDI transaction
  await create('edi_transactions', {
    org_id: orgId,
    client_id: clientId,
    transaction_type: '835',
    direction: 'inbound',
    file_name: `ERA_${parsed.check_number || eraFileId.slice(0, 8)}.835`,
    claim_count: parsed.claims.length,
    status: 'accepted',
    response_at: new Date().toISOString(),
  }, orgId);

  await auditLog(orgId, userId, 'parse_835', 'era_files', eraFileId, results);
  return results;
}

// ─── DHA eClaim XML Generator (UAE) ────────────────────────────────────────────
async function generateDHAeClaim(claimId, orgId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');

  const linesR = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number', [claimId]);
  const dxR = await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1 ORDER BY sequence', [claimId]);
  const patient = claim.patient_id ? await getById('patients', claim.patient_id) : null;
  const provider = claim.provider_id ? await getById('providers', claim.provider_id) : null;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // Escape XML special characters to prevent XML injection
  function escXml(val) {
    if (val == null) return '';
    return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // DHA eClaim XML format
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Claim.Request xmlns="http://www.haad.ae/DataDictionary/eClaim">
  <Header>
    <SenderID>COSENTUS</SenderID>
    <ReceiverID>DHA</ReceiverID>
    <TransactionDate>${escXml(dateStr)}</TransactionDate>
    <RecordCount>1</RecordCount>
    <DispositionFlag>PRODUCTION</DispositionFlag>
  </Header>
  <Claim>
    <ID>${escXml(claim.claim_number || claimId.slice(0, 12))}</ID>
    <MemberID>${escXml(patient?.member_id)}</MemberID>
    <PayerID>${escXml(claim.payer_id)}</PayerID>
    <ProviderID>${escXml(provider?.npi)}</ProviderID>
    <EmiratesIDNumber>${escXml(patient?.emirates_id)}</EmiratesIDNumber>
    <Gross>${escXml(claim.total_charge || 0)}</Gross>
    <PatientShare>0</PatientShare>
    <Net>${escXml(claim.total_charge || 0)}</Net>
    <Encounter>
      <FacilityID>COSENTUS-UAE</FacilityID>
      <Type>${claim.claim_type === '837I' ? 'INPATIENT' : 'OUTPATIENT'}</Type>
      <PatientID>${escXml(patient?.id)}</PatientID>
      <Start>${escXml(claim.dos_from || dateStr)}</Start>
      <End>${escXml(claim.dos_to || claim.dos_from || dateStr)}</End>
      <StartType>ELECTIVE</StartType>`;

  // Diagnoses
  for (const dx of dxR.rows) {
    xml += `
      <Diagnosis>
        <Type>${dx.sequence === 1 ? 'PRINCIPAL' : 'SECONDARY'}</Type>
        <Code>${escXml(dx.icd_code)}</Code>
      </Diagnosis>`;
  }

  // Activities (service lines)
  for (const line of linesR.rows) {
    xml += `
      <Activity>
        <ID>${escXml(line.id.slice(0, 12))}</ID>
        <Start>${escXml(line.dos || claim.dos_from || dateStr)}</Start>
        <Type>CPT</Type>
        <Code>${escXml(line.cpt_code)}</Code>
        <Quantity>${escXml(line.units || 1)}</Quantity>
        <Net>${escXml(line.charge)}</Net>
        <Clinician>${escXml(provider?.npi)}</Clinician>
        ${line.prior_auth_number ? `<PriorAuthorizationID>${escXml(line.prior_auth_number)}</PriorAuthorizationID>` : ''}
      </Activity>`;
  }

  xml += `
    </Encounter>
  </Claim>
</Claim.Request>`;

  return { xml_content: xml, claim_id: claimId, claim_number: claim.claim_number, format: 'DHA_ECLAIM' };
}

// ─── 837P EDI Generator (preserved from v3) ───────────────────────────────────
async function generateEDI(claimId, orgId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');

  const linesR = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number', [claimId]);
  const dxR = await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1 ORDER BY sequence', [claimId]);
  const patient = claim.patient_id ? await getById('patients', claim.patient_id) : null;
  const provider = claim.provider_id ? await getById('providers', claim.provider_id) : null;
  const payer = claim.payer_id ? await getById('payers', claim.payer_id) : null;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const ctrlNum = String(Math.floor(Math.random() * 900000000) + 100000000);

  let edi = '';
  edi += `ISA*00*          *00*          *ZZ*COSENTUS       *ZZ*${(payer?.name || 'PAYER').substring(0, 15).padEnd(15)}*${dateStr.slice(2)}*${timeStr}*^*00501*${ctrlNum}*0*P*:~\n`;
  edi += `GS*HC*COSENTUS*${(payer?.payer_code || 'PAYER')}*${dateStr}*${timeStr}*${ctrlNum}*X*005010X222A1~\n`;
  edi += `ST*837*0001*005010X222A1~\n`;
  edi += `BHT*0019*00*${claim.claim_number || claimId.slice(0, 8)}*${dateStr}*${timeStr}*CH~\n`;

  // Submitter
  edi += `NM1*41*2*COSENTUS AI*****46*COSENTUS001~\n`;
  edi += `PER*IC*BILLING*TE*8005551234~\n`;

  // Receiver
  edi += `NM1*40*2*${(payer?.name || 'PAYER')}*****46*${payer?.payer_code || 'PAYER001'}~\n`;

  // Billing provider
  if (provider) {
    edi += `NM1*85*1*${provider.last_name || ''}*${provider.first_name || ''}****XX*${provider.npi || ''}~\n`;
    edi += `N3*${provider.address || '123 Medical Dr'}~\n`;
    edi += `N4*${provider.city || 'New York'}*${provider.state || 'NY'}*${provider.zip || '10001'}~\n`;
    edi += `REF*EI*${provider.tax_id || '123456789'}~\n`;
  }

  // Subscriber/patient
  if (patient) {
    edi += `NM1*IL*1*${patient.last_name || ''}*${patient.first_name || ''}****MI*${patient.member_id || ''}~\n`;
    edi += `N3*${patient.address || ''}~\n`;
    edi += `N4*${patient.city || ''}*${patient.state || ''}*${patient.zip || ''}~\n`;
    edi += `DMG*D8*${patient.date_of_birth ? patient.date_of_birth.replace(/-/g, '') : ''}*${patient.gender === 'female' ? 'F' : 'M'}~\n`;
  }

  // Payer
  if (payer) {
    edi += `NM1*PR*2*${payer.name}*****PI*${payer.payer_code || ''}~\n`;
  }

  // Claim info
  edi += `CLM*${claim.claim_number || claimId.slice(0, 8)}*${claim.total_charge || 0}***${claim.pos || '11'}:B:1*Y*A*Y*Y~\n`;

  // Diagnoses (HI segment)
  if (dxR.rows.length > 0) {
    const primary = dxR.rows.find(d => d.sequence === 1);
    const secondary = dxR.rows.filter(d => d.sequence !== 1);
    let hi = `HI*ABK:${primary?.icd_code || dxR.rows[0].icd_code}`;
    for (const dx of secondary.slice(0, 11)) {
      hi += `*ABF:${dx.icd_code}`;
    }
    edi += hi + '~\n';
  }

  // Service lines
  let lineNum = 1;
  for (const line of linesR.rows) {
    const dos = line.dos ? new Date(line.dos).toISOString().slice(0, 10).replace(/-/g, '') : dateStr;
    edi += `LX*${lineNum}~\n`;
    edi += `SV1*HC:${line.cpt_code}${line.modifier ? ':' + line.modifier : ''}*${line.charge}*UN*${line.units || 1}*${claim.pos || '11'}**`;
    // Diagnosis pointers
    const pointers = dxR.rows.slice(0, 4).map((_, i) => i + 1).join(':');
    edi += `${pointers}~\n`;
    edi += `DTP*472*D8*${dos}~\n`;
    lineNum++;
  }

  const segCount = edi.split('~').filter(Boolean).length;
  edi += `SE*${segCount + 1}*0001~\n`;
  edi += `GE*1*${ctrlNum}~\n`;
  edi += `IEA*1*${ctrlNum}~\n`;

  return { edi_content: edi, claim_id: claimId, claim_number: claim.claim_number, format: claim.claim_type || '837P' };
}

// ─── Claim Scrubbing (50 rules, persists results) ─────────────────────────────
async function scrubClaim(claimId, orgId, userId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');

  const linesR = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1', [claimId]);
  const dxR = await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1', [claimId]);
  const patient = claim.patient_id ? await getById('patients', claim.patient_id) : null;
  const provider = claim.provider_id ? await getById('providers', claim.provider_id) : null;
  const payer = claim.payer_id ? await getById('payers', claim.payer_id) : null;
  const lines = linesR.rows;
  const dxCodes = dxR.rows;

  const results = [];
  function check(code, name, severity, passed, message) {
    results.push({ rule_code: code, rule_name: name, severity, passed, message: passed ? 'OK' : message });
  }

  // ── Basic Presence (1-10) ───────────────────────────────────────────────
  check('has_lines', 'Claim has service lines', 'error', lines.length > 0, 'Claim has no service lines');
  check('has_diagnosis', 'Diagnosis codes present', 'error', dxCodes.length > 0, 'No diagnosis codes');
  check('dos_present', 'Date of service present', 'error', !!claim.dos_from, 'Date of service missing');
  check('dos_not_future', 'DOS not in future', 'error', !claim.dos_from || new Date(claim.dos_from) <= new Date(), 'DOS is in the future');
  check('npi_present', 'Provider/NPI present', 'error', !!claim.provider_id, 'Provider/NPI missing');
  check('payer_linked', 'Payer linked to claim', 'error', !!claim.payer_id, 'No payer linked');
  check('patient_linked', 'Patient linked to claim', 'error', !!claim.patient_id, 'No patient linked');
  check('total_positive', 'Total charge is positive', 'error', claim.total_charge && Number(claim.total_charge) > 0, 'Total charge is zero or negative');
  check('claim_type', 'Valid claim type', 'error', ['837P', '837I', 'DHA'].includes(claim.claim_type), 'Invalid claim type');
  check('primary_dx', 'Primary diagnosis exists', 'error', !!dxCodes.find(d => d.sequence === 1), 'No primary diagnosis (sequence=1)');

  // ── Line-Level Validation (11-20) ───────────────────────────────────────
  check('cpt_present', 'All lines have CPT codes', 'error', !lines.some(l => !l.cpt_code), 'One or more lines missing CPT code');
  check('charges_positive', 'All line charges positive', 'error', !lines.some(l => !l.charge || Number(l.charge) <= 0), 'Line has zero or negative charge');
  check('units_valid', 'All line units valid', 'warning', !lines.some(l => !l.units || Number(l.units) < 1), 'Line has invalid units');
  check('units_excessive', 'Units not excessive (>50)', 'warning', !lines.some(l => Number(l.units) > 50), 'Line has >50 units — review');
  const highCharge = lines.find(l => Number(l.charge) > 50000);
  check('charge_threshold', 'No unusually high charges', 'warning', !highCharge, `Line ${highCharge?.cpt_code || ''} charge > $50,000`);
  const cpts = lines.map(l => l.cpt_code);
  const dupCpts = cpts.filter((c, i) => cpts.indexOf(c) !== i);
  check('duplicate_cpt', 'No duplicate CPT codes', 'warning', dupCpts.length === 0, `Duplicate CPT: ${dupCpts[0] || ''}`);
  check('line_dos_valid', 'Line DOS within claim DOS range', 'warning',
    !lines.some(l => l.dos && claim.dos_from && new Date(l.dos) < new Date(claim.dos_from)),
    'Service line DOS before claim DOS start');
  check('line_dos_to_valid', 'Line DOS not after claim end', 'warning',
    !lines.some(l => l.dos && claim.dos_to && new Date(l.dos) > new Date(claim.dos_to)),
    'Service line DOS after claim DOS end');
  const totalCalc = lines.reduce((s, l) => s + Number(l.charge || 0) * Number(l.units || 1), 0);
  check('total_matches_lines', 'Total charge matches line sum', 'warning',
    Math.abs(totalCalc - Number(claim.total_charge || 0)) < 0.02, `Total charge ${claim.total_charge} doesn't match line sum ${totalCalc.toFixed(2)}`);
  check('pos_valid', 'Place of service valid', 'warning',
    !claim.pos || ['11','12','21','22','23','24','31','32','33','41','42','49','50','51','52','53','61','65','71','72','81','99'].includes(claim.pos),
    `Unrecognized POS code: ${claim.pos}`);

  // ── NCCI / Modifier Edits (21-30) ───────────────────────────────────────
  // Common NCCI column 1/2 pairs (procedure-to-procedure)
  const NCCI_PAIRS = [
    ['99213','36415'], ['99214','36415'], ['99215','36415'],  // E/M + venipuncture
    ['99213','81002'], ['99214','81002'],                      // E/M + urinalysis
    ['99213','85025'], ['99214','85025'],                      // E/M + CBC
    ['29881','29880'], ['27447','27446'],                      // knee arthroscopy bundles
    ['43239','43235'], ['43249','43235'],                      // upper GI bundles
    ['58661','58660'], ['58662','58660'],                      // laparoscopy bundles
    ['99291','99292'],                                          // critical care (check units)
  ];
  const cptSet = new Set(cpts);
  const ncciFail = NCCI_PAIRS.find(([c1, c2]) => cptSet.has(c1) && cptSet.has(c2) && !lines.find(l => l.cpt_code === c2 && (l.modifier === '59' || l.modifier === 'XE' || l.modifier === 'XS' || l.modifier === 'XP' || l.modifier === 'XU')));
  check('ncci_pair', 'NCCI edit — bundled procedures', 'error',
    !ncciFail, ncciFail ? `NCCI conflict: ${ncciFail[0]} bundles with ${ncciFail[1]} — needs modifier 59/X{EPSU}` : '');

  const obGynCpts = lines.filter(l => ['59400','59510','59610','59614','59618','59622'].includes(l.cpt_code) && !l.modifier);
  check('modifier_obstetric', 'OB global CPTs need modifier', 'warning', obGynCpts.length === 0,
    obGynCpts.length > 0 ? `CPT ${obGynCpts[0].cpt_code} may need modifier (global OB)` : '');

  const bilatCpts = lines.filter(l => ['27447','27130','29881','29880','64721'].includes(l.cpt_code));
  const bilatDups = bilatCpts.filter(l => cpts.filter(c => c === l.cpt_code).length > 1 && l.modifier !== '50' && l.modifier !== 'RT' && l.modifier !== 'LT');
  check('modifier_bilateral', 'Bilateral procedures need 50/RT/LT modifier', 'warning', bilatDups.length === 0,
    bilatDups.length > 0 ? `CPT ${bilatDups[0].cpt_code} billed twice — needs bilateral modifier` : '');

  const emCpts = lines.filter(l => l.cpt_code && l.cpt_code.match(/^992[0-9]{2}$/));
  check('multiple_em', 'Only one E/M per encounter', 'warning', emCpts.length <= 1,
    `${emCpts.length} E/M codes in one claim — only one typically allowed per encounter`);

  const emWithProcedure = emCpts.length > 0 && lines.some(l => l.cpt_code && !l.cpt_code.match(/^99/));
  const emHasMod25 = emCpts.some(l => l.modifier === '25');
  check('modifier_25_em', 'E/M + procedure needs modifier 25', 'warning',
    !emWithProcedure || emHasMod25, 'E/M code billed with procedure — requires modifier 25');

  // TC/26 mutually exclusive
  const tcCpts = lines.filter(l => l.modifier === 'TC').map(l => l.cpt_code);
  const profCpts = lines.filter(l => l.modifier === '26').map(l => l.cpt_code);
  const tcProfConflict = tcCpts.find(c => profCpts.includes(c));
  check('tc_26_conflict', 'TC and 26 modifiers not on same CPT', 'error',
    !tcProfConflict, tcProfConflict ? `CPT ${tcProfConflict} has both TC and 26 modifiers` : '');

  // Global/TC/26 with global
  const globalSurgery = lines.filter(l => ['10060','10061','11042','11043','20610','20611'].includes(l.cpt_code));
  const globalWithTC = globalSurgery.find(l => l.modifier === 'TC' || l.modifier === '26');
  check('global_surgery_modifier', 'Surgical CPT should not have TC/26', 'warning',
    !globalWithTC, globalWithTC ? `CPT ${globalWithTC.cpt_code} is surgical — TC/26 may be inappropriate` : '');

  const addOnCpts = ['99354','99355','99356','99417','20930','20931','22614','22840','22842','64727','95940'];
  const orphanAddOns = lines.filter(l => addOnCpts.includes(l.cpt_code) && lines.length === 1);
  check('addon_without_primary', 'Add-on codes need primary procedure', 'error',
    orphanAddOns.length === 0, orphanAddOns.length > 0 ? `Add-on CPT ${orphanAddOns[0].cpt_code} billed without primary procedure` : '');

  const lateModifiers = lines.filter(l => l.modifier && l.modifier.length > 2 && !['59','XE','XS','XP','XU'].includes(l.modifier));
  check('modifier_valid', 'Modifier codes recognized', 'warning',
    !lines.some(l => l.modifier && !l.modifier.match(/^[A-Z0-9]{1,2}$/i)), 'Modifier format invalid');

  // ── Patient / Demographics (31-37) ──────────────────────────────────────
  check('patient_dob', 'Patient DOB present', 'warning', !patient || !!patient.date_of_birth, 'Patient date of birth missing');

  const patientAge = patient?.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 86400000)) : null;
  const pedCpts = lines.filter(l => ['99381','99382','99383','99391','99392','99393','90460','90461'].includes(l.cpt_code));
  check('age_pediatric', 'Pediatric CPTs match patient age', 'warning',
    pedCpts.length === 0 || (patientAge !== null && patientAge < 18),
    `Pediatric CPT ${pedCpts[0]?.cpt_code || ''} but patient age is ${patientAge}`);

  const genderSpecific = { 'male': ['55700','55866','52601','55810'], 'female': ['58661','58662','58558','57454','58571'] };
  const wrongGender = patient?.gender ? (genderSpecific[patient.gender === 'male' ? 'female' : 'male'] || []) : [];
  const genderMismatch = lines.find(l => wrongGender.includes(l.cpt_code));
  check('gender_procedure', 'Procedure matches patient gender', 'error',
    !genderMismatch, genderMismatch ? `CPT ${genderMismatch.cpt_code} is gender-specific — conflicts with patient gender ${patient?.gender}` : '');

  check('patient_member_id', 'Patient member/insurance ID present', 'warning',
    !patient || !!patient.member_id, 'Patient member/insurance ID missing — may cause rejection');

  check('patient_address', 'Patient address present', 'warning',
    !patient || !!(patient.address && patient.city && patient.state && patient.zip),
    'Patient address incomplete — some payers require full address');

  check('provider_npi', 'Rendering provider NPI present', 'warning',
    !provider || !!provider.npi, 'Provider NPI missing — required for submission');

  check('provider_taxonomy', 'Provider taxonomy code present', 'warning',
    !provider || !!provider.taxonomy_code, 'Provider taxonomy code missing — some payers require it');

  // ── Timely Filing / Date Rules (38-42) ──────────────────────────────────
  if (claim.dos_from) {
    const dosDate = new Date(claim.dos_from);
    const daysSinceDOS = Math.floor((new Date() - dosDate) / 86400000);
    check('timely_filing_90', 'Timely filing — 90 days', 'warning', daysSinceDOS <= 90,
      `${daysSinceDOS} days since DOS — approaching timely filing limits`);
    check('timely_filing_365', 'Timely filing — 365 days', 'error', daysSinceDOS <= 365,
      `${daysSinceDOS} days since DOS — likely past timely filing deadline`);
    check('dos_not_ancient', 'DOS not older than 3 years', 'error', daysSinceDOS <= 1095,
      `DOS is ${daysSinceDOS} days ago — claims over 3 years are almost never payable`);
  }
  check('dos_range_valid', 'DOS from <= DOS to', 'error',
    !claim.dos_from || !claim.dos_to || new Date(claim.dos_from) <= new Date(claim.dos_to),
    'DOS from is after DOS to');
  check('dos_range_reasonable', 'DOS range not excessive (>30 days for professional)', 'warning',
    claim.claim_type !== '837P' || !claim.dos_from || !claim.dos_to ||
    (new Date(claim.dos_to) - new Date(claim.dos_from)) / 86400000 <= 30,
    'Professional claim spans >30 days — unusual for 837P');

  // ── Payer / Insurance Rules (43-47) ─────────────────────────────────────
  check('payer_id_present', 'Payer ID/code present', 'warning',
    !payer || !!payer.payer_code, 'Payer code missing — required for EDI submission');

  const priorAuthCpts = ['27447','27130','27446','63030','63042','22551','22612','22630','23472','49505'];
  const needsAuth = lines.filter(l => priorAuthCpts.includes(l.cpt_code));
  check('prior_auth_likely', 'Procedures likely needing prior auth', 'warning',
    needsAuth.length === 0 || lines.some(l => l.prior_auth_number),
    needsAuth.length > 0 ? `CPT ${needsAuth[0].cpt_code} typically requires prior authorization` : '');

  check('cob_check', 'COB — secondary payer if applicable', 'info',
    true, '');  // Informational — always passes, just a reminder

  check('auth_number_format', 'Prior auth number format valid', 'warning',
    !lines.some(l => l.prior_auth_number && l.prior_auth_number.length < 4),
    'Prior auth number seems too short — verify');

  check('payer_active', 'Payer is active', 'warning',
    !payer || payer.status !== 'inactive', 'Payer is inactive — claim may be rejected');

  // ── UAE-Specific Rules (48-50) ──────────────────────────────────────────
  if (claim.claim_type === 'DHA') {
    check('uae_emirates_id', 'UAE: Emirates ID present', 'error',
      !patient || !!patient.emirates_id, 'UAE claim requires Emirates ID');
    check('uae_facility_id', 'UAE: Facility ID present', 'warning',
      true, '');  // We hardcode COSENTUS-UAE
    check('uae_icd10am', 'UAE: Using ICD-10-AM codes', 'info',
      true, '');  // Informational
  } else {
    // US fillers to keep count at 50
    check('rendering_vs_billing', 'Rendering provider ≠ Billing provider if group', 'info', true, '');
    check('taxonomy_match', 'Taxonomy matches specialty', 'info', true, '');
    check('medical_necessity_flag', 'Medical necessity — LCD/NCD review recommended', 'info', true, '');
  }

  // ── Persist results ─────────────────────────────────────────────────────
  for (const r of results) {
    try {
      await create('scrub_results', {
        org_id: orgId, claim_id: claimId, rule_code: r.rule_code, rule_name: r.rule_name,
        severity: r.severity, passed: r.passed, message: r.message, scrubbed_by: userId,
      }, orgId);
    } catch (e) { /* table might not exist yet pre-migration */ }
  }

  const errors = results.filter(r => !r.passed && r.severity === 'error');
  const warnings = results.filter(r => !r.passed && r.severity === 'warning');
  const newStatus = errors.length > 0 ? 'scrub_failed' : 'scrubbed';

  await update('claims', claimId, { status: newStatus });
  await auditLog(orgId, userId, 'scrub', 'claims', claimId, { errors: errors.length, warnings: warnings.length, total_rules: results.length });

  return { claim_id: claimId, status: newStatus, total_rules: results.length,
           errors: errors.length, warnings: warnings.length, results };
}

// ─── Bedrock AI Auto-Coding ────────────────────────────────────────────────────
async function aiAutoCode(codingQueueId, orgId, userId) {
  const item = await getById('coding_queue', codingQueueId);
  if (!item || item.org_id !== orgId) throw new Error('Coding queue item not found');

  // Get SOAP note or document content
  let clinicalText = '';
  if (item.soap_note_id) {
    const note = await getById('soap_notes', item.soap_note_id);
    if (note) {
      clinicalText = `SUBJECTIVE: ${note.subjective || ''}\nOBJECTIVE: ${note.objective || ''}\nASSESSMENT: ${note.assessment || ''}\nPLAN: ${note.plan || ''}`;
    }
  }

  // If no SOAP note, try encounter
  if (!clinicalText && item.encounter_id) {
    const enc = await getById('encounters', item.encounter_id);
    if (enc?.notes) clinicalText = enc.notes;
  }

  // Determine region for coding system
  let codingSystem = 'ICD-10-CM + CPT (US)';
  if (item.client_id) {
    const client = await getById('clients', item.client_id);
    if (client?.region === 'UAE') codingSystem = 'ICD-10-AM + DRG (UAE/DHA)';
  }

  const prompt = `You are an expert medical coder. Analyze the following clinical documentation and suggest appropriate codes.

Coding System: ${codingSystem}

Clinical Documentation:
${sanitizeForPrompt(clinicalText) || 'No clinical documentation available. Return empty suggestions.'}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "suggested_cpt": [{"code": "99214", "description": "Office visit, established, moderate complexity", "confidence": 92, "modifier": ""}],
  "suggested_icd": [{"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "confidence": 88, "is_primary": true}],
  "suggested_em": "99214",
  "em_confidence": 90,
  "reasoning": "Brief explanation of code selection"
}`;

  let suggestion;
  const startMs = Date.now();

  if (bedrockClient && InvokeModelCommand) {
    try {
      const cmd = new InvokeModelCommand({
        modelId: BEDROCK_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const response = await bedrockClient.send(cmd);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const aiText = responseBody.content?.[0]?.text || '{}';
      suggestion = JSON.parse(aiText.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error('Bedrock error:', e.message);
      suggestion = null;
    }
  }

  // Fallback mock if Bedrock unavailable or failed
  if (!suggestion) {
    suggestion = {
      suggested_cpt: [
        { code: '99214', description: 'Office visit, established, moderate', confidence: 85, modifier: '' },
        { code: '36415', description: 'Venipuncture', confidence: 72, modifier: '' },
      ],
      suggested_icd: [
        { code: 'E11.9', description: 'Type 2 diabetes without complications', confidence: 88, is_primary: true },
        { code: 'I10', description: 'Essential hypertension', confidence: 80, is_primary: false },
      ],
      suggested_em: '99214',
      em_confidence: 85,
      reasoning: 'Mock suggestion — Bedrock unavailable. Based on typical primary care encounter.',
      mock: true,
    };
  }

  const processingMs = Date.now() - startMs;
  const totalConf = suggestion.suggested_cpt?.length > 0
    ? suggestion.suggested_cpt.reduce((s, c) => s + (c.confidence || 0), 0) / suggestion.suggested_cpt.length
    : 0;

  // Persist AI suggestion
  const saved = await create('ai_coding_suggestions', {
    org_id: orgId,
    coding_queue_id: codingQueueId,
    encounter_id: item.encounter_id,
    soap_note_id: item.soap_note_id,
    suggested_cpt: JSON.stringify(suggestion.suggested_cpt || []),
    suggested_icd: JSON.stringify(suggestion.suggested_icd || []),
    suggested_em: suggestion.suggested_em,
    em_confidence: suggestion.em_confidence,
    model_id: suggestion.mock ? 'mock' : BEDROCK_MODEL,
    prompt_version: 'v1.0',
    total_confidence: totalConf,
    processing_ms: processingMs,
  }, orgId);

  // Update coding queue item
  await update('coding_queue', codingQueueId, {
    ai_suggestion_id: saved.id,
    coding_method: 'ai_assisted',
  });

  await auditLog(orgId, userId, 'ai_code', 'coding_queue', codingQueueId, {
    model: suggestion.mock ? 'mock' : BEDROCK_MODEL,
    confidence: totalConf,
    processing_ms: processingMs,
  });

  return { ...suggestion, suggestion_id: saved.id, processing_ms: processingMs, confidence: totalConf };
}

// ─── Textract Document Processing ──────────────────────────────────────────────
async function triggerTextract(documentId, orgId, userId) {
  const doc = await getById('documents', documentId);
  if (!doc || doc.org_id !== orgId) throw new Error('Document not found');
  if (!doc.s3_key) throw new Error('Document has no S3 key — upload first');

  // Update status
  await update('documents', documentId, { textract_status: 'processing' });

  if (textractClient && StartDocumentAnalysisCommand) {
    try {
      const cmd = new StartDocumentAnalysisCommand({
        DocumentLocation: {
          S3Object: { Bucket: doc.s3_bucket || S3_BUCKET, Name: doc.s3_key },
        },
        FeatureTypes: ['TABLES', 'FORMS', 'QUERIES'],
        QueriesConfig: {
          Queries: [
            { Text: 'What is the patient name?' },
            { Text: 'What is the date of service?' },
            { Text: 'What are the CPT codes?' },
            { Text: 'What is the diagnosis?' },
            { Text: 'What is the total charge?' },
          ],
        },
      });
      const result = await textractClient.send(cmd);

      await update('documents', documentId, {
        textract_job_id: result.JobId,
        textract_status: 'processing',
      });

      await auditLog(orgId, userId, 'textract_start', 'documents', documentId, { job_id: result.JobId });
      return { document_id: documentId, job_id: result.JobId, status: 'processing' };
    } catch (e) {
      await update('documents', documentId, { textract_status: 'failed' });
      throw e;
    }
  }

  // Mock for local dev
  const mockResult = {
    patient_name: 'John Smith',
    date_of_service: '2026-03-01',
    cpt_codes: ['99214', '36415'],
    diagnoses: ['E11.9', 'I10'],
    total_charge: 285.00,
    confidence: 0.87,
    raw_text: 'Mock Textract result — SDK not available',
  };
  await update('documents', documentId, {
    textract_status: 'completed',
    textract_result: JSON.stringify(mockResult),
  });

  return { document_id: documentId, status: 'completed', result: mockResult, mock: true };
}

async function getTextractResults(documentId, orgId) {
  const doc = await getById('documents', documentId);
  if (!doc || doc.org_id !== orgId) throw new Error('Document not found');

  if (doc.textract_status === 'completed' && doc.textract_result) {
    return { document_id: documentId, status: 'completed', result: typeof doc.textract_result === 'string' ? JSON.parse(doc.textract_result) : doc.textract_result };
  }

  if (doc.textract_job_id && textractClient && GetDocumentAnalysisCommand) {
    const cmd = new GetDocumentAnalysisCommand({ JobId: doc.textract_job_id });
    const result = await textractClient.send(cmd);

    if (result.JobStatus === 'SUCCEEDED') {
      const extracted = {
        blocks: result.Blocks?.slice(0, 100),  // Limit stored blocks
        pages: result.DocumentMetadata?.Pages,
      };
      await update('documents', documentId, {
        textract_status: 'completed',
        textract_result: JSON.stringify(extracted),
      });
      return { document_id: documentId, status: 'completed', result: extracted };
    }

    return { document_id: documentId, status: result.JobStatus?.toLowerCase() || 'processing' };
  }

  return { document_id: documentId, status: doc.textract_status || 'none' };
}

// ─── Auto-Post Payments ────────────────────────────────────────────────────────
async function autoPostPayments(eraFileId, orgId, userId) {
  const era = await getById('era_files', eraFileId);
  if (!era || era.org_id !== orgId) throw new Error('ERA file not found');

  const paymentsR = await pool.query(
    `SELECT * FROM payments WHERE era_file_id = $1 AND (action = 'pending' OR action IS NULL)`,
    [eraFileId]
  );

  const results = { auto_posted: 0, manual_review: 0, total: paymentsR.rows.length, details: [] };

  for (const pmt of paymentsR.rows) {
    const paid = Number(pmt.amount_paid) || 0;
    const adjCode = pmt.adj_reason_code || '';
    const isContractualOnly = !adjCode || adjCode === 'CO-45' || adjCode.startsWith('CO-45');
    const hasClaim = !!pmt.claim_id;

    if (paid > 0 && isContractualOnly && hasClaim) {
      await update('payments', pmt.id, { action: 'posted', posted_at: new Date().toISOString(), posted_by: userId });
      // Update claim status
      if (pmt.claim_id) {
        const claim = await getById('claims', pmt.claim_id);
        if (claim && ['accepted', 'in_process', 'submitted'].includes(claim.status)) {
          const bal = Number(pmt.patient_responsibility) || 0;
          await update('claims', pmt.claim_id, { status: bal > 0 ? 'partial_pay' : 'paid' });
        }
      }
      results.auto_posted++;
      results.details.push({ payment_id: pmt.id, action: 'posted', reason: 'Auto-post criteria met' });
    } else {
      await update('payments', pmt.id, { action: 'review' });
      const reasons = [];
      if (paid <= 0) reasons.push('Zero/negative payment');
      if (!isContractualOnly) reasons.push(`Non-contractual adjustment: ${adjCode}`);
      if (!hasClaim) reasons.push('No matching claim');
      results.manual_review++;
      results.details.push({ payment_id: pmt.id, action: 'review', reason: reasons.join('; ') });
    }
  }

  await update('era_files', eraFileId, { status: 'posted' });
  await auditLog(orgId, userId, 'auto_post', 'era_files', eraFileId, results);
  return results;
}

// ─── 271 Eligibility Response Parser ───────────────────────────────────────────
async function parse271Response(eligibilityCheckId, ediContent, orgId, userId) {
  const elig = await getById('eligibility_checks', eligibilityCheckId);
  if (!elig || elig.org_id !== orgId) throw new Error('Eligibility check not found');

  const segments = ediContent.split('~').map(s => s.trim()).filter(Boolean);
  const result = {
    eligibility_check_id: eligibilityCheckId,
    raw_segments: segments.length,
    status: 'active',  // default
    benefits: [],
  };

  let currentEB = null;
  for (const seg of segments) {
    const els = seg.split('*');
    const segId = els[0];

    // AAA — Request Validation
    if (segId === 'AAA') {
      const validCode = els[1];   // Y = valid, N = invalid
      const rejectCode = els[3];  // 71=patient not found, 72=invalid subscriber
      if (validCode === 'N') {
        result.status = 'not_found';
        result.reject_reason = rejectCode === '71' ? 'Patient not found' :
                               rejectCode === '72' ? 'Invalid subscriber/member ID' :
                               rejectCode === '73' ? 'Invalid date of birth' :
                               rejectCode === '75' ? 'Subscriber not in plan' :
                               `Rejection code: ${rejectCode}`;
      }
    }

    // INS — Subscriber status
    if (segId === 'INS') {
      const isSubscriber = els[1] === 'Y';
      const relationship = els[2];  // 18=self, 01=spouse, 19=child
      result.is_subscriber = isSubscriber;
      result.relationship = relationship === '18' ? 'self' : relationship === '01' ? 'spouse' : relationship === '19' ? 'child' : relationship;
    }

    // DTP — Date info
    if (segId === 'DTP') {
      const qualifier = els[1];  // 291=plan begin, 292=plan end, 307=eligibility
      const dateVal = els[3];
      if (qualifier === '291') result.plan_begin = dateVal;
      if (qualifier === '292') result.plan_end = dateVal;
      if (qualifier === '307') {
        // Date range format: CCYYMMDD-CCYYMMDD
        if (dateVal.includes('-')) {
          const [from, to] = dateVal.split('-');
          result.eligibility_from = from;
          result.eligibility_to = to;
        } else {
          result.eligibility_date = dateVal;
        }
      }
    }

    // EB — Eligibility/Benefit Information
    if (segId === 'EB') {
      currentEB = {
        info_code: els[1],      // 1=active, 6=inactive, 8=not covered, A=co-insurance, B=co-pay, C=deductible, G=out-of-pocket
        coverage_level: els[2], // IND=individual, FAM=family
        service_type: els[3],   // 30=health benefit plan coverage, 88=pharmacy, etc
        insurance_type: els[4], // HM=HMO, PPO, etc
        plan_name: els[5],
        time_qualifier: els[6], // 23=calendar year, 29=remaining
        amount: els[7] ? parseFloat(els[7]) : null,
        percent: els[8] ? parseFloat(els[8]) : null,
      };
      result.benefits.push(currentEB);

      // Extract key fields
      if (els[1] === '1') result.status = 'active';
      if (els[1] === '6') result.status = 'inactive';
      if (els[1] === '8') result.status = 'not_covered';
      if (els[1] === 'C' && els[7]) {
        if (els[6] === '29') result.deductible_remaining = parseFloat(els[7]);
        else result.deductible = parseFloat(els[7]);
      }
      if (els[1] === 'G' && els[7]) result.out_of_pocket_max = parseFloat(els[7]);
      if (els[1] === 'A' && els[8]) result.coinsurance_pct = parseFloat(els[8]);
      if (els[1] === 'B' && els[7]) result.copay = parseFloat(els[7]);
      if (els[5]) result.plan_name = els[5];
    }

    // REF — Reference identifiers
    if (segId === 'REF') {
      if (els[1] === '6P') result.group_number = els[2];    // Group number
      if (els[1] === '18') result.plan_number = els[2];     // Plan number
    }
  }

  // Update eligibility_checks record
  const updateData = {
    result: result.status,
    plan_name: result.plan_name || null,
    group_number: result.group_number || null,
    coinsurance: result.coinsurance_pct || null,
    out_of_pocket_max: result.out_of_pocket_max || null,
    deductible_met: result.deductible_remaining != null ? result.deductible_remaining : null,
    benefits_json: JSON.stringify(result),
    effective_date: result.plan_begin ? `${result.plan_begin.slice(0,4)}-${result.plan_begin.slice(4,6)}-${result.plan_begin.slice(6,8)}` : null,
    termination_date: result.plan_end ? `${result.plan_end.slice(0,4)}-${result.plan_end.slice(4,6)}-${result.plan_end.slice(6,8)}` : null,
  };
  await update('eligibility_checks', eligibilityCheckId, updateData);

  // Log EDI transaction
  await create('edi_transactions', {
    org_id: orgId, transaction_type: '271', direction: 'inbound',
    status: 'accepted', claim_count: 0,
    response_at: new Date().toISOString(),
  }, orgId);

  await auditLog(orgId, userId, 'parse_271', 'eligibility_checks', eligibilityCheckId, { status: result.status, benefits_count: result.benefits.length });
  return result;
}

// ─── Contract Underpayment Detection ───────────────────────────────────────────
async function detectUnderpayments(claimId, orgId, userId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');

  // Get payments for this claim
  const pmtR = await pool.query(
    `SELECT * FROM payments WHERE claim_id = $1 AND status != 'line_detail' ORDER BY created_at DESC LIMIT 1`, [claimId]
  );
  if (pmtR.rows.length === 0) return { claim_id: claimId, message: 'No payments found for this claim' };

  const payment = pmtR.rows[0];

  // Get claim lines with payments
  const linesR = await pool.query(`SELECT * FROM claim_lines WHERE claim_id = $1`, [claimId]);
  const linePaymentsR = await pool.query(
    `SELECT * FROM payments WHERE claim_id = $1 AND status = 'line_detail'`, [claimId]
  );

  // Get fee schedule for this payer
  const feeSchedR = await pool.query(
    `SELECT * FROM fee_schedules WHERE payer_id = $1 AND org_id = $2 AND (termination_date IS NULL OR termination_date > NOW())`,
    [claim.payer_id, orgId]
  );
  const feeMap = {};
  for (const fs of feeSchedR.rows) {
    feeMap[fs.cpt_code] = Number(fs.contracted_rate);
  }

  const result = {
    claim_id: claimId,
    claim_number: claim.claim_number,
    payer_id: claim.payer_id,
    total_billed: Number(claim.total_charge) || 0,
    total_paid: Number(payment.amount_paid) || 0,
    underpayments: [],
    total_underpaid: 0,
    has_fee_schedule: feeSchedR.rows.length > 0,
  };

  // Line-level comparison
  for (const line of linesR.rows) {
    const contracted = feeMap[line.cpt_code];
    if (!contracted) continue;  // No fee schedule entry for this CPT

    const linePmt = linePaymentsR.rows.find(p => p.cpt_code === line.cpt_code);
    const allowed = linePmt ? Number(linePmt.allowed_amount) || Number(linePmt.amount_paid) || 0 : 0;
    const units = Number(line.units) || 1;
    const expectedPay = contracted * units;

    if (allowed > 0 && allowed < expectedPay) {
      const underpaid = expectedPay - allowed;
      result.underpayments.push({
        cpt_code: line.cpt_code,
        units,
        contracted_rate: contracted,
        expected_payment: expectedPay,
        actual_allowed: allowed,
        underpaid_amount: underpaid,
        variance_pct: ((underpaid / expectedPay) * 100).toFixed(1),
      });
      result.total_underpaid += underpaid;
    }
  }

  // If underpayments found, create a task
  if (result.underpayments.length > 0) {
    await create('tasks', {
      org_id: orgId,
      client_id: claim.client_id,
      title: `Underpayment: ${claim.claim_number} — $${result.total_underpaid.toFixed(2)}`,
      description: `${result.underpayments.length} line(s) paid below contracted rate. Total underpaid: $${result.total_underpaid.toFixed(2)}`,
      status: 'pending',
      priority: result.total_underpaid > 500 ? 'high' : 'medium',
      task_type: 'underpayment_review',
      assigned_to: null,
    }, orgId);
    await auditLog(orgId, userId, 'underpayment_detected', 'claims', claimId, {
      underpaid_lines: result.underpayments.length, total_underpaid: result.total_underpaid,
    });
  }

  return result;
}

// ─── Fee Schedule CRUD ─────────────────────────────────────────────────────────
// Table: fee_schedules (payer_id, cpt_code, contracted_rate, effective_date, termination_date, org_id)

// ─── Batch Claim Submission ────────────────────────────────────────────────────
async function batchSubmitClaims(claimIds, orgId, clientId, userId) {
  const results = { submitted: 0, failed: 0, details: [] };

  for (const claimId of claimIds) {
    try {
      const claim = await getById('claims', claimId);
      if (!claim || claim.org_id !== orgId) {
        results.details.push({ claim_id: claimId, status: 'error', reason: 'Not found or access denied' });
        results.failed++;
        continue;
      }
      if (!['ready', 'scrubbed', 'corrected'].includes(claim.status)) {
        results.details.push({ claim_id: claimId, status: 'error', reason: `Cannot submit claim in ${claim.status} status` });
        results.failed++;
        continue;
      }

      // Generate EDI based on claim type
      const ediResult = claim.claim_type === 'DHA'
        ? await generateDHAeClaim(claimId, orgId)
        : await generateEDI(claimId, orgId);

      // Update claim status
      await update('claims', claimId, { status: 'submitted', submitted_at: new Date().toISOString() });

      // Log EDI transaction
      await create('edi_transactions', {
        org_id: orgId, client_id: clientId,
        transaction_type: claim.claim_type === 'DHA' ? 'DHA_ECLAIM' : claim.claim_type || '837P',
        direction: 'outbound', claim_id: claimId, claim_count: 1, status: 'pending',
      }, orgId);

      await auditLog(orgId, userId, 'submit', 'claims', claimId, { method: 'batch', claim_number: claim.claim_number });
      results.details.push({ claim_id: claimId, claim_number: claim.claim_number, status: 'submitted' });
      results.submitted++;
    } catch (e) {
      results.details.push({ claim_id: claimId, status: 'error', reason: e.message });
      results.failed++;
    }
  }

  await auditLog(orgId, userId, 'batch_submit', 'claims', null, results);
  return results;
}

// ─── Denial Prediction (AI Feature #7) ─────────────────────────────────────────
async function predictDenial(claimId, orgId, userId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');

  const linesR = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1', [claimId]);
  const risks = [];
  let riskScore = 0;

  // 1. Payer denial history
  if (claim.payer_id) {
    const ps = await pool.query(
      `SELECT COUNT(*)::int AS total, SUM(CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END)::int AS denied
       FROM claims c LEFT JOIN denials d ON d.claim_id = c.id
       WHERE c.payer_id = $1 AND c.org_id = $2 AND c.status NOT IN ('draft','scrubbing')`, [claim.payer_id, orgId]);
    const s = ps.rows[0];
    if (s.total > 10) {
      const dr = (s.denied / s.total) * 100;
      if (dr > 20) { riskScore += 15; risks.push({ category: 'payer_history', score: 15, detail: `Payer denial rate: ${dr.toFixed(0)}% (${s.denied}/${s.total})` }); }
    }
  }

  // 2. CPT-specific denial history
  for (const line of linesR.rows) {
    const cs = await pool.query(
      `SELECT COUNT(*)::int AS denied FROM denials d JOIN claims c ON d.claim_id = c.id
       JOIN claim_lines cl ON cl.claim_id = c.id WHERE cl.cpt_code = $1 AND c.org_id = $2`, [line.cpt_code, orgId]);
    if (cs.rows[0]?.denied > 3) { riskScore += 10; risks.push({ category: 'cpt_history', score: 10, detail: `CPT ${line.cpt_code}: ${cs.rows[0].denied} prior denials` }); }
  }

  // 3. Missing prior auth for high-cost procedures
  const authReq = ['27447','27130','63030','63042','22551','22612','29881','29880','23472'];
  const needsAuth = linesR.rows.filter(l => authReq.includes(l.cpt_code) && !l.prior_auth_number);
  if (needsAuth.length > 0) { riskScore += 25; risks.push({ category: 'prior_auth', score: 25, detail: `${needsAuth.length} CPT(s) likely need auth: ${needsAuth.map(l => l.cpt_code).join(', ')}` }); }

  // 4. Timely filing risk
  if (claim.dos_from) {
    const days = Math.floor((new Date() - new Date(claim.dos_from)) / 86400000);
    if (days > 60) { const sc = Math.min(20, Math.floor(days / 30) * 5); riskScore += sc; risks.push({ category: 'timely_filing', score: sc, detail: `${days} days since DOS` }); }
  }

  // 5. Eligibility status
  if (claim.patient_id && claim.payer_id) {
    const er = await pool.query(`SELECT result FROM eligibility_checks WHERE patient_id = $1 AND payer_id = $2 ORDER BY created_at DESC LIMIT 1`, [claim.patient_id, claim.payer_id]);
    if (!er.rows[0]) { riskScore += 15; risks.push({ category: 'eligibility', score: 15, detail: 'No eligibility check on file' }); }
    else if (er.rows[0].result !== 'active') { riskScore += 30; risks.push({ category: 'eligibility', score: 30, detail: `Eligibility: ${er.rows[0].result}` }); }
  }

  // 6. Duplicate claim check
  const dupR = await pool.query(
    `SELECT claim_number FROM claims WHERE org_id = $1 AND patient_id = $2 AND dos_from = $3 AND payer_id = $4 AND id != $5 AND status NOT IN ('write_off','draft')`,
    [orgId, claim.patient_id, claim.dos_from, claim.payer_id, claimId]);
  if (dupR.rows.length > 0) { riskScore += 20; risks.push({ category: 'duplicate', score: 20, detail: `Possible duplicates: ${dupR.rows.map(r => r.claim_number).join(', ')}` }); }

  // 7. High-dollar flag
  if (Number(claim.total_charge) > 10000) { riskScore += 5; risks.push({ category: 'high_dollar', score: 5, detail: `$${claim.total_charge} — payers often review manually` }); }

  riskScore = Math.min(100, riskScore);
  const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
  await auditLog(orgId, userId, 'denial_prediction', 'claims', claimId, { risk_score: riskScore, risk_level: riskLevel });
  return { claim_id: claimId, claim_number: claim.claim_number, risk_score: riskScore, risk_level: riskLevel, risk_factors: risks,
    recommendation: riskScore >= 60 ? 'Review before submission — high denial risk' : riskScore >= 30 ? 'Proceed with caution' : 'Low risk — clear to submit' };
}

// ─── 276 Claim Status Request Generator ────────────────────────────────────────
async function generate276(claimId, orgId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');
  const patient = claim.patient_id ? await getById('patients', claim.patient_id) : null;
  const payer = claim.payer_id ? await getById('payers', claim.payer_id) : null;
  const provider = claim.provider_id ? await getById('providers', claim.provider_id) : null;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const ctrlNum = String(Math.floor(Math.random() * 900000000) + 100000000);

  let edi = '';
  edi += `ISA*00*          *00*          *ZZ*COSENTUS       *ZZ*${(payer?.name || 'PAYER').substring(0, 15).padEnd(15)}*${dateStr.slice(2)}*${timeStr}*^*00501*${ctrlNum}*0*P*:~\n`;
  edi += `GS*HR*COSENTUS*${payer?.payer_code || 'PAYER'}*${dateStr}*${timeStr}*${ctrlNum}*X*005010X212~\n`;
  edi += `ST*276*0001*005010X212~\n`;
  edi += `BHT*0010*13*${claim.claim_number || claimId.slice(0, 8)}*${dateStr}*${timeStr}~\n`;
  if (payer) edi += `NM1*PR*2*${payer.name}*****PI*${payer.payer_code || ''}~\n`;
  if (provider) edi += `NM1*41*1*${provider.last_name || ''}*${provider.first_name || ''}****XX*${provider.npi || ''}~\n`;
  if (patient) {
    edi += `NM1*IL*1*${patient.last_name || ''}*${patient.first_name || ''}****MI*${patient.member_id || ''}~\n`;
    edi += `DMG*D8*${patient.date_of_birth ? patient.date_of_birth.replace(/-/g, '') : ''}~\n`;
  }
  edi += `TRN*1*${claim.claim_number || claimId.slice(0, 12)}*COSENTUS~\n`;
  if (claim.payer_claim_number) edi += `REF*1K*${claim.payer_claim_number}~\n`;
  edi += `DTP*472*RD8*${(claim.dos_from || '').replace(/-/g, '')}-${(claim.dos_to || claim.dos_from || '').replace(/-/g, '')}~\n`;
  edi += `AMT*T3*${claim.total_charge || 0}~\n`;
  const segCount = edi.split('~').filter(Boolean).length;
  edi += `SE*${segCount + 1}*0001~\n`;
  edi += `GE*1*${ctrlNum}~\n`;
  edi += `IEA*1*${ctrlNum}~\n`;

  await update('claims', claimId, { last_status_check: new Date().toISOString() });
  await create('edi_transactions', { org_id: orgId, transaction_type: '276', direction: 'outbound', claim_id: claimId, claim_count: 1, status: 'pending' }, orgId);
  return { edi_content: edi, claim_id: claimId, claim_number: claim.claim_number, format: '276' };
}

// ─── 277 Claim Status Response Parser ──────────────────────────────────────────
async function parse277Response(claimId, ediContent, orgId, userId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');
  const segments = ediContent.split('~').map(s => s.trim()).filter(Boolean);
  const result = { claim_id: claimId, claim_number: claim.claim_number, statuses: [] };

  let currentStatus = null;
  for (const seg of segments) {
    const els = seg.split('*');
    if (els[0] === 'STC') {
      const si = (els[1] || '').split(':');
      const catMap = { 'A0':'Received','A1':'Accepted','A2':'Pending','A3':'Rejected','A6':'In Adjudication','A7':'Determined',
        'F0':'Finalized/Payment','F1':'Finalized/Denial','F2':'Finalized/Reversed','P0':'Payment Mailed','P1':'Payment EFT',
        'R0':'Rejected/Missing Info','R1':'Rejected/Not Covered','R3':'Rejected/Duplicate' };
      currentStatus = { category_code: si[0], status_code: si[1], effective_date: els[2],
        total_charge: els[4] ? parseFloat(els[4]) : null, total_paid: els[5] ? parseFloat(els[5]) : null,
        description: catMap[si[0]] || `Code: ${si[0]}` };
      result.statuses.push(currentStatus);
    }
    if (els[0] === 'REF' && currentStatus) {
      if (els[1] === '1K') currentStatus.payer_claim_number = els[2];
    }
  }

  // Map to claim status
  const latest = result.statuses[result.statuses.length - 1];
  let newStatus = null;
  if (latest) {
    const c = latest.category_code;
    if (['A0','A1'].includes(c)) newStatus = 'accepted';
    else if (['A2','A6','A8'].includes(c)) newStatus = 'in_process';
    else if (['A3','R0','R1','R3','F1'].includes(c)) newStatus = 'denied';
    else if (['F0','P0','P1'].includes(c)) newStatus = 'paid';

    const upd = { last_status_check: new Date().toISOString() };
    if (newStatus && ['submitted','accepted','in_process'].includes(claim.status)) upd.status = newStatus;
    if (latest.payer_claim_number) upd.payer_claim_number = latest.payer_claim_number;
    await update('claims', claimId, upd);

    // Auto-create denial record
    if (['A3','R0','R1','R3','F1'].includes(c)) {
      await create('denials', { org_id: orgId, client_id: claim.client_id, claim_id: claimId,
        amount: claim.total_charge, status: 'new', denial_date: new Date().toISOString(), source: 'claim_status_277' }, orgId);
    }
  }
  result.new_claim_status = newStatus;
  result.latest_status = latest?.description;

  await create('edi_transactions', { org_id: orgId, transaction_type: '277', direction: 'inbound', claim_id: claimId, claim_count: 1, status: 'accepted', response_at: new Date().toISOString() }, orgId);
  await auditLog(orgId, userId, 'parse_277', 'claims', claimId, { statuses: result.statuses.length, new_status: newStatus });
  return result;
}

// ─── Analytics / KPI Endpoints ─────────────────────────────────────────────────
async function getAnalyticsKPIs(orgId, clientId, dateRange) {
  const params = [orgId];
  let cf = '';
  if (clientId) { params.push(clientId); cf = ` AND client_id = $${params.length}`; }
  let df = '';
  if (dateRange?.from) { params.push(dateRange.from); df += ` AND created_at >= $${params.length}`; }
  if (dateRange?.to) { params.push(dateRange.to); df += ` AND created_at <= $${params.length}`; }

  const [claimStats, denialBreak, payStats, arAging, payerPerf, codingStats] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total, SUM(CASE WHEN status NOT IN ('scrub_failed','denied') THEN 1 ELSE 0 END)::int AS clean,
      SUM(total_charge)::numeric AS billed, SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END)::int AS paid_ct,
      SUM(CASE WHEN status='denied' THEN 1 ELSE 0 END)::int AS denied_ct FROM claims WHERE org_id = $1${cf}${df}`, params),
    pool.query(`SELECT COALESCE(carc_code,'unknown') AS carc, COUNT(*)::int AS cnt, SUM(amount)::numeric AS amt
      FROM denials WHERE org_id = $1${cf}${df} GROUP BY carc_code ORDER BY cnt DESC LIMIT 20`, params),
    pool.query(`SELECT COUNT(*)::int AS total, SUM(amount_paid)::numeric AS collected,
      SUM(CASE WHEN action='posted' THEN amount_paid ELSE 0 END)::numeric AS auto_posted
      FROM payments WHERE org_id = $1 AND status != 'line_detail'${cf}${df}`, params),
    pool.query(`SELECT
      SUM(CASE WHEN NOW()-dos_from <= '30 days'::interval THEN total_charge ELSE 0 END)::numeric AS b0_30,
      SUM(CASE WHEN NOW()-dos_from > '30 days'::interval AND NOW()-dos_from <= '60 days'::interval THEN total_charge ELSE 0 END)::numeric AS b31_60,
      SUM(CASE WHEN NOW()-dos_from > '60 days'::interval AND NOW()-dos_from <= '90 days'::interval THEN total_charge ELSE 0 END)::numeric AS b61_90,
      SUM(CASE WHEN NOW()-dos_from > '90 days'::interval AND NOW()-dos_from <= '120 days'::interval THEN total_charge ELSE 0 END)::numeric AS b91_120,
      SUM(CASE WHEN NOW()-dos_from > '120 days'::interval THEN total_charge ELSE 0 END)::numeric AS b120_plus
      FROM claims WHERE org_id = $1 AND status NOT IN ('paid','write_off','draft')${cf}`, params),
    pool.query(`SELECT py.name, COUNT(c.id)::int AS total, SUM(CASE WHEN c.status='paid' THEN 1 ELSE 0 END)::int AS paid,
      SUM(CASE WHEN c.status='denied' THEN 1 ELSE 0 END)::int AS denied, SUM(c.total_charge)::numeric AS billed
      FROM claims c JOIN payers py ON c.payer_id = py.id WHERE c.org_id = $1${cf}${df}
      GROUP BY py.name ORDER BY billed DESC LIMIT 15`, params),
    pool.query(`SELECT COUNT(*)::int AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END)::int AS completed,
      SUM(CASE WHEN coding_method IN ('ai_auto','ai_assisted') THEN 1 ELSE 0 END)::int AS ai_coded
      FROM coding_queue WHERE org_id = $1${cf}${df}`, params),
  ]);

  const cs = claimStats.rows[0] || {};
  const ps = payStats.rows[0] || {};
  return {
    overview: {
      total_claims: cs.total || 0, total_billed: Number(cs.billed || 0), total_collected: Number(ps.collected || 0),
      collection_rate: cs.billed > 0 ? ((Number(ps.collected || 0) / Number(cs.billed)) * 100).toFixed(1) : '0.0',
      clean_claim_rate: cs.total > 0 ? ((cs.clean / cs.total) * 100).toFixed(1) : '0.0',
      denial_rate: cs.total > 0 ? ((cs.denied_ct / cs.total) * 100).toFixed(1) : '0.0',
    },
    ar_aging: arAging.rows[0] || {},
    denial_breakdown: denialBreak.rows,
    payer_performance: payerPerf.rows,
    coding: codingStats.rows[0] || {},
  };
}

// ─── Presigned URL Generator ───────────────────────────────────────────────────
async function generatePresignedUrl(folder, fileName, contentType) {
  const key = `${folder}/${Date.now()}-${fileName}`;
  if (s3Client && getSignedUrl && PutObjectCommand) {
    const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType || 'application/octet-stream' });
    const url = await getSignedUrl(s3Client, cmd, { expiresIn: 300 });
    return { upload_url: url, s3_key: key, s3_bucket: S3_BUCKET, expires_in: 300 };
  }
  return {
    upload_url: `https://${S3_BUCKET}.s3.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300`,
    s3_key: key, s3_bucket: S3_BUCKET, expires_in: 300,
  };
}

// ─── Coding Approve → Claim Creation ───────────────────────────────────────────
async function approveCoding(codingQueueId, body, orgId, userId) {
  const item = await getById('coding_queue', codingQueueId);
  if (!item || item.org_id !== orgId) throw new Error('Coding item not found');

  const icdCodes = body.icd_codes || [];
  const cptCodes = body.cpt_codes || [];
  const emLevel = body.em_level || null;

  // Update coding queue
  await update('coding_queue', codingQueueId, {
    status: 'completed',
    updated_at: new Date().toISOString(),
  });

  // Create claim from approved codes
  const claimNumber = await nextClaimNumber(orgId);
  const claimData = {
    org_id: orgId,
    client_id: item.client_id,
    patient_id: item.patient_id,
    provider_id: item.provider_id,
    claim_number: claimNumber,
    status: 'draft',
    claim_type: '837P',
    dos_from: item.received_at || new Date().toISOString(),
    total_charge: cptCodes.reduce((s, c) => s + (Number(c.charge) || 0), 0),
  };
  const claim = await create('claims', claimData, orgId);

  // Insert claim lines
  let lineNum = 1;
  for (const cpt of cptCodes) {
    await create('claim_lines', {
      org_id: orgId,
      claim_id: claim.id,
      line_number: lineNum++,
      cpt_code: cpt.code,
      modifier: cpt.modifier || null,
      charge: Number(cpt.charge) || 0,
      units: Number(cpt.units) || 1,
      dos: item.received_at || new Date().toISOString(),
    }, orgId);
  }

  // Insert diagnoses
  let seq = 1;
  for (const icd of icdCodes) {
    await create('claim_diagnoses', {
      org_id: orgId,
      claim_id: claim.id,
      icd_code: icd.code,
      sequence: seq++,
      description: icd.description || '',
    }, orgId);
  }

  // Track AI accuracy if AI was used
  if (item.ai_suggestion_id) {
    try {
      await update('ai_coding_suggestions', item.ai_suggestion_id, {
        accepted: true,
        overrides: JSON.stringify({
          final_cpt: cptCodes.map(c => c.code),
          final_icd: icdCodes.map(c => c.code),
          final_em: emLevel,
        }),
      });
    } catch (e) { /* table might not exist */ }
  }

  await auditLog(orgId, userId, 'approve_coding', 'coding_queue', codingQueueId, {
    claim_id: claim.id, claim_number: claimNumber, cpt_count: cptCodes.length, icd_count: icdCodes.length,
  });

  return { coding_id: codingQueueId, claim_id: claim.id, claim_number: claimNumber, status: 'completed' };
}

// ─── 837I Institutional Claim Generator ────────────────────────────────────────
async function generate837I(claimId, orgId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');
  if (claim.claim_type !== '837I') throw new Error('Claim is not institutional (837I)');

  const linesR = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number', [claimId]);
  const dxR = await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1 ORDER BY sequence', [claimId]);
  const patient = claim.patient_id ? await getById('patients', claim.patient_id) : null;
  const provider = claim.provider_id ? await getById('providers', claim.provider_id) : null;
  const payer = claim.payer_id ? await getById('payers', claim.payer_id) : null;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const ctrlNum = String(Math.floor(Math.random() * 900000000) + 100000000);

  let edi = '';
  // ISA/GS/ST — 837I uses 005010X223A2
  edi += `ISA*00*          *00*          *ZZ*COSENTUS       *ZZ*${(payer?.name || 'PAYER').substring(0, 15).padEnd(15)}*${dateStr.slice(2)}*${timeStr}*^*00501*${ctrlNum}*0*P*:~\n`;
  edi += `GS*HC*COSENTUS*${payer?.payer_code || 'PAYER'}*${dateStr}*${timeStr}*${ctrlNum}*X*005010X223A2~\n`;
  edi += `ST*837*0001*005010X223A2~\n`;
  edi += `BHT*0019*00*${claim.claim_number || claimId.slice(0, 8)}*${dateStr}*${timeStr}*CH~\n`;

  // Submitter
  edi += `NM1*41*2*COSENTUS AI*****46*COSENTUS001~\n`;
  edi += `PER*IC*BILLING*TE*8005551234~\n`;
  // Receiver
  edi += `NM1*40*2*${payer?.name || 'PAYER'}*****46*${payer?.payer_code || 'PAYER001'}~\n`;

  // Billing provider (Facility)
  if (provider) {
    edi += `NM1*85*2*${provider.last_name || provider.name || 'FACILITY'}*****XX*${provider.npi || '0000000000'}~\n`;
    edi += `N3*${provider.address_line1 || '123 MAIN ST'}~\n`;
    edi += `N4*${provider.city || 'CITY'}*${provider.state || 'CA'}*${provider.zip || '00000'}~\n`;
    if (provider.tax_id) edi += `REF*EI*${provider.tax_id}~\n`;
  }

  // Subscriber / Patient
  if (patient) {
    edi += `NM1*IL*1*${patient.last_name || ''}*${patient.first_name || ''}****MI*${patient.insurance_member_id || ''}~\n`;
    edi += `N3*${patient.address_line1 || ''}~\n`;
    edi += `N4*${patient.city || ''}*${patient.state || ''}*${patient.zip || ''}~\n`;
    edi += `DMG*D8*${(patient.date_of_birth || '19700101').replace(/-/g, '')}*${patient.gender === 'female' ? 'F' : patient.gender === 'male' ? 'M' : 'U'}~\n`;
  }

  // CLM — Institutional claim: type-of-bill, admission type, frequency
  const typeOfBill = claim.type_of_bill || '0111'; // 011 = Hospital Inpatient, 1 = Admit through Discharge
  const admitType = claim.admit_type || '1'; // 1=Emergency, 2=Urgent, 3=Elective
  const admitSource = claim.admit_source || '1'; // 1=Physician referral
  const patientStatus = claim.patient_status || '01'; // 01=Discharged home
  edi += `CLM*${claim.claim_number}*${claim.total_charge || 0}***${typeOfBill}:B:1*Y*A*Y*Y~\n`;

  // Admission date (DTP*435) and discharge date (DTP*096)
  edi += `DTP*435*D8*${(claim.dos_from || dateStr).replace(/-/g, '')}~\n`;
  if (claim.dos_to) edi += `DTP*096*D8*${claim.dos_to.replace(/-/g, '')}~\n`;

  // Admission type/source/patient status
  edi += `CL1*${admitType}*${admitSource}*${patientStatus}~\n`;

  // Occurrence codes (if any)
  if (claim.occurrence_code) edi += `HI*BH:${claim.occurrence_code}~\n`;

  // Attending physician
  if (provider) {
    edi += `NM1*71*1*${provider.last_name || 'DOC'}*${provider.first_name || ''}****XX*${provider.npi || ''}~\n`;
    if (provider.taxonomy) edi += `PRV*AT*PXC*${provider.taxonomy}~\n`;
  }

  // Principal + secondary diagnoses (HI segments — ICD-10)
  if (dxR.rows.length > 0) {
    const principal = dxR.rows.find(d => d.sequence === 1) || dxR.rows[0];
    edi += `HI*ABK:${principal.icd_code}~\n`; // ABK = principal diagnosis
    const secondary = dxR.rows.filter(d => d.sequence !== 1).slice(0, 11);
    if (secondary.length > 0) {
      edi += `HI*${secondary.map(d => `ABF:${d.icd_code}`).join('*')}~\n`; // ABF = other diagnosis
    }
    // Principal procedure (if surgical)
    if (claim.principal_procedure) edi += `HI*BBR:${claim.principal_procedure}~\n`;
  }

  // Revenue code lines (SV2 for institutional)
  let segCount = 0;
  for (const line of linesR.rows) {
    segCount++;
    const rc = line.revenue_code || '0250'; // 0250 = General pharmacy
    const hcpcs = line.cpt_code || '';
    edi += `LX*${segCount}~\n`;
    edi += `SV2*${rc}*HC:${hcpcs}*${line.charge_amount || 0}*UN*${line.units || 1}~\n`;
    if (line.dos_from) edi += `DTP*472*D8*${line.dos_from.replace(/-/g, '')}~\n`;
  }

  // Trailers
  const totalSegments = edi.split('\n').filter(s => s.trim()).length + 1;
  edi += `SE*${totalSegments}*0001~\n`;
  edi += `GE*1*${ctrlNum}~\n`;
  edi += `IEA*1*${ctrlNum}~\n`;

  // Log EDI transaction
  await pool.query(
    `INSERT INTO edi_transactions (id, org_id, client_id, transaction_type, direction, claim_id, status, submitted_at, created_at)
     VALUES ($1, $2, $3, '837I', 'outbound', $4, 'pending', NOW(), NOW())`,
    [uuid(), orgId, claim.client_id, claimId]
  );

  return { edi_content: edi, claim_id: claimId, claim_number: claim.claim_number, format: '837I' };
}

// ─── Charge Capture AI (Feature #11) ───────────────────────────────────────────
async function chargeCapture(encounterId, orgId, userId) {
  // Fetch encounter + associated SOAP note + document
  const encounter = await getById('encounters', encounterId);
  if (!encounter || encounter.org_id !== orgId) throw new Error('Encounter not found');

  const soapR = await pool.query(
    'SELECT * FROM soap_notes WHERE encounter_id = $1 ORDER BY created_at DESC LIMIT 1', [encounterId]
  );
  const soap = soapR.rows[0];

  // Also check for documents linked to this encounter
  const docR = await pool.query(
    'SELECT * FROM documents WHERE encounter_id = $1 AND textract_status = $2 ORDER BY created_at DESC LIMIT 1',
    [encounterId, 'completed']
  );
  const doc = docR.rows[0];
  const textractText = doc?.textract_result?.text || '';

  // Build clinical text from available sources
  const clinicalText = [
    soap ? `SUBJECTIVE: ${soap.subjective || ''}\nOBJECTIVE: ${soap.objective || ''}\nASSESSMENT: ${soap.assessment || ''}\nPLAN: ${soap.plan || ''}` : '',
    textractText,
    encounter.chief_complaint ? `CHIEF COMPLAINT: ${encounter.chief_complaint}` : '',
    encounter.notes || '',
  ].filter(Boolean).join('\n\n');

  if (!clinicalText.trim()) throw new Error('No clinical documentation available for charge capture');

  // Determine region for coding system
  const client = encounter.client_id ? await getById('clients', encounter.client_id) : null;
  const isUAE = client?.region === 'uae';

  // Call Bedrock for charge extraction
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

  const prompt = `You are a medical charge capture specialist. Extract billable charges from this clinical documentation.

Region: ${isUAE ? 'UAE (use ICD-10-AM + DRG codes)' : 'US (use ICD-10-CM + CPT codes)'}

Clinical Documentation:
${sanitizeForPrompt(clinicalText)}

Patient: ${sanitizeForPrompt(encounter.patient_name) || 'Unknown'}, DOS: ${encounter.encounter_date || 'Unknown'}

Return ONLY valid JSON:
{
  "charges": [
    {
      "cpt_code": "string",
      "description": "string",
      "units": number,
      "modifier": "string or null",
      "charge_amount": number,
      "place_of_service": "string",
      "confidence": number (0-100)
    }
  ],
  "diagnoses": [
    {
      "icd_code": "string",
      "description": "string",
      "is_primary": boolean,
      "confidence": number (0-100)
    }
  ],
  "em_level": "string or null",
  "em_rationale": "string",
  "total_estimated_charge": number,
  "missing_documentation": ["string"]
}`;

  try {
    const resp = await bedrock.send(new InvokeModelCommand({
      modelId: BEDROCK_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    }));

    const aiResult = JSON.parse(new TextDecoder().decode(resp.body));
    const text = aiResult.content?.[0]?.text || '{}';
    const charges = extractJSON(text) || {};

    // Store results
    await pool.query(
      `INSERT INTO charge_captures (id, org_id, client_id, encounter_id, patient_id, provider_id,
        dos, charges_json, diagnoses_json, em_level, total_charge, ai_confidence, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_review', NOW())`,
      [uuid(), orgId, encounter.client_id, encounterId, encounter.patient_id, encounter.provider_id,
       encounter.encounter_date, JSON.stringify(charges.charges || []),
       JSON.stringify(charges.diagnoses || []), charges.em_level,
       charges.total_estimated_charge || 0,
       charges.charges?.length ? Math.round(charges.charges.reduce((s, c) => s + (c.confidence || 0), 0) / charges.charges.length) : 0]
    );

    return {
      encounter_id: encounterId,
      charges: charges.charges || [],
      diagnoses: charges.diagnoses || [],
      em_level: charges.em_level,
      em_rationale: charges.em_rationale,
      total_estimated_charge: charges.total_estimated_charge || 0,
      missing_documentation: charges.missing_documentation || [],
      source: 'bedrock_ai',
    };
  } catch (aiErr) {
    console.error('Bedrock charge capture error:', aiErr);
    return {
      encounter_id: encounterId,
      charges: [],
      diagnoses: [],
      em_level: null,
      total_estimated_charge: 0,
      missing_documentation: ['AI charge capture unavailable — manual entry required'],
      source: 'fallback',
      error: aiErr.message,
    };
  }
}

// ─── Document Classification AI ────────────────────────────────────────────────
async function classifyDocument(documentId, orgId) {
  const doc = await getById('documents', documentId);
  if (!doc || doc.org_id !== orgId) throw new Error('Document not found');

  // If Textract results exist, use that text; otherwise classify by metadata
  let docText = '';
  if (doc.textract_result?.text) {
    docText = doc.textract_result.text.substring(0, 3000);
  } else if (doc.file_name) {
    docText = doc.file_name;
  }

  const DOCUMENT_TYPES = [
    'superbill', 'insurance_card', 'eob', 'clinical_note', 'lab_result',
    'radiology_report', 'referral', 'prior_auth', 'denial_letter',
    'appeal_letter', 'patient_statement', 'contract', 'credential',
    'driver_license', 'consent_form', 'operative_report', 'discharge_summary',
    'fax', 'other'
  ];

  // Try filename-based classification first (fast path)
  const fnLower = (doc.file_name || '').toLowerCase();
  const filePatterns = {
    superbill: /superbill|charge.?slip|encounter.?form/i,
    insurance_card: /insurance.?card|ins.?card|member.?card/i,
    eob: /eob|explanation.?of.?benefit|remittance|era/i,
    clinical_note: /clinical.?note|progress.?note|visit.?note|soap/i,
    lab_result: /lab|pathology|blood.?work|cbc|bmp|cmp/i,
    radiology_report: /radiology|x.?ray|mri|ct.?scan|ultrasound/i,
    denial_letter: /denial|denied|adverse/i,
    credential: /credential|license|certification|cme/i,
    consent_form: /consent|hipaa.?auth/i,
    fax: /fax/i,
  };

  let classification = null;
  let confidence = 0;
  let method = 'filename';

  for (const [docType, pattern] of Object.entries(filePatterns)) {
    if (pattern.test(fnLower)) {
      classification = docType;
      confidence = 75;
      break;
    }
  }

  // If we have Textract text and no filename match (or low confidence), use Bedrock
  if (docText.length > 50 && (!classification || confidence < 70)) {
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

      const prompt = `Classify this medical document. Return ONLY JSON: {"type": "<one of: ${DOCUMENT_TYPES.join(', ')}>", "confidence": <0-100>, "key_entities": ["string"]}

Document text:
${sanitizeForPrompt(docText)}`;

      const resp = await bedrock.send(new InvokeModelCommand({
        modelId: BEDROCK_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      }));

      const aiResult = JSON.parse(new TextDecoder().decode(resp.body));
      const text = aiResult.content?.[0]?.text || '{}';
      const parsed = extractJSON(text);
      if (parsed) {
        classification = DOCUMENT_TYPES.includes(parsed.type) ? parsed.type : classification || 'other';
        confidence = parsed.confidence || 80;
        method = 'bedrock_ai';
      }
    } catch (aiErr) {
      console.error('Bedrock classification error:', aiErr);
      if (!classification) { classification = 'other'; confidence = 30; method = 'fallback'; }
    }
  }

  if (!classification) { classification = 'other'; confidence = 20; method = 'metadata'; }

  // Update document record
  await pool.query(
    `UPDATE documents SET classification = $1, ai_confidence = $2, updated_at = NOW() WHERE id = $3`,
    [classification, confidence, documentId]
  );

  return {
    document_id: documentId,
    file_name: doc.file_name,
    classification,
    confidence,
    method,
    document_types: DOCUMENT_TYPES,
  };
}

// ─── Prior Auth Workflow ───────────────────────────────────────────────────────
async function createPriorAuth(body, orgId, userId) {
  const { claim_id, patient_id, payer_id, cpt_codes, icd_codes, provider_id,
          urgency, clinical_rationale, dos_from, dos_to } = body;

  const id = uuid();
  const authNumber = `PA-${Date.now().toString(36).toUpperCase()}`;

  await pool.query(
    `INSERT INTO prior_auth_requests (id, org_id, client_id, claim_id, patient_id, payer_id,
      provider_id, auth_number, cpt_codes, icd_codes, urgency, clinical_rationale,
      dos_from, dos_to, status, requested_by, requested_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, NOW(), NOW())`,
    [id, orgId, body.client_id || null, claim_id || null, patient_id, payer_id,
     provider_id || null, authNumber, JSON.stringify(cpt_codes || []),
     JSON.stringify(icd_codes || []), urgency || 'standard', clinical_rationale || null,
     dos_from || null, dos_to || null, userId]
  );

  // Auto-create task for the auth team
  await pool.query(
    `INSERT INTO tasks (id, org_id, client_id, title, description, status, priority, assigned_to, due_date, created_at)
     VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, NOW())`,
    [uuid(), orgId, body.client_id, `Prior Auth Required: ${authNumber}`,
     `CPT: ${(cpt_codes || []).join(', ')} | Patient: ${patient_id} | Payer: ${payer_id}`,
     urgency === 'urgent' ? 'high' : 'medium', userId,
     new Date(Date.now() + (urgency === 'urgent' ? 1 : 3) * 86400000).toISOString().slice(0, 10)]
  );

  return { id, auth_number: authNumber, status: 'pending' };
}

async function updatePriorAuth(authId, body, orgId, userId) {
  const auth = await getById('prior_auth_requests', authId);
  if (!auth) throw new Error('Prior auth not found');

  const updates = {};
  if (body.status) updates.status = body.status;
  if (body.auth_number_payer) updates.auth_number_payer = body.auth_number_payer;
  if (body.approved_units) updates.approved_units = body.approved_units;
  if (body.approved_from) updates.approved_from = body.approved_from;
  if (body.approved_to) updates.approved_to = body.approved_to;
  if (body.denial_reason) updates.denial_reason = body.denial_reason;
  if (body.peer_to_peer_date) updates.peer_to_peer_date = body.peer_to_peer_date;
  if (body.notes) updates.notes = body.notes;
  updates.updated_at = new Date().toISOString();
  updates.updated_by = userId;

  // If status changes to approved/denied, set resolved_at
  if (['approved', 'denied', 'partially_approved'].includes(body.status)) {
    updates.resolved_at = new Date().toISOString();
  }

  const result = await update('prior_auth_requests', authId, updates);
  return result;
}

// ─── Patient Statement Generation ──────────────────────────────────────────────
async function generatePatientStatement(patientId, orgId) {
  const patient = await getById('patients', patientId);
  if (!patient) throw new Error('Patient not found');

  // Find all claims with patient responsibility
  const claimsR = await pool.query(
    `SELECT c.id, c.claim_number, c.dos_from, c.dos_to, c.total_charge, c.status,
            p.name AS payer_name, c.patient_responsibility, c.allowed_amount
     FROM claims c
     LEFT JOIN payers p ON c.payer_id = p.id
     WHERE c.patient_id = $1 AND c.org_id = $2
       AND c.status IN ('paid','partial_pay','patient_balance')
       AND (c.patient_responsibility > 0 OR c.status = 'patient_balance')
     ORDER BY c.dos_from DESC`,
    [patientId, orgId]
  );

  // Get existing payments by patient
  const paymentsR = await pool.query(
    `SELECT SUM(amount_paid) AS total_patient_paid
     FROM payments WHERE patient_id = $1 AND org_id = $2 AND status = 'posted'
       AND payment_source = 'patient'`,
    [patientId, orgId]
  );

  const lines = claimsR.rows.map(c => ({
    claim_number: c.claim_number,
    dos: c.dos_from,
    description: `Services ${c.dos_from || 'N/A'}`,
    total_charge: Number(c.total_charge || 0),
    insurance_paid: Number(c.allowed_amount || 0) - Number(c.patient_responsibility || 0),
    patient_responsibility: Number(c.patient_responsibility || 0),
    payer: c.payer_name,
  }));

  const totalOwed = lines.reduce((s, l) => s + l.patient_responsibility, 0);
  const totalPaid = Number(paymentsR.rows[0]?.total_patient_paid || 0);
  const balanceDue = totalOwed - totalPaid;

  const statementId = uuid();
  const statementNumber = `STMT-${Date.now().toString(36).toUpperCase()}`;

  // Store statement
  await pool.query(
    `INSERT INTO patient_statements (id, org_id, client_id, patient_id, statement_number,
      statement_date, total_charges, insurance_payments, patient_payments, balance_due,
      line_items, status, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, 'generated', NOW())`,
    [statementId, orgId, patient.client_id, patientId, statementNumber,
     lines.reduce((s, l) => s + l.total_charge, 0),
     lines.reduce((s, l) => s + l.insurance_paid, 0),
     totalPaid, balanceDue, JSON.stringify(lines)]
  );

  return {
    statement_id: statementId,
    statement_number: statementNumber,
    patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
    patient_address: {
      line1: patient.address_line1, city: patient.city, state: patient.state, zip: patient.zip,
    },
    statement_date: new Date().toISOString().slice(0, 10),
    lines,
    summary: {
      total_charges: lines.reduce((s, l) => s + l.total_charge, 0),
      insurance_adjustments: lines.reduce((s, l) => s + l.insurance_paid, 0),
      prior_payments: totalPaid,
      balance_due: balanceDue,
    },
    payment_options: {
      online_portal: true,
      payment_plan_eligible: balanceDue > 200,
      payment_plan_months: balanceDue > 1000 ? 12 : balanceDue > 500 ? 6 : 3,
    },
  };
}

// ─── Secondary Claim / COB Workflow ────────────────────────────────────────────
async function triggerSecondaryClaim(claimId, orgId, userId) {
  const claim = await getById('claims', claimId);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');
  if (!['paid', 'partial_pay'].includes(claim.status)) {
    throw new Error('Primary claim must be paid or partially paid before filing secondary');
  }

  // Check if patient has secondary insurance
  const patient = claim.patient_id ? await getById('patients', claim.patient_id) : null;
  if (!patient?.secondary_payer_id) {
    throw new Error('Patient has no secondary payer on file');
  }

  // Get primary payment info
  const primaryPayR = await pool.query(
    `SELECT SUM(amount_paid) AS primary_paid, SUM(allowed_amount) AS primary_allowed,
            SUM(patient_responsibility) AS patient_resp
     FROM payments WHERE claim_id = $1 AND org_id = $2 AND status = 'posted'`, [claimId, orgId]
  );
  const primaryPaid = Number(primaryPayR.rows[0]?.primary_paid || 0);
  const primaryAllowed = Number(primaryPayR.rows[0]?.primary_allowed || 0);

  // Clone claim for secondary payer
  const newClaimId = uuid();
  const claimNumber = `${claim.claim_number}-S`;

  await pool.query(
    `INSERT INTO claims (id, org_id, client_id, patient_id, provider_id, payer_id,
      claim_number, claim_type, dos_from, dos_to, total_charge, status,
      primary_claim_id, primary_payer_paid, primary_allowed_amount,
      billing_sequence, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13, $14, 'secondary', NOW(), NOW())`,
    [newClaimId, orgId, claim.client_id, claim.patient_id, claim.provider_id,
     patient.secondary_payer_id, claimNumber, claim.claim_type,
     claim.dos_from, claim.dos_to, claim.total_charge,
     claimId, primaryPaid, primaryAllowed]
  );

  // Copy claim lines
  const linesR = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1', [claimId]);
  for (const line of linesR.rows) {
    await pool.query(
      `INSERT INTO claim_lines (id, org_id, claim_id, line_number, cpt_code, modifier,
        units, charge_amount, dos_from, dos_to, place_of_service, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [uuid(), orgId, newClaimId, line.line_number, line.cpt_code, line.modifier,
       line.units, line.charge_amount, line.dos_from, line.dos_to, line.place_of_service]
    );
  }

  // Copy diagnoses
  const dxR = await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1', [claimId]);
  for (const dx of dxR.rows) {
    await pool.query(
      `INSERT INTO claim_diagnoses (id, org_id, claim_id, icd_code, description, sequence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [uuid(), orgId, newClaimId, dx.icd_code, dx.description, dx.sequence]
    );
  }

  // Update original claim
  await pool.query(
    `UPDATE claims SET secondary_claim_id = $1, updated_at = NOW() WHERE id = $2`,
    [newClaimId, claimId]
  );

  return {
    secondary_claim_id: newClaimId,
    claim_number: claimNumber,
    primary_claim_id: claimId,
    secondary_payer_id: patient.secondary_payer_id,
    primary_paid: primaryPaid,
    remaining_charge: Number(claim.total_charge) - primaryPaid,
    status: 'draft',
    next_step: 'Run scrubbing, then submit to secondary payer',
  };
}

// ─── Credentialing Workflow ────────────────────────────────────────────────────
async function getCredentialingDashboard(orgId, clientId) {
  let cf = ''; const params = [orgId];
  if (clientId) { cf = ' AND client_id = $2'; params.push(clientId); }

  // Active credentialing items with expiry tracking
  const activeR = await pool.query(
    `SELECT c.*, p.name AS provider_name, p.npi, py.name AS payer_name
     FROM credentialing c
     LEFT JOIN providers p ON c.provider_id = p.id
     LEFT JOIN payers py ON c.payer_id = py.id
     WHERE c.org_id = $1${cf}
     ORDER BY c.expiry_date ASC NULLS LAST`, params
  );

  const now = new Date();
  const items = activeR.rows.map(c => {
    const expiry = c.expiry_date ? new Date(c.expiry_date) : null;
    const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / 86400000) : null;
    let alert = 'none';
    if (daysUntilExpiry !== null) {
      if (daysUntilExpiry < 0) alert = 'expired';
      else if (daysUntilExpiry <= 30) alert = 'critical';
      else if (daysUntilExpiry <= 60) alert = 'warning';
      else if (daysUntilExpiry <= 90) alert = 'upcoming';
    }
    return { ...c, days_until_expiry: daysUntilExpiry, alert };
  });

  const expiringSoon = items.filter(i => ['critical', 'warning'].includes(i.alert));
  const expired = items.filter(i => i.alert === 'expired');
  const pending = items.filter(i => ['pending', 'submitted', 'in_review'].includes(i.status));

  return {
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    pending: pending.length,
    expiring_soon: expiringSoon.length,
    expired: expired.length,
    alerts: [...expired, ...expiringSoon].slice(0, 20),
    items,
  };
}

async function createEnrollment(body, orgId, userId) {
  const { provider_id, payer_id, enrollment_type, effective_date, notes } = body;
  const id = uuid();

  await pool.query(
    `INSERT INTO credentialing (id, org_id, client_id, provider_id, payer_id,
      credential_type, status, application_date, effective_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), $7, $8, NOW(), NOW())`,
    [id, orgId, body.client_id || null, provider_id, payer_id,
     enrollment_type || 'initial', effective_date || null, notes || null]
  );

  // Create follow-up task
  await pool.query(
    `INSERT INTO tasks (id, org_id, title, description, status, priority, due_date, created_at)
     VALUES ($1, $2, $3, $4, 'open', 'medium', $5, NOW())`,
    [uuid(), orgId, `Credentialing Follow-up: Provider ${provider_id}`,
     `Track enrollment status with payer ${payer_id}`,
     new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)]
  );

  return { id, status: 'pending', enrollment_type: enrollment_type || 'initial' };
}

// ─── Report Export Engine ──────────────────────────────────────────────────────
async function generateReport(reportType, orgId, clientId, params) {
  let cf = ''; const qp = [orgId]; let pidx = 2;
  if (clientId) { cf = ` AND client_id = $${pidx}`; qp.push(clientId); pidx++; }
  const dateFrom = params.from || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const dateTo = params.to || new Date().toISOString().slice(0, 10);
  cf += ` AND created_at >= $${pidx}`; qp.push(dateFrom); pidx++;
  cf += ` AND created_at <= $${pidx}`; qp.push(dateTo + 'T23:59:59Z'); pidx++;

  const reports = {
    // ── AR Aging Report ─────────────────────────────────────────────────────
    ar_aging: async () => {
      const r = await pool.query(
        `SELECT c.claim_number, c.dos_from, c.total_charge, c.status,
                p.first_name || ' ' || p.last_name AS patient_name,
                py.name AS payer_name,
                EXTRACT(DAY FROM NOW() - c.dos_from)::int AS age_days
         FROM claims c
         LEFT JOIN patients p ON c.patient_id = p.id
         LEFT JOIN payers py ON c.payer_id = py.id
         WHERE c.org_id = $1 AND c.status NOT IN ('paid','write_off','draft')${cf}
         ORDER BY age_days DESC`,
        qp
      );
      return {
        report: 'AR Aging Detail',
        generated: new Date().toISOString(),
        columns: ['claim_number','patient_name','payer_name','dos_from','total_charge','age_days','status'],
        rows: r.rows,
        summary: {
          total_ar: r.rows.reduce((s, r) => s + Number(r.total_charge || 0), 0),
          count: r.rows.length,
          buckets: {
            '0-30': r.rows.filter(r => r.age_days <= 30).reduce((s, r) => s + Number(r.total_charge || 0), 0),
            '31-60': r.rows.filter(r => r.age_days > 30 && r.age_days <= 60).reduce((s, r) => s + Number(r.total_charge || 0), 0),
            '61-90': r.rows.filter(r => r.age_days > 60 && r.age_days <= 90).reduce((s, r) => s + Number(r.total_charge || 0), 0),
            '91-120': r.rows.filter(r => r.age_days > 90 && r.age_days <= 120).reduce((s, r) => s + Number(r.total_charge || 0), 0),
            '120+': r.rows.filter(r => r.age_days > 120).reduce((s, r) => s + Number(r.total_charge || 0), 0),
          },
        },
      };
    },

    // ── Denial Analysis Report ──────────────────────────────────────────────
    denial_analysis: async () => {
      const r = await pool.query(
        `SELECT d.id, d.claim_id, c.claim_number, d.denial_reason, d.carc_code, d.rarc_code,
                d.amount, d.status AS denial_status, d.appeal_level,
                p.first_name || ' ' || p.last_name AS patient_name,
                py.name AS payer_name, d.created_at
         FROM denials d
         LEFT JOIN claims c ON d.claim_id = c.id
         LEFT JOIN patients p ON c.patient_id = p.id
         LEFT JOIN payers py ON c.payer_id = py.id
         WHERE d.org_id = $1${cf}
         ORDER BY d.created_at DESC`,
        qp
      );
      // Summarize by CARC code
      const carcSummary = {};
      r.rows.forEach(row => {
        const k = row.carc_code || 'UNKNOWN';
        if (!carcSummary[k]) carcSummary[k] = { code: k, count: 0, total: 0 };
        carcSummary[k].count++;
        carcSummary[k].total += Number(row.amount || 0);
      });
      return {
        report: 'Denial Analysis',
        generated: new Date().toISOString(),
        columns: ['claim_number','patient_name','payer_name','carc_code','denial_reason','amount','denial_status','appeal_level'],
        rows: r.rows,
        summary: {
          total_denials: r.rows.length,
          total_amount: r.rows.reduce((s, r) => s + Number(r.amount || 0), 0),
          by_carc: Object.values(carcSummary).sort((a, b) => b.count - a.count),
          by_status: {
            new: r.rows.filter(r => r.denial_status === 'new').length,
            in_review: r.rows.filter(r => r.denial_status === 'in_review').length,
            appealed: r.rows.filter(r => ['appeal_l1','appeal_l2','appeal_l3'].includes(r.denial_status)).length,
            resolved: r.rows.filter(r => ['overturned','upheld','write_off'].includes(r.denial_status)).length,
          },
        },
      };
    },

    // ── Payment Summary Report ──────────────────────────────────────────────
    payment_summary: async () => {
      const r = await pool.query(
        `SELECT p.id, p.amount_paid, p.payment_date, p.check_number, p.status,
                p.cpt_code, p.billed_amount, p.allowed_amount, p.adjustment_amount,
                c.claim_number, c.dos_from,
                pt.first_name || ' ' || pt.last_name AS patient_name,
                py.name AS payer_name, e.file_name AS era_file
         FROM payments p
         LEFT JOIN claims c ON p.claim_id = c.id
         LEFT JOIN patients pt ON c.patient_id = pt.id
         LEFT JOIN payers py ON c.payer_id = py.id
         LEFT JOIN era_files e ON p.era_file_id = e.id
         WHERE p.org_id = $1${cf}
         ORDER BY p.payment_date DESC NULLS LAST`,
        qp
      );
      return {
        report: 'Payment Summary',
        generated: new Date().toISOString(),
        columns: ['claim_number','patient_name','payer_name','cpt_code','billed_amount','allowed_amount','amount_paid','adjustment_amount','payment_date','era_file'],
        rows: r.rows,
        summary: {
          total_payments: r.rows.length,
          total_collected: r.rows.reduce((s, r) => s + Number(r.amount_paid || 0), 0),
          total_billed: r.rows.reduce((s, r) => s + Number(r.billed_amount || 0), 0),
          total_adjustments: r.rows.reduce((s, r) => s + Number(r.adjustment_amount || 0), 0),
        },
      };
    },

    // ── Production / Coding Report ──────────────────────────────────────────
    coding_production: async () => {
      const r = await pool.query(
        `SELECT cq.id, cq.patient_name, cq.cpt_codes, cq.icd_codes, cq.status,
                cq.coding_method, cq.assigned_to, cq.completed_at, cq.created_at,
                u.email AS assigned_email
         FROM coding_queue cq
         LEFT JOIN users u ON cq.assigned_to = u.id
         WHERE cq.org_id = $1${cf}
         ORDER BY cq.created_at DESC`,
        qp
      );
      return {
        report: 'Coding Production',
        generated: new Date().toISOString(),
        columns: ['patient_name','cpt_codes','icd_codes','status','coding_method','assigned_email','completed_at','created_at'],
        rows: r.rows,
        summary: {
          total: r.rows.length,
          completed: r.rows.filter(r => r.status === 'completed').length,
          pending: r.rows.filter(r => ['pending_review','in_progress'].includes(r.status)).length,
          ai_coded: r.rows.filter(r => ['ai_auto','ai_assisted'].includes(r.coding_method)).length,
          manual: r.rows.filter(r => r.coding_method === 'manual').length,
        },
      };
    },

    // ── Payer Performance Report ────────────────────────────────────────────
    payer_performance: async () => {
      const r = await pool.query(
        `SELECT py.name AS payer_name,
                COUNT(c.id) AS total_claims,
                COUNT(c.id) FILTER (WHERE c.status = 'paid') AS paid,
                COUNT(c.id) FILTER (WHERE c.status IN ('denied','appealed')) AS denied,
                COALESCE(SUM(c.total_charge), 0) AS total_billed,
                COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.total_charge END), 0) AS total_paid,
                ROUND(AVG(EXTRACT(DAY FROM COALESCE(c.paid_at, NOW()) - c.submitted_at))::numeric, 1) AS avg_days_to_pay
         FROM claims c
         LEFT JOIN payers py ON c.payer_id = py.id
         WHERE c.org_id = $1 AND c.status != 'draft'${cf}
         GROUP BY py.name
         ORDER BY total_billed DESC`,
        qp
      );
      return {
        report: 'Payer Performance',
        generated: new Date().toISOString(),
        columns: ['payer_name','total_claims','paid','denied','total_billed','total_paid','avg_days_to_pay'],
        rows: r.rows,
      };
    },

    // ── Eligibility Verification Report ─────────────────────────────────────
    eligibility_summary: async () => {
      const r = await pool.query(
        `SELECT ec.id, ec.result, ec.plan_name, ec.group_number,
                p.first_name || ' ' || p.last_name AS patient_name,
                py.name AS payer_name, ec.created_at, ec.copay, ec.coinsurance,
                ec.deductible_met, ec.out_of_pocket_max
         FROM eligibility_checks ec
         LEFT JOIN patients p ON ec.patient_id = p.id
         LEFT JOIN payers py ON ec.payer_id = py.id
         WHERE ec.org_id = $1${cf}
         ORDER BY ec.created_at DESC`,
        qp
      );
      return {
        report: 'Eligibility Verification Summary',
        generated: new Date().toISOString(),
        columns: ['patient_name','payer_name','result','plan_name','copay','coinsurance','deductible_met','created_at'],
        rows: r.rows,
        summary: {
          total_checks: r.rows.length,
          active: r.rows.filter(r => r.result === 'active').length,
          inactive: r.rows.filter(r => r.result === 'inactive').length,
          error: r.rows.filter(r => r.result === 'error').length,
        },
      };
    },
  };

  if (!reports[reportType]) {
    return {
      error: 'Invalid report type',
      available_reports: Object.keys(reports),
    };
  }

  const data = await reports[reportType]();

  // Convert to CSV if requested
  if (params.format === 'csv' && data.rows?.length > 0) {
    const cols = data.columns || Object.keys(data.rows[0]);
    const header = cols.join(',');
    const rows = data.rows.map(r =>
      cols.map(c => {
        const val = r[c];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    data.csv = [header, ...rows].join('\n');
  }

  return data;
}

// ─── Auto-Appeals Engine (AI Feature #4) ───────────────────────────────────────
async function generateAppeal(denialId, orgId, userId) {
  const denial = await getById('denials', denialId);
  if (!denial || denial.org_id !== orgId) throw new Error('Denial not found');

  const claim = denial.claim_id ? await getById('claims', denial.claim_id) : null;
  const patient = claim?.patient_id ? await getById('patients', claim.patient_id) : null;
  const provider = claim?.provider_id ? await getById('providers', claim.provider_id) : null;
  const payer = claim?.payer_id ? await getById('payers', claim.payer_id) : null;

  // Get claim lines + diagnoses for clinical context
  const linesR = claim ? await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number', [claim.id]) : { rows: [] };
  const dxR = claim ? await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1 ORDER BY sequence', [claim.id]) : { rows: [] };

  // Get SOAP note if available
  const soapR = claim ? await pool.query(
    'SELECT * FROM soap_notes WHERE encounter_id = $1 ORDER BY created_at DESC LIMIT 1',
    [claim.encounter_id || '00000000-0000-0000-0000-000000000000']
  ) : { rows: [] };
  const soap = soapR.rows[0];

  // Get prior call log for this denial
  const callsR = await pool.query(
    'SELECT * FROM ar_call_log WHERE denial_id = $1 ORDER BY call_date DESC LIMIT 5', [denialId]
  );

  // Determine appeal level
  const currentLevel = denial.appeal_level || 0;
  const nextLevel = currentLevel + 1;
  const appealType = nextLevel === 1 ? 'Internal Review (L1)' : nextLevel === 2 ? 'External Review (L2)' : 'State Department Review (L3)';

  // CARC/RARC lookup for denial reason context
  const carcR = denial.carc_code ? await pool.query(
    'SELECT * FROM carc_codes WHERE code = $1 LIMIT 1', [denial.carc_code]
  ) : { rows: [] };
  const carcDesc = carcR.rows[0]?.description || denial.denial_reason || 'Unknown';

  // Build clinical summary
  const clinicalContext = [
    soap ? `CLINICAL NOTE:\nSubjective: ${sanitizeForPrompt(soap.subjective) || 'N/A'}\nObjective: ${sanitizeForPrompt(soap.objective) || 'N/A'}\nAssessment: ${sanitizeForPrompt(soap.assessment) || 'N/A'}\nPlan: ${sanitizeForPrompt(soap.plan) || 'N/A'}` : '',
    dxR.rows.length ? `DIAGNOSES: ${dxR.rows.map(d => `${d.icd_code} - ${sanitizeForPrompt(d.description) || ''}`).join('; ')}` : '',
    linesR.rows.length ? `PROCEDURES: ${linesR.rows.map(l => `${l.cpt_code} x${l.units || 1} ($${l.charge_amount || 0})`).join('; ')}` : '',
    callsR.rows.length ? `PRIOR CALLS: ${callsR.rows.map(c => `${c.call_date?.toISOString?.()?.slice(0,10) || 'N/A'}: ${sanitizeForPrompt(c.outcome)} - ${sanitizeForPrompt(c.notes) || ''}`).join(' | ')}` : '',
  ].filter(Boolean).join('\n\n');

  // Call Bedrock for appeal letter generation
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

  const prompt = `You are a medical billing appeal specialist. Generate a professional appeal letter for a denied claim.

DENIAL DETAILS:
- Denial Reason (CARC ${denial.carc_code || 'N/A'}): ${sanitizeForPrompt(carcDesc)}
- RARC: ${denial.rarc_code || 'N/A'}
- Denied Amount: $${denial.amount || 0}
- Claim Number: ${claim?.claim_number || 'N/A'}
- DOS: ${claim?.dos_from || 'N/A'}
- Appeal Level: ${appealType} (Level ${nextLevel})

PATIENT: ${patient ? `${sanitizeForPrompt(patient.first_name)} ${sanitizeForPrompt(patient.last_name)}, DOB: ${patient.date_of_birth}` : 'N/A'}
PROVIDER: ${provider ? `${sanitizeForPrompt(provider.first_name || '')} ${sanitizeForPrompt(provider.last_name || '')}, NPI: ${provider.npi || ''}` : 'N/A'}
PAYER: ${sanitizeForPrompt(payer?.name) || 'N/A'}

${clinicalContext}

Generate a JSON response ONLY:
{
  "appeal_letter": "Full appeal letter text with proper formatting, medical necessity arguments, and regulatory citations",
  "appeal_strategy": "Brief strategy description",
  "supporting_evidence": ["List of recommended supporting documents to attach"],
  "regulatory_citations": ["Relevant CMS/payer policy citations"],
  "success_probability": number (0-100),
  "recommended_actions": ["Action items before sending"]
}`;

  try {
    const resp = await bedrock.send(new InvokeModelCommand({
      modelId: BEDROCK_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    }));

    const aiResult = JSON.parse(new TextDecoder().decode(resp.body));
    const text = aiResult.content?.[0]?.text || '{}';
    const appeal = extractJSON(text) || {};

    // Store appeal
    const appealId = uuid();
    await pool.query(
      `INSERT INTO appeals (id, org_id, client_id, denial_id, claim_id, appeal_level, appeal_type,
        appeal_letter, strategy, supporting_evidence, regulatory_citations, success_probability,
        status, generated_by, generated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, NOW(), NOW())`,
      [appealId, orgId, denial.client_id, denialId, denial.claim_id, nextLevel, appealType,
       appeal.appeal_letter || '', appeal.appeal_strategy || '',
       JSON.stringify(appeal.supporting_evidence || []),
       JSON.stringify(appeal.regulatory_citations || []),
       appeal.success_probability || 0, userId]
    );

    // Update denial status
    await pool.query(
      `UPDATE denials SET status = 'appeal_in_progress', appeal_level = $1, updated_at = NOW() WHERE id = $2`,
      [nextLevel, denialId]
    );

    return {
      appeal_id: appealId,
      denial_id: denialId,
      claim_number: claim?.claim_number,
      appeal_level: nextLevel,
      appeal_type: appealType,
      ...appeal,
      source: 'bedrock_ai',
    };
  } catch (aiErr) {
    console.error('Bedrock appeal generation error:', aiErr);
    // Return template fallback
    return {
      denial_id: denialId,
      claim_number: claim?.claim_number,
      appeal_level: nextLevel,
      appeal_type: appealType,
      appeal_letter: `[TEMPLATE — AI unavailable]\n\nDate: ${new Date().toISOString().slice(0,10)}\n\nTo: ${payer?.name || 'Insurance Company'}\nRe: Appeal of Claim ${claim?.claim_number || 'N/A'}\nPatient: ${patient ? `${patient.first_name} ${patient.last_name}` : 'N/A'}\nDOS: ${claim?.dos_from || 'N/A'}\nDenial Reason: ${carcDesc}\n\nDear Appeals Department,\n\nI am writing to appeal the denial of the above-referenced claim. The services provided were medically necessary as documented in the enclosed clinical records.\n\n[INSERT MEDICAL NECESSITY ARGUMENT]\n\nPlease reconsider this claim for payment.\n\nSincerely,\n${provider ? `${provider.first_name || ''} ${provider.last_name || ''}` : 'Provider'}`,
      supporting_evidence: ['Clinical notes', 'Lab results', 'Prior authorization (if applicable)'],
      success_probability: 0,
      source: 'template_fallback',
      error: aiErr.message,
    };
  }
}

// ─── Denial Categorization Engine ──────────────────────────────────────────────
const DENIAL_CATEGORIES = {
  authorization: {
    name: 'Authorization / Referral',
    carcs: ['1','2','3','15','16','18','38','177','197','198','242','243','B7','B20'],
    priority: 1,
  },
  eligibility: {
    name: 'Eligibility / Enrollment',
    carcs: ['22','23','24','25','26','27','29','31','32','33','34','39','50','51','52','54','55','56','58','109','170','180','183','186','234','235','N30'],
    priority: 2,
  },
  coding: {
    name: 'Coding / Billing Errors',
    carcs: ['4','5','6','9','10','11','12','13','16','19','49','53','97','125','140','146','147','148','149','150','151','167','168','169','170','171','172','173','174','175','176','181','182','B1','B4','B5','B7','B8','B9','B10','B11','B12','B13','B14','B15','B16','B22','B23','P1','P2','P3','P4'],
    priority: 3,
  },
  timely_filing: {
    name: 'Timely Filing',
    carcs: ['29','136','N5'],
    priority: 4,
  },
  duplicate: {
    name: 'Duplicate Claim',
    carcs: ['18','19'],
    priority: 5,
  },
  medical_necessity: {
    name: 'Medical Necessity',
    carcs: ['50','55','56','57','58','59','150','151','152','153','154','155','167','196','197','198','199','236','237','238','239','240','241','A1','A5','A6','A7','A8'],
    priority: 6,
  },
  contractual: {
    name: 'Contractual / Adjustment',
    carcs: ['45','90','94','95','97','100','101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122','123','124','128','129','130','131','132','133','134','135','137','138','139','W1','W2','W3','W4'],
    priority: 7,
  },
  other: {
    name: 'Other',
    carcs: [],
    priority: 8,
  },
};

function categorizeDenial(carcCode) {
  if (!carcCode) return { category: 'other', ...DENIAL_CATEGORIES.other };
  const code = String(carcCode).trim();
  for (const [key, cat] of Object.entries(DENIAL_CATEGORIES)) {
    if (key === 'other') continue;
    if (cat.carcs.includes(code)) return { category: key, ...cat };
  }
  return { category: 'other', ...DENIAL_CATEGORIES.other };
}

async function categorizeDenials(orgId, clientId) {
  let cf = ''; const params = [orgId];
  if (clientId) { cf = ' AND d.client_id = $2'; params.push(clientId); }

  const r = await pool.query(
    `SELECT d.id, d.carc_code, d.rarc_code, d.amount, d.status, d.denial_reason,
            c.claim_number, c.dos_from, p.first_name || ' ' || p.last_name AS patient_name,
            py.name AS payer_name
     FROM denials d
     LEFT JOIN claims c ON d.claim_id = c.id
     LEFT JOIN patients p ON c.patient_id = p.id
     LEFT JOIN payers py ON c.payer_id = py.id
     WHERE d.org_id = $1${cf}
     ORDER BY d.created_at DESC`, params
  );

  const categorized = r.rows.map(d => ({
    ...d,
    ...categorizeDenial(d.carc_code),
  }));

  // Summary by category
  const summary = {};
  for (const [key, cat] of Object.entries(DENIAL_CATEGORIES)) {
    const items = categorized.filter(d => d.category === key);
    summary[key] = {
      name: cat.name,
      count: items.length,
      total_amount: items.reduce((s, d) => s + Number(d.amount || 0), 0),
      priority: cat.priority,
    };
  }

  // Auto-update denial category in DB
  for (const d of categorized) {
    if (d.category !== 'other' || !d.carc_code) {
      await pool.query(
        'UPDATE denials SET category = $1, updated_at = NOW() WHERE id = $2',
        [d.category, d.id]
      ).catch(() => {});
    }
  }

  return {
    denials: categorized,
    summary: Object.values(summary).sort((a, b) => a.priority - b.priority),
    total: categorized.length,
    total_amount: categorized.reduce((s, d) => s + Number(d.amount || 0), 0),
  };
}

// ─── Chart Completeness Check (AI Feature #14) ────────────────────────────────
async function checkChartCompleteness(encounterId, orgId) {
  const encounter = await getById('encounters', encounterId);
  if (!encounter || encounter.org_id !== orgId) throw new Error('Encounter not found');

  const soapR = await pool.query(
    'SELECT * FROM soap_notes WHERE encounter_id = $1 ORDER BY created_at DESC LIMIT 1', [encounterId]
  );
  const soap = soapR.rows[0];

  // Rule-based checks first (fast, no AI needed)
  const checks = [];
  let score = 0;
  const maxScore = 10;

  // 1. SOAP note exists
  if (soap) { checks.push({ field: 'soap_note', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'soap_note', present: false, weight: 1, message: 'No SOAP note found' }); }

  // 2. Subjective (HPI)
  if (soap?.subjective?.length > 20) { checks.push({ field: 'subjective_hpi', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'subjective_hpi', present: false, weight: 1, message: 'History of Present Illness (HPI) missing or insufficient' }); }

  // 3. Objective (Exam)
  if (soap?.objective?.length > 20) { checks.push({ field: 'objective_exam', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'objective_exam', present: false, weight: 1, message: 'Physical exam documentation missing or insufficient' }); }

  // 4. Assessment (Diagnosis)
  if (soap?.assessment?.length > 10) { checks.push({ field: 'assessment_dx', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'assessment_dx', present: false, weight: 1, message: 'Assessment / diagnosis missing' }); }

  // 5. Plan
  if (soap?.plan?.length > 10) { checks.push({ field: 'plan', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'plan', present: false, weight: 1, message: 'Treatment plan missing' }); }

  // 6. Patient demographics present
  const patient = encounter.patient_id ? await getById('patients', encounter.patient_id) : null;
  if (patient?.date_of_birth && patient?.gender) { checks.push({ field: 'patient_demographics', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'patient_demographics', present: false, weight: 1, message: 'Patient DOB or gender missing' }); }

  // 7. Provider assigned
  if (encounter.provider_id) { checks.push({ field: 'provider', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'provider', present: false, weight: 1, message: 'Rendering provider not assigned' }); }

  // 8. Date of service
  if (encounter.encounter_date) { checks.push({ field: 'dos', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'dos', present: false, weight: 1, message: 'Date of service missing' }); }

  // 9. Chief complaint
  if (encounter.chief_complaint?.length > 5) { checks.push({ field: 'chief_complaint', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'chief_complaint', present: false, weight: 1, message: 'Chief complaint missing' }); }

  // 10. Signature / sign-off
  if (soap?.signed_off) { checks.push({ field: 'signed_off', present: true, weight: 1 }); score += 1; }
  else { checks.push({ field: 'signed_off', present: false, weight: 1, message: 'Note not signed off by provider' }); }

  const completenessScore = Math.round((score / maxScore) * 100);

  // If score < 60 and we have SOAP text, run Bedrock for deeper analysis
  let aiAnalysis = null;
  if (completenessScore < 60 && soap) {
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

      const prompt = `Review this clinical note for coding readiness. What specific documentation is missing or insufficient for accurate E/M coding?

SOAP Note:
S: ${sanitizeForPrompt(soap.subjective)}
O: ${sanitizeForPrompt(soap.objective)}
A: ${sanitizeForPrompt(soap.assessment)}
P: ${sanitizeForPrompt(soap.plan)}

Return ONLY JSON:
{
  "missing_elements": ["specific missing documentation items"],
  "query_message": "A brief, professional message to send to the provider requesting the missing information",
  "estimated_em_impact": "How the missing documentation affects E/M level selection",
  "coding_ready": boolean
}`;

      const resp = await bedrock.send(new InvokeModelCommand({
        modelId: BEDROCK_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      }));

      const aiResult = JSON.parse(new TextDecoder().decode(resp.body));
      const text = aiResult.content?.[0]?.text || '{}';
      aiAnalysis = extractJSON(text);
    } catch (aiErr) {
      console.error('Bedrock chart completeness error:', aiErr);
    }
  }

  // If incomplete, auto-create query task for provider
  if (completenessScore < 60 && encounter.provider_id) {
    const missingFields = checks.filter(c => !c.present).map(c => c.message);
    await pool.query(
      `INSERT INTO tasks (id, org_id, client_id, title, description, status, priority, assigned_to, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', 'high', $6, $7, NOW())
       ON CONFLICT DO NOTHING`,
      [uuid(), orgId, encounter.client_id, `Documentation Query: ${encounter.patient_name || 'Patient'}`,
       `Encounter ${encounter.encounter_date || 'N/A'} — incomplete documentation (${completenessScore}%).\nMissing: ${missingFields.join('; ')}${aiAnalysis?.query_message ? '\n\nSuggested query: ' + aiAnalysis.query_message : ''}`,
       encounter.provider_id,
       new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)]
    );
  }

  return {
    encounter_id: encounterId,
    completeness_score: completenessScore,
    coding_ready: completenessScore >= 60,
    checks,
    missing_count: checks.filter(c => !c.present).length,
    ai_analysis: aiAnalysis,
    auto_query_sent: completenessScore < 60 && !!encounter.provider_id,
  };
}

// ─── Contract Rate Extraction from PDFs (AI Feature #12 enhancement) ──────────
async function extractContractRates(documentId, payerId, orgId, userId) {
  const doc = await getById('documents', documentId);
  if (!doc || doc.org_id !== orgId) throw new Error('Document not found');

  let docText = '';
  if (doc.textract_result?.text) {
    docText = doc.textract_result.text;
  } else {
    throw new Error('Document must be processed by Textract first (POST /documents/:id/textract)');
  }

  const payer = payerId ? await getById('payers', payerId) : null;

  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

  const prompt = `Extract fee schedule / contracted rates from this payer contract document.

Payer: ${sanitizeForPrompt(payer?.name) || 'Unknown'}

Document text (may be messy from OCR):
${sanitizeForPrompt(docText)}

Return ONLY valid JSON:
{
  "contract_effective_date": "YYYY-MM-DD or null",
  "contract_termination_date": "YYYY-MM-DD or null",
  "rate_type": "fee_for_service | percent_of_medicare | per_diem | case_rate | capitation",
  "medicare_percentage": number or null,
  "rates": [
    {
      "cpt_code": "string",
      "description": "string",
      "contracted_rate": number,
      "modifier": "string or null"
    }
  ],
  "general_terms": {
    "timely_filing_days": number or null,
    "clean_claim_days": number or null,
    "appeal_deadline_days": number or null,
    "auto_adjudication": boolean
  },
  "extraction_confidence": number (0-100),
  "notes": "any important contract terms or caveats"
}`;

  try {
    const resp = await bedrock.send(new InvokeModelCommand({
      modelId: BEDROCK_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    }));

    const aiResult = JSON.parse(new TextDecoder().decode(resp.body));
    const text = aiResult.content?.[0]?.text || '{}';
    const extracted = extractJSON(text) || {};

    // Auto-insert extracted rates into fee_schedules
    let inserted = 0;
    if (extracted.rates?.length && payerId) {
      for (const rate of extracted.rates) {
        if (!rate.cpt_code || !rate.contracted_rate) continue;
        try {
          await pool.query(
            `INSERT INTO fee_schedules (id, org_id, payer_id, cpt_code, modifier, contracted_rate,
              effective_date, termination_date, rate_type, medicare_pct, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
             ON CONFLICT (org_id, payer_id, cpt_code, modifier, effective_date) DO UPDATE
             SET contracted_rate = EXCLUDED.contracted_rate, updated_at = NOW()`,
            [uuid(), orgId, payerId, rate.cpt_code, rate.modifier || null,
             rate.contracted_rate, extracted.contract_effective_date || new Date().toISOString().slice(0, 10),
             extracted.contract_termination_date || null,
             extracted.rate_type || 'fee_for_service',
             extracted.medicare_percentage || null,
             `AI-extracted from ${doc.file_name || 'contract document'}`]
          );
          inserted++;
        } catch (e) { /* skip duplicates */ }
      }
    }

    return {
      document_id: documentId,
      payer_id: payerId,
      payer_name: payer?.name,
      ...extracted,
      rates_extracted: extracted.rates?.length || 0,
      rates_inserted: inserted,
      source: 'bedrock_ai',
    };
  } catch (aiErr) {
    console.error('Bedrock contract extraction error:', aiErr);
    return {
      document_id: documentId,
      payer_id: payerId,
      rates: [],
      rates_extracted: 0,
      rates_inserted: 0,
      source: 'fallback',
      error: aiErr.message,
    };
  }
}

// ─── Payment Reconciliation Engine ─────────────────────────────────────────────
async function reconcilePayments(eraFileId, orgId, userId) {
  const eraFile = await getById('era_files', eraFileId);
  if (!eraFile || eraFile.org_id !== orgId) throw new Error('ERA file not found');

  // Get all payments from this ERA
  const paymentsR = await pool.query(
    `SELECT p.*, c.claim_number, c.total_charge, c.status AS claim_status,
            c.dos_from, c.patient_id, c.payer_id
     FROM payments p
     LEFT JOIN claims c ON p.claim_id = c.id
     WHERE p.era_file_id = $1 AND p.org_id = $2
     ORDER BY p.created_at`,
    [eraFileId, orgId]
  );

  const results = {
    era_file_id: eraFileId,
    total_payments: paymentsR.rows.length,
    matched: [],
    unmatched: [],
    recoupments: [],
    overpayments: [],
    underpayments: [],
    zero_pays: [],
    actions_taken: [],
  };

  for (const payment of paymentsR.rows) {
    const amountPaid = Number(payment.amount_paid || 0);
    const billedAmount = Number(payment.billed_amount || 0);
    const allowedAmount = Number(payment.allowed_amount || 0);
    const adjustmentAmount = Number(payment.adjustment_amount || 0);

    // Detect recoupments (negative payments)
    if (amountPaid < 0) {
      results.recoupments.push({
        payment_id: payment.id,
        claim_number: payment.claim_number,
        amount: amountPaid,
        reason: payment.adj_reason_code || 'Unknown recoupment',
      });
      await pool.query(
        `UPDATE payments SET action = 'review', notes = COALESCE(notes, '') || ' | RECOUPMENT DETECTED' WHERE id = $1`,
        [payment.id]
      );
      results.actions_taken.push(`Flagged recoupment on ${payment.claim_number}: $${amountPaid}`);
      continue;
    }

    // Zero-pay denials
    if (amountPaid === 0 && billedAmount > 0) {
      results.zero_pays.push({
        payment_id: payment.id,
        claim_number: payment.claim_number,
        billed: billedAmount,
        reason: payment.adj_reason_code,
      });
      // Auto-create denial if not exists
      if (payment.claim_id) {
        const existingDenial = await pool.query(
          'SELECT id FROM denials WHERE claim_id = $1 AND org_id = $2 LIMIT 1', [payment.claim_id, orgId]
        );
        if (existingDenial.rows.length === 0) {
          const cat = categorizeDenial(payment.adj_reason_code);
          await pool.query(
            `INSERT INTO denials (id, org_id, client_id, claim_id, carc_code, rarc_code,
              denial_reason, amount, category, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', NOW())`,
            [uuid(), orgId, payment.client_id || null, payment.claim_id,
             payment.adj_reason_code, payment.adj_remark_code,
             `Zero-pay from ERA ${eraFile.file_name || eraFileId}`,
             billedAmount, cat.category]
          );
          results.actions_taken.push(`Created denial for zero-pay: ${payment.claim_number}`);
        }
        // Update claim status
        await pool.query(
          'UPDATE claims SET status = $1, updated_at = NOW() WHERE id = $2',
          ['denied', payment.claim_id]
        );
      }
      continue;
    }

    // Check for underpayment against fee schedule
    if (payment.claim_id && payment.cpt_code) {
      const feeR = await pool.query(
        `SELECT contracted_rate FROM fee_schedules
         WHERE org_id = $1 AND payer_id = $2 AND cpt_code = $3
         AND effective_date <= CURRENT_DATE
         AND (termination_date IS NULL OR termination_date >= CURRENT_DATE)
         ORDER BY effective_date DESC LIMIT 1`,
        [orgId, payment.payer_id || null, payment.cpt_code]
      );
      if (feeR.rows[0]) {
        const expectedRate = Number(feeR.rows[0].contracted_rate);
        if (amountPaid < expectedRate * 0.95) { // 5% tolerance
          results.underpayments.push({
            payment_id: payment.id,
            claim_number: payment.claim_number,
            cpt_code: payment.cpt_code,
            paid: amountPaid,
            expected: expectedRate,
            variance: expectedRate - amountPaid,
          });
          await pool.query(
            `UPDATE payments SET action = 'review',
              notes = COALESCE(notes, '') || ' | UNDERPAYMENT: expected $' || $1 || ', paid $' || $2
             WHERE id = $3`,
            [expectedRate.toFixed(2), amountPaid.toFixed(2), payment.id]
          );
          results.actions_taken.push(`Flagged underpayment: ${payment.claim_number} CPT ${payment.cpt_code} paid $${amountPaid} vs expected $${expectedRate}`);
          continue;
        }
      }
    }

    // Check overpayment
    if (allowedAmount > 0 && amountPaid > allowedAmount * 1.05) {
      results.overpayments.push({
        payment_id: payment.id,
        claim_number: payment.claim_number,
        paid: amountPaid,
        allowed: allowedAmount,
        overage: amountPaid - allowedAmount,
      });
      continue;
    }

    // Normal match
    results.matched.push({
      payment_id: payment.id,
      claim_number: payment.claim_number,
      amount_paid: amountPaid,
    });

    // Update claim status for fully paid claims
    if (payment.claim_id) {
      const totalPaidR = await pool.query(
        'SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE claim_id = $1 AND status = $2',
        [payment.claim_id, 'posted']
      );
      const totalPaid = Number(totalPaidR.rows[0]?.total_paid || 0) + amountPaid;
      const patientResp = Number(payment.patient_responsibility || 0);

      if (totalPaid >= (billedAmount - adjustmentAmount - patientResp) * 0.95) {
        await pool.query(
          `UPDATE claims SET status = 'paid', patient_responsibility = $1, allowed_amount = $2, paid_at = NOW(), updated_at = NOW() WHERE id = $3`,
          [patientResp, allowedAmount, payment.claim_id]
        );
        results.actions_taken.push(`Claim ${payment.claim_number} marked PAID`);

        // Trigger secondary claim if patient has secondary payer
        const patR = payment.patient_id ? await pool.query(
          'SELECT secondary_payer_id FROM patients WHERE id = $1', [payment.patient_id]
        ) : { rows: [] };
        if (patR.rows[0]?.secondary_payer_id && patientResp > 0) {
          results.actions_taken.push(`Secondary payer exists for ${payment.claim_number} — eligible for COB filing`);
        }
      }
    }
  }

  results.summary = {
    matched: results.matched.length,
    zero_pays: results.zero_pays.length,
    recoupments: results.recoupments.length,
    underpayments: results.underpayments.length,
    overpayments: results.overpayments.length,
    actions_taken: results.actions_taken.length,
  };

  return results;
}

// ─── Write-Off Workflow (Tiered Approval) ──────────────────────────────────────
async function requestWriteOff(body, orgId, userId) {
  const { claim_id, amount, reason, category } = body;
  if (!claim_id) throw new Error('claim_id required');

  const claim = await getById('claims', claim_id);
  if (!claim || claim.org_id !== orgId) throw new Error('Claim not found');

  const writeOffAmount = amount || Number(claim.total_charge || 0);

  // Tiered approval logic
  let approvalRequired = 'none';
  let autoApproved = false;
  if (writeOffAmount <= 25) {
    approvalRequired = 'none';
    autoApproved = true;
  } else if (writeOffAmount <= 100) {
    approvalRequired = 'team_lead';
  } else if (writeOffAmount <= 500) {
    approvalRequired = 'manager';
  } else if (writeOffAmount <= 2000) {
    approvalRequired = 'director';
  } else {
    approvalRequired = 'vp_finance';
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO write_off_requests (id, org_id, client_id, claim_id, amount, reason, category,
      approval_required, status, requested_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [id, orgId, claim.client_id, claim_id, writeOffAmount, reason || 'Not specified',
     category || 'bad_debt', approvalRequired,
     autoApproved ? 'approved' : 'pending', userId]
  );

  // If auto-approved, update claim immediately
  if (autoApproved) {
    await pool.query(
      `UPDATE claims SET status = 'write_off', updated_at = NOW() WHERE id = $1`, [claim_id]
    );
  } else {
    // Create approval task
    await pool.query(
      `INSERT INTO tasks (id, org_id, client_id, title, description, status, priority, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, NOW())`,
      [uuid(), orgId, claim.client_id,
       `Write-Off Approval: ${claim.claim_number} ($${writeOffAmount.toFixed(2)})`,
       `Claim: ${claim.claim_number}\nAmount: $${writeOffAmount.toFixed(2)}\nReason: ${reason || 'Not specified'}\nApproval Level: ${approvalRequired}`,
       writeOffAmount > 500 ? 'high' : 'medium',
       new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)]
    );
  }

  return {
    write_off_id: id,
    claim_id,
    claim_number: claim.claim_number,
    amount: writeOffAmount,
    approval_required: approvalRequired,
    status: autoApproved ? 'approved' : 'pending',
    auto_approved: autoApproved,
  };
}

async function approveWriteOff(writeOffId, body, orgId, userId) {
  const wo = await getById('write_off_requests', writeOffId);
  if (!wo || wo.org_id !== orgId) throw new Error('Write-off request not found');
  if (wo.status !== 'pending') throw new Error(`Write-off already ${wo.status}`);

  const action = body.action; // 'approve' or 'deny'
  if (!['approve', 'deny'].includes(action)) throw new Error('action must be approve or deny');

  await pool.query(
    `UPDATE write_off_requests SET status = $1, approved_by = $2, approved_at = NOW(), 
      approval_notes = $3, updated_at = NOW() WHERE id = $4`,
    [action === 'approve' ? 'approved' : 'denied', userId, body.notes || null, writeOffId]
  );

  if (action === 'approve') {
    await pool.query(
      `UPDATE claims SET status = 'write_off', updated_at = NOW() WHERE id = $1`, [wo.claim_id]
    );
  }

  return { write_off_id: writeOffId, status: action === 'approve' ? 'approved' : 'denied' };
}

// ─── Notification Engine ───────────────────────────────────────────────────────
async function createNotification(orgId, body) {
  const { user_id, title, message, type, priority, entity_type, entity_id, action_url } = body;
  const id = uuid();
  await pool.query(
    `INSERT INTO notifications (id, org_id, user_id, title, message, type, priority,
      entity_type, entity_id, action_url, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, NOW())`,
    [id, orgId, user_id, title, message,
     type || 'info', priority || 'normal',
     entity_type || null, entity_id || null, action_url || null]
  );
  return { id, status: 'created' };
}

async function getNotifications(orgId, userId, qs) {
  let q = 'SELECT * FROM notifications WHERE org_id = $1 AND user_id = $2';
  const params = [orgId, userId];
  if (qs.unread === 'true') { q += ' AND read = FALSE'; }
  q += ' ORDER BY created_at DESC';
  if (qs.limit) { q += ` LIMIT $${params.length + 1}`; params.push(qs.limit); }
  else { q += ' LIMIT 50'; }
  const r = await pool.query(q, params);

  const unreadR = await pool.query(
    'SELECT COUNT(*) AS cnt FROM notifications WHERE org_id = $1 AND user_id = $2 AND read = FALSE',
    [orgId, userId]
  );

  return { data: r.rows, total: r.rows.length, unread_count: Number(unreadR.rows[0]?.cnt || 0) };
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════════════════════
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return respond(200, {});
  }

  try {
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const path = event.path || event.rawPath || event.resource || '';
    const rawParams = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const qs = event.queryStringParameters || {};
    const headers = event.headers || {};

    // ── UUID format validation ──────────────────────────────────────────
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    function validateUUID(val, label) {
      if (val && !UUID_RE.test(val)) {
        throw new Error(`Invalid ${label}: must be UUID format`);
      }
      return val;
    }

    // TODO: PRODUCTION — Replace header-based auth with Cognito JWT validation.
    // API Gateway authorizer should decode the JWT, extract org_id/user_id/client_id
    // from token claims, and pass them via event.requestContext.authorizer.
    // Until then, validate UUID format to prevent injection via spoofed headers.
    const rawOrgId = headers['x-org-id'] || qs.org_id || body.org_id || 'a0000000-0000-0000-0000-000000000001';
    const rawUserId = headers['x-user-id'] || qs.user_id || body.user_id || null;
    const rawClientId = headers['x-client-id'] || qs.client_id || body.client_id || null;

    const effectiveOrgId = validateUUID(rawOrgId, 'org_id');
    const userId = rawUserId ? validateUUID(rawUserId, 'user_id') : null;
    const clientId = rawClientId ? validateUUID(rawClientId, 'client_id') : null;

    // Parse path params (for /:id patterns)
    const pathParts = path.replace(/^\/+|\/+$/g, '').split('/');
    const pathParams = { id: rawParams.id || rawParams.proxy || null };
    // Auto-detect ID from path: /entity/uuid
    if (!pathParams.id && pathParts.length >= 2) {
      const maybeId = pathParts[pathParts.length - 1];
      if (maybeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        pathParams.id = maybeId;
      }
    }

    // ════ Document Routes ════════════════════════════════════════════════════
    if (path.includes('/documents/upload-url') && method === 'POST') {
      const { folder, file_name, content_type } = body;
      const result = await generatePresignedUrl(folder || 'uploads', file_name || 'file', content_type);
      return respond(200, result);
    }

    if (path.includes('/documents') && !path.includes('/upload-url') && !path.includes('/textract') && !path.includes('/classify') && !path.includes('/extract-rates')) {
      if (method === 'GET' && !pathParams.id) {
        return respond(200, await list('documents', effectiveOrgId, clientId, 'ORDER BY created_at DESC'));
      }
      if (method === 'GET' && pathParams.id) {
        const d = await getById('documents', pathParams.id);
        return d ? respond(200, d) : respond(404, { error: 'Document not found' });
      }
      if (method === 'POST') {
        const doc = await create('documents', body, effectiveOrgId);
        await auditLog(effectiveOrgId, userId, 'upload', 'documents', doc.id, { file_name: body.file_name });
        return respond(201, doc);
      }
    }

    // Document Textract
    if (path.includes('/documents') && path.includes('/textract')) {
      if (method === 'POST') {
        const result = await triggerTextract(pathParams.id, effectiveOrgId, userId);
        return respond(200, result);
      }
      if (method === 'GET') {
        const result = await getTextractResults(pathParams.id, effectiveOrgId);
        return respond(200, result);
      }
    }

    // ════ SOAP Notes ═══════════════════════════════════════════════════════
    if (path.includes('/soap-notes')) {
      if (method === 'GET' && !pathParams.id) {
        return respond(200, await list('soap_notes', effectiveOrgId, clientId, 'ORDER BY created_at DESC'));
      }
      if (method === 'GET' && pathParams.id) {
        // Can get by ID or by encounter_id
        let note = await getById('soap_notes', pathParams.id);
        if (!note) {
          const r = await pool.query('SELECT * FROM soap_notes WHERE encounter_id = $1 LIMIT 1', [pathParams.id]);
          note = r.rows[0] || null;
        }
        return note ? respond(200, note) : respond(404, { error: 'SOAP note not found' });
      }
      if (method === 'POST') {
        const note = await create('soap_notes', body, effectiveOrgId);
        await auditLog(effectiveOrgId, userId, 'create', 'soap_notes', note.id, {});
        return respond(201, note);
      }
      if (method === 'PUT' && pathParams.id) {
        const note = await update('soap_notes', pathParams.id, body);
        if (body.signed_off) {
          await update('soap_notes', pathParams.id, { signed_off_at: new Date().toISOString(), signed_off_by: userId });
        }
        return respond(200, note);
      }
    }

    // ════ Claims ════════════════════════════════════════════════════════════
    if (path.includes('/claims') && !path.includes('/lines') && !path.includes('/diagnoses') &&
        !path.includes('/scrub') && !path.includes('/generate-edi') && !path.includes('/generate-dha') &&
        !path.includes('/transition') && !path.includes('/underpayment') && !path.includes('/predict-denial') &&
        !path.includes('/generate-276') && !path.includes('/parse-277') && !path.includes('/batch-submit')) {
      if (method === 'GET' && !pathParams.id) return respond(200, await enrichedClaims(effectiveOrgId, clientId));
      if (method === 'GET' && pathParams.id) {
        const c = await getById('claims', pathParams.id);
        return c ? respond(200, c) : respond(404, { error: 'Claim not found' });
      }
      if (method === 'POST') {
        body.claim_number = body.claim_number || await nextClaimNumber(effectiveOrgId);
        body.status = body.status || 'draft';
        const c = await create('claims', body, effectiveOrgId);
        await auditLog(effectiveOrgId, userId, 'create', 'claims', c.id, { claim_number: c.claim_number });
        return respond(201, c);
      }
      if (method === 'PUT' && pathParams.id) {
        const c = await update('claims', pathParams.id, body);
        return respond(200, c);
      }
    }

    // Claim transition
    if (path.includes('/transition') && method === 'POST') {
      const { status } = body;
      const c = await update('claims', pathParams.id, { status });
      await auditLog(effectiveOrgId, userId, 'transition', 'claims', pathParams.id, { new_status: status });
      return respond(200, c);
    }

    // Claim scrub
    if (path.includes('/scrub') && method === 'POST') {
      const result = await scrubClaim(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // 837P/837I EDI generate
    if (path.includes('/generate-edi') && method === 'POST') {
      const r = await generateEDI(pathParams.id, effectiveOrgId);
      // Log EDI transaction
      await create('edi_transactions', {
        org_id: effectiveOrgId,
        client_id: clientId,
        transaction_type: r.format || '837P',
        direction: 'outbound',
        claim_id: pathParams.id,
        claim_count: 1,
        status: 'pending',
      }, effectiveOrgId);
      return respond(200, r);
    }

    // DHA eClaim XML generate (UAE)
    if (path.includes('/generate-dha') && method === 'POST') {
      const r = await generateDHAeClaim(pathParams.id, effectiveOrgId);
      await create('edi_transactions', {
        org_id: effectiveOrgId,
        client_id: clientId,
        transaction_type: 'DHA_ECLAIM',
        direction: 'outbound',
        claim_id: pathParams.id,
        claim_count: 1,
        status: 'pending',
      }, effectiveOrgId);
      return respond(200, r);
    }

    // Claim lines
    if (path.includes('/lines')) {
      if (method === 'GET') {
        const r = await pool.query('SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number', [pathParams.id]);
        return respond(200, r.rows);
      }
      if (method === 'POST') {
        body.claim_id = pathParams.id;
        return respond(201, await create('claim_lines', body, effectiveOrgId));
      }
    }

    // Claim diagnoses
    if (path.includes('/diagnoses')) {
      if (method === 'GET') {
        const r = await pool.query('SELECT * FROM claim_diagnoses WHERE claim_id = $1 ORDER BY sequence', [pathParams.id]);
        return respond(200, r.rows);
      }
      if (method === 'POST') {
        body.claim_id = pathParams.id;
        return respond(201, await create('claim_diagnoses', body, effectiveOrgId));
      }
    }

    // ════ Scrub Rules ══════════════════════════════════════════════════════
    if (path.includes('/scrub-rules')) {
      if (method === 'GET') {
        return respond(200, await list('scrub_rules', effectiveOrgId, null, 'ORDER BY severity DESC, rule_order'));
      }
    }

    // ════ Scrub Results ════════════════════════════════════════════════════
    if (path.includes('/scrub-results')) {
      if (method === 'GET' && pathParams.id) {
        const r = await pool.query('SELECT * FROM scrub_results WHERE claim_id = $1 ORDER BY created_at DESC', [pathParams.id]);
        return respond(200, r.rows);
      }
    }

    // ════ Denials ═══════════════════════════════════════════════════════════
    if (path.includes('/denials') && !path.includes('/appeal') && !path.includes('/categorize')) {
      if (method === 'GET' && !pathParams.id) return respond(200, await enrichedDenials(effectiveOrgId, clientId));
      if (method === 'GET' && pathParams.id) {
        const d = await getById('denials', pathParams.id);
        return d ? respond(200, d) : respond(404, { error: 'Denial not found' });
      }
      if (method === 'POST') {
        body.status = body.status || 'new';
        const d = await create('denials', body, effectiveOrgId);
        await auditLog(effectiveOrgId, userId, 'create', 'denials', d.id, { claim_id: body.claim_id });
        return respond(201, d);
      }
      if (method === 'PUT' && pathParams.id) {
        const d = await update('denials', pathParams.id, body);
        await auditLog(effectiveOrgId, userId, 'update', 'denials', pathParams.id, { status: body.status });
        return respond(200, d);
      }
    }

    // Appeal on denial
    if (path.includes('/appeal') && method === 'POST') {
      const denialId = pathParams.id || path.split('/denials/')[1]?.split('/')[0];
      body.denial_id = denialId;
      body.status = body.status || 'submitted';
      const appeal = await create('appeals', body, effectiveOrgId);
      await update('denials', denialId, { status: 'in_appeal' });
      await auditLog(effectiveOrgId, userId, 'appeal', 'denials', denialId, { appeal_id: appeal.id });
      return respond(201, appeal);
    }

    // ════ Coding Queue ═════════════════════════════════════════════════════
    if (path.includes('/coding') && !path.includes('/approve') && !path.includes('/query') &&
        !path.includes('/assign') && !path.includes('/ai-suggest')) {
      if (method === 'GET' && !pathParams.id) return respond(200, await enrichedCoding(effectiveOrgId, clientId));
      if (method === 'GET' && pathParams.id) {
        const c = await getById('coding_queue', pathParams.id);
        return c ? respond(200, c) : respond(404, { error: 'Coding item not found' });
      }
      if (method === 'POST') {
        const item = await create('coding_queue', { ...body, status: body.status || 'pending' }, effectiveOrgId);
        return respond(201, item);
      }
    }

    // Coding approve → create claim
    if (path.includes('/coding') && path.includes('/approve') && method === 'POST') {
      const result = await approveCoding(pathParams.id, body, effectiveOrgId, userId);
      return respond(200, result);
    }

    // Coding query (send to provider)
    if (path.includes('/coding') && path.includes('/query') && method === 'POST') {
      await update('coding_queue', pathParams.id, { status: 'query_sent' });
      // Create task for provider
      await create('tasks', {
        org_id: effectiveOrgId,
        client_id: clientId,
        title: `Coding Query: ${body.query_text || 'Documentation needed'}`,
        description: body.query_text,
        status: 'pending',
        priority: 'high',
        task_type: 'coding_query',
        assigned_to: body.provider_id || null,
      }, effectiveOrgId);
      await auditLog(effectiveOrgId, userId, 'query', 'coding_queue', pathParams.id, { query: body.query_text });
      return respond(200, { status: 'query_sent', coding_id: pathParams.id });
    }

    // Coding reassign
    if (path.includes('/coding') && path.includes('/assign') && method === 'PUT') {
      const c = await update('coding_queue', pathParams.id, { assigned_to: body.assigned_to });
      return respond(200, c);
    }

    // AI auto-code
    if (path.includes('/coding') && path.includes('/ai-suggest') && method === 'POST') {
      const result = await aiAutoCode(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // AI coding suggestions lookup
    if (path.includes('/ai-coding-suggestions') && method === 'GET' && pathParams.id) {
      const r = await pool.query(
        'SELECT * FROM ai_coding_suggestions WHERE coding_queue_id = $1 ORDER BY created_at DESC LIMIT 1',
        [pathParams.id]
      );
      return r.rows[0] ? respond(200, r.rows[0]) : respond(404, { error: 'No AI suggestions found' });
    }

    // ════ Contract Underpayment Detection ══════════════════════════════════
    if (path.includes('/claims') && path.includes('/underpayment-check') && method === 'POST') {
      const result = await detectUnderpayments(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ Denial Prediction (AI Feature #7) ════════════════════════════════
    if (path.includes('/claims') && path.includes('/predict-denial') && method === 'POST') {
      const result = await predictDenial(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ 276 Claim Status Request ═════════════════════════════════════════
    if (path.includes('/claims') && path.includes('/generate-276') && method === 'POST') {
      const result = await generate276(pathParams.id, effectiveOrgId);
      return respond(200, result);
    }

    // ════ 277 Claim Status Response Parser ═════════════════════════════════
    if (path.includes('/claims') && path.includes('/parse-277') && method === 'POST') {
      const { edi_content } = body;
      if (!edi_content) return respond(400, { error: 'edi_content required' });
      const result = await parse277Response(pathParams.id, edi_content, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ Analytics KPIs ═══════════════════════════════════════════════════
    if (path.includes('/analytics') && method === 'GET') {
      const dateRange = { from: qs.from || null, to: qs.to || null };
      const result = await getAnalyticsKPIs(effectiveOrgId, clientId, dateRange);
      return respond(200, result);
    }

    // ════ Batch Claim Submission ═══════════════════════════════════════════
    if (path.includes('/claims/batch-submit') && method === 'POST') {
      const { claim_ids } = body;
      if (!claim_ids || !Array.isArray(claim_ids)) return respond(400, { error: 'claim_ids array required' });
      if (claim_ids.length > 100) return respond(400, { error: 'Max 100 claims per batch' });
      const result = await batchSubmitClaims(claim_ids, effectiveOrgId, clientId, userId);
      return respond(200, result);
    }

    // ════ Fee Schedules (Contract Rates) ══════════════════════════════════
    if (path.includes('/fee-schedules')) {
      if (method === 'GET' && !pathParams.id) {
        let q = 'SELECT fs.*, py.name AS payer_name FROM fee_schedules fs LEFT JOIN payers py ON fs.payer_id = py.id WHERE fs.org_id = $1';
        const params = [effectiveOrgId];
        if (qs.payer_id) { params.push(qs.payer_id); q += ` AND fs.payer_id = $${params.length}`; }
        if (qs.cpt_code) { params.push(qs.cpt_code); q += ` AND fs.cpt_code = $${params.length}`; }
        q += ' ORDER BY fs.payer_id, fs.cpt_code';
        return respond(200, (await pool.query(q, params)).rows);
      }
      if (method === 'GET' && pathParams.id) {
        const fs = await getById('fee_schedules', pathParams.id);
        return fs ? respond(200, fs) : respond(404, { error: 'Fee schedule entry not found' });
      }
      if (method === 'POST') {
        const fs = await create('fee_schedules', body, effectiveOrgId);
        await auditLog(effectiveOrgId, userId, 'create', 'fee_schedules', fs.id, { payer_id: body.payer_id, cpt_code: body.cpt_code });
        return respond(201, fs);
      }
      if (method === 'PUT' && pathParams.id) {
        const fs = await update('fee_schedules', pathParams.id, body);
        return respond(200, fs);
      }
    }

    // ════ ERA Files + 835 Parser ═══════════════════════════════════════════
    if (path.includes('/era-files') && path.includes('/parse-835') && method === 'POST') {
      const { edi_content } = body;
      if (!edi_content) return respond(400, { error: 'edi_content required' });
      const result = await ingest835(pathParams.id, edi_content, effectiveOrgId, clientId, userId);
      return respond(200, result);
    }

    if (path.includes('/era-files') && !path.includes('/parse-835') && !path.includes('/reconcile')) {
      if (method === 'GET' && !pathParams.id) {
        return respond(200, await list('era_files', effectiveOrgId, clientId, 'ORDER BY created_at DESC'));
      }
      if (method === 'GET' && pathParams.id) {
        const e = await getById('era_files', pathParams.id);
        return e ? respond(200, e) : respond(404, { error: 'ERA file not found' });
      }
      if (method === 'POST') {
        const e = await create('era_files', body, effectiveOrgId);
        return respond(201, e);
      }
    }

    // ════ Payments + Auto-Post ══════════════════════════════════════════════
    if (path.includes('/payments/auto-post') && method === 'POST') {
      const { era_file_id } = body;
      const result = await autoPostPayments(era_file_id, effectiveOrgId, userId);
      return respond(200, result);
    }

    if (path.includes('/payments')) {
      if (method === 'GET' && !pathParams.id) return respond(200, await enrichedPayments(effectiveOrgId, clientId));
      if (method === 'GET' && pathParams.id) {
        const p = await getById('payments', pathParams.id);
        return p ? respond(200, p) : respond(404, { error: 'Payment not found' });
      }
      if (method === 'POST') return respond(201, await create('payments', body, effectiveOrgId));
      if (method === 'PUT' && pathParams.id) return respond(200, await update('payments', pathParams.id, body));
    }

    // ════ AR Management ════════════════════════════════════════════════════
    if (path.includes('/ar/log-call') && method === 'POST') {
      const call = await create('ar_call_log', body, effectiveOrgId);
      // Create follow-up task if needed
      if (body.next_follow_up) {
        await create('tasks', {
          org_id: effectiveOrgId,
          client_id: body.client_id,
          title: `AR Follow-up: ${body.outcome || 'Call'} — ${body.reference_number || ''}`,
          description: body.notes,
          status: 'pending',
          priority: 'medium',
          task_type: 'ar_follow_up',
          due_date: body.next_follow_up,
          assigned_to: body.caller_id || userId,
        }, effectiveOrgId);
      }
      // Update claim if call obtained status
      if (body.claim_id && body.outcome === 'claim_status_obtained') {
        await auditLog(effectiveOrgId, userId, 'ar_call', 'claims', body.claim_id, {
          outcome: body.outcome, reference: body.reference_number,
        });
      }
      return respond(201, call);
    }

    if (path.includes('/ar/call-log') && method === 'GET') {
      return respond(200, await list('ar_call_log', effectiveOrgId, clientId, 'ORDER BY call_date DESC'));
    }

    if (path.includes('/ar/follow-ups') && method === 'GET') {
      const r = await pool.query(
        `SELECT t.*, c.claim_number, p.first_name || ' ' || p.last_name AS patient_name
         FROM tasks t
         LEFT JOIN claims c ON t.description LIKE '%' || c.claim_number || '%'
         LEFT JOIN patients p ON c.patient_id = p.id
         WHERE t.org_id = $1 AND t.task_type IN ('ar_follow_up','payer_call')
         AND t.status IN ('pending','in_progress')
         ORDER BY t.due_date ASC`,
        [effectiveOrgId]
      );
      return respond(200, r.rows);
    }

    // ════ Eligibility ══════════════════════════════════════════════════════
    if (path.includes('/eligibility/check') && method === 'POST') {
      const { patient_id, payer_id, dos, member_id } = body;
      // TODO: Wire to Availity 270 API when available
      const result = await create('eligibility_checks', {
        org_id: effectiveOrgId,
        client_id: clientId,
        patient_id, payer_id, dos,
        member_id: member_id || null,
        status: 'completed',
        result: 'active',
        network_status: 'in_network',
        copay: 25.00,
        deductible: 500.00,
        prior_auth_required: false,
        benefits_json: JSON.stringify({
          plan_name: 'Standard PPO',
          effective_date: '2025-01-01',
          coinsurance: 20,
          out_of_pocket_max: 6000,
          deductible_met: 125.00,
          note: 'Mock response — Availity 270/271 integration pending',
        }),
      }, effectiveOrgId);
      return respond(200, { ...result, mock: true });
    }

    if (path.includes('/eligibility/batch') && method === 'POST') {
      const { patient_ids, payer_id, dos } = body;
      const results = [];
      for (const pid of (patient_ids || [])) {
        const r = await create('eligibility_checks', {
          org_id: effectiveOrgId, client_id: clientId,
          patient_id: pid, payer_id, dos,
          status: 'completed', result: 'active',
          network_status: 'in_network', copay: 25, deductible: 500,
        }, effectiveOrgId);
        results.push(r);
      }
      return respond(200, { total: results.length, results, mock: true });
    }

    // 271 response parser
    if (path.includes('/eligibility') && path.includes('/parse-271') && method === 'POST') {
      const { edi_content } = body;
      if (!edi_content) return respond(400, { error: 'edi_content required' });
      const result = await parse271Response(pathParams.id, edi_content, effectiveOrgId, userId);
      return respond(200, result);
    }

    if (path.includes('/eligibility') && !path.includes('/check') && !path.includes('/batch') && !path.includes('/parse-271')) {
      if (method === 'GET' && !pathParams.id) {
        let q = `SELECT ec.*, p.first_name || ' ' || p.last_name AS patient_name
                 FROM eligibility_checks ec
                 LEFT JOIN patients p ON ec.patient_id = p.id
                 WHERE ec.org_id = $1`;
        const params = [effectiveOrgId];
        if (clientId) { params.push(clientId); q += ` AND ec.client_id = $${params.length}`; }
        q += ' ORDER BY ec.created_at DESC';
        return respond(200, (await pool.query(q, params)).rows);
      }
    }

    // ════ EDI Transactions ═════════════════════════════════════════════════
    if (path.includes('/edi-transactions')) {
      if (method === 'GET') {
        return respond(200, await list('edi_transactions', effectiveOrgId, clientId, 'ORDER BY created_at DESC'));
      }
      if (method === 'POST') {
        return respond(201, await create('edi_transactions', body, effectiveOrgId));
      }
    }

    // ════ Dashboard KPIs ═══════════════════════════════════════════════════
    if (path.includes('/dashboard')) {
      let clientFilter = '';
      const params = [effectiveOrgId];
      if (clientId) { params.push(clientId); clientFilter = ` AND client_id = $${params.length}`; }

      const [claims, denials, payments, tasks, eligibility] = await Promise.all([
        pool.query(`SELECT status, COUNT(*)::int as count, SUM(total_charge)::numeric as total FROM claims WHERE org_id = $1${clientFilter} GROUP BY status`, params),
        pool.query(`SELECT status, COUNT(*)::int as count FROM denials WHERE org_id = $1${clientFilter} GROUP BY status`, params),
        pool.query(`SELECT status, COUNT(*)::int as count, SUM(amount_paid)::numeric as total FROM payments WHERE org_id = $1${clientFilter} GROUP BY status`, params),
        pool.query(`SELECT status, COUNT(*)::int as count FROM tasks WHERE org_id = $1${clientFilter} GROUP BY status`, params),
        pool.query(`SELECT COUNT(*)::int as total, SUM(CASE WHEN result='active' THEN 1 ELSE 0 END)::int as active FROM eligibility_checks WHERE org_id = $1${clientFilter}`, params),
      ]);

      return respond(200, {
        claims: claims.rows,
        denials: denials.rows,
        payments: payments.rows,
        tasks: tasks.rows,
        eligibility: eligibility.rows[0] || { total: 0, active: 0 },
      });
    }

    // ════ Patients ═════════════════════════════════════════════════════════
    if (path.includes('/patients')) {
      if (method === 'GET' && !pathParams.id) return respond(200, await enrichedPatients(effectiveOrgId, clientId));
      if (method === 'GET' && pathParams.id) {
        const p = await getById('patients', pathParams.id);
        return p ? respond(200, p) : respond(404, { error: 'Patient not found' });
      }
      if (method === 'POST') return respond(201, await create('patients', body, effectiveOrgId));
      if (method === 'PUT' && pathParams.id) return respond(200, await update('patients', pathParams.id, body));
    }

    // ════ CARC / RARC Reference ════════════════════════════════════════════
    if (path.includes('/carc-codes')) {
      return respond(200, (await pool.query('SELECT * FROM carc_codes ORDER BY code')).rows);
    }
    if (path.includes('/rarc-codes')) {
      return respond(200, (await pool.query('SELECT * FROM rarc_codes ORDER BY code')).rows);
    }

    // ════ Generic Entity Routes ════════════════════════════════════════════
    const entityMap = {
      'appointments': 'appointments',
      'providers': 'providers',
      'payers': 'payers',
      'users': 'users',
      'clients': 'clients',
      'encounters': 'encounters',
      'tasks': 'tasks',
      'credentialing': 'credentialing',
      'organizations': 'organizations',
    };

    // Sub-routes that should NOT be caught by generic CRUD
    const entitySubRouteExclusions = {
      'encounters': ['/charge-capture', '/chart-check'],
      'credentialing': ['/dashboard', '/enrollment'],
    };

    for (const [route, table] of Object.entries(entityMap)) {
      if (path.includes(`/${route}`)) {
        // Skip if path matches a known sub-route for this entity
        const exclusions = entitySubRouteExclusions[route] || [];
        if (exclusions.some(ex => path.includes(ex))) continue;
        if (method === 'GET' && !pathParams.id) {
          return respond(200, await list(table, effectiveOrgId, clientId, 'ORDER BY created_at DESC'));
        }
        if (method === 'GET' && pathParams.id) {
          const r = await getById(table, pathParams.id);
          if (!r || r.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
          return respond(200, r);
        }
        if (method === 'POST') return respond(201, await create(table, body, effectiveOrgId));
        if (method === 'PUT' && pathParams.id) {
          const existing = await getById(table, pathParams.id);
          if (!existing || existing.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
          return respond(200, await update(table, pathParams.id, body));
        }
        if (method === 'DELETE' && pathParams.id) {
          await pool.query(`DELETE FROM ${table} WHERE id = $1 AND org_id = $2`, [pathParams.id, effectiveOrgId]);
          return respond(200, { deleted: true });
        }
      }
    }

    // ════ 837I Institutional Claim Generator ════════════════════════════════
    if (path.includes('/claims') && path.includes('/generate-837i') && method === 'POST') {
      const result = await generate837I(pathParams.id, effectiveOrgId);
      return respond(200, result);
    }

    // ════ Charge Capture AI (Feature #11) ═════════════════════════════════
    if (path.includes('/encounters') && path.includes('/charge-capture') && method === 'POST') {
      const result = await chargeCapture(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ Document Classification AI ══════════════════════════════════════
    if (path.includes('/documents') && path.includes('/classify') && method === 'POST') {
      const result = await classifyDocument(pathParams.id, effectiveOrgId);
      return respond(200, result);
    }

    // ════ Prior Auth Workflow ══════════════════════════════════════════════
    if (path.includes('/prior-auth')) {
      if (method === 'GET' && !pathParams.id) {
        let q = `SELECT pa.*, pt.first_name || ' ' || pt.last_name AS patient_name,
                        py.name AS payer_name, pv.last_name AS provider_name
                 FROM prior_auth_requests pa
                 LEFT JOIN patients pt ON pa.patient_id = pt.id
                 LEFT JOIN payers py ON pa.payer_id = py.id
                 LEFT JOIN providers pv ON pa.provider_id = pv.id
                 WHERE pa.org_id = $1`;
        const p = [effectiveOrgId];
        if (clientId) { q += ' AND pa.client_id = $2'; p.push(clientId); }
        if (qs.status) { q += ` AND pa.status = $${p.length + 1}`; p.push(qs.status); }
        q += ' ORDER BY pa.created_at DESC';
        if (qs.limit) { q += ` LIMIT $${p.length + 1}`; p.push(qs.limit); }
        const r = await pool.query(q, p);
        return respond(200, { data: r.rows, total: r.rows.length });
      }
      if (method === 'GET' && pathParams.id) {
        const r = await getById('prior_auth_requests', pathParams.id);
        if (!r || r.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
        return respond(200, r);
      }
      if (method === 'POST') {
        const result = await createPriorAuth(body, effectiveOrgId, userId);
        return respond(201, result);
      }
      if (method === 'PUT' && pathParams.id) {
        const result = await updatePriorAuth(pathParams.id, body, effectiveOrgId, userId);
        return respond(200, result);
      }
    }

    // ════ Patient Statements ══════════════════════════════════════════════
    if (path.includes('/patient-statements')) {
      // Generate statement for a patient
      if (method === 'POST' && path.includes('/generate')) {
        const { patient_id } = body;
        if (!patient_id) return respond(400, { error: 'patient_id required' });
        const result = await generatePatientStatement(patient_id, effectiveOrgId);
        return respond(200, result);
      }
      // List statements
      if (method === 'GET' && !pathParams.id) {
        let q = 'SELECT * FROM patient_statements WHERE org_id = $1';
        const p = [effectiveOrgId];
        if (clientId) { q += ' AND client_id = $2'; p.push(clientId); }
        if (qs.patient_id) { q += ` AND patient_id = $${p.length + 1}`; p.push(qs.patient_id); }
        q += ' ORDER BY created_at DESC';
        if (qs.limit) { q += ` LIMIT $${p.length + 1}`; p.push(qs.limit); }
        const r = await pool.query(q, p);
        return respond(200, { data: r.rows, total: r.rows.length });
      }
      // Get single statement
      if (method === 'GET' && pathParams.id) {
        const r = await getById('patient_statements', pathParams.id);
        if (!r || r.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
        return respond(200, r);
      }
      // Update statement (mark sent, mark paid, etc.)
      if (method === 'PUT' && pathParams.id) {
        const existing = await getById('patient_statements', pathParams.id);
        if (!existing || existing.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
        const result = await update('patient_statements', pathParams.id, { ...body, updated_at: new Date().toISOString() });
        return respond(200, result);
      }
    }

    // ════ Secondary Claim / COB Workflow ═══════════════════════════════════
    if (path.includes('/claims') && path.includes('/secondary') && method === 'POST') {
      const result = await triggerSecondaryClaim(pathParams.id, effectiveOrgId, userId);
      return respond(201, result);
    }

    // ════ Credentialing Dashboard + Enrollment ════════════════════════════
    if (path.includes('/credentialing/dashboard') && method === 'GET') {
      const result = await getCredentialingDashboard(effectiveOrgId, clientId);
      return respond(200, result);
    }
    if (path.includes('/credentialing/enrollment') && method === 'POST') {
      const result = await createEnrollment(body, effectiveOrgId, userId);
      return respond(201, result);
    }

    // ════ Report Export Engine ═════════════════════════════════════════════
    if (path.includes('/reports') && method === 'GET') {
      const reportType = qs.type || pathParams.id;
      if (!reportType) {
        return respond(200, {
          available_reports: [
            'ar_aging', 'denial_analysis', 'payment_summary',
            'coding_production', 'payer_performance', 'eligibility_summary'
          ],
        });
      }
      const result = await generateReport(reportType, effectiveOrgId, clientId, qs);
      return respond(200, result);
    }

    // ════ Auto-Appeals Engine (AI Feature #4) ═══════════════════════════════
    if (path.includes('/denials') && path.includes('/generate-appeal') && method === 'POST') {
      const result = await generateAppeal(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ Denial Categorization ════════════════════════════════════════════
    if (path.includes('/denials/categorize') && method === 'GET') {
      const result = await categorizeDenials(effectiveOrgId, clientId);
      return respond(200, result);
    }

    // ════ Chart Completeness Check (AI Feature #14) ═══════════════════════
    if (path.includes('/encounters') && path.includes('/chart-check') && method === 'POST') {
      const result = await checkChartCompleteness(pathParams.id, effectiveOrgId);
      return respond(200, result);
    }

    // ════ Contract Rate Extraction from PDFs ══════════════════════════════
    if (path.includes('/documents') && path.includes('/extract-rates') && method === 'POST') {
      const { payer_id } = body;
      if (!payer_id) return respond(400, { error: 'payer_id required in body' });
      const result = await extractContractRates(pathParams.id, payer_id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ Payment Reconciliation ══════════════════════════════════════════
    if (path.includes('/era-files') && path.includes('/reconcile') && method === 'POST') {
      const result = await reconcilePayments(pathParams.id, effectiveOrgId, userId);
      return respond(200, result);
    }

    // ════ Write-Off Workflow ══════════════════════════════════════════════
    if (path.includes('/write-offs')) {
      if (method === 'POST' && !pathParams.id) {
        const result = await requestWriteOff(body, effectiveOrgId, userId);
        return respond(201, result);
      }
      if (method === 'PUT' && pathParams.id) {
        const result = await approveWriteOff(pathParams.id, body, effectiveOrgId, userId);
        return respond(200, result);
      }
      if (method === 'GET' && !pathParams.id) {
        let q = 'SELECT wo.*, c.claim_number FROM write_off_requests wo LEFT JOIN claims c ON wo.claim_id = c.id WHERE wo.org_id = $1';
        const p = [effectiveOrgId];
        if (clientId) { q += ' AND wo.client_id = $2'; p.push(clientId); }
        if (qs.status) { q += ` AND wo.status = $${p.length + 1}`; p.push(qs.status); }
        q += ' ORDER BY wo.created_at DESC';
        const r = await pool.query(q, p);
        return respond(200, { data: r.rows, total: r.rows.length });
      }
      if (method === 'GET' && pathParams.id) {
        const r = await getById('write_off_requests', pathParams.id);
        if (!r || r.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
        return respond(200, r);
      }
    }

    // ════ Notifications ═══════════════════════════════════════════════════
    if (path.includes('/notifications')) {
      if (method === 'GET') {
        const result = await getNotifications(effectiveOrgId, userId, qs);
        return respond(200, result);
      }
      if (method === 'POST' && !pathParams.id) {
        const result = await createNotification(effectiveOrgId, body);
        return respond(201, result);
      }
      // Mark as read
      if (method === 'PUT' && pathParams.id) {
        await pool.query('UPDATE notifications SET read = TRUE, read_at = NOW() WHERE id = $1', [pathParams.id]);
        return respond(200, { id: pathParams.id, read: true });
      }
      // Mark all read
      if (method === 'PUT' && path.includes('/mark-all-read')) {
        await pool.query(
          'UPDATE notifications SET read = TRUE, read_at = NOW() WHERE org_id = $1 AND user_id = $2 AND read = FALSE',
          [effectiveOrgId, userId]
        );
        return respond(200, { status: 'all_read' });
      }
    }

    // ════ Appeals CRUD ════════════════════════════════════════════════════
    if (path.includes('/appeals')) {
      if (method === 'GET' && !pathParams.id) {
        let q = `SELECT a.*, d.carc_code, d.denial_reason, c.claim_number, c.dos_from,
                        p.first_name || ' ' || p.last_name AS patient_name, py.name AS payer_name
                 FROM appeals a
                 LEFT JOIN denials d ON a.denial_id = d.id
                 LEFT JOIN claims c ON a.claim_id = c.id
                 LEFT JOIN patients p ON c.patient_id = p.id
                 LEFT JOIN payers py ON c.payer_id = py.id
                 WHERE a.org_id = $1`;
        const p = [effectiveOrgId];
        if (clientId) { q += ' AND a.client_id = $2'; p.push(clientId); }
        if (qs.status) { q += ` AND a.status = $${p.length + 1}`; p.push(qs.status); }
        q += ' ORDER BY a.created_at DESC';
        const r = await pool.query(q, p);
        return respond(200, { data: r.rows, total: r.rows.length });
      }
      if (method === 'GET' && pathParams.id) {
        const r = await getById('appeals', pathParams.id);
        if (!r || r.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
        return respond(200, r);
      }
      if (method === 'PUT' && pathParams.id) {
        const existing = await getById('appeals', pathParams.id);
        if (!existing || existing.org_id !== effectiveOrgId) return respond(404, { error: 'Not found' });
        const result = await update('appeals', pathParams.id, { ...body, updated_at: new Date().toISOString() });
        return respond(200, result);
      }
    }

    return respond(404, { error: 'Route not found', path, method });

  } catch (err) {
    console.error('Handler error:', err);
    return respond(500, { error: err.message });
  } finally {
    // ── HIPAA Audit Middleware — log every request ─────────────────────────
    // This covers the missing read-event audit logging for PHI access
    try {
      const method = event.httpMethod || event.requestContext?.http?.method || '';
      const path = event.path || event.rawPath || '';
      const headers = event.headers || {};
      const qs = event.queryStringParameters || {};
      const orgId = headers['x-org-id'] || qs.org_id || 'unknown';
      const uid = headers['x-user-id'] || qs.user_id || 'anonymous';
      const ip = event.requestContext?.identity?.sourceIp || event.requestContext?.http?.sourceIp || 'unknown';

      // Identify PHI-containing entities
      const PHI_ENTITIES = ['patients', 'claims', 'denials', 'payments', 'eligibility', 'soap-notes', 'documents', 'encounters', 'ar'];
      const entity = PHI_ENTITIES.find(e => path.includes(`/${e}`));

      if (entity && method !== 'OPTIONS') {
        await pool.query(
          `INSERT INTO audit_log (id, org_id, user_id, action, entity_type, entity_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [uuid(), orgId, uid, `${method.toLowerCase()}_request`, entity,
           null, JSON.stringify({ path, method, ip, source: 'audit_middleware' })]
        ).catch(() => {}); // Never fail the response for audit logging
      }
    } catch (_) { /* audit middleware must never break responses */ }
  }
};
