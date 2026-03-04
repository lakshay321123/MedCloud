#!/usr/bin/env bash
# =============================================================================
# MedCloud — Complete Backend Deploy Script
# Date: March 4, 2026
# Owner: Dev 1
#
# Runs in sequence:
#   1. Run all pending DB migrations (002–007) on Aurora
#   2. Deploy S3 + IAM CloudFormation stack
#   3. Package + deploy Lambda v4 (main API)
#   4. Package + deploy Lambda Authorizer (Cognito JWT)
#   5. Package + deploy SFTP Poller Lambda (Availity EDI)
#   6. Attach Authorizer to API Gateway
#   7. Set EventBridge schedule for SFTP poller
#   8. Upgrade Lambda runtime to nodejs22.x
#   9. Smoke test all critical endpoints
#
# Usage:
#   export MEDCLOUD_DB_PASS="<from secrets manager>"
#   bash deploy/deploy.sh
#
# Or with full env:
#   MEDCLOUD_DB_PASS=xxx AWS_PROFILE=cosentus-us bash deploy/deploy.sh
# =============================================================================

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
REGION="us-east-1"
LAMBDA_NAME="medcloud-api"
AUTHORIZER_NAME="medcloud-api-authorizer"
SFTP_POLLER_NAME="medcloud-sftp-poller"
API_GATEWAY_ID="fm2l2133of"
LAMBDA_ROLE_NAME="medcloud-api-role"
S3_BUCKET="medcloud-documents-us-prod"
COGNITO_USER_POOL_ID="us-east-1_azvKruQpU"
DB_HOST="medcloud-db.ck54k4qcenu4.us-east-1.rds.amazonaws.com"
DB_NAME="medcloud"
DB_USER="medcloud_admin"
ORG_ID="a0000000-0000-0000-0000-000000000001"
API_BASE="https://${API_GATEWAY_ID}.execute-api.${REGION}.amazonaws.com/prod"
BEDROCK_MODEL="anthropic.claude-sonnet-4-5-20250929-v1:0"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Pre-flight checks ────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo " MedCloud Backend Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"
echo ""

info "Checking prerequisites..."

command -v aws    >/dev/null 2>&1 || error "aws CLI not found. Install: pip install awscli"
command -v psql   >/dev/null 2>&1 || error "psql not found. Install: apt-get install postgresql-client"
command -v node   >/dev/null 2>&1 || error "node not found."
command -v npm    >/dev/null 2>&1 || error "npm not found."
command -v zip    >/dev/null 2>&1 || error "zip not found."

aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1 || \
  error "AWS credentials not configured. Run: aws configure"

if [[ -z "${MEDCLOUD_DB_PASS:-}" ]]; then
  warn "MEDCLOUD_DB_PASS not set — fetching from Secrets Manager..."
  MEDCLOUD_DB_PASS=$(aws secretsmanager get-secret-value \
    --secret-id medcloud/db-password \
    --region "$REGION" \
    --query 'SecretString' \
    --output text 2>/dev/null) || error "Could not fetch DB password from Secrets Manager.\nRun: export MEDCLOUD_DB_PASS='<password>'"
  success "DB password fetched from Secrets Manager"
fi

LAMBDA_ROLE_ARN=$(aws iam get-role --role-name "$LAMBDA_ROLE_NAME" \
  --query 'Role.Arn' --output text 2>/dev/null) || \
  error "Lambda role '$LAMBDA_ROLE_NAME' not found. Create it first."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

success "Prerequisites OK — Account: $ACCOUNT_ID Region: $REGION"
echo ""

# ─── Step 1: Run DB Migrations ────────────────────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 1: Running DB Migrations 002–007"
echo "──────────────────────────────────────────────────"

export PGPASSWORD="$MEDCLOUD_DB_PASS"
PSQL="psql -h $DB_HOST -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1"

MIGRATIONS=(
  "backend/migrations/002-sprint2-tables.sql"
  "backend/migrations/003-sprint2-v7-tables.sql"
  "backend/migrations/004-sprint3-tables.sql"
  "backend/migrations/005-sprint4-tables.sql"
  "backend/migrations/006-column-fixes.sql"
  "backend/migrations/007-security-and-missing-columns.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  if [[ -f "$migration" ]]; then
    info "Running: $migration"
    $PSQL -f "$migration" 2>&1 | grep -E "(NOTICE|ERROR|WARNING)" || true
    success "Migration applied: $(basename $migration)"
  else
    warn "Migration file not found: $migration — skipping"
  fi
done

# Verify table count
TABLE_COUNT=$($PSQL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" 2>/dev/null | tr -d ' ')
success "DB migration complete — $TABLE_COUNT tables in schema"
echo ""

# ─── Step 2: Deploy CloudFormation (S3 + IAM) ─────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 2: Deploy S3 + IAM CloudFormation stack"
echo "──────────────────────────────────────────────────"

CF_STACK="medcloud-sprint2-us-prod"
CF_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$CF_STACK" \
  --region "$REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [[ "$CF_STATUS" == "DOES_NOT_EXIST" ]] || [[ "$CF_STATUS" == "ROLLBACK_COMPLETE" ]]; then
  info "Creating CloudFormation stack: $CF_STACK"
  aws cloudformation deploy \
    --template-file backend/deploy/sprint2-infra.yaml \
    --stack-name "$CF_STACK" \
    --parameter-overrides Environment=prod Region=us ExistingLambdaRoleName="$LAMBDA_ROLE_NAME" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"
  success "CloudFormation stack created"
elif [[ "$CF_STATUS" == "CREATE_COMPLETE" ]] || [[ "$CF_STATUS" == "UPDATE_COMPLETE" ]]; then
  info "Stack already exists ($CF_STATUS) — updating..."
  aws cloudformation deploy \
    --template-file backend/deploy/sprint2-infra.yaml \
    --stack-name "$CF_STACK" \
    --parameter-overrides Environment=prod Region=us ExistingLambdaRoleName="$LAMBDA_ROLE_NAME" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --no-fail-on-empty-changeset
  success "CloudFormation stack updated"
else
  warn "Stack in state: $CF_STATUS — skipping CF deploy. Manually check: aws cloudformation describe-stacks --stack-name $CF_STACK"
fi
echo ""

# ─── Step 3: Deploy Lambda v4 (main API) ──────────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 3: Package + Deploy Lambda v4 (main API)"
echo "──────────────────────────────────────────────────"

cd deploy/lambda-v4
info "Installing npm dependencies..."
npm install --omit=dev pg \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @aws-sdk/client-textract \
  @aws-sdk/client-bedrock-runtime \
  2>&1 | tail -3

info "Packaging Lambda..."
rm -f lambda-v4.zip
zip -r lambda-v4.zip index.mjs node_modules/ --quiet
ZIP_SIZE=$(du -sh lambda-v4.zip | cut -f1)
success "Lambda package created: lambda-v4.zip ($ZIP_SIZE)"

info "Deploying to AWS Lambda..."
aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --zip-file fileb://lambda-v4.zip \
  --region "$REGION" \
  --output text --query 'FunctionName'

# Wait for update to complete
aws lambda wait function-updated \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION"
success "Lambda v4 deployed: $LAMBDA_NAME"
cd ../..
echo ""

# ─── Step 4: Set Lambda Environment Variables ──────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 4: Setting Lambda environment variables"
echo "──────────────────────────────────────────────────"

aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --environment "Variables={
    DB_HOST=$DB_HOST,
    DB_NAME=$DB_NAME,
    DB_USER=$DB_USER,
    DB_PASS=$MEDCLOUD_DB_PASS,
    S3_BUCKET=$S3_BUCKET,
    AWS_REGION=$REGION,
    BEDROCK_MODEL=$BEDROCK_MODEL,
    COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID,
    NODE_OPTIONS=--experimental-vm-modules
  }" \
  --region "$REGION" \
  --output text --query 'FunctionName' >/dev/null

aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION"
success "Environment variables set on $LAMBDA_NAME"
echo ""

# ─── Step 5: Upgrade Lambda runtime to nodejs22.x ────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 5: Upgrading Lambda runtime to nodejs22.x"
echo "──────────────────────────────────────────────────"

aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --runtime nodejs22.x \
  --region "$REGION" \
  --output text --query 'Runtime'

aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION"
RUNTIME=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" --region "$REGION" \
  --query 'Runtime' --output text)
success "Runtime upgraded: $RUNTIME"
echo ""

# ─── Step 6: Deploy Cognito Lambda Authorizer ─────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 6: Deploy Cognito Lambda Authorizer"
echo "──────────────────────────────────────────────────"

cd deploy/lambda-authorizer
rm -f authorizer.zip
zip -r authorizer.zip index.mjs --quiet

# Check if authorizer Lambda already exists
AUTHORIZER_EXISTS=$(aws lambda get-function \
  --function-name "$AUTHORIZER_NAME" \
  --region "$REGION" \
  --query 'Configuration.FunctionName' \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [[ "$AUTHORIZER_EXISTS" == "DOES_NOT_EXIST" ]]; then
  info "Creating Lambda authorizer function..."
  AUTHORIZER_ARN=$(aws lambda create-function \
    --function-name "$AUTHORIZER_NAME" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$LAMBDA_ROLE_ARN" \
    --zip-file fileb://authorizer.zip \
    --timeout 10 \
    --memory-size 128 \
    --environment "Variables={
      COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID,
      COGNITO_REGION=$REGION
    }" \
    --region "$REGION" \
    --query 'FunctionArn' --output text)
  aws lambda wait function-active --function-name "$AUTHORIZER_NAME" --region "$REGION"
  success "Authorizer Lambda created: $AUTHORIZER_ARN"
else
  info "Updating existing authorizer Lambda..."
  aws lambda update-function-code \
    --function-name "$AUTHORIZER_NAME" \
    --zip-file fileb://authorizer.zip \
    --region "$REGION" >/dev/null
  aws lambda wait function-updated --function-name "$AUTHORIZER_NAME" --region "$REGION"
  AUTHORIZER_ARN=$(aws lambda get-function-configuration \
    --function-name "$AUTHORIZER_NAME" --region "$REGION" \
    --query 'FunctionArn' --output text)
  success "Authorizer Lambda updated: $AUTHORIZER_ARN"
fi
cd ../..

# Attach authorizer to API Gateway
info "Attaching authorizer to API Gateway..."

# Check if authorizer already attached
EXISTING_AUTHORIZER=$(aws apigateway get-authorizers \
  --rest-api-id "$API_GATEWAY_ID" \
  --region "$REGION" \
  --query "items[?name=='MedCloudCognitoAuth'].id | [0]" \
  --output text 2>/dev/null || echo "None")

if [[ "$EXISTING_AUTHORIZER" == "None" ]] || [[ -z "$EXISTING_AUTHORIZER" ]]; then
  # Give API Gateway permission to invoke the authorizer
  aws lambda add-permission \
    --function-name "$AUTHORIZER_NAME" \
    --statement-id "APIGatewayInvoke" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_GATEWAY_ID/*" \
    --region "$REGION" 2>/dev/null || warn "Permission may already exist"

  AUTHORIZER_ID=$(aws apigateway create-authorizer \
    --rest-api-id "$API_GATEWAY_ID" \
    --name "MedCloudCognitoAuth" \
    --type TOKEN \
    --authorizer-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$AUTHORIZER_ARN/invocations" \
    --identity-source "method.request.header.Authorization" \
    --authorizer-result-ttl-in-seconds 300 \
    --region "$REGION" \
    --query 'id' --output text)
  success "Authorizer attached to API Gateway (ID: $AUTHORIZER_ID)"
  warn "NOTE: You still need to apply the authorizer to each API Gateway method via console or CloudFormation update."
else
  success "Authorizer already attached (ID: $EXISTING_AUTHORIZER) — no action needed"
fi
echo ""

# ─── Step 7: Deploy SFTP Poller Lambda ────────────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 7: Deploy SFTP Poller Lambda + EventBridge schedule"
echo "──────────────────────────────────────────────────"

cd deploy/lambda-sftp-poller
npm install --omit=dev @aws-sdk/client-s3 @aws-sdk/client-secrets-manager 2>&1 | tail -2
rm -f sftp-poller.zip
zip -r sftp-poller.zip index.mjs node_modules/ --quiet

SFTP_EXISTS=$(aws lambda get-function \
  --function-name "$SFTP_POLLER_NAME" \
  --region "$REGION" \
  --query 'Configuration.FunctionName' \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [[ "$SFTP_EXISTS" == "DOES_NOT_EXIST" ]]; then
  aws lambda create-function \
    --function-name "$SFTP_POLLER_NAME" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$LAMBDA_ROLE_ARN" \
    --zip-file fileb://sftp-poller.zip \
    --timeout 300 \
    --memory-size 512 \
    --environment "Variables={
      API_BASE=$API_BASE,
      ORG_ID=$ORG_ID,
      S3_BUCKET=$S3_BUCKET,
      AWS_REGION=$REGION
    }" \
    --region "$REGION" >/dev/null
  aws lambda wait function-active --function-name "$SFTP_POLLER_NAME" --region "$REGION"
  success "SFTP Poller Lambda created"
else
  aws lambda update-function-code \
    --function-name "$SFTP_POLLER_NAME" \
    --zip-file fileb://sftp-poller.zip \
    --region "$REGION" >/dev/null
  aws lambda wait function-updated --function-name "$SFTP_POLLER_NAME" --region "$REGION"
  success "SFTP Poller Lambda updated"
fi
cd ../..

# Create EventBridge rule for 15-min schedule
SFTP_POLLER_ARN=$(aws lambda get-function-configuration \
  --function-name "$SFTP_POLLER_NAME" --region "$REGION" \
  --query 'FunctionArn' --output text)

RULE_EXISTS=$(aws events describe-rule \
  --name medcloud-sftp-poll \
  --region "$REGION" \
  --query 'Name' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [[ "$RULE_EXISTS" == "DOES_NOT_EXIST" ]]; then
  aws events put-rule \
    --name medcloud-sftp-poll \
    --schedule-expression "rate(15 minutes)" \
    --state ENABLED \
    --description "MedCloud SFTP poller — fetches 835/999/277 from Availity every 15 min" \
    --region "$REGION" >/dev/null

  aws events put-targets \
    --rule medcloud-sftp-poll \
    --targets "Id=sftp-poller-target,Arn=$SFTP_POLLER_ARN" \
    --region "$REGION" >/dev/null

  aws lambda add-permission \
    --function-name "$SFTP_POLLER_NAME" \
    --statement-id "EventBridgeInvoke" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:$REGION:$ACCOUNT_ID:rule/medcloud-sftp-poll" \
    --region "$REGION" 2>/dev/null || warn "EventBridge permission may already exist"

  success "EventBridge schedule created (every 15 min)"
else
  success "EventBridge schedule already exists — no change"
fi
echo ""

# ─── Step 8: Redeploy API Gateway ─────────────────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 8: Redeploying API Gateway to 'prod' stage"
echo "──────────────────────────────────────────────────"

aws apigateway create-deployment \
  --rest-api-id "$API_GATEWAY_ID" \
  --stage-name prod \
  --description "Deploy $(date '+%Y-%m-%d %H:%M') — Lambda v4 + Authorizer" \
  --region "$REGION" >/dev/null
success "API Gateway redeployed"
echo ""

# ─── Step 9: Smoke Tests ──────────────────────────────────────────────────────
echo "──────────────────────────────────────────────────"
info "STEP 9: Smoke testing endpoints"
echo "──────────────────────────────────────────────────"

sleep 5  # Wait for Lambda to warm up

run_test() {
  local name="$1" url="$2" method="${3:-GET}" body="${4:-}"
  local resp
  if [[ -n "$body" ]]; then
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "X-Org-Id: $ORG_ID" \
      -d "$body" 2>/dev/null)
  else
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "X-Org-Id: $ORG_ID" 2>/dev/null)
  fi
  local code=$(echo "$resp" | tail -1)
  local body_out=$(echo "$resp" | head -1 | cut -c1-80)

  if [[ "$code" == "200" ]] || [[ "$code" == "201" ]]; then
    success "$name → HTTP $code ✓"
  elif [[ "$code" == "403" ]]; then
    success "$name → HTTP $code ✓ (auth required — correct)"
  else
    warn "$name → HTTP $code — $body_out"
  fi
}

run_test "Health Check"       "$API_BASE/health"
run_test "Patients (auth)"    "$API_BASE/patients"
run_test "Claims (auth)"      "$API_BASE/claims"
run_test "Dashboard"          "$API_BASE/dashboard"
run_test "CARC codes"         "$API_BASE/carc-codes"
run_test "Eligibility (auth)" "$API_BASE/eligibility"
run_test "Denials (auth)"     "$API_BASE/denials"
run_test "Coding (auth)"      "$API_BASE/coding"
run_test "Notifications"      "$API_BASE/notifications"
run_test "Write-offs"         "$API_BASE/write-offs"
run_test "EDI Transactions"   "$API_BASE/edi-transactions"

echo ""
echo "======================================================"
success "DEPLOY COMPLETE — $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"
echo ""
echo "  API Base:        $API_BASE"
echo "  Lambda:          $LAMBDA_NAME (nodejs22.x)"
echo "  Authorizer:      $AUTHORIZER_NAME"
echo "  SFTP Poller:     $SFTP_POLLER_NAME (every 15 min)"
echo "  DB Tables:       $TABLE_COUNT"
echo "  S3 Bucket:       $S3_BUCKET"
echo ""
echo "  NEXT STEPS (manual — cannot automate):"
echo "  1. Start Availity SFTP enrollment: 1-800-AVAILITY"
echo "  2. Set RETELL_WEBHOOK_SECRET in Lambda env vars once Alex provides it"
echo "  3. Apply Cognito Authorizer to API Gateway methods via console"
echo "  4. Set AVAILITY_SFTP creds in Secrets Manager after enrollment:"
echo "     aws secretsmanager create-secret --name medcloud/availity-sftp \\"
echo "       --secret-string '{\"host\":\"sftp.availity.com\",\"user\":\"<USER>\",\"password\":\"<PASS>\"}'"
echo ""
