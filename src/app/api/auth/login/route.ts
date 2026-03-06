import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' })
const CLIENT_ID     = '54tftm7llmiqcdb80bfr1tibaj'
const CLIENT_SECRET = '1bon4i0smj9m8n77al2dil6cbgqu6mtifmuetvu9b3bpkkmlchlv'

// Cognito requires SECRET_HASH when the app client has a secret
function secretHash(username: string): string {
  return createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64')
}

export async function POST(req: NextRequest) {
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

    // Read role, org, region from Cognito custom attributes
    const role     = attrs['custom:custom:role']    || 'admin'
    const orgId    = attrs['custom:custom:org_id']  || 'a0000000-0000-0000-0000-000000000001'
    const region   = attrs['custom:custom:region']  || 'us'
    const name     = attrs['name']                  || username
    const sub      = attrs['sub']                   || ''

    // Derive portalType from role — facility roles get the clinic portal
    const facilityRoles = ['provider', 'client']
    const portalType = facilityRoles.includes(role) ? 'facility' : 'backoffice'
    const country    = region === 'uae' ? 'uae' : 'usa'

    // Set httpOnly session cookie (8 hour lifetime)
    const cookieStore = await cookies()
    cookieStore.set('auth_session', JSON.stringify({
      sub,
      email: username,
      name,
      role,
      org_id: orgId,
      country,
      portalType,
      accessToken:  authRes.AuthenticationResult.AccessToken,
      refreshToken: authRes.AuthenticationResult.RefreshToken,
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
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }
    if (msg.includes('UserNotFoundException')) {
      return NextResponse.json({ error: 'No account found with that email' }, { status: 401 })
    }
    if (msg.includes('UserNotConfirmedException')) {
      return NextResponse.json({ error: 'Account not confirmed — contact admin' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Login failed — please try again' }, { status: 500 })
  }
}
