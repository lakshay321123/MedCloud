'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { t } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import { Language, UserRole } from '@/types'
import {
  Search, Bell, Sun, Moon, Globe, User, ChevronDown,
} from 'lucide-react'

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇦🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

const roles: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Director' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'coder', label: 'Coder' },
  { value: 'biller', label: 'Biller' },
  { value: 'ar_team', label: 'AR Team' },
  { value: 'posting_team', label: 'Posting' },
  { value: 'client', label: 'Client' },
]

export default function Topbar() {
  const { theme, language, currentUser, sidebarCollapsed, setTheme, setLanguage, setRole } = useApp()
  const [showLang, setShowLang] = useState(false)
  const [showRole, setShowRole] = useState(false)

  return (
    <header className={cn(
      'fixed top-0 right-0 h-14 z-30 flex items-center justify-between px-4 border-b transition-all duration-300',
      'bg-[var(--bg-secondary)] border-[var(--border-color)]',
      sidebarCollapsed ? 'left-[72px]' : 'left-[260px]',
    )}>
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder={t('common.search', language)}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-brand/50 transition-colors"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Role switcher (dev only) */}
        <div className="relative">
          <button
            onClick={() => { setShowRole(!showRole); setShowLang(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
          >
            <User size={13} />
            <span>{currentUser.role}</span>
            <ChevronDown size={12} />
          </button>
          {showRole && (
            <div className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg shadow-xl border bg-[var(--bg-secondary)] border-[var(--border-color)] animate-fade-in z-50">
              {roles.map(r => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value); setShowRole(false) }}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-hover)] transition-colors',
                    currentUser.role === r.value ? 'text-brand' : 'text-[var(--text-primary)]'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language */}
        <div className="relative">
          <button
            onClick={() => { setShowLang(!showLang); setShowRole(false) }}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Globe size={17} />
          </button>
          {showLang && (
            <div className="absolute right-0 top-full mt-1 w-36 py-1 rounded-lg shadow-xl border bg-[var(--bg-secondary)] border-[var(--border-color)] animate-fade-in z-50">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setShowLang(false) }}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-hover)] transition-colors',
                    language === l.code ? 'text-brand' : 'text-[var(--text-primary)]'
                  )}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors relative">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand rounded-full" />
        </button>
      </div>
    </header>
  )
}
