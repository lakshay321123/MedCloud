'use client'
import React, { useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const INACTIVITY_MS = 15 * 60 * 1000 // 15 minutes

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/'
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('cosentus_region')
      localStorage.removeItem('cosentus_portal_type')
      router.push('/?timeout=1')
    }, INACTIVITY_MS)
  }, [router])

  useEffect(() => {
    if (isLoginPage) return
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [isLoginPage, resetTimer])

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-surface-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
