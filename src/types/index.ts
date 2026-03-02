export type Theme = 'dark' | 'light'
export type PortalType = 'facility' | 'backoffice'
export type Language = 'en' | 'ar' | 'es'
export type Direction = 'ltr' | 'rtl'
export type Region = 'us' | 'uae'
export type EhrMode = 'medcloud_ehr' | 'external_ehr'

export type UserRole =
  | 'admin'
  | 'director'
  | 'supervisor'
  | 'manager'
  | 'coder'
  | 'biller'
  | 'ar_team'
  | 'posting_team'
  | 'provider'
  | 'client'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  organization_id: string
}

export interface ClientOrg {
  id: string
  name: string
  region: Region
  ehr_mode: EhrMode
  logo_url?: string
}

export interface Organization {
  id: string
  name: string
  type: 'rcm_provider' | 'practice' | 'tpa'
  region: Region
  ehr_mode: EhrMode
  branding?: {
    logo_url?: string
    primary_color?: string
    name?: string
  }
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

export type AppointmentStatus = 'booked' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled' | 'rescheduled' | 'walk_in' | 'late'
export type ClaimStatus = 'draft' | 'scrubbing' | 'scrub_failed' | 'ready' | 'submitted' | 'accepted' | 'in_process' | 'paid' | 'partial_pay' | 'denied' | 'appealed' | 'corrected' | 'write_off'
export type MessageEntityType = 'patient' | 'claim' | 'submission' | 'appointment' | 'general'
export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'completed'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type DenialSource = 'payment_posting' | 'claim_rejection' | 'payer_audit'
export type AppealLevel = 'L1' | 'L2' | 'L3'
export type ARSource = 'denied_claim' | 'underpayment' | 'patient_balance' | 'timely_filing_risk'
