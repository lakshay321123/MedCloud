'use client'
import React from 'react'
import { useApp } from '@/lib/context'
import { UserRole } from '@/types'
import { Search, Globe, Sun, Moon, Bell, Building2 } from 'lucide-react'

const allRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team', 'provider', 'client']
const staffRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']

export default function Topbar() {
  const { theme, setTheme, language, setLanguage, currentUser, setRole, selectedClient, setSelectedClient, clients } = useApp()
  const isStaff = staffRoles.includes(currentUser.role)

  return (
    <header className="h-16 bg-surface-secondary border-b border-separator flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 max-w-md relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
        <input type="text" placeholder="Search patients, claims, docs..."
          className="w-full bg-surface-elevated rounded-btn pl-9 pr-4 py-2 text-[14px] text-content-primary placeholder:text-content-tertiary outline-none border border-transparent focus:border-brand/40 transition-colors" />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {isStaff && (
          <select value={selectedClient?.id || ''}
            onChange={e => { const c = clients.find(c => c.id === e.target.value) || null; setSelectedClient(c) }}
            className="bg-surface-elevated rounded-btn px-3 py-2 text-[13px] text-content-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.region === 'uae' ? '🇦🇪' : '🇺🇸'} {c.name}</option>)}
          </select>
        )}

        <button onClick={() => setLanguage(language === 'en' ? 'ar' : language === 'ar' ? 'es' : 'en')}
          className="px-2.5 py-2 rounded-btn hover:bg-surface-elevated text-content-secondary text-[13px] font-semibold transition-colors">
          {language.toUpperCase()}
        </button>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary relative transition-colors">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-content-primary font-bold flex items-center justify-center">3</span>
        </button>

        <select value={currentUser.role}
          onChange={e => setRole(e.target.value as UserRole)}
          className="bg-brand/10 text-brand rounded-btn px-3 py-2 text-[13px] font-semibold cursor-pointer focus:outline-none">
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </header>
  )
}
