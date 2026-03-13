/**
 * MedCloud — Cognito JWT Lambda Authorizer
 *
 * Attached to API Gateway as a TOKEN authorizer. Validates the Cognito JWT
 * from the Authorization header, extracts custom claims, and injects them
 * into requestContext.authorizer so Lambda v4 can use them without trusting
 * spoofable headers.
 *
 * Deploy:
 *   zip authorizer.zip index.mjs
 *   aws lambda create-function \
 *     --function-name medcloud-api-authorizer \
 *     --runtime nodejs22.x \
 *     --handler index.handler \
 *     --role arn:aws:iam::<ACCOUNT>:role/medcloud-api-role \
 *     --zip-file fileb://authorizer.zip \
 *     --environment Variables="{COGNITO_USER_POOL_ID=us-east-1_azvKruQpU,COGNITO_REGION=us-east-1}" \
 *     --region us-east-1
 *
 * Then attach to API Gateway:
 *   aws apigateway create-authorizer \
 *     --rest-api-id fm2l2133of \
 *     --name MedCloudCognitoAuth \
 *     --type TOKEN \
 *     --authorizer-uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/<AUTHORIZER_ARN>/invocations \
 *     --identity-source method.request.header.Authorization \
 *     --authorizer-result-ttl-in-seconds 300
 *
 * Environment Variables:
 *   COGNITO_USER_POOL_ID  — us-east-1_azvKruQpU
 *   COGNITO_REGION        — us-east-1
 */

const REGION        = process.env.COGNITO_REGION       || 'us-east-1';
const USER_POOL_ID  = process.env.COGNITO_USER_POOL_ID || 'us-east-1_azvKruQpU';
const JWKS_URL      = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

// ─── JWKS Key Cache ─────────────────────────────────────────────────────────────
let jwksCache = null;
let jwksCacheExpiry = 0;

async function getJWKS() {
  if (jwksCache && Date.now() < jwksCacheExpiry) return jwksCache;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const data = await res.json();
  jwksCache = data.keys;
  jwksCacheExpiry = Date.now() + 3600_000; // cache 1 hour
  return jwksCache;
}

// ─── Base64URL helpers ──────────────────────────────────────────────────────────
function b64urlDecode(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// ─── JWT Verify ─────────────────────────────────────────────────────────────────
async function verifyJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const header  = JSON.parse(b64urlDecode(parts[0]).toString());
  const payload = JSON.parse(b64urlDecode(parts[1]).toString());
  const signature = b64urlDecode(parts[2]);

  // Validate expiry
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('JWT expired');

  // Validate issuer
  const expectedIssuer = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
  if (payload.iss !== expectedIssuer) throw new Error(`Invalid issuer: ${payload.iss}`);

  // token_use must be 'access' or 'id'
  if (!['access', 'id'].includes(payload.token_use)) throw new Error(`Invalid token_use: ${payload.token_use}`);

  // Find matching key in JWKS
  const keys = await getJWKS();
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error(`Key not found: ${header.kid}`);

  // Import JWK and verify signature
  const signingInput = `${parts[0]}.${parts[1]}`;
  const cryptoKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    signature,
    new TextEncoder().encode(signingInput)
  );
  if (!valid) throw new Error('JWT signature invalid');

  return payload;
}

// ─── Role → Permission Mapping ──────────────────────────────────────────────────
// Maps Cognito group name to internal role string
const GROUP_ROLE_MAP = {
  'admin':        'admin',
  'director':     'director',
  'supervisor':   'supervisor',
  'manager':      'manager',
  'coder':        'coder',
  'biller':       'biller',
  'ar_team':      'ar_team',
  'posting_team': 'posting_team',
  'provider':     'provider',
  'client':       'client',
};

// ─── IAM Policy Generator ───────────────────────────────────────────────────────
function generatePolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }],
    },
    context, // passed to Lambda as requestContext.authorizer
  };
}

// ─── Main Handler ───────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new Error('Unauthorized'); // API Gateway returns 401
  }

  try {
    const payload = await verifyJWT(token);

    // Extract custom Cognito attributes
    // Custom attributes use prefix 'custom:' in Cognito user pool
    const sub         = payload.sub;
    const email       = payload.email || payload['cognito:username'] || sub;
    const orgId       = payload['custom:org_id']     || 'a0000000-0000-0000-0000-000000000001';
    const clientId    = payload['custom:client_id']  || null;
    const portalType  = payload['custom:portal_type'] || 'backoffice';

    // Determine role from Cognito groups (prefer explicit custom:role attribute)
    let role = payload['custom:role'] || null;
    if (!role) {
      const groups = payload['cognito:groups'] || [];
      for (const g of groups) {
        if (GROUP_ROLE_MAP[g]) { role = GROUP_ROLE_MAP[g]; break; }
      }
    }
    role = role || 'unknown';

    // Build authorizer context — available in Lambda as event.requestContext.authorizer
    const context = {
      user_id:      sub,
      email,
      org_id:       orgId,
      client_id:    clientId    || '',
      role,
      portal_type:  portalType,
      token_use:    payload.token_use,
    };

    // Allow access — wildcard resource so one policy covers all routes
    const resourceArn = event.methodArn.replace(/\/[^\/]+\/[^\/]+$/, '/*/*');
    return generatePolicy(sub, 'Allow', resourceArn, context);

  } catch (err) {
    console.error('[Authorizer] Denied:', err.message);
    // Deny — API Gateway returns 403
    return generatePolicy('unknown', 'Deny', event.methodArn, {});
  }
};
