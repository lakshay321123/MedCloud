'use client'
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { Menu, X } from 'lucide-react'

const INACTIVITY_MS = 15 * 60 * 1000 // 15 minutes

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/'
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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

  // Close mobile sidebar on route change
  useEffect(() => { setMobileSidebarOpen(false) }, [pathname])

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-surface-primary overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
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
        <div className="flex items-center lg:hidden h-16 bg-surface-secondary border-b border-separator px-4 gap-3 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-content-secondary hover:bg-surface-elevated"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-content-primary">MedCloud</span>
          <div className="ml-auto">
            {/* Minimal topbar actions on mobile — role switcher & logout only */}
          </div>
        </div>
        {/* Desktop topbar */}
        <div className="hidden lg:block">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
