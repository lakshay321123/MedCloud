'use client'
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SessionTimeout from '../shared/SessionTimeout'
import { Menu, X, LogOut } from 'lucide-react'
import Footer from './Footer'
import { useHasMounted } from '@/lib/hooks/useHasMounted'
import { useApp } from '@/lib/context'

type UserRole = 'provider' | 'client' | 'admin' | 'director' | 'supervisor' | 'manager' | 'coder' | 'biller' | 'ar_team' | 'posting_team'
const facilityRoles: UserRole[] = ['provider', 'client']
const roleDisplayLabels: Record<string, string> = { provider: 'Doctor', client: 'Front Desk' }

const INACTIVITY_MS = 15 * 60 * 1000 // 15 minutes

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, setRole, portalType } = useApp()
  const isLoginPage = pathname === '/'
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const mounted = useHasMounted()

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('cosentus_region')
      localStorage.removeItem('cosentus_portal_type')
      localStorage.removeItem('cosentus_role')
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

  // Close mobile sidebar on route change
  useEffect(() => { setMobileSidebarOpen(false) }, [pathname])

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-surface-primary overflow-hidden">
      {/* Desktop sidebar — only render after hydration to avoid backoffice flash */}
      <div className="hidden lg:flex">
        {mounted && <Sidebar />}
      </div>

      {/* Mobile sidebar overlay */}
      {mounted && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative flex w-72 flex-col bg-surface-secondary shadow-2xl">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute right-3 top-3 p-2 rounded-lg text-content-secondary hover:bg-surface-elevated z-10"
            >
              <X size={18} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar with hamburger */}
        <div className="flex items-center lg:hidden h-16 bg-brand border-b border-brand-mid px-4 gap-3 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-content-secondary hover:bg-surface-elevated"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-white">MedCloud</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Role switcher — facility portal only (Doctor / Front Desk) */}
            {mounted && portalType === 'facility' && (
              <select
                value={currentUser.role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="text-xs bg-brand/10 text-brand border-0 rounded-lg px-2 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {facilityRoles.map(r => (
                  <option key={r} value={r}>{roleDisplayLabels[r]}</option>
                ))}
              </select>
            )}
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                localStorage.removeItem('cosentus_region')
                localStorage.removeItem('cosentus_portal_type')
                localStorage.removeItem('cosentus_role')
                window.location.href = '/'
              }}
              className="p-2 rounded-lg text-content-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
        {/* Desktop topbar */}
        <div className="hidden lg:block">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Gate content on mounted: SSR always renders with role='admin' (no localStorage).
              Showing content before hydration causes a flash of wrong dashboard/sidebar.
              The spinner is only visible for ~50-80ms (one useEffect tick). */}
          {mounted ? children : (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
            </div>
          )}
        </main>
        <Footer />
      </div>
      <SessionTimeout />
    </div>
  )
}
