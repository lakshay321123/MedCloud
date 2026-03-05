'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { UserRole } from '@/types'
import { Search, Sun, Moon, Bell, LogOut, Check, AlertTriangle, Info, X } from 'lucide-react'
import { useNotifications, useMarkNotificationRead } from '@/lib/hooks'
import Dropdown, { DropdownOption } from '@/components/shared/Dropdown'
import { useRouter } from 'next/navigation'

const roleDisplayLabels: Record<UserRole, string> = {
  admin: 'Admin',
  director: 'Director',
  supervisor: 'Supervisor',
  manager: 'Manager',
  coder: 'Coder',
  biller: 'Biller',
  ar_team: 'AR Team',
  posting_team: 'Posting Team',
  provider: 'Doctor',
  client: 'Front Desk',
}

const facilityRoles: UserRole[] = ['provider', 'client']
const backofficeRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']

export default function Topbar() {
  const { t } = useT()
  const supportedLanguages = [
    { lang: 'en' as const, flag: '🇺🇸', nativeName: 'EN' },
    { lang: 'ar' as const, flag: '🇦🇪', nativeName: 'عربي' },
    { lang: 'es' as const, flag: '🇪🇸', nativeName: 'ES' },
  ]
  const { theme, setTheme, language, setLanguage, currentUser, setRole, selectedClient, setSelectedClient, clients, country, portalType, isScribeRecording } = useApp()
  const isStaff = backofficeRoles.includes(currentUser.role)
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const { data: notifData, refetch: refetchNotifs } = useNotifications({ limit: 20 })
  const liveNotifs = notifData?.data ?? []
  const unreadCount = notifData?.unread_count ?? 0

  // Fallback static notifications while API warms up
  const staticNotifs = [
    { id: 's1', title: 'CLM-4504 appeal deadline in 2 days', created_at: new Date(Date.now() - 3600000).toISOString(), type: 'urgent', action_url: '/denials', read: false },
    { id: 's2', title: 'ERA from BCBS ready to post', created_at: new Date(Date.now() - 10800000).toISOString(), type: 'info', action_url: '/payment-posting', read: false },
    { id: 's3', title: 'Dr. Patel credentials expiring', created_at: new Date(Date.now() - 86400000).toISOString(), type: 'warning', action_url: '/credentialing', read: false },
  ]
  const notifications = liveNotifs.length > 0 ? liveNotifs : staticNotifs
  const displayUnread = liveNotifs.length > 0 ? unreadCount : staticNotifs.filter(n => !n.read).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Search: navigate to module search pages instead of querying demo data
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    const quickLinks: { type: string; label: string; sub: string; path: string }[] = [
      { type: 'Patients', label: 'Search patients', sub: `"${searchQuery}"`, path: `/portal/patients?search=${encodeURIComponent(searchQuery)}` },
      { type: 'Claims', label: 'Search claims', sub: `"${searchQuery}"`, path: `/claims?search=${encodeURIComponent(searchQuery)}` },
      { type: 'Documents', label: 'Search documents', sub: `"${searchQuery}"`, path: `/documents?search=${encodeURIComponent(searchQuery)}` },
    ]
    // Surface module shortcuts for common keywords
    const shortcuts: typeof quickLinks = []
    if (q.includes('denial') || q.includes('appeal')) shortcuts.push({ type: 'Module', label: 'Denials & Appeals', sub: 'Open module', path: '/denials' })
    if (q.includes('claim') || q.includes('clm')) shortcuts.push({ type: 'Module', label: 'Claims', sub: 'Open module', path: '/claims' })
    if (q.includes('post') || q.includes('era') || q.includes('835')) shortcuts.push({ type: 'Module', label: 'Payment Posting', sub: 'Open module', path: '/payment-posting' })
    if (q.includes('cod') || q.includes('cpt') || q.includes('icd')) shortcuts.push({ type: 'Module', label: 'AI Coding', sub: 'Open module', path: '/coding' })
    if (q.includes('ar') || q.includes('aging') || q.includes('follow')) shortcuts.push({ type: 'Module', label: 'AR Management', sub: 'Open module', path: '/ar' })
    return [...shortcuts, ...quickLinks].slice(0, 8)
  }, [searchQuery])

  const availableRoles = portalType === 'facility' ? facilityRoles : portalType === 'backoffice' ? backofficeRoles : [...backofficeRoles, ...facilityRoles]
  const roleOptions: DropdownOption[] = availableRoles.map(r => ({ value: r, label: roleDisplayLabels[r] }))

  const clientOptions: DropdownOption[] = [
    { value: '', label: 'All Clients' },
    ...clients.map(c => ({ value: c.id, label: `${c.region === 'uae' ? '🇦🇪' : '🇺🇸'} ${c.name}` })),
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('cosentus_region')
    localStorage.removeItem('cosentus_portal_type')
    window.location.href = '/'
  }

  return (
    <>
    {isScribeRecording && (
      <div className='h-9 bg-red-500 flex items-center justify-center gap-3 px-4 z-50'>
        <span className='w-2 h-2 rounded-full bg-white animate-pulse' />
        <span className='text-white text-xs font-semibold'>AI Scribe is recording</span>
        <a href='/ai-scribe' className='ml-2 text-xs font-bold text-white underline'>Return to Scribe</a>
      </div>
    )}
    <header className="h-16 bg-surface-secondary border-b border-separator flex items-center px-6 gap-4 shrink-0">
      {/* Search — always-visible border that turns brand on focus */}
      <div className="flex-1 max-w-md relative" ref={searchRef}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
          onFocus={() => searchQuery && setSearchOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              setSearchOpen(false)
              router.push(`/portal/patients?search=${encodeURIComponent(searchQuery.trim())}`)
            }
            if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
          }}
          placeholder="Search patients, claims, docs..."
          className="w-full bg-surface-elevated rounded-btn pl-9 pr-4 py-2 text-[14px] text-content-primary placeholder:text-content-tertiary outline-none border border-separator focus:border-brand/40 transition-colors"
        />
        {searchOpen && searchQuery.length >= 2 && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-secondary border border-separator rounded-card shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => { router.push(r.path); setSearchOpen(false); setSearchQuery('') }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated flex items-center gap-3 border-b border-separator last:border-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold uppercase">{r.type}</span>
                <div>
                  <div className="text-sm text-content-primary">{r.label}</div>
                  <div className="text-xs text-content-secondary">{r.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {searchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-secondary border border-separator rounded-card shadow-2xl z-50 px-4 py-3 text-sm text-content-secondary">
            No results for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Client selector — back-office staff only, filtered by region */}
        {isStaff && (
          <Dropdown
            value={selectedClient?.id || ''}
            options={clientOptions}
            onChange={v => setSelectedClient(clients.find(c => c.id === v) || null)}
            buttonClassName="bg-surface-elevated text-content-primary hover:bg-surface-primary"
          />
        )}

        {/* Region badge — visible after login */}
        {country && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-surface-elevated text-xs font-semibold text-content-secondary">
            <span>{country === 'usa' ? '🇺🇸' : '🇦🇪'}</span>
            <span>{country === 'usa' ? 'USA' : 'UAE'}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(o => !o); if (!notifOpen) refetchNotifs() }}
            className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary relative transition-colors">
            <Bell size={18} />
            {displayUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                {displayUnread > 9 ? '9+' : displayUnread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface-secondary border border-separator rounded-card shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-separator flex items-center justify-between">
                <span className="text-xs font-semibold text-content-secondary uppercase tracking-wide">Notifications</span>
                {displayUnread > 0 && <span className="text-[10px] text-brand font-medium">{displayUnread} unread</span>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-content-tertiary">All caught up ✓</div>
                ) : notifications.map((n) => {
                  const dotColor = n.type === 'urgent' || n.type === 'critical' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-brand'
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(n.created_at).getTime()
                    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                    return `${Math.floor(diff / 86400000)}d ago`
                  })()
                  return (
                    <button key={n.id}
                      onClick={() => { setNotifOpen(false); router.push(('action_url' in n ? n.action_url : '') || '/dashboard') }}
                      className={`w-full text-left px-4 py-3 hover:bg-surface-elevated border-b border-separator last:border-0 flex items-start gap-3 transition-colors ${!n.read ? 'bg-brand/5' : ''}`}>
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug ${!n.read ? 'text-content-primary font-medium' : 'text-content-secondary'}`}>{n.title}</p>
                        <p className="text-[11px] text-content-tertiary mt-0.5">{timeAgo}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="px-4 py-2 border-t border-separator">
                <button onClick={() => { setNotifOpen(false); router.push('/tasks') }}
                  className="text-xs text-brand hover:text-brand/80 font-medium transition-colors">
                  View all in Tasks →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Role switcher — shows only portal-appropriate roles */}
        <Dropdown
          value={currentUser.role}
          options={roleOptions}
          onChange={v => setRole(v as UserRole)}
          buttonClassName="bg-brand/10 text-brand hover:bg-brand/20"
        />

        <div className="w-px h-5 bg-separator mx-1" />
        <button
          onClick={handleLogout}
          className="p-2 rounded-btn hover:bg-red-500/10 text-content-secondary hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
    </>
  )
}
