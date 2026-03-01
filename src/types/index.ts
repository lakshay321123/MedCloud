export type Theme = 'dark' | 'light'
export type Language = 'en' | 'ar' | 'es'
export type Direction = 'ltr' | 'rtl'

export type UserRole =
  | 'admin'
  | 'director'
  | 'supervisor'
  | 'manager'
  | 'coder'
  | 'biller'
  | 'ar_team'
  | 'posting_team'
  | 'client'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  organization_id: string
}

export interface ModuleConfig {
  id: string
  label: string
  icon: string
  path: string
  section: 'operations' | 'ai' | 'management' | 'portal' | 'system'
  roles: UserRole[]
  badge?: number
}

export interface Organization {
  id: string
  name: string
  type: 'rcm_provider' | 'practice' | 'tpa'
  region: 'us' | 'uae'
  branding?: {
    logo_url?: string
    primary_color?: string
    name?: string
  }
}
