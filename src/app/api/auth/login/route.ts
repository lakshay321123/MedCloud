import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'

// FIX 1: Move sensitive values to env vars (Gemini: critical + high)
const REGION        = process.env.AWS_COGNITO_REGION      || 'us-east-1'
const CLIENT_ID     = process.env.COGNITO_CLIENT_ID       || ''
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET   || ''

const cognito = new CognitoIdentityProviderClient({ region: REGION })

// Cognito requires SECRET_HASH when the app client has a secret
function secretHash(username: string): string {
  return createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64')
}

export async function POST(req: NextRequest) {
  // FIX 1 cont: Fail fast if env vars not set
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[auth/login] COGNITO_CLIENT_ID or COGNITO_CLIENT_SECRET not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const username = email.toLowerCase().trim()

  try {
    // Authenticate against Cognito
    const authRes = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash(username),
      },
    }))

    if (!authRes.AuthenticationResult?.AccessToken) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Fetch user attributes using the access token
    const userRes = await cognito.send(new GetUserCommand({
      AccessToken: authRes.AuthenticationResult.AccessToken,
    }))

    const attrs: Record<string, string> = {}
    userRes.UserAttributes?.forEach(a => {
      if (a.Name && a.Value) attrs[a.Name] = a.Value
    })

    // FIX 2: Fail if required Cognito attributes missing — never default to 'admin' (Gemini: security-high)
    // Attributes use double-prefix custom:custom:* — this matches ALL existing Cognito users
    // (admin, maria, james, lisa, david, emily, drsmith, dr.m, Dr@cosentus.com)
    const role   = attrs['custom:custom:role']
    const orgId  = attrs['custom:custom:org_id']
    const region = attrs['custom:custom:region']

    if (!role || !orgId || !region) {
      console.error(`[auth/login] User ${username} missing required Cognito attributes: role=${role} org=${orgId} region=${region}`)
      return NextResponse.json({ error: 'Account configuration error. Please contact support.' }, { status: 500 })
    }

    const name    = attrs['name'] || username
    const sub     = attrs['sub']  || ''
    const country = region === 'uae' ? 'uae' : 'usa'

    // Derive portalType from role — facility roles get the clinic portal
    const facilityRoles = ['provider', 'client']
    const portalType = facilityRoles.includes(role) ? 'facility' : 'backoffice'

    // FIX 3: Store only non-sensitive session data in cookie; drop tokens from cookie (Gemini: security-high)
    // accessToken / refreshToken are NOT stored in the cookie to prevent exposure
    const cookieStore = await cookies()
    cookieStore.set('auth_session', JSON.stringify({
      sub,
      email: username,
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

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[auth/login] Cognito error:', msg)
    if (msg.includes('NotAuthorizedException') || msg.includes('Incorrect')) {
      // FIX 4 (partial): NotAuthorized covers both wrong password AND wrong user — generic message (Gemini: medium)
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }
    if (msg.includes('UserNotFoundException')) {
      // FIX 4: Return same message as wrong password to prevent email enumeration (Gemini: medium)
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }
    if (msg.includes('UserNotConfirmedException')) {
      return NextResponse.json({ error: 'Account not confirmed — contact admin' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Login failed — please try again' }, { status: 500 })
  }
}
