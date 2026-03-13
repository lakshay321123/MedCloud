import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const REGION        = process.env.AWS_COGNITO_REGION      || 'us-east-1'
const CLIENT_ID     = process.env.COGNITO_CLIENT_ID       || ''
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET   || ''
const USER_POOL_ID  = process.env.COGNITO_USER_POOL_ID    || 'us-east-1_azvKruQpU'

const cognito = new CognitoIdentityProviderClient({ region: REGION })

// Cognito requires SECRET_HASH when the app client has a secret
function secretHash(username: string): string {
  return createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64')
}

// Resolve the canonical Cognito username for a given email.
// The user pool is case-sensitive (UsernameConfiguration: null = legacy mode).
// Lowercasing before auth causes "User does not exist" for mixed-case emails
// like Dr@cosentus.com. ListUsers email filter is case-insensitive — we use
// it to get the exact stored email and authenticate with that.
async function resolveCanonicalEmail(email: string): Promise<string | null> {
  try {
    const res = await cognito.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email.trim().replace(/"/g, '')}"`,
      Limit: 1,
    }))
    const user = res.Users?.[0]
    if (!user) return null
    const emailAttr = user.Attributes?.find(a => a.Name === 'email')
    return emailAttr?.Value || user.Username || null
  } catch (e) {
    console.error('[auth/login] resolveCanonicalEmail error:', e instanceof Error ? e.message : String(e))
    return null
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

  try {
    // Step 1: Resolve canonical email from Cognito (case-insensitive lookup).
    // This handles Dr@cosentus.com vs dr@cosentus.com without any special casing.
    const canonicalEmail = await resolveCanonicalEmail(email)
    if (!canonicalEmail) {
      console.error(`[auth/login] No Cognito user found for email: ${email}`)
      // Same message as wrong password — prevents email enumeration
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }

    // Step 2: Authenticate with exact canonical email Cognito stored
    const authRes = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: canonicalEmail,
        PASSWORD: password,
        SECRET_HASH: secretHash(canonicalEmail),
      },
    }))

    if (!authRes.AuthenticationResult?.AccessToken) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Step 3: Fetch user attributes from the access token
    const userRes = await cognito.send(new GetUserCommand({
      AccessToken: authRes.AuthenticationResult.AccessToken,
    }))

    const attrs: Record<string, string> = {}
    userRes.UserAttributes?.forEach(a => {
      if (a.Name && a.Value) attrs[a.Name] = a.Value
    })

    // Dual-key attribute lookup — mirrors the Lambda authorizer:
    //   New users (Admin panel, PR #108+): custom:custom:role / custom:custom:org_id / custom:custom:region
    //   Legacy users (admin, maria, james, etc.): custom:role / custom:org_id
    const role   = attrs['custom:custom:role']   || attrs['custom:role']
    const orgId  = attrs['custom:custom:org_id']  || attrs['custom:org_id']
    const region = attrs['custom:custom:region']  || 'us'

    if (!role || !orgId) {
      console.error(`[auth/login] User ${canonicalEmail} missing required attributes: role=${role} org=${orgId}`)
      return NextResponse.json({ error: 'Account configuration error. Please contact support.' }, { status: 500 })
    }

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

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[auth/login] Cognito error:', msg)

    if (
      msg.includes('NotAuthorizedException') ||
      msg.includes('Incorrect username or password') ||
      msg.includes('Incorrect') ||
      msg.includes('Password attempts exceeded')
    ) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }
    if (
      msg.includes('UserNotFoundException') ||
      msg.includes('User does not exist') ||
      msg.includes('User not found')
    ) {
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
}
