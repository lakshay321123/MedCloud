import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('auth_session')
  const isLoginPage = req.nextUrl.pathname === '/'
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  // Allow API routes through
  if (isApiRoute) return NextResponse.next()

  // If no session and not on login page, redirect to login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // If has session and is on login page, redirect to dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
