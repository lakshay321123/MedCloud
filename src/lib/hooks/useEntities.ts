'use client'

import { useApp } from '@/lib/context'
import { useApi, useMutation } from './useApi'
import type { ApiListParams, ApiListResponse } from '@/lib/api-client'
import type { ClaimStatus, AppointmentStatus, TaskStatus, Priority } from '@/types'

// ── Shared helper ─────────────────────────────────────────────────────────────
function useClientParams(extra?: ApiListParams): ApiListParams {
  const { selectedClient, orgId, currentUser } = useApp()
  // Provider and client roles are always scoped to their own organization
  const isClinicUser = currentUser.role === 'client' || currentUser.role === 'provider'
  const clientId = isClinicUser
    ? currentUser.organization_id   // fixed to their org
    : selectedClient?.id            // backoffice picks from dropdown
  return {
    org_id: orgId,
    ...(clientId ? { client_id: clientId } : {}),
    ...extra,
  }
}

// ── API entity shapes ─────────────────────────────────────────────────────────

export interface ApiPatient {
  id: string
  org_id: string
  client_id: string
  first_name: string
  last_name: string
  dob: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  insurance_payer?: string
  insurance_member_id?: string
  status?: string
  profile_complete?: number
  // enriched
  patient_name?: string
  client_name?: string
  claim_count?: number
  upcoming_appointments?: number
  created_at?: string
  updated_at?: string
}

export interface ApiClaim {
  id: string
  org_id: string
  client_id: string
  patient_id: string
  provider_id?: string
  payer_id?: string
  claim_number?: string
  status: ClaimStatus
  total_charges: number
  allowed_amount?: number
  paid_amount?: number
  dos_from?: string
  dos_to?: string
  submitted_date?: string
  paid_date?: string
  // enriched
  patient_name?: string
  provider_name?: string
  payer_name?: string
  client_name?: string
  created_at?: string
  updated_at?: string
}

export interface ApiDenial {
  id: string
  org_id: string
  client_id: string
  claim_id?: string
  patient_id?: string
  payer_id?: string
  denial_reason?: string
  denial_code?: string
  status?: string
  appeal_level?: string
  total_charges?: number
  dos_from?: string
  // enriched
  patient_name?: string
  payer_name?: string
  client_name?: string
  claim_number?: string
  carc_description?: string
  rarc_description?: string
  created_at?: string
  updated_at?: string
}

export interface ApiPayment {
  id: string
  org_id: string
  client_id: string
  claim_id?: string
  era_file_id?: string
  amount_paid?: number
  check_number?: string
  payment_date?: string
  status?: string
  // enriched
  patient_name?: string
  payer_name?: string
  claim_number?: string
  dos_from?: string
  era_file_name?: string
  created_at?: string
}

export interface ApiERAFile {
  id: string
  org_id: string
  client_id: string
  file_name?: string
  payer_name?: string
  check_number?: string
  payment_date?: string
  total_amount?: number
  status?: string
  claim_count?: number
  created_at?: string
}

export interface ApiCodingItem {
  id: string
  org_id: string
  client_id: string
  patient_id?: string
  provider_id?: string
  status?: string
  received_at?: string
  priority?: Priority
  // enriched
  patient_name?: string
  provider_name?: string
  client_name?: string
  created_at?: string
  updated_at?: string
}

export interface ApiAppointment {
  id: string
  org_id: string
  client_id: string
  patient_id?: string
  provider_id?: string
  appointment_date?: string
  appointment_time?: string
  status?: AppointmentStatus
  appointment_type?: string
  notes?: string
  // enriched
  patient_name?: string
  provider_name?: string
  first_name?: string
  last_name?: string
  created_at?: string
  updated_at?: string
}

export interface ApiEligibilityCheck {
  id: string
  org_id: string
  client_id: string
  patient_id?: string
  payer_id?: string
  dos?: string
  status?: string
  result?: string
  network_status?: string
  copay?: number
  deductible?: number
  prior_auth_required?: boolean
  // enriched — present when Lambda JOINs patients table
  patient_name?: string
  created_at?: string
}

export interface ApiTask {
  id: string
  org_id: string
  client_id?: string
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  assigned_to?: string
  due_date?: string
  task_type?: string
  created_at?: string
  updated_at?: string
}

export interface ApiProvider {
  id: string
  org_id: string
  client_id?: string
  first_name?: string
  last_name?: string
  npi?: string
  specialty?: string
  status?: string
  created_at?: string
}

export interface ApiPayer {
  id: string
  name?: string
  payer_code?: string
  type?: string
  status?: string
}

export interface ApiClient {
  id: string
  org_id?: string
  name?: string
  region?: string
  status?: string
}

export interface ApiEncounter {
  id: string
  org_id: string
  client_id?: string
  patient_id?: string
  provider_id?: string
  encounter_date?: string
  status?: string
  created_at?: string
}

export interface ApiCredentialing {
  id: string
  org_id: string
  client_id?: string
  provider_id?: string
  provider_name?: string
  credential_type?: string
  status?: string
  expiration_date?: string
  payer_enrollment_count?: number
  created_at?: string
  updated_at?: string
}

export interface ApiCARCCode {
  code: string
  description: string
  category?: string
}

export interface ApiRARCCode {
  code: string
  description: string
  category?: string
}

export interface ApiDashboardMetrics {
  total_patients: number
  total_claims: number
  claims_by_status: Array<{ status: string; count: string }>
  open_denials: number
  total_ar: number
  total_collections_mtd: number
  coding_queue_count: number
  recent_claims: Array<{
    id: string
    claim_number: string
    status: string
    total_charges: number
    dos_from: string
    first_name: string
    last_name: string
    payer_name: string
  }>
  upcoming_appointments: Array<{
    id: string
    appointment_date: string
    appointment_time: string
    first_name: string
    last_name: string
  }>
  ar_aging: {
    '0_30': number
    '31_60': number
    '61_90': number
    '91_120': number
    '120_plus': number
  }
}

// ── Patients ──────────────────────────────────────────────────────────────────

export function usePatients(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiPatient>>('/patients', params)
}

export function usePatient(id: string | null) {
  const { orgId } = useApp()
  return useApi<ApiPatient>(id ? `/patients/${id}` : '/patients', { org_id: orgId }, { skip: !id })
}

export function useCreatePatient() {
  return useMutation<ApiPatient, Partial<ApiPatient>>('post', '/patients')
}

export function useUpdatePatient(id: string) {
  return useMutation<ApiPatient, Partial<ApiPatient>>('put', `/patients/${id}`)
}

// ── Claims ────────────────────────────────────────────────────────────────────

export function useClaims(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiClaim>>('/claims', params)
}

export function useClaim(id: string | null) {
  const { orgId } = useApp()
  return useApi<ApiClaim>(id ? `/claims/${id}` : '/claims', { org_id: orgId }, { skip: !id })
}

export function useCreateClaim() {
  return useMutation<ApiClaim, Partial<ApiClaim>>('post', '/claims')
}

export function useUpdateClaim(id: string) {
  return useMutation<ApiClaim, Partial<ApiClaim>>('put', `/claims/${id}`)
}

// ── Appointments ──────────────────────────────────────────────────────────────

export function useAppointments(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiAppointment>>('/appointments', params)
}

export function useAppointment(id: string | null) {
  const { orgId } = useApp()
  return useApi<ApiAppointment>(id ? `/appointments/${id}` : '/appointments', { org_id: orgId }, { skip: !id })
}

export function useCreateAppointment() {
  return useMutation<ApiAppointment, Partial<ApiAppointment>>('post', '/appointments')
}

export function useUpdateAppointment(id: string) {
  return useMutation<ApiAppointment, Partial<ApiAppointment>>('put', `/appointments/${id}`)
}

// ── Denials ───────────────────────────────────────────────────────────────────

export function useDenials(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiDenial>>('/denials', params)
}

export function useDenial(id: string | null) {
  const { orgId } = useApp()
  return useApi<ApiDenial>(id ? `/denials/${id}` : '/denials', { org_id: orgId }, { skip: !id })
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function usePayments(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiPayment>>('/payments', params)
}

// ── ERA Files ─────────────────────────────────────────────────────────────────

export function useERAFiles(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiERAFile>>('/era-files', params)
}

// ── Coding Queue ──────────────────────────────────────────────────────────────

export function useCodingQueue(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiCodingItem>>('/coding', params)
}

export function useCodingItem(id: string | null) {
  const { orgId } = useApp()
  return useApi<ApiCodingItem>(id ? `/coding/${id}` : '/coding', { org_id: orgId }, { skip: !id })
}

export function useSubmitCoding(id: string) {
  return useMutation<ApiCodingItem, Partial<ApiCodingItem>>('put', `/coding/${id}`)
}

// ── Providers ─────────────────────────────────────────────────────────────────

export function useProviders(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiProvider>>('/providers', params)
}

// ── Payers ────────────────────────────────────────────────────────────────────

export function usePayers(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiPayer>>('/payers', params)
}

// ── Encounters ────────────────────────────────────────────────────────────────

export function useEncounters(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiEncounter>>('/encounters', params)
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export function useEligibilityChecks(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiEligibilityCheck>>('/eligibility', params)
}

export function useRunEligibility() {
  return useMutation<ApiEligibilityCheck, { patient_id: string; payer_id: string; dos: string }>('post', '/eligibility')
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useTasks(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiTask>>('/tasks', params)
}

export function useUpdateTask(id: string) {
  return useMutation<ApiTask, Partial<ApiTask>>('put', `/tasks/${id}`)
}

// ── CARC / RARC ───────────────────────────────────────────────────────────────

export function useCARCCodes() {
  return useApi<ApiListResponse<ApiCARCCode>>('/carc-codes', { limit: 2000 })
}

export function useRARCCodes() {
  return useApi<ApiListResponse<ApiRARCCode>>('/rarc-codes', { limit: 2000 })
}

export function lookupCARC(codes: ApiCARCCode[], code: string): string {
  return codes.find(c => c.code === code)?.description || code
}

export function lookupRARC(codes: ApiRARCCode[], code: string): string {
  return codes.find(c => c.code === code)?.description || code
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboardMetrics() {
  const params = useClientParams()
  return useApi<ApiDashboardMetrics>('/dashboard', params)
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function useClients() {
  const { orgId } = useApp()
  return useApi<ApiListResponse<ApiClient>>('/clients', { org_id: orgId })
}

// ── Credentialing ─────────────────────────────────────────────────────────────

export function useCredentialing(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiCredentialing>>('/credentialing', params)
}
