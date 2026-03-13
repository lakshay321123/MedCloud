'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { UserRole } from '@/types'
import { Search, Bell, LogOut, ChevronDown, Settings, User, FileText, Stethoscope, FolderOpen, Loader2, CheckCheck } from 'lucide-react'
import { useNotifications, useGlobalSearch, useMarkAllNotificationsRead } from '@/lib/hooks'
import { api } from '@/lib/api-client'
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

const SEARCH_ICONS: Record<string, React.ElementType> = {
  patient: User,
  claim: FileText,
  provider: Stethoscope,
  document: FolderOpen,
}

export default function Topbar() {
  const { t } = useT()
  const { currentUser, setRole, selectedClient, setSelectedClient, clients, country, setCountry, portalType, isScribeRecording } = useApp()
  const isStaff = backofficeRoles.includes(currentUser.role)
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Live API search
  const { data: searchData, loading: searchLoading } = useGlobalSearch(debouncedQuery)
  const searchResults = searchData?.results ?? []

  // Notifications — already role-aware via useClientParams
  const { data: notifData, refetch: refetchNotifs } = useNotifications({ limit: 30 })
  const notifications = notifData?.data ?? []
  const unreadCount = notifData?.unread_count ?? 0

  // Mark single notification read
  const handleMarkRead = useCallback(async (id: string, actionUrl: string, entityId?: string) => {
    setNotifOpen(false)
    // Build URL with openId so the target page opens the specific record
    const url = actionUrl || '/dashboard'
    const navUrl = entityId ? `${url}${url.includes('?') ? '&' : '?'}openId=${entityId}` : url
    router.push(navUrl)
    try {
      await api.put(`/notifications/${id}/read`, {})
      refetchNotifs()
    } catch (err) { console.error('Failed to mark notification read:', err) }
  }, [router, refetchNotifs])

  // Mark all read
  const markAllRead = useMarkAllNotificationsRead()
  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead.mutate({})
      setTimeout(() => refetchNotifs(), 500)
    } catch (err) { console.error('Failed to mark all notifications read:', err) }
  }, [markAllRead, refetchNotifs])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // portalType is null until hydration — show no roles during SSR to prevent flashing wrong options
  const availableRoles = portalType === 'facility' ? facilityRoles : portalType === 'backoffice' ? backofficeRoles : []
  const roleOptions: DropdownOption[] = availableRoles.map(r => ({ value: r, label: roleDisplayLabels[r] }))

  const clientOptions: DropdownOption[] = [
    { value: '', label: 'All Clients' },
    ...clients.map(c => ({ value: c.id, label: `${c.region === 'uae' ? '🇦🇪' : '🇺🇸'} ${c.name}` })),
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('cosentus_region')
    localStorage.removeItem('cosentus_portal_type')
    localStorage.removeItem('cosentus_role')
    localStorage.removeItem('cosentus_user_name')
    localStorage.removeItem('cosentus_org_id')
    localStorage.removeItem('cosentus_user_email')
    localStorage.removeItem('cosentus_selected_client')
    window.location.href = '/'
  }

  const initials = currentUser.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = roleDisplayLabels[currentUser.role] || currentUser.role

  return (
    <>
      {isScribeRecording && (
        <div className="h-9 bg-brand-deep flex items-center justify-center gap-3 px-4 z-50">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-semibold">Ai Scribe is recording</span>
          <a href="/ai-scribe" className="ml-2 text-xs font-bold text-white underline">Return to Scribe</a>
        </div>
      )}

      {/* ── Blue topbar ── */}
      <header className="h-16 bg-brand border-b border-brand-mid flex items-center px-5 gap-3 shrink-0">

        {/* ── LEFT: Client selector (staff only) ── */}
        {isStaff && (
          <div className="shrink-0">
            <Dropdown
              value={selectedClient?.id || ''}
              options={clientOptions}
              onChange={v => setSelectedClient(clients.find(c => c.id === v) || null)}
              buttonClassName="bg-white/20 text-white hover:bg-white/30 font-semibold border-0"
            />
          </div>
        )}

        {/* ── CENTER: Search + Notifications ── */}
        <div className="flex-1 flex items-center gap-2 max-w-xl">
          {/* Search */}
          <div className="flex-1 relative" ref={searchRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => searchQuery && setSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery.trim()) { setSearchOpen(false); if (searchResults.length > 0) { router.push(searchResults[0].path); setSearchQuery('') } }
                if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
              }}
              placeholder="Search patients, claims, docs..."
              className="w-full bg-white/95 backdrop-blur-sm rounded-btn pl-8 pr-4 py-2 text-[13px] text-[#1D1D1F] placeholder:text-[#6E6E73] outline-none border-0 shadow-sm ring-1 ring-white/20 focus:ring-2 focus:ring-white/40 transition-all"
            />
            {searchLoading && debouncedQuery.length >= 2 && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand animate-spin" />
            )}
            {searchOpen && debouncedQuery.length >= 2 && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-separator rounded-card shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.map((r, i) => {
                  const Icon = SEARCH_ICONS[r.type] || Search
                  return (
                    <button type="button" key={`${r.type}-${r.id}-${i}`} onClick={() => { router.push(r.path); setSearchOpen(false); setSearchQuery('') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated flex items-center gap-3 border-b border-separator last:border-0">
                      <Icon size={14} className="text-brand shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-black truncate">{r.label}</p>
                        {r.sub && <p className="text-[11px] text-gray-400 truncate">{r.sub}</p>}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold capitalize shrink-0">{r.type}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {searchOpen && debouncedQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-separator rounded-card shadow-2xl z-50 p-4 text-center text-sm text-gray-400">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </div>
            )}
          </div>
          {/* Notifications — right next to search */}
          <div className="relative shrink-0" ref={notifRef}>
            <button type="button"
              onClick={() => { setNotifOpen(o => !o); if (!notifOpen) refetchNotifs() }}
              className="p-2 rounded-btn hover:bg-white/20 text-white relative transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-separator rounded-card shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-separator flex items-center justify-between">
                  <span className="text-xs font-bold text-black tracking-wide">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && <span className="text-[10px] text-brand font-medium">{unreadCount} unread</span>}
                    {unreadCount > 0 && (
                      <button type="button" onClick={handleMarkAllRead} className="text-[10px] text-gray-400 hover:text-brand font-medium flex items-center gap-1 transition-colors">
                        <CheckCheck size={11} /> Mark all
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">All caught up ✓</div>
                  ) : notifications.map((n) => {
                    const dotColor = n.type === 'urgent' || n.type === 'critical' ? 'bg-[#065E76]' : n.type === 'warning' ? 'bg-brand-light' : 'bg-brand'
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(n.created_at).getTime()
                      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                      return `${Math.floor(diff / 86400000)}d ago`
                    })()
                    return (
                      <button type="button" key={n.id}
                        onClick={() => handleMarkRead(n.id, n.action_url || '/dashboard', n.entity_id)}
                        className={`w-full text-left px-4 py-3 hover:bg-surface-elevated border-b border-separator last:border-0 flex items-start gap-3 transition-colors ${!n.read ? 'bg-brand/5' : ''}`}>
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug ${!n.read ? 'text-black font-medium' : 'text-gray-600'}`}>{n.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="px-4 py-2 border-t border-separator">
                  <button type="button" onClick={() => { setNotifOpen(false); router.push('/tasks') }} className="text-xs text-brand hover:text-brand-dark font-medium transition-colors">
                    View all in Tasks →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Logo + User menu ── */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {/* MedCloud logo — white version */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/medcloud-white.png"
            alt="MedCloud"
            className="h-7 w-auto object-contain"
            
          />

          {/* User popup — Claude-style */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-btn bg-white/20 hover:bg-white/30 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
              <span className="text-white text-[13px] font-semibold">{roleLabel}</span>
              <ChevronDown size={14} className="text-white/70" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-separator rounded-card shadow-2xl z-50 overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="px-4 py-3 border-b border-separator">
                  <p className="text-[13px] font-bold text-black">{currentUser.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{roleLabel}</p>
                </div>

                {/* Role switcher — only for backoffice staff, not facility users */}
                {portalType !== 'facility' && (
                <div className="px-4 py-3 border-b border-separator">
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-2">Switch Role</p>
                  <div className="flex flex-col gap-1">
                    {availableRoles.map(r => (
                      <button
                        key={r}
                        onClick={() => { setRole(r as UserRole); setUserMenuOpen(false) }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-btn text-[12px] font-semibold transition-colors text-left ${
                          currentUser.role === r ? 'bg-brand text-white' : 'text-black hover:bg-brand/10'
                        }`}
                      >
                        {roleDisplayLabels[r]}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* Region toggle — only for backoffice staff, not facility users */}
                {portalType !== 'facility' && (
                <div className="px-4 py-3 border-b border-separator">
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-2">Region</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCountry('usa') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-btn text-[12px] font-semibold transition-colors ${
                        country === 'usa' ? 'bg-brand text-white' : 'bg-surface-elevated text-black hover:bg-brand/10'
                      }`}
                    >
                      <span>🇺🇸</span> USA
                    </button>
                    <button
                      onClick={() => { setCountry('uae') }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-btn text-[12px] font-semibold transition-colors ${
                        country === 'uae' ? 'bg-brand text-white' : 'bg-surface-elevated text-black hover:bg-brand/10'
                      }`}
                    >
                      <span>🇦🇪</span> UAE
                    </button>
                  </div>
                </div>
                )}

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); router.push('/admin') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-elevated text-[13px] text-black transition-colors"
                  >
                    <Settings size={15} className="text-gray-400" />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-separator py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary text-[13px] text-content-secondary transition-colors"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
