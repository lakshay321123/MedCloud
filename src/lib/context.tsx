'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { Theme, Language, UserRole, User, ClientOrg, PortalType } from '@/types'

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

// Role → display name used at init AND on setRole switches
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Admin User', director: 'Director', supervisor: 'Supervisor',
  manager: 'Manager', coder: 'Sarah Kim', biller: 'Mike Rodriguez',
  ar_team: 'AR Team', posting_team: 'Posting Team',
  provider: 'Dr. Martinez', client: 'Front Desk',
}

// Demo org_id fallback per role so messages/patients filter works without Cognito
const DEMO_ORG_IDS: Record<string, string> = {
  provider: 'org-102', client: 'org-102',
}

function getInitialUser(): User {
  if (typeof window !== 'undefined') {
    const pt = localStorage.getItem('cosentus_portal_type') as PortalType | null
    const savedRole = localStorage.getItem('cosentus_role') as UserRole | null
    if (pt === 'facility') {
      const role = (savedRole && ['provider', 'client'].includes(savedRole)) ? savedRole : 'provider'
      // SECURITY: org_id must be authoritative. Production path reads from the
      // Cognito ID token (custom:org_id claim) decoded server-side and stored
      // during login. localStorage is only a demo/dev fallback — never used
      // for actual data access decisions (those are enforced via Aurora RLS + org_id).
      // TODO Sprint 2: replace with decoded JWT claim from /api/auth/session
      const orgIdFromToken = getCognitoOrgId()
      const orgId = orgIdFromToken || localStorage.getItem('cosentus_org_id') || DEMO_ORG_IDS[role] || 'org-102'
      const name = ROLE_DISPLAY_NAMES[role] || 'Provider'
      return { id: 'demo-001', name, email: 'provider@clinic.com', role, organization_id: orgId }
    }
    if (savedRole) {
      const name = ROLE_DISPLAY_NAMES[savedRole] || 'Admin User'
      return { id: 'demo-001', name, email: 'admin@cosentus.ai', role: savedRole, organization_id: 'org-001' }
    }
  }
  return { id: 'demo-001', name: 'Admin User', email: 'admin@cosentus.ai', role: 'admin', organization_id: 'org-001' }
}

/**
 * Reads org_id from the Cognito ID token stored in the auth_session cookie.
 * Returns null if no token is present (demo/unauthenticated state).
 * In production, Cognito sets custom:org_id on the token during user pool login.
 */
function getCognitoOrgId(): string | null {
  try {
    // auth_session is an HttpOnly cookie set by /api/auth/callback — not readable here.
    // The login flow stores the decoded org claim in a non-sensitive session key.
    const claim = sessionStorage.getItem('cosentus_jwt_org_id')
    if (claim && /^[a-zA-Z0-9_-]+$/.test(claim)) return claim
  } catch { /* sessionStorage unavailable in SSR */ }
  return null
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
    // Clients loaded from API at runtime — empty until backend returns data
    return [] as import('@/types').ClientOrg[]
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

  const setRole = useCallback((r: UserRole) => {
    if (typeof window !== 'undefined') localStorage.setItem('cosentus_role', r)
    setCurrentUser(prev => ({
      ...prev,
      role: r,
      name: ROLE_DISPLAY_NAMES[r] ?? prev.name,
      // Update org_id for facility roles so message/patient filters work in demo mode
      organization_id: DEMO_ORG_IDS[r] ?? prev.organization_id,
    }))
  }, [])
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
