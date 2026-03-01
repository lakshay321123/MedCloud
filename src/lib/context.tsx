'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Theme, Language, UserRole, User, ClientOrg } from '@/types'
import { demoClients } from '@/lib/demo-data'

interface AppState {
  theme: Theme
  language: Language
  direction: 'ltr' | 'rtl'
  sidebarCollapsed: boolean
  currentUser: User
  selectedClient: ClientOrg | null
  clients: ClientOrg[]
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  toggleSidebar: () => void
  setRole: (r: UserRole) => void
  setSelectedClient: (c: ClientOrg | null) => void
}

const demoUser: User = {
  id: 'demo-001',
  name: 'Admin User',
  email: 'admin@cosentus.ai',
  role: 'admin',
  organization_id: 'org-001',
}

const AppContext = createContext<AppState | null>(null)

function getDirection(lang: Language): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [language, setLanguageState] = useState<Language>('en')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>(demoUser)
  const [selectedClient, setSelectedClientState] = useState<ClientOrg | null>(null)

  const direction = getDirection(language)

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

  useEffect(() => {
    document.documentElement.classList.add(theme)
    document.documentElement.dir = direction
    document.documentElement.lang = language
  }, [])

  return (
    <AppContext.Provider value={{
      theme, language, direction, sidebarCollapsed, currentUser,
      selectedClient, clients: demoClients,
      setTheme, setLanguage, toggleSidebar, setRole, setSelectedClient,
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
