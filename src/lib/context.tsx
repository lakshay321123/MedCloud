'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { Theme, Language, UserRole, User, ClientOrg, PortalType } from '@/types'
import { demoClients } from '@/lib/demo-data'

const facilityRoles: UserRole[] = ['provider', 'client']
const backofficeRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']

interface AppState {
  theme: Theme
  language: Language
  direction: 'ltr' | 'rtl'
  sidebarCollapsed: boolean
  currentUser: User
  selectedClient: ClientOrg | null
  clients: ClientOrg[]
  country: 'uae' | 'usa' | null
  portalType: PortalType | null
  orgId: string
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  toggleSidebar: () => void
  setRole: (r: UserRole) => void
  setSelectedClient: (c: ClientOrg | null) => void
  setCountry: (c: 'uae' | 'usa') => void
  setPortalType: (p: PortalType) => void
  isScribeRecording: boolean
  setIsScribeRecording: (v: boolean) => void
}

function getInitialUser(): User {
  if (typeof window !== 'undefined') {
    const pt = localStorage.getItem('cosentus_portal_type') as PortalType | null
    if (pt === 'facility') return { id: 'demo-001', name: 'Demo Provider', email: 'provider@clinic.com', role: 'provider', organization_id: 'org-102' }
  }
  return { id: 'demo-001', name: 'Admin User', email: 'admin@cosentus.ai', role: 'admin', organization_id: 'org-001' }
}

const AppContext = createContext<AppState | null>(null)

function getDirection(lang: Language): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [language, setLanguageState] = useState<Language>('en')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>(getInitialUser)
  const [selectedClient, setSelectedClientState] = useState<ClientOrg | null>(null)
  const [country, setCountryState] = useState<'uae' | 'usa' | null>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('cosentus_region') as 'uae' | 'usa') : null)
  )
  const [portalType, setPortalTypeState] = useState<PortalType | null>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('cosentus_portal_type') as PortalType) : null)
  )
  const [isScribeRecording, setIsScribeRecording] = useState(false)
  // TODO: Sprint 2 — derive orgId from Cognito JWT claims after authentication
  // For Sprint 1 dev mode, hardcode to seeded organization UUID
  const orgId = 'a0000000-0000-0000-0000-000000000001'

  const direction = getDirection(language)

  // Filter clients by logged-in region
  const clients = useMemo(() => {
    if (!country) return demoClients
    const region = country === 'usa' ? 'us' : 'uae'
    return demoClients.filter(c => c.region === region)
  }, [country])

  // Clear selectedClient if it doesn't match current region
  useEffect(() => {
    if (selectedClient && country) {
      const region = country === 'usa' ? 'us' : 'uae'
      if (selectedClient.region !== region) setSelectedClientState(null)
    }
  }, [country]) // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(t)
  }, [])

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l)
    document.documentElement.dir = getDirection(l)
    document.documentElement.lang = l
  }, [])

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])
  const setRole = useCallback((r: UserRole) => setCurrentUser(prev => ({ ...prev, role: r })), [])
  const setSelectedClient = useCallback((c: ClientOrg | null) => setSelectedClientState(c), [])

  const setCountry = useCallback((c: 'uae' | 'usa') => {
    setCountryState(c)
    if (typeof window !== 'undefined') localStorage.setItem('cosentus_region', c)
  }, [])

  const setPortalType = useCallback((p: PortalType) => {
    setPortalTypeState(p)
    if (typeof window !== 'undefined') localStorage.setItem('cosentus_portal_type', p)
    // Switch role to a sensible default if the current role isn't valid for this portal
    const available = p === 'facility' ? facilityRoles : backofficeRoles
    setCurrentUser(prev => ({
      ...prev,
      role: available.includes(prev.role) ? prev.role : available[0],
    }))
  }, [])

  useEffect(() => {
    document.documentElement.classList.add(theme)
    document.documentElement.dir = direction
    document.documentElement.lang = language
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{
      theme, language, direction, sidebarCollapsed, currentUser,
      selectedClient, clients,
      country, portalType,
      orgId,
      setTheme, setLanguage, toggleSidebar, setRole, setSelectedClient,
      setCountry, setPortalType,
      isScribeRecording, setIsScribeRecording,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
