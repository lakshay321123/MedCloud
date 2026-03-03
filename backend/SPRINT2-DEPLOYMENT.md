# MedCloud Sprint 2 — Deployment Guide

**Date:** March 4, 2026  
**Branch:** `claude/sprint2-backend-v4`  
**Owner:** Dev 1 (Backend Lead)  

---

## What's In This Build

### 1. Database Migration (`backend/migrations/002-sprint2-tables.sql`)
New tables:
- `soap_notes` — AI Scribe output (frozen schema from BM2)
- `scrub_results` — Persisted claim scrubbing audit trail  
- `ar_call_log` — Every payer/patient follow-up call
- `edi_transactions` — Tracks every 837/835/270/271/999/DHA file
- `ai_coding_suggestions` — Bedrock AI suggestions per coding item

Column additions:
- `documents` — s3_key, s3_bucket, textract fields, classification
- `claims` — edi_transaction_id, clearinghouse, submitted_at, payer_claim_number
- `coding_queue` — soap_note_id, document_id, ai_suggestion_id, coding_method, source
- `eligibility_checks` — 270/271 fields (member_id, plan_name, benefits_json, etc)
- `payments` — ERA line detail fields (cpt_code, billed/allowed/adjustment amounts, CARC/RARC)

### 2. Lambda v4 (`deploy/lambda-v4/index.mjs`)
**14 new endpoints** on top of v3:

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/era-files/:id/parse-835` | Parse 835 EDI → payment records |
| POST | `/claims/:id/generate-dha` | Generate DHA eClaim XML (UAE) |
| POST | `/coding/:id/ai-suggest` | Bedrock AI auto-coding |
| POST | `/documents/:id/textract` | Trigger Textract OCR |
| GET | `/documents/:id/textract` | Get Textract results |
| GET | `/edi-transactions` | List EDI transaction history |
| POST | `/edi-transactions` | Create EDI transaction record |
| GET | `/scrub-results/:claimId` | Get persisted scrub results |
| GET | `/ar/call-log` | List AR call log entries |
| POST | `/ar/log-call` | Log AR call (enhanced with auto-task) |
| GET | `/soap-notes` | List SOAP notes |
| PUT | `/soap-notes/:id` | Update/sign-off SOAP note |
| GET | `/ai-coding-suggestions/:id` | Get AI suggestions for coding item |
| POST | `/eligibility/270` | Generate 270 request (stub) |

**Upgraded features:**
- 837P EDI generator now includes submitter/receiver segments, REF, DMG, LX segments
- Claim scrubbing now persists results to `scrub_results` table
- Coding approve now tracks AI accuracy (overrides stored)
- Auto-post now handles `amount_paid` column (was `paid` in v3)
- All enriched queries filter by `client_id` (region isolation)

### 3. AWS Infrastructure (`backend/deploy/sprint2-infra.yaml`)
CloudFormation template creates:
- S3 bucket `medcloud-documents-{region}-{env}` with encryption, versioning, CORS, lifecycle
- IAM policy for Lambda: S3 + Textract + Bedrock access
- Bucket policy restricting access to Lambda role only

### 4. Frontend Hooks (`src/lib/hooks/useEntities.ts`)
**16 new hooks** added:
- `useParse835` — Parse 835 ERA content
- `useGenerateDHA` — Generate DHA XML
- `useAIAutoCode` — Trigger Bedrock AI coding
- `useAICodingSuggestion` — Fetch AI suggestions
- `useTriggerTextract` — Start Textract OCR
- `useTextractResults` — Get Textract results
- `useEDITransactions` — List EDI history
- `useCreateEDITransaction` — Create EDI record
- `useScrubResults` — Get persisted scrub results
- `useARCallLog` — List AR call log
- `useSOAPNotes` — List SOAP notes
- `useUpdateSOAPNote` — Update/sign-off SOAP note
- `useCreateEncounter` — Create encounter
- `useUpdateEncounter` — Update encounter
- `useCreateCredentialing` — Create credentialing record
- `useUpdateCredentialing` — Update credentialing record

---

## Deployment Steps

### Step 1: Run Migration
```bash
psql -h medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com \
     -U medcloud_admin -d medcloud \
     -f backend/migrations/002-sprint2-tables.sql
```

### Step 2: Deploy CloudFormation (S3 + IAM)
```bash
aws cloudformation deploy \
  --template-file backend/deploy/sprint2-infra.yaml \
  --stack-name medcloud-sprint2-us-prod \
  --parameter-overrides Environment=prod Region=us ExistingLambdaRoleName=medcloud-api-role \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 3: Deploy Lambda v4
```bash
cd deploy/lambda-v4
npm install pg @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
              @aws-sdk/client-textract @aws-sdk/client-bedrock-runtime
zip -r lambda-v4.zip index.mjs node_modules/
aws lambda update-function-code \
  --function-name medcloud-api \
  --zip-file fileb://lambda-v4.zip \
  --region us-east-1
```

### Step 4: Set Lambda Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name medcloud-api \
  --environment Variables="{
    DB_HOST=medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com,
    DB_NAME=medcloud,
    DB_USER=medcloud_admin,
    DB_PASS=<RETRIEVE_FROM_SECRETS_MANAGER>,
    S3_BUCKET=medcloud-documents-us-prod,
    AWS_REGION=us-east-1,
    BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
  }" \
  --region us-east-1
```

> **Security Note:** Never store `DB_PASS` in plaintext. Retrieve it from
> AWS Secrets Manager: `aws secretsmanager get-secret-value --secret-id medcloud/db-password`.
> For production, use Lambda's Secrets Manager integration to inject at runtime.

### Step 5: Verify
```bash
# Test 835 parser
curl -X POST https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod/era-files/TEST_ID/parse-835 \
  -H "X-Org-Id: a0000000-0000-0000-0000-000000000001" \
  -d '{"edi_content": "ISA*00*...~"}'

# Test AI coding
curl -X POST https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod/coding/CODING_ID/ai-suggest \
  -H "X-Org-Id: a0000000-0000-0000-0000-000000000001"

# Test DHA eClaim
curl -X POST https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod/claims/CLAIM_ID/generate-dha \
  -H "X-Org-Id: a0000000-0000-0000-0000-000000000001"
```

---

## What's NOT In This Build (Next Priorities)

1. **Availity clearinghouse connector** — Needs Availity API credentials + enrollment
2. **Real 270/271 eligibility** — Currently returns mock data, needs Availity
3. **999/277 response parser** — EDI transaction table ready, parser logic TBD
4. **S3 trigger for auto-Textract** — Template has it commented out, enable after testing
5. **Frontend page wiring** — Hooks exist, pages still need to call them (separate PR)
