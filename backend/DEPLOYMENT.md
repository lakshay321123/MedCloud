# MedCloud — Complete Backend Deployment Guide
**Updated:** March 4, 2026  
**Branch:** `backend/complete-pending-work`

---

## TL;DR — One Command Deploy (Dev 1)

```bash
export MEDCLOUD_DB_PASS=$(aws secretsmanager get-secret-value \
  --secret-id medcloud/db-password --region us-east-1 \
  --query SecretString --output text)

bash deploy/deploy.sh
```

This runs all 9 steps automatically. See below for details on each step.

---

## What Was Built in This Branch

### 1. Lambda v4 Additions (`deploy/lambda-v4/index.mjs`)

| New Endpoint | Description |
|---|---|
| `GET /health` | DB health check — bypasses auth, for monitoring |
| `POST /webhooks/retell` | Retell call-ended webhook — HMAC verified, extracts AR outcome via Bedrock |
| `POST /webhooks/availity` | Availity real-time claim status push — HMAC verified |
| `POST /edi/ingest-999` | Process 999 functional acknowledgement EDI |
| `POST /edi/ingest-277` | Process 277 claim status response EDI |

**Security fixes:**
- Replaced `// TODO: PRODUCTION — Replace header-based auth` with Cognito JWT authorizer context
- PHI scrubber added — all `console.log` now strips SSN, DOB, email, phone before CloudWatch
- HMAC verifier for webhooks prevents spoofed callbacks
- S3 bucket name corrected: `medcloud-documents-us` → `medcloud-documents-us-prod`

### 2. Lambda Authorizer (`deploy/lambda-authorizer/index.mjs`)
Cognito JWT validator that:
- Fetches JWKS from Cognito and caches 1 hour
- Validates signature, expiry, issuer
- Extracts `org_id`, `user_id`, `client_id`, `role` from JWT custom claims
- Injects into `requestContext.authorizer` for Lambda v4 to use
- Maps 10 Cognito groups to internal role names

### 3. SFTP Poller Lambda (`deploy/lambda-sftp-poller/index.mjs`)
Scheduled every 15 minutes via EventBridge:
- Polls Availity SFTP `/OUT/835`, `/OUT/999`, `/OUT/277`, `/OUT/TA1`
- Auto-detects EDI file type and routes to correct processor
- Archives all received files to S3
- Marks processed files to prevent double-processing
- **NOTE:** SFTP credentials are stubbed until Availity enrollment completes

### 4. Migration 007 (`backend/migrations/007-security-and-missing-columns.sql`)
- **RLS** on all 20 PHI tables (org_id isolation at DB level — AD-1)
- **audit_log immutability** — REVOKE DELETE/UPDATE, trigger blocks all deletes
- `ar_call_log` — Retell columns: `retell_call_id`, `call_type`, `duration_seconds`, `transcript`
- `edi_transactions` — `transaction_set_control_number`, `acknowledgement_code`, `acknowledged_at`
- `claims` — `payer_claim_number`, `payer_reference_number`, `last_follow_up_date`, `next_action_date`, `submitted_via`, `timely_filing_deadline`
- `providers` — `tax_id`, `taxonomy_code`, `npi_type_2`, `group_npi`, `address`, `city`, `state`, `zip`
- `patients` — secondary payer fields, `copay_cents`, `deductible_cents`, financial fields
- `fee_schedules` — `contract_type`, `contracted_rate`, `medicare_rate`, `effective_from`, `effective_to`
- `webhook_configs` — new table for Retell/Availity webhook secrets
- **35 new indexes** on high-frequency query patterns

### 5. Deploy Script (`deploy/deploy.sh`)
Fully automated 9-step deploy:
1. Runs migrations 002–007
2. Deploys CloudFormation (S3 + IAM)
3. Packages + deploys Lambda v4
4. Sets all Lambda env vars
5. Upgrades runtime to `nodejs22.x`
6. Deploys Lambda Authorizer
7. Deploys SFTP Poller + EventBridge schedule
8. Redeploys API Gateway
9. Smoke tests 11 endpoints

---

## Manual Steps After Deploy

These cannot be automated — must be done by humans:

### A. Availity SFTP Enrollment (Owner + Dev 1) — START IMMEDIATELY
**Lead time: 4–8 weeks. Start now or Sprint 2 demo will have mock eligibility.**

1. Call Availity: **1-800-AVAILITY** or visit portal.availity.com
2. Request enrollment for:
   - EDI 837P claim submission
   - EDI 270/271 real-time eligibility
   - EDI 835 ERA auto-delivery
   - EDI 277 claim status
   - SFTP access for batch EDI
3. Provide for each billing NPI: NPI, Tax ID, billing address, specialty
4. Once enrolled, store SFTP creds in Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name medcloud/availity-sftp \
     --secret-string '{"host":"sftp.availity.com","user":"<USER>","password":"<PASS>"}' \
     --region us-east-1
   ```
5. Enable the Availity webhook in DB:
   ```sql
   UPDATE webhook_configs SET active = TRUE WHERE provider = 'availity';
   ```

### B. Apply Cognito Authorizer to API Gateway Methods
After deploy.sh creates the authorizer, attach it to methods in API Gateway console:
1. AWS Console → API Gateway → fm2l2133of → Resources
2. For each method (except `/health`):
   - Click Method Request
   - Authorization: Select `MedCloudCognitoAuth`
3. Deploy to `prod` stage

Or use this CLI to apply to all routes:
```bash
# Get all resource IDs
aws apigateway get-resources --rest-api-id fm2l2133of --region us-east-1 \
  --query 'items[*].{id:id,path:path}' --output table
  
# For each resource ID + method:
aws apigateway update-method \
  --rest-api-id fm2l2133of \
  --resource-id <RESOURCE_ID> \
  --http-method GET \
  --patch-operations op=replace,path=/authorizationType,value=CUSTOM \
                     op=replace,path=/authorizerId,value=<AUTHORIZER_ID> \
  --region us-east-1
```

### C. Configure Retell Webhook (Alex + Dev 1)
1. Get `RETELL_WEBHOOK_SECRET` from Retell dashboard (Webhook Settings)
2. Add to Lambda env vars:
   ```bash
   aws lambda update-function-configuration \
     --function-name medcloud-api \
     --environment Variables="{..., RETELL_WEBHOOK_SECRET=<SECRET>}" \
     --region us-east-1
   ```
3. In Retell dashboard, set webhook URL to:
   `https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod/webhooks/retell`
4. Enable events: `call_ended`, `call_analyzed`

### D. Verify Bedrock Model Access
```bash
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?modelId==`anthropic.claude-sonnet-4-5-20250929-v1:0`]'
```
If empty, request model access in Bedrock console → Model access → Request.

---

## Key Values

| Resource | Value |
|---|---|
| API Gateway | `fm2l2133of.execute-api.us-east-1.amazonaws.com/prod` |
| Lambda | `medcloud-api` |
| Lambda Authorizer | `medcloud-api-authorizer` |
| SFTP Poller | `medcloud-sftp-poller` |
| Aurora | `medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com` |
| Cognito User Pool | `us-east-1_azvKruQpU` |
| S3 Bucket | `medcloud-documents-us-prod` |
| CloudFormation Stack | `medcloud-sprint2-us-prod` |
| Org UUID | `a0000000-0000-0000-0000-000000000001` |
| Bedrock Model | `anthropic.claude-sonnet-4-5-20250929-v1:0` |

---

## What's Still Pending (After Availity Enrollment)

| Item | Owner | When |
|---|---|---|
| Wire real 270/271 to Availity API | Dev 1 | After enrollment |
| Enable webhook_configs.availity | Dev 1 | After enrollment |
| Apply Cognito auth to API Gateway methods | Dev 1 | This sprint |
| Set RETELL_WEBHOOK_SECRET env var | Dev 1 + Alex | When Alex provides |
| Add `ssh2` package to SFTP poller | Dev 1 | After enrollment |
| Postgres RLS SET LOCAL app.org_id in Lambda queries | Dev 1 | Sprint 3 |
| Session inactivity timeout (15 min) | Dev 2 | Sprint 3 (HIPAA) |
| BAA tracking per client | Dev 1 | Sprint 3 (HIPAA) |
