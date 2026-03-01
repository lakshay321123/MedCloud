'use client'
import React from 'react'
import { useApp } from '@/lib/context'
import { UserRole } from '@/types'
import { Search, Globe, Sun, Moon, Bell, ChevronDown, Building2 } from 'lucide-react'

const allRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team', 'provider', 'client']
const staffRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']

export default function Topbar() {
  const { theme, setTheme, language, setLanguage, currentUser, setRole, selectedClient, setSelectedClient, clients } = useApp()
  const isStaff = staffRoles.includes(currentUser.role)

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center px-4 gap-3 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" placeholder="Search patients, claims, docs..."
          className="w-full bg-white/5 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand/50" />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Client Filter — staff only */}
        {isStaff && (
          <div className="relative">
            <select value={selectedClient?.id || ''}
              onChange={e => {
                const c = clients.find(c => c.id === e.target.value) || null
                setSelectedClient(c)
              }}
              className="appearance-none bg-white/5 border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-white cursor-pointer focus:outline-none focus:border-brand/50">
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.region === 'uae' ? '🇦🇪' : '🇺🇸'} {c.name}</option>
              ))}
            </select>
            <Building2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        )}

        {/* Region indicator */}
        {selectedClient && (
          <span className="text-lg">{selectedClient.region === 'uae' ? '🇦🇪' : '🇺🇸'}</span>
        )}

        {/* Language */}
        <button onClick={() => setLanguage(language === 'en' ? 'ar' : language === 'ar' ? 'es' : 'en')}
          className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white text-xs font-mono border border-border">
          {language.toUpperCase()}
        </button>

        {/* Theme */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white relative">
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center">3</span>
        </button>

        {/* Role Switcher (dev only) */}
        <select value={currentUser.role}
          onChange={e => setRole(e.target.value as UserRole)}
          className="appearance-none bg-brand/10 border border-brand/30 text-brand rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-none">
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </header>
  )
}
