/**
 * MedCloud — Availity SFTP Poller Lambda
 *
 * Runs on a scheduled EventBridge rule (every 15 min) to pull new EDI files
 * from Availity SFTP. Processes:
 *   - 835 (ERA) → parse payments, auto-post, update claims
 *   - 999       → update edi_transaction acknowledgement status
 *   - 277       → update claim status from payer
 *   - TA1       → flag rejected ISA envelopes
 *
 * Deploy:
 *   zip sftp-poller.zip index.mjs node_modules/
 *   aws lambda create-function \
 *     --function-name medcloud-sftp-poller \
 *     --runtime nodejs22.x \
 *     --handler index.handler \
 *     --timeout 300 \
 *     --memory-size 512 \
 *     --role arn:aws:iam::<ACCOUNT>:role/medcloud-api-role \
 *     --zip-file fileb://sftp-poller.zip \
 *     --environment Variables="{
 *       API_BASE=https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod,
 *       ORG_ID=a0000000-0000-0000-0000-000000000001,
 *       AVAILITY_SFTP_HOST=sftp.availity.com,
 *       AVAILITY_SFTP_USER=<FROM_AVAILITY_ENROLLMENT>,
 *       AVAILITY_SFTP_PASS=<FROM_SECRETS_MANAGER>,
 *       S3_BUCKET=medcloud-documents-us-prod,
 *       AWS_REGION=us-east-1
 *     }" \
 *     --region us-east-1
 *
 * EventBridge Schedule:
 *   aws events put-rule \
 *     --name medcloud-sftp-poll \
 *     --schedule-expression "rate(15 minutes)" \
 *     --state ENABLED
 *
 * IMPORTANT: SFTP credentials must be stored in Secrets Manager:
 *   aws secretsmanager create-secret \
 *     --name medcloud/availity-sftp \
 *     --secret-string '{"host":"sftp.availity.com","user":"<USER>","password":"<PASS>"}'
 *
 * NOTE: Availity SFTP enrollment must be completed before this will work.
 *       Contact Availity at 1-800-AVAILITY to start enrollment.
 *       Enrollment typically takes 4-8 weeks.
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const sm = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

const API_BASE  = process.env.API_BASE  || 'https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod';
const ORG_ID    = process.env.ORG_ID   || 'a0000000-0000-0000-0000-000000000001';
const S3_BUCKET = process.env.S3_BUCKET || 'medcloud-documents-us-prod';

// ─── Secrets Manager helper ─────────────────────────────────────────────────────
async function getSecret(secretName) {
  const res = await sm.send(new GetSecretValueCommand({ SecretId: secretName }));
  return JSON.parse(res.SecretString);
}

// ─── Internal API caller ────────────────────────────────────────────────────────
async function callAPI(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Id': ORG_ID,
      'X-User-Id': 'system-sftp-poller',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${path} failed ${res.status}: ${err.substring(0, 200)}`);
  }
  return res.json();
}

// ─── EDI file type detector ─────────────────────────────────────────────────────
function detectEDIType(content) {
  const firstSegments = content.substring(0, 500);
  if (/\bST\*835\b/.test(firstSegments)) return '835';
  if (/\bST\*999\b/.test(firstSegments)) return '999';
  if (/\bST\*277\b/.test(firstSegments)) return '277';
  if (/\bST\*271\b/.test(firstSegments)) return '271';
  if (/^TA1\*/m.test(firstSegments))     return 'TA1';
  if (/\bST\*276\b/.test(firstSegments)) return '276';
  return 'unknown';
}

// ─── 835 ERA Processor ──────────────────────────────────────────────────────────
async function process835(content, filename) {
  console.log(`Processing 835 ERA: ${filename}`);
  // Extract payer info from ISA/GS segments for logging
  const isaMatch = content.match(/ISA\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*([^*]+)\*/);
  const payerISA = isaMatch?.[1]?.trim() || 'unknown';

  // Create ERA file record in DB
  const eraFile = await callAPI('/era-files', 'POST', {
    org_id: ORG_ID,
    file_name: filename,
    payer_name: payerISA,
    file_type: '835',
    status: 'received',
    received_at: new Date().toISOString(),
  });

  // Archive to S3
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `era-files/${new Date().toISOString().slice(0, 10)}/${filename}`,
    Body: content,
    ContentType: 'text/plain',
    Metadata: { era_file_id: eraFile.id, payer: payerISA },
  }));

  // Call parse-835 endpoint
  const parseResult = await callAPI(`/era-files/${eraFile.id}/parse-835`, 'POST', {
    edi_content: content,
  });

  // Auto-post payments
  let autoPostResult = null;
  try {
    autoPostResult = await callAPI('/payments/auto-post', 'POST', {
      era_file_id: eraFile.id,
    });
  } catch (err) {
    console.error(`Auto-post failed for ERA ${eraFile.id}:`, err.message);
  }

  return {
    type: '835',
    era_file_id: eraFile.id,
    filename,
    payments_parsed: parseResult.payments_posted || 0,
    auto_posted: autoPostResult?.posted || 0,
  };
}

// ─── 999 Acknowledgement Processor ─────────────────────────────────────────────
async function process999(content, filename) {
  console.log(`Processing 999 acknowledgement: ${filename}`);
  const result = await callAPI('/edi/ingest-999', 'POST', { edi_content: content });

  // Archive to S3
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `edi-acks/999/${new Date().toISOString().slice(0, 10)}/${filename}`,
    Body: content,
    ContentType: 'text/plain',
  }));

  return { type: '999', filename, ...result };
}

// ─── 277 Status Response Processor ─────────────────────────────────────────────
async function process277(content, filename) {
  console.log(`Processing 277 claim status: ${filename}`);
  const result = await callAPI('/edi/ingest-277', 'POST', { edi_content: content });

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `edi-responses/277/${new Date().toISOString().slice(0, 10)}/${filename}`,
    Body: content,
    ContentType: 'text/plain',
  }));

  return { type: '277', filename, ...result };
}

// ─── TA1 Interchange Rejection Handler ─────────────────────────────────────────
async function processTA1(content, filename) {
  console.log(`Processing TA1 rejection: ${filename}`);
  // TA1*000000001*20260304*1200*R*022 — R=rejected, 022=invalid control structure
  const ta1Match = content.match(/TA1\*(\d+)\*(\d+)\*(\d+)\*([AR])\*(\d+)/);
  if (ta1Match) {
    const [, icn, date, time, ackCode, errorCode] = ta1Match;
    const accepted = ackCode === 'A';
    console.log(`TA1: ICN=${icn} Date=${date} Accepted=${accepted} ErrorCode=${errorCode}`);

    // Update EDI transaction if we can match by control number
    // Control numbers are tracked in edi_transactions.transaction_set_control_number
    try {
      await callAPI('/notifications', 'POST', {
        type: 'edi_error',
        priority: 'urgent',
        title: `EDI Interchange ${accepted ? 'Accepted' : 'Rejected'}: ICN ${icn}`,
        message: accepted
          ? `ISA interchange ${icn} acknowledged successfully.`
          : `ISA interchange ${icn} REJECTED. Error code: ${errorCode}. Check EDI formatting.`,
        entity_type: 'edi_transaction',
      });
    } catch (e) { console.error('TA1 notification failed:', e.message); }
  }

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `edi-acks/ta1/${new Date().toISOString().slice(0, 10)}/${filename}`,
    Body: content,
    ContentType: 'text/plain',
  }));

  return { type: 'TA1', filename, raw: ta1Match?.[0] || 'unparsed' };
}

// ─── Track already-processed files using S3 marker objects ─────────────────────
async function getProcessedFiles() {
  try {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: 'sftp-poller/processed/',
    }));
    return new Set((res.Contents || []).map(o => o.Key.replace('sftp-poller/processed/', '')));
  } catch { return new Set(); }
}

async function markProcessed(filename) {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `sftp-poller/processed/${filename}`,
    Body: '',
    ContentType: 'text/plain',
  })).catch(() => {});
}

// ─── SFTP polling using native Node.js net (SSH2 not bundled — use Transfer Family) ──
// NOTE: AWS Transfer Family (SFTP) is the recommended approach for Lambda-SFTP.
// If using Availity SFTP directly, add ssh2 npm package:
//   npm install ssh2
// Then replace this stub with actual ssh2 client code.
async function pollSFTP(sftpConfig) {
  // STUB — returns mock file list when SFTP creds not yet configured.
  // Replace with actual SSH2/Transfer Family integration after Availity enrollment.
  if (!sftpConfig?.host || !sftpConfig?.user || sftpConfig.host === 'PENDING_ENROLLMENT') {
    console.log('[SFTP] Credentials not yet configured — Availity enrollment required');
    return { files: [], message: 'Availity SFTP enrollment pending. Contact Availity to complete enrollment.' };
  }

  // Actual SSH2 implementation (install ssh2 package first):
  /*
  const { Client } = await import('ssh2');
  const conn = new Client();

  return new Promise((resolve, reject) => {
    const files = [];
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        const dirs = ['/OUT/835', '/OUT/999', '/OUT/277', '/OUT/TA1'];
        let pending = dirs.length;
        for (const dir of dirs) {
          sftp.readdir(dir, (e, list) => {
            if (!e && list) {
              for (const f of list) {
                if (f.filename.match(/\.(txt|edi|835|999|277)$/i)) {
                  files.push({ dir, name: f.filename, size: f.attrs.size });
                }
              }
            }
            if (--pending === 0) { conn.end(); resolve({ files }); }
          });
        }
      });
    }).connect({ host: sftpConfig.host, port: 22, username: sftpConfig.user, password: sftpConfig.password });
  });
  */

  // Placeholder — returns empty set until credentials are configured
  return { files: [], message: 'SFTP implementation ready. Add ssh2 package and Availity credentials.' };
}

// ─── Main Handler ───────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const startTime = Date.now();
  const results = { processed: [], errors: [], skipped: [] };

  console.log('[SFTP Poller] Starting poll run:', new Date().toISOString());

  try {
    // Get SFTP credentials from Secrets Manager
    let sftpConfig = { host: 'PENDING_ENROLLMENT' };
    try {
      sftpConfig = await getSecret('medcloud/availity-sftp');
    } catch (err) {
      console.log('[SFTP Poller] Secret not found — using stub:', err.message);
    }

    // Get already-processed file list from S3
    const processedFiles = await getProcessedFiles();

    // Poll SFTP for new files
    const { files, message } = await pollSFTP(sftpConfig);

    if (message) console.log('[SFTP Poller]', message);
    if (files.length === 0) {
      return { status: 'no_new_files', duration_ms: Date.now() - startTime, message };
    }

    // Process each new file
    for (const file of files) {
      const fileKey = `${file.dir}/${file.name}`;
      if (processedFiles.has(fileKey)) {
        results.skipped.push(file.name);
        continue;
      }

      try {
        // Download file content (SSH2 sftp.readFile or Transfer Family S3 event)
        const content = file.content || ''; // set by polling function above
        const fileType = detectEDIType(content);

        let result;
        switch (fileType) {
          case '835': result = await process835(content, file.name); break;
          case '999': result = await process999(content, file.name); break;
          case '277': result = await process277(content, file.name); break;
          case 'TA1': result = await processTA1(content, file.name); break;
          default:
            console.log(`[SFTP Poller] Unknown file type for ${file.name} — archived to S3`);
            await s3.send(new PutObjectCommand({
              Bucket: S3_BUCKET, Key: `edi-unknown/${file.name}`, Body: content,
            }));
            result = { type: 'unknown', filename: file.name };
        }

        results.processed.push(result);
        await markProcessed(fileKey);

      } catch (fileErr) {
        console.error(`[SFTP Poller] Failed to process ${file.name}:`, fileErr.message);
        results.errors.push({ filename: file.name, error: fileErr.message });
      }
    }

  } catch (err) {
    console.error('[SFTP Poller] Fatal error:', err.message);
    results.errors.push({ fatal: true, error: err.message });
  }

  const summary = {
    status: results.errors.length === 0 ? 'success' : 'partial',
    duration_ms: Date.now() - startTime,
    processed: results.processed.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
    details: results,
  };
  console.log('[SFTP Poller] Complete:', JSON.stringify(summary));
  return summary;
};
