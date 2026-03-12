'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { Theme, Language, UserRole, User, ClientOrg, PortalType } from '@/types'
import { api } from '@/lib/api-client'

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
  hydrated: boolean
}

// Role → display name used at init AND on setRole switches
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Admin User', director: 'Director', supervisor: 'Supervisor',
  manager: 'Manager', coder: 'Sarah Kim', biller: 'Mike Rodriguez',
  ar_team: 'AR Team', posting_team: 'Posting Team',
  provider: 'Dr. Martinez', client: 'Front Desk',
}

// Demo org_id fallback per role — must be real UUIDs, Lambda rejects shorthand like 'org-102'
const DEMO_ORG_IDS: Record<string, string> = {
  provider: 'a0000000-0000-0000-0000-000000000001',
  client:   'a0000000-0000-0000-0000-000000000001',
}

// Stable SSR-safe default — MUST match server render to prevent React hydration error #418.
// localStorage is NOT available on the server; reading it in useState() causes server/client
// mismatch. We use a fixed default here and hydrate from localStorage in useEffect below.
const SERVER_DEFAULT_USER: User = {
  id: 'demo-001',
  name: 'Dr. Martinez',
  email: 'provider@clinic.com',
  role: 'provider',
  organization_id: 'a0000000-0000-0000-0000-000000000001',
}

function getUserFromStorage(): User {
  try {
    const pt = localStorage.getItem('cosentus_portal_type') as PortalType | null
    const savedRole = localStorage.getItem('cosentus_role') as UserRole | null
    if (pt === 'facility') {
      const role = (savedRole && ['provider', 'client'].includes(savedRole)) ? savedRole as UserRole : 'provider'
      const orgIdFromToken = getCognitoOrgId()
      const orgId = orgIdFromToken || localStorage.getItem('cosentus_org_id') || DEMO_ORG_IDS[role] || 'a0000000-0000-0000-0000-000000000001'
      const name = ROLE_DISPLAY_NAMES[role] || 'Provider'
      return { id: 'demo-001', name, email: 'provider@clinic.com', role, organization_id: orgId }
    }
    if (savedRole) {
      const name = ROLE_DISPLAY_NAMES[savedRole] || 'Admin User'
      // org-001 is not a valid UUID — use the real demo org UUID
      return { id: 'demo-001', name, email: 'admin@cosentus.ai', role: savedRole as UserRole, organization_id: 'a0000000-0000-0000-0000-000000000001' }
    }
  } catch { /* localStorage unavailable */ }
  return SERVER_DEFAULT_USER
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
  const [theme, setThemeState] = useState<Theme>('light')
  const [language, setLanguageState] = useState<Language>('en')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>(SERVER_DEFAULT_USER)
  const [selectedClient, setSelectedClientState] = useState<ClientOrg | null>(null)
  const [country, setCountryState] = useState<'uae' | 'usa' | null>(null)
  const [apiClients, setApiClients] = useState<ClientOrg[]>([])
  const [portalType, setPortalTypeState] = useState<PortalType | null>(null)
  const [isScribeRecording, setIsScribeRecording] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  // TODO: Sprint 2 — derive orgId from Cognito JWT claims after authentication
  // For Sprint 1 dev mode, hardcode to seeded organization UUID
  const orgId = 'a0000000-0000-0000-0000-000000000001'

  // ── Hydration from localStorage (client-only, runs after SSR mount) ──────
  // This MUST be a useEffect — reading localStorage in useState causes React
  // hydration error #418 because the server renders with a different value.
  useEffect(() => {
    const user = getUserFromStorage()
    setCurrentUser(user)
    const region = localStorage.getItem('cosentus_region') as 'uae' | 'usa' | null
    if (region) setCountryState(region)
    const portal = localStorage.getItem('cosentus_portal_type') as PortalType | null
    if (portal) setPortalTypeState(portal)
    // Force light mode — dark mode removed
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add('light')
    localStorage.setItem('cosentus_theme', 'light')
    // Auto-select client for provider/client facility portal roles.
    // These users belong to exactly one practice — pre-select it so
    // useClientParams sends the right client_id on every API call.
    // c0000000...102 = Irvine Medical Group (first US client in seed)
    if (portal === 'facility' && (user.role === 'provider' || user.role === 'client')) {
      const savedClientId = localStorage.getItem('cosentus_selected_client')
      if (!savedClientId) {
        setSelectedClientState({
          id: 'c0000000-0000-0000-0000-000000000102',
          name: 'Sunrise Cardiology Group',
          region: 'us',
          ehr_mode: 'external_ehr',
        })
      }
    }
    setHydrated(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch real clients from API
  useEffect(() => {
    api.get<{ data: Array<{ id: string; name: string; region: string; ehr_mode?: string }> }>('/clients')
      .then(res => {
        const data = Array.isArray(res) ? res : res?.data || []
        const mapped: ClientOrg[] = data.map((c: { id: string; name: string; region: string; ehr_mode?: string }) => ({
          id: c.id, name: c.name, region: (c.region || 'us') as 'us' | 'uae', ehr_mode: (c.ehr_mode || 'external_ehr') as 'medcloud_ehr' | 'external_ehr',
        }))
        if (mapped.length > 0) setApiClients(mapped)
      })
      .catch((err) => { console.error('Failed to fetch clients:', err) })
  }, [])

  const direction = getDirection(language)

  // Static fallback clients — must match real DB data, used only when API hasn't loaded yet
  const STATIC_CLIENTS: ClientOrg[] = [
    { id: 'c0000000-0000-0000-0000-000000000101', name: 'Metro Internal Medicine', region: 'us', ehr_mode: 'external_ehr' },
    { id: 'c0000000-0000-0000-0000-000000000102', name: 'Sunrise Cardiology Group', region: 'us', ehr_mode: 'external_ehr' },
    { id: 'c0000000-0000-0000-0000-000000000103', name: 'Al Noor Medical Center', region: 'uae', ehr_mode: 'medcloud_ehr' },
    { id: 'c0000000-0000-0000-0000-000000000104', name: 'Pacific Orthopedic Associates', region: 'us', ehr_mode: 'external_ehr' },
    { id: 'c0000000-0000-0000-0000-000000000105', name: 'Dubai Wellness Clinic', region: 'uae', ehr_mode: 'external_ehr' },
  ]

  // Filter clients by logged-in region — API data takes precedence, falls back to static
  const clients = useMemo(() => {
    const source = apiClients.length > 0 ? apiClients : STATIC_CLIENTS
    if (!country) return source
    const region = country === 'usa' ? 'us' : 'uae'
    return source.filter(c => c.region === region)
  }, [country, apiClients])

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
      hydrated,
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
