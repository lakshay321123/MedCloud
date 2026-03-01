'use client'
import React from 'react'
import { useApp } from '@/lib/context'
import { UserRole } from '@/types'
import { Search, Sun, Moon, Bell } from 'lucide-react'
import Dropdown, { DropdownOption } from '@/components/shared/Dropdown'

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
  const { theme, setTheme, language, setLanguage, currentUser, setRole, selectedClient, setSelectedClient, clients, country, portalType } = useApp()
  const isStaff = backofficeRoles.includes(currentUser.role)

  const availableRoles = portalType === 'facility' ? facilityRoles : portalType === 'backoffice' ? backofficeRoles : [...backofficeRoles, ...facilityRoles]
  const roleOptions: DropdownOption[] = availableRoles.map(r => ({ value: r, label: roleDisplayLabels[r] }))

  const clientOptions: DropdownOption[] = [
    { value: '', label: 'All Clients' },
    ...clients.map(c => ({ value: c.id, label: `${c.region === 'uae' ? '🇦🇪' : '🇺🇸'} ${c.name}` })),
  ]

  return (
    <header className="h-16 bg-surface-secondary border-b border-separator flex items-center px-6 gap-4 shrink-0">
      {/* Search — always-visible border that turns brand on focus */}
      <div className="flex-1 max-w-md relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
        <input
          type="text"
          placeholder="Search patients, claims, docs..."
          className="w-full bg-surface-elevated rounded-btn pl-9 pr-4 py-2 text-[14px] text-content-primary placeholder:text-content-tertiary outline-none border border-separator focus:border-brand/40 transition-colors"
        />
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
          className="px-2.5 py-2 rounded-btn hover:bg-surface-elevated text-content-secondary text-[13px] font-semibold transition-colors"
        >
          {language.toUpperCase()}
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell — text-white fixes readability in light mode */}
        <button className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary relative transition-colors">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">3</span>
        </button>

        {/* Role switcher — shows only portal-appropriate roles */}
        <Dropdown
          value={currentUser.role}
          options={roleOptions}
          onChange={v => setRole(v as UserRole)}
          buttonClassName="bg-brand/10 text-brand hover:bg-brand/20"
        />
      </div>
    </header>
  )
}
