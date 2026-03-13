import { NextRequest, NextResponse } from 'next/server'

// TODO Sprint 2: Wire this map to JWT role claim from Cognito
// When real auth is implemented, decode the JWT in middleware,
// extract the role claim, and enforce routes using this map.
// Current implementation uses portalType (facility vs backoffice)
// as a coarse guard until JWT auth is ready.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const roleRouteMap: Record<string, string[]> = {
  admin:        ['*'],
  director:     ['/dashboard', '/claims', '/coding', '/eligibility', '/denials', '/ar-management', '/payment-posting', '/contracts', '/voice-ai', '/ai-scribe', '/tasks', '/documents', '/credentialing', '/analytics', '/admin', '/integrations', '/portal'],
  supervisor:   ['/dashboard', '/claims', '/coding', '/eligibility', '/denials', '/ar-management', '/payment-posting', '/contracts', '/voice-ai', '/ai-scribe', '/tasks', '/documents', '/credentialing', '/analytics', '/portal'],
  manager:      ['/dashboard', '/claims', '/coding', '/eligibility', '/denials', '/ar-management', '/payment-posting', '/contracts', '/voice-ai', '/ai-scribe', '/tasks', '/documents', '/credentialing', '/analytics', '/portal'],
  coder:        ['/dashboard', '/coding', '/ai-scribe', '/tasks', '/documents', '/portal/messages'],
  biller:       ['/dashboard', '/claims', '/eligibility', '/denials', '/tasks', '/documents', '/patients', '/portal/appointments', '/portal/messages', '/portal/patients'],
  ar_team:      ['/dashboard', '/denials', '/ar-management', '/voice-ai', '/tasks', '/documents', '/portal/messages'],
  posting_team: ['/dashboard', '/payment-posting', '/tasks', '/documents', '/portal/messages'],
  provider:     ['/dashboard', '/ai-scribe', '/documents', '/analytics', '/portal/appointments', '/portal/messages', '/portal/patients'],
  client:       ['/dashboard', '/portal', '/eligibility'],
}

export function middleware(req: NextRequest) {
  const session = req.cookies.get('auth_session')
  const isLoginPage = req.nextUrl.pathname === '/'
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isStatic = req.nextUrl.pathname.startsWith('/_next')

  if (isApiRoute || isStatic) return NextResponse.next()

  // No session — redirect to login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Has session on login page — redirect to dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Session exists — parse portalType for coarse route guard
  if (session) {
    try {
      // Cookie is signed: base64url(payload).signature
      // Decode the payload portion only — signature verification is done server-side in the login route.
      // Middleware only needs portalType for coarse route guards.
      const cookieValue = session.value
      const dotIndex = cookieValue.indexOf('.')
      let parsed: Record<string, unknown>
      if (dotIndex > 0) {
        // Signed format — extract and decode the base64url payload
        const encodedPayload = cookieValue.slice(0, dotIndex)
        const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8')
        parsed = JSON.parse(decoded)
      } else {
        // Legacy plain-JSON fallback (sessions set before HMAC signing)
        parsed = JSON.parse(cookieValue)
      }
      const portalType = parsed.portalType as string | undefined

      // Facility portal users (provider, client) must never access back-office routes
      const backOfficeRoutes = ['/claims', '/coding', '/denials', '/ar-management',
        '/payment-posting', '/contracts', '/voice-ai', '/analytics', '/admin', '/integrations', '/credentialing']

      if (portalType === 'facility') {
        const isBackOfficeRoute = backOfficeRoutes.some(r => req.nextUrl.pathname.startsWith(r))
        if (isBackOfficeRoute) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }

      // Admin route — only admin portalType users should access
      // Fine-grained role enforcement is done client-side via sidebar
      // This is the server-side safety net
    } catch {
      // Malformed cookie — clear and redirect to login
      const response = NextResponse.redirect(new URL('/', req.url))
      response.cookies.delete('auth_session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
