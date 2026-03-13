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

// Attempt Cognito USER_PASSWORD_AUTH and return the result.
// Does NOT throw — returns { result } on success or { error: string } on failure.
async function tryAuth(username: string, password: string) {
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
    return { result: res }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg }
  }
}

function isUserNotFound(msg: string): boolean {
  return (
    msg.includes('UserNotFoundException') ||
    msg.includes('User does not exist') ||
    msg.includes('User not found')
  )
}

function isWrongPassword(msg: string): boolean {
  return (
    msg.includes('NotAuthorizedException') ||
    msg.includes('Incorrect username or password') ||
    msg.includes('Incorrect') ||
    msg.includes('Password attempts exceeded')
  )
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

  const emailTrimmed   = email.trim()
  const emailLower     = emailTrimmed.toLowerCase()

  // Strategy: try auth with the email exactly as the user typed it.
  // If Cognito says "User does not exist" AND the casing differs, retry with
  // lowercase — this handles Dr@cosentus.com typed as "dr@cosentus.com" and vice versa.
  // No IAM credentials needed — uses only CLIENT_ID + CLIENT_SECRET.
  let authRes = await tryAuth(emailTrimmed, password)

  if (authRes.error && isUserNotFound(authRes.error) && emailTrimmed !== emailLower) {
    // First attempt was with original casing and user not found — try lowercase
    authRes = await tryAuth(emailLower, password)
  }

  // Determine which username ultimately succeeded (for session cookie)
  // If the second attempt (lowercase) worked, use that; otherwise emailTrimmed
  const usedUsername = (authRes.result) 
    ? (authRes.error ? emailLower : emailTrimmed)
    : emailTrimmed

  if (authRes.error) {
    const msg = authRes.error
    console.error(`[auth/login] Cognito error for ${emailTrimmed}:`, msg)

    if (isWrongPassword(msg)) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }
    if (isUserNotFound(msg)) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }
    if (msg.includes('UserNotConfirmedException')) {
      return NextResponse.json({ error: 'Account not confirmed — contact admin' }, { status: 401 })
    }
    if (msg.includes('PasswordResetRequiredException')) {
      return NextResponse.json({ error: 'Password reset required — contact admin' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Login failed — please try again' }, { status: 500 })
  }

  if (!authRes.result?.AuthenticationResult?.AccessToken) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }

  // Fetch user attributes using the access token
  let userRes
  try {
    userRes = await cognito.send(new GetUserCommand({
      AccessToken: authRes.result.AuthenticationResult.AccessToken,
    }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[auth/login] GetUser error:', msg)
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
  const region = attrs['custom:custom:region']  || 'us'

  if (!role || !orgId) {
    console.error(`[auth/login] User ${emailTrimmed} missing required attributes: role=${role} org=${orgId}`)
    return NextResponse.json({ error: 'Account configuration error. Please contact support.' }, { status: 500 })
  }

  // Use the canonical email from Cognito attributes (most reliable source)
  const canonicalEmail = attrs['email'] || usedUsername
  const name    = attrs['name'] || attrs['given_name'] || canonicalEmail
  const sub     = attrs['sub']  || ''
  const country = region === 'uae' ? 'uae' : 'usa'

  const facilityRoles = ['provider', 'client']
  const portalType = facilityRoles.includes(role) ? 'facility' : 'backoffice'

  const cookieStore = await cookies()
  cookieStore.set('auth_session', JSON.stringify({
    sub,
    email: canonicalEmail,
    name,
    role,
    org_id: orgId,
    country,
    portalType,
    ts: Date.now(),
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return NextResponse.json({ ok: true, role, name, country, portalType, orgId })
}
