'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { UserRole } from '@/types'
import { Search, Sun, Moon, Bell, LogOut } from 'lucide-react'
import Dropdown, { DropdownOption } from '@/components/shared/Dropdown'
import { useRouter } from 'next/navigation'
import { demoPatients, demoClaims, demoDocs } from '@/lib/demo-data'
import { useT } from '@/lib/i18n'

const roleDisplayLabels: Record<UserRole, string> = {
  admin: 'Admin',
  director: 'Director',
  supervisor: 'Supervisor',
  manager: 'Manager',
  coder: 'Coder',
  biller: 'Biller',
  ar_team: 'AR Team',
  posting_team: 'Posting Team',
  provider: 'Provider',
  client: 'Client',
}

const facilityRoles: UserRole[] = ['provider', 'client']
const backofficeRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']

export default function Topbar() {
  const { theme, setTheme, language, setLanguage, currentUser, setRole, selectedClient, setSelectedClient, clients, country, portalType, isScribeRecording } = useApp()
  const { t } = useT()
  const isStaff = backofficeRoles.includes(currentUser.role)
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const notifications = [
    { title: 'CLM-4504 appeal deadline in 2 days', time: '1h ago', type: 'urgent', href: '/denials' },
    { title: 'ERA from BCBS ready to post', time: '3h ago', type: 'info', href: '/payment-posting' },
    { title: 'Dr. Patel credentials expiring', time: '1d ago', type: 'warning', href: '/credentialing' },
  ]

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

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    const results: { type: string; label: string; sub: string; path: string }[] = []
    demoPatients
      .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.phone?.includes(q))
      .slice(0, 3)
      .forEach(p => results.push({ type: 'Patient', label: `${p.firstName} ${p.lastName}`, sub: p.phone || '', path: '/portal/patients' }))
    demoClaims
      .filter(c => c.id.toLowerCase().includes(q) || c.patientName.toLowerCase().includes(q) || c.payer.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(c => results.push({ type: 'Claim', label: c.id, sub: `${c.patientName} · ${c.payer}`, path: '/claims' }))
    demoDocs
      .filter(d => d.name.toLowerCase().includes(q) || d.patient?.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach(d => results.push({ type: 'Doc', label: d.name, sub: d.type, path: '/documents' }))
    return results.slice(0, 8)
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
          placeholder={t('topbar', 'searchPlaceholder')}
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

        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : language === 'ar' ? 'es' : 'en')}
          className="px-2.5 py-2 rounded-btn hover:bg-surface-elevated text-content-secondary text-[13px] font-semibold transition-colors flex items-center gap-1.5"
          title={t('topbar', 'language')}
        >
          <span>{language === 'en' ? '🇺🇸' : language === 'ar' ? '🇦🇪' : '🇪🇸'}</span>
          <span>{language === 'en' ? 'EN' : language === 'ar' ? 'عربي' : 'ES'}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(o => !o)} className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary relative transition-colors">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">{notifications.length}</span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-secondary border border-separator rounded-card shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-separator text-xs font-semibold text-content-secondary uppercase tracking-wide">Notifications</div>
              {notifications.map((n, i) => (
                <button key={i} onClick={() => { setNotifOpen(false); router.push(n.href) }}
                  className="w-full text-left px-4 py-3 hover:bg-surface-elevated border-b border-separator last:border-0 flex items-start gap-3 transition-colors">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'urgent' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-brand'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-content-primary leading-snug">{n.title}</p>
                    <p className="text-[11px] text-content-tertiary mt-0.5">{n.time}</p>
                  </div>
                </button>
              ))}
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
