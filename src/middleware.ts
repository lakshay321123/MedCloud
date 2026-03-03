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
  biller:       ['/dashboard', '/claims', '/eligibility', '/denials', '/tasks', '/documents', '/portal/appointments', '/portal/messages', '/portal/patients'],
  ar_team:      ['/dashboard', '/denials', '/ar-management', '/voice-ai', '/tasks', '/documents', '/portal/messages'],
  posting_team: ['/dashboard', '/payment-posting', '/tasks', '/documents', '/portal/messages'],
  provider:     ['/dashboard', '/ai-scribe', '/documents', '/portal/appointments', '/portal/messages', '/portal/patients'],
  client:       ['/dashboard', '/portal'],
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
      const parsed = JSON.parse(session.value)
      const portalType = parsed.portalType

      // Facility portal users (provider, client) must never access back-office routes
      const backOfficeRoutes = ['/claims', '/coding', '/eligibility', '/denials', '/ar-management',
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
