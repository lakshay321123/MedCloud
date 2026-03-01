import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { username, password, country } = await req.json()

  const validUser = process.env.APP_USERNAME || 'admin'
  const validPass = process.env.APP_PASSWORD || 'cosentus2026'

  if (username === validUser && password === validPass) {
    // Set a simple session cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_session', JSON.stringify({ username, country, ts: Date.now() }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })
    return NextResponse.json({ ok: true, country })
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
