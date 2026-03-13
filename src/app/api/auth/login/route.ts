import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const REGION        = process.env.AWS_COGNITO_REGION || 'us-east-1'
const CLIENT_ID     = process.env.COGNITO_CLIENT_ID  || ''
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || ''

const cognito = new CognitoIdentityProviderClient({ region: REGION })

function secretHash(username: string): string {
  return createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64')
}

// Redact email for logs — keeps domain, replaces local-part with ***
function redactEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 0) return '***'
  return `***${email.slice(at)}`
}

// Attempt Cognito USER_PASSWORD_AUTH. Returns { result, usedUsername } on success
// or { errorName, errorMsg } on failure. Never throws.
async function tryAuth(
  username: string,
  password: string
): Promise<
  | { result: Awaited<ReturnType<typeof cognito.send<InitiateAuthCommand>>>; usedUsername: string }
  | { errorName: string; errorMsg: string }
> {
  try {
    const res = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash(username),
      },
    }))
    return { result: res, usedUsername: username }
  } catch (err: unknown) {
    const errorName = (err as { name?: string }).name || 'UnknownError'
    const errorMsg  = err instanceof Error ? err.message : String(err)
    return { errorName, errorMsg }
  }
}

export async function POST(req: NextRequest) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[auth/login] COGNITO_CLIENT_ID or COGNITO_CLIENT_SECRET not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const emailTrimmed = email.trim() as string
  const emailLower   = emailTrimmed.toLowerCase()

  // Strategy: try auth with the email exactly as typed.
  // If Cognito says UserNotFoundException AND casing differs, retry lowercase.
  // No IAM credentials needed — uses only CLIENT_ID + CLIENT_SECRET.
  let authRes = await tryAuth(emailTrimmed, password)

  if (
    'errorName' in authRes &&
    authRes.errorName === 'UserNotFoundException' &&
    emailTrimmed !== emailLower
  ) {
    authRes = await tryAuth(emailLower, password)
  }

  if ('errorName' in authRes) {
    // Log redacted email and error code only — no PII
    console.error(`[auth/login] auth failed for ${redactEmail(emailTrimmed)}: ${authRes.errorName}`)

    switch (authRes.errorName) {
      case 'NotAuthorizedException':
        return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
      case 'UserNotFoundException':
        // Intentionally same message as NotAuthorizedException — prevents email enumeration
        return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
      case 'UserNotConfirmedException':
        return NextResponse.json({ error: 'Account not confirmed — contact admin' }, { status: 401 })
      case 'PasswordResetRequiredException':
        return NextResponse.json({ error: 'Password reset required — contact admin' }, { status: 401 })
      default:
        return NextResponse.json({ error: 'Login failed — please try again' }, { status: 500 })
    }
  }

  if (!authRes.result?.AuthenticationResult?.AccessToken) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }

  // usedUsername is always correct here — it's the username that actually succeeded
  const usedUsername = authRes.usedUsername

  // Fetch user attributes using the access token
  let userRes: Awaited<ReturnType<typeof cognito.send<GetUserCommand>>>
  try {
    userRes = await cognito.send(new GetUserCommand({
      AccessToken: authRes.result.AuthenticationResult.AccessToken,
    }))
  } catch (err: unknown) {
    const errorName = (err as { name?: string }).name || 'UnknownError'
    console.error(`[auth/login] GetUser failed for ${redactEmail(emailTrimmed)}: ${errorName}`)
    return NextResponse.json({ error: 'Login failed — please try again' }, { status: 500 })
  }

  const attrs: Record<string, string> = {}
  userRes.UserAttributes?.forEach(a => {
    if (a.Name && a.Value) attrs[a.Name] = a.Value
  })

  // Dual-key lookup — mirrors the Lambda authorizer:
  //   New users (Admin panel): custom:custom:role / custom:custom:org_id / custom:custom:region
  //   Legacy users: custom:role / custom:org_id
  const role   = attrs['custom:custom:role']   || attrs['custom:role']
  const orgId  = attrs['custom:custom:org_id']  || attrs['custom:org_id']
  const region = attrs['custom:custom:region']  || attrs['custom:region'] || 'us'

  if (!role || !orgId) {
    console.error(`[auth/login] missing required attributes for ${redactEmail(emailTrimmed)}: role=${!!role} org=${!!orgId}`)
    return NextResponse.json({ error: 'Account configuration error. Please contact support.' }, { status: 500 })
  }

  // Use canonical email from Cognito attrs — most reliable source
  const canonicalEmail = attrs['email'] || usedUsername
  // Prefer full name; fall back to given_name + family_name; finally use email
  const givenName  = attrs['given_name']  || ''
  const familyName = attrs['family_name'] || ''
  const name = attrs['name'] || (givenName && familyName ? `${givenName} ${familyName}`.trim() : givenName || canonicalEmail)
  const sub  = attrs['sub'] || ''
  const country = region === 'uae' ? 'uae' : 'usa'

  const facilityRoles = ['provider', 'client']
  const portalType = facilityRoles.includes(role) ? 'facility' : 'backoffice'

  // auth_session is HttpOnly + server-signed — middleware checks presence + HMAC integrity.
  // Full opaque server-side sessions deferred until session store is provisioned (TODO: Sprint 5).
  const sessionPayload = JSON.stringify({
    sub,
    email: canonicalEmail,
    name,
    role,
    org_id: orgId,
    country,
    portalType,
    ts: Date.now(),
  })
  // Sign the payload so it can't be forged by setting a cookie manually
  const SESSION_SECRET = process.env.SESSION_SECRET || CLIENT_SECRET
  const signature = createHmac('sha256', SESSION_SECRET).update(sessionPayload).digest('base64url')
  const signedSession = `${Buffer.from(sessionPayload).toString('base64url')}.${signature}`

  const cookieStore = await cookies()
  cookieStore.set('auth_session', signedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  // Return all identity fields — page.tsx persists these to localStorage for context hydration
  return NextResponse.json({ ok: true, role, name, email: canonicalEmail, country, portalType, orgId })
}
