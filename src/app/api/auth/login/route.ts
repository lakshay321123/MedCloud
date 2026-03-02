import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const { username, password, country, portalType } = await req.json()

  const validUser = process.env.APP_USERNAME || (process.env.NODE_ENV === 'development' ? 'admin' : undefined)
  const validPass = process.env.APP_PASSWORD || (process.env.NODE_ENV === 'development' ? 'cosentus2026' : undefined)

  if (!validUser || !validPass) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  if (safeCompare(username, validUser) && safeCompare(password, validPass)) {
    const cookieStore = await cookies()
    cookieStore.set('auth_session', JSON.stringify({ username, country, portalType, ts: Date.now() }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    return NextResponse.json({ ok: true, country, portalType })
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
