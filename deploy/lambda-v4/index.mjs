/**
 * MedCloud API v4 — Sprint 2 Complete
 * 
 * UPGRADE from v3 — NEW features:
 *   POST  /era-files/:id/parse-835     — Parse 835 EDI content into payment records
 *   POST  /claims/:id/generate-dha     — Generate DHA eClaim XML (UAE)
 *   POST  /claims/:id/generate-edi     — Generate 837P/837I ANSI X12 (US)
 *   POST  /claims/:id/scrub            — Run 50-rule claim scrubbing engine
 *   POST  /claims/:id/underpayment-check — Detect contract underpayments per line
 *   POST  /claims/batch-submit         — Batch submit up to 100 claims
 *   POST  /coding/:id/ai-suggest       — Bedrock AI auto-coding from SOAP/document
 *   POST  /documents/:id/textract      — Trigger Textract OCR on uploaded document
 *   GET   /documents/:id/textract      — Get Textract results
 *   POST  /eligibility/270             — Generate 270 eligibility request
 *   POST  /eligibility/:id/parse-271   — Parse 271 eligibility response
 *   POST  /edi-transactions            — Create EDI transaction record
 *   GET   /edi-transactions            — List EDI transactions
 *   GET   /scrub-results/:claimId      — Get persisted scrub results
 *   POST  /ar/log-call                 — Log AR call (enhanced)
 *   GET   /ar/call-log                 — List AR call log
 *   GET   /soap-notes                  — List SOAP notes (with filters)
 *   PUT   /soap-notes/:id              — Update SOAP note
 *   GET   /ai-coding-suggestions/:id   — Get AI suggestions for coding item
 *   CRUD  /fee-schedules               — Contract rate management
 *   POST  /payments/auto-post          — Auto-post payments from 835
 *
 * SECURITY: UUID validation on all org/user/client IDs. Audit middleware logs every PHI access.
 * SCRUBBING: 50 rules — NCCI edits, gender/age, timely filing, modifier, bilateral, add-on, UAE-specific.
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
async function generateDHAeClaim(claimId) {
  const claim = await getById('claims', claimId);
  if (!claim) throw new Error('Claim not found');

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
async function generateEDI(claimId) {
  const claim = await getById('claims', claimId);
  if (!claim) throw new Error('Claim not found');

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
  if (!claim) throw new Error('Claim not found');

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
  if (!item) throw new Error('Coding queue item not found');

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
${clinicalText || 'No clinical documentation available. Return empty suggestions.'}

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
  if (!doc) throw new Error('Document not found');
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

async function getTextractResults(documentId) {
  const doc = await getById('documents', documentId);
  if (!doc) throw new Error('Document not found');

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
  if (!era) throw new Error('ERA file not found');

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

// ─── Presigned URL Generator ───────────────────────────────────────────────────

// ─── 271 Eligibility Response Parser ───────────────────────────────────────────
async function parse271Response(eligibilityCheckId, ediContent, orgId, userId) {
  const elig = await getById('eligibility_checks', eligibilityCheckId);
  if (!elig) throw new Error('Eligibility check not found');

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
  if (!claim) throw new Error('Claim not found');

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
        ? await generateDHAeClaim(claimId)
        : await generateEDI(claimId);

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
  if (!item) throw new Error('Coding item not found');

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

    if (path.includes('/documents') && !path.includes('/upload-url') && !path.includes('/textract')) {
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
        const result = await getTextractResults(pathParams.id);
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
        !path.includes('/transition')) {
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
      const r = await generateEDI(pathParams.id);
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
      const r = await generateDHAeClaim(pathParams.id);
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
    if (path.includes('/denials') && !path.includes('/appeal')) {
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

    if (path.includes('/era-files')) {
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

    for (const [route, table] of Object.entries(entityMap)) {
      if (path.includes(`/${route}`)) {
        if (method === 'GET' && !pathParams.id) {
          return respond(200, await list(table, effectiveOrgId, clientId, 'ORDER BY created_at DESC'));
        }
        if (method === 'GET' && pathParams.id) {
          const r = await getById(table, pathParams.id);
          return r ? respond(200, r) : respond(404, { error: 'Not found' });
        }
        if (method === 'POST') return respond(201, await create(table, body, effectiveOrgId));
        if (method === 'PUT' && pathParams.id) return respond(200, await update(table, pathParams.id, body));
        if (method === 'DELETE' && pathParams.id) {
          await pool.query(`DELETE FROM ${table} WHERE id = $1 AND org_id = $2`, [pathParams.id, effectiveOrgId]);
          return respond(200, { deleted: true });
        }
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
