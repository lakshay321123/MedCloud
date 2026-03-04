'use client'

import { useApp } from '@/lib/context'
import { useApi, useMutation } from './useApi'
import type { ApiListParams, ApiListResponse } from '@/lib/api-client'
import type { ClaimStatus, AppointmentStatus, TaskStatus, Priority } from '@/types'

// ── Shared helper ─────────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function useClientParams(extra?: ApiListParams): ApiListParams {
  const { selectedClient, orgId, currentUser } = useApp()
  // Provider and client roles are always scoped to their own organization
  const isClinicUser = currentUser.role === 'client' || currentUser.role === 'provider'
  const rawClientId = isClinicUser ? currentUser.organization_id : selectedClient?.id
  const clientId = rawClientId && UUID_REGEX.test(rawClientId) ? rawClientId : undefined
  return {
    org_id: orgId,
    ...(clientId !== undefined ? { client_id: clientId } : {}),
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
  place_of_service?: string
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
  result?: Record<string, unknown> | string
  network_status?: string
  copay?: number
  deductible?: number
  prior_auth_required?: boolean
  // enriched — present when Lambda JOINs patients table
  patient_name?: string
  created_at?: string
}

export interface ApiScrubResult {
  passed: boolean
  total_rules: number
  errors: number
  warnings: number
  violations: Array<{
    rule_code: string
    rule_name: string
    severity: 'error' | 'warning'
    description: string
    category: string
  }>
  claim_id: string
  scrubbed_at: string
}

export interface ApiClaimLine {
  id: string
  claim_id: string
  line_number?: number
  cpt_code: string
  modifier_1?: string
  modifier_2?: string
  units: number
  charge_amount: number
  place_of_service?: string
  description?: string
  diagnosis_pointers?: string
  created_at?: string
}

export interface ApiClaimDiagnosis {
  id: string
  claim_id: string
  icd_code: string
  sequence: number
  is_primary?: boolean
  description?: string
  created_at?: string
}

export interface ApiScrubRule {
  id: string
  org_id: string
  rule_code: string
  rule_name: string
  rule_type: string
  severity: 'error' | 'warning'
  logic: Record<string, string>
  description: string
  is_active: boolean
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

// ── Claims Workflow (Sprint 2) ────────────────────────────────────────────────

export function useScrubClaim(claimId: string) {
  return useMutation<ApiScrubResult, { user_id?: string }>('post', `/claims/${claimId}/scrub`)
}

export function useTransitionClaim(claimId: string) {
  return useMutation<ApiClaim, { to_status: string; user_id?: string; note?: string }>('post', `/claims/${claimId}/transition`)
}

export function useGenerateEDI(claimId: string) {
  return useMutation<{ edi: string; claim_id: string }, Record<string, never>>('post', `/claims/${claimId}/generate-edi`)
}

export function useClaimLines(claimId: string | null) {
  const { orgId } = useApp()
  return useApi<ApiListResponse<ApiClaimLine>>(
    claimId ? `/claims/${claimId}/lines` : '/claims',
    { org_id: orgId },
    { skip: !claimId }
  )
}

export function useAddClaimLine(claimId: string) {
  return useMutation<ApiClaimLine, {
    cpt_code: string; units?: number; charge_amount: number;
    modifier_1?: string; modifier_2?: string; place_of_service?: string;
    description?: string; diagnosis_pointers?: string
  }>('post', `/claims/${claimId}/lines`)
}

export function useClaimDiagnoses(claimId: string | null) {
  const { orgId } = useApp()
  return useApi<ApiListResponse<ApiClaimDiagnosis>>(
    claimId ? `/claims/${claimId}/diagnoses` : '/claims',
    { org_id: orgId },
    { skip: !claimId }
  )
}

export function useAddClaimDiagnosis(claimId: string) {
  return useMutation<ApiClaimDiagnosis, {
    icd_code: string; sequence: number; is_primary?: boolean; description?: string
  }>('post', `/claims/${claimId}/diagnoses`)
}

export function useScrubRules(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiScrubRule>>('/scrub-rules', { ...params, limit: 100 })
}

// ── Coding Workflow (Sprint 2) ────────────────────────────────────────────────

export function useApproveCoding(codingId: string) {
  return useMutation<{ claim_id: string; claim_number: string }, {
    icd_codes: Array<{ code: string; description?: string }>
    cpt_codes: Array<{ code: string; modifiers?: string[]; units?: number; charge?: number }>
    patient_id: string
    provider_id: string
    client_id: string
    payer_id?: string
    dos: string
    user_id?: string
  }>('post', `/coding/${codingId}/approve`)
}

export function useSendCodingQuery(codingId: string) {
  return useMutation<ApiCodingItem, { query_text: string; user_id?: string }>('post', `/coding/${codingId}/query`)
}

export function useAssignCoding(codingId: string) {
  return useMutation<ApiCodingItem, { assigned_to: string }>('put', `/coding/${codingId}/assign`)
}

// ── Eligibility Workflow (Sprint 2) ───────────────────────────────────────────

export function useEligibilityCheck() {
  return useMutation<ApiEligibilityCheck, {
    patient_id: string
    payer_id: string
    dos: string
    member_id?: string
    group_number?: string
    client_id?: string
  }>('post', '/eligibility/check')
}

export function useBatchEligibility() {
  return useMutation<{ results: ApiEligibilityCheck[]; total: number; checked: number }, {
    date: string
    client_id?: string
  }>('post', '/eligibility/batch')
}

// ── Sprint 2 v3: Documents ────────────────────────────────────────────────────

export interface ApiDocument {
  id: string
  org_id: string
  client_id?: string
  patient_id?: string
  encounter_id?: string
  document_type: string
  file_name: string
  s3_key: string
  s3_bucket: string
  content_type: string
  file_size: number
  source: string
  status: string
  ai_confidence?: number
  extracted_data?: Record<string, unknown>
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface ApiPresignedUrl {
  upload_url: string
  s3_key: string
  s3_bucket: string
  expires_in: number
}

export function useDocuments() {
  return useApi<ApiDocument[]>('/documents', useClientParams())
}

export function useDocument(id: string) {
  return useApi<ApiDocument>(`/documents/${id}`)
}

export function useRequestUploadUrl() {
  return useMutation<ApiPresignedUrl, {
    file_name: string
    content_type?: string
    folder?: string
  }>('post', '/documents/upload-url')
}

export function useCreateDocument() {
  return useMutation<ApiDocument, {
    client_id?: string
    patient_id?: string
    encounter_id?: string
    document_type: string
    file_name: string
    s3_key: string
    s3_bucket?: string
    content_type?: string
    file_size?: number
    source?: string
  }>('post', '/documents')
}

// ── Sprint 2 v3: SOAP Notes ──────────────────────────────────────────────────

export interface ApiSOAPNote {
  id: string
  org_id: string
  encounter_id: string
  patient_id: string
  provider_id: string
  client_id?: string
  dos: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  transcript?: string
  audio_url?: string
  signed_off: boolean
  signed_off_at?: string
  ai_suggestions?: Record<string, unknown>
  created_at: string
}

export function useSOAPNote(encounterId: string) {
  return useApi<ApiSOAPNote>(`/soap-notes/${encounterId}`)
}

export function useCreateSOAPNote() {
  return useMutation<ApiSOAPNote, {
    encounter_id: string
    patient_id: string
    provider_id: string
    client_id?: string
    dos: string
    subjective: string
    objective: string
    assessment: string
    plan: string
    transcript?: string
    audio_url?: string
    signed_off?: boolean
    ai_suggestions?: Record<string, unknown>
  }>('post', '/soap-notes')
}

// ── Sprint 2 v3: Denials Create ──────────────────────────────────────────────

export function useCreateDenial() {
  return useMutation<ApiDenial, {
    claim_id: string
    carc_code?: string
    rarc_code?: string
    denial_reason?: string
    denial_category?: string
    denied_amount?: number
    source_era_id?: string
    source_line_item?: string
    client_id?: string
    status?: string
  }>('post', '/denials')
}

export function useUpdateDenial(id: string) {
  return useMutation<ApiDenial, {
    status?: string
    notes?: string
    assigned_to?: string
  }>('put', `/denials/${id}`)
}

// ── Sprint 2 v3: Appeals ─────────────────────────────────────────────────────

export interface ApiAppeal {
  id: string
  org_id: string
  denial_id: string
  claim_id: string
  appeal_level: 'L1' | 'L2' | 'L3'
  appeal_reason: string
  appeal_letter: string
  supporting_docs?: string[]
  submitted_by?: string
  status: string
  created_at: string
}

export function useSubmitAppeal(denialId: string) {
  return useMutation<ApiAppeal, {
    appeal_level?: 'L1' | 'L2' | 'L3'
    appeal_reason: string
    appeal_letter?: string
    supporting_docs?: string[]
  }>('post', `/denials/${denialId}/appeal`)
}

// ── Sprint 2 v3: AR Call Logging ─────────────────────────────────────────────

export interface ApiARCallLog {
  id: string
  org_id: string
  claim_id: string
  denial_id?: string
  client_id?: string
  payer_id?: string
  call_type: string
  duration_seconds: number
  outcome: string
  notes: string
  reference_number?: string
  called_by?: string
  called_at: string
  follow_up_date?: string
  follow_up_reason?: string
  patient_name?: string
  payer_name?: string
  claim_number?: string
}

export function useLogARCall() {
  return useMutation<ApiARCallLog, {
    claim_id: string
    denial_id?: string
    client_id?: string
    payer_id?: string
    call_type?: string
    duration_seconds?: number
    outcome: string
    notes?: string
    reference_number?: string
    follow_up_date?: string
    follow_up_reason?: string
  }>('post', '/ar/log-call')
}

export function useARFollowUps() {
  return useApi<ApiARCallLog[]>('/ar/follow-ups', useClientParams())
}

// ── Sprint 2 v3: Payment Auto-Post ──────────────────────────────────────────

export interface ApiAutoPostResult {
  auto_posted: number
  manual_review: number
  total: number
  details: Array<{ payment_id: string; action: string; reason: string }>
}

export function useAutoPostPayments() {
  return useMutation<ApiAutoPostResult, {
    era_file_id: string
  }>('post', '/payments/auto-post')
}

export function useUpdatePayment(id: string) {
  return useMutation<ApiPayment, {
    action?: string
    notes?: string
    posted_at?: string
  }>('put', `/payments/${id}`)
}

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 v4: New Endpoints
// ══════════════════════════════════════════════════════════════════════════════

// ── 835 ERA Parser ──────────────────────────────────────────────────────────

export interface Api835ParseResult {
  era_file_id: string
  claims_found: number
  payments_created: number
  matched: number
  unmatched: number
  denials_created?: number
}

export function useParse835(eraFileId: string) {
  return useMutation<Api835ParseResult, {
    edi_content: string
  }>('post', `/era-files/${eraFileId}/parse-835`)
}

// ── DHA eClaim XML Generator (UAE) ──────────────────────────────────────────

export interface ApiDHAeClaimResult {
  xml_content: string
  claim_id: string
  claim_number: string
  format: string
}

export function useGenerateDHA(claimId: string) {
  return useMutation<ApiDHAeClaimResult, Record<string, never>>('post', `/claims/${claimId}/generate-dha`)
}

// ── AI Auto-Coding (Bedrock) ────────────────────────────────────────────────

export interface ApiAICodingSuggestion {
  suggested_cpt: Array<{ code: string; description: string; confidence: number; modifier?: string }>
  suggested_icd: Array<{ code: string; description: string; confidence: number; is_primary?: boolean }>
  suggested_em?: string
  em_confidence?: number
  reasoning?: string
  suggestion_id?: string
  processing_ms?: number
  confidence?: number
  mock?: boolean
}

export function useAIAutoCode(codingId: string) {
  return useMutation<ApiAICodingSuggestion, Record<string, never>>('post', `/coding/${codingId}/ai-suggest`)
}

export function useAICodingSuggestion(codingId: string | null) {
  const { orgId } = useApp()
  return useApi<ApiAICodingSuggestion>(
    codingId ? `/ai-coding-suggestions/${codingId}` : '/ai-coding-suggestions/none',
    { org_id: orgId },
    { skip: !codingId }
  )
}

// ── Textract Document Processing ────────────────────────────────────────────

export interface ApiTextractResult {
  document_id: string
  status: string
  job_id?: string
  result?: Record<string, unknown>
  mock?: boolean
}

export function useTriggerTextract(documentId: string) {
  return useMutation<ApiTextractResult, Record<string, never>>('post', `/documents/${documentId}/textract`)
}

export function useTextractResults(documentId: string | null) {
  const { orgId } = useApp()
  return useApi<ApiTextractResult>(
    documentId ? `/documents/${documentId}/textract` : '/documents/none/textract',
    { org_id: orgId },
    { skip: !documentId }
  )
}

// ── EDI Transactions ────────────────────────────────────────────────────────

export interface ApiEDITransaction {
  id: string
  org_id: string
  client_id?: string
  transaction_type: string
  direction: string
  clearinghouse?: string
  file_name?: string
  claim_id?: string
  claim_count?: number
  status: string
  response_code?: string
  response_detail?: string
  submitted_at?: string
  response_at?: string
  created_at?: string
}

export function useEDITransactions(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiEDITransaction>>('/edi-transactions', params)
}

export function useCreateEDITransaction() {
  return useMutation<ApiEDITransaction, Partial<ApiEDITransaction>>('post', '/edi-transactions')
}

// ── Scrub Results (persisted) ───────────────────────────────────────────────

export interface ApiScrubResultItem {
  id: string
  claim_id: string
  rule_id?: string
  rule_code: string
  rule_name: string
  severity: string
  passed: boolean
  message: string
  auto_fixed?: boolean
  scrubbed_at?: string
}

export function useScrubResults(claimId: string | null) {
  const { orgId } = useApp()
  return useApi<ApiScrubResultItem[]>(
    claimId ? `/scrub-results/${claimId}` : '/scrub-results/none',
    { org_id: orgId },
    { skip: !claimId }
  )
}

// ── AR Call Log ─────────────────────────────────────────────────────────────

export interface ApiARCallLogEntry {
  id: string
  org_id: string
  client_id?: string
  claim_id?: string
  denial_id?: string
  caller_id?: string
  call_type?: string
  payer_id?: string
  phone_number?: string
  call_date?: string
  duration_sec?: number
  outcome?: string
  reference_number?: string
  next_action?: string
  next_follow_up?: string
  notes?: string
  ai_generated?: boolean
  created_at?: string
}

export function useARCallLog(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiARCallLogEntry>>('/ar/call-log', params)
}

// ── SOAP Notes (list + update) ──────────────────────────────────────────────
// ApiSOAPNote interface already defined above in Sprint 2 v3 section

export function useSOAPNotes(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiSOAPNote>>('/soap-notes', params)
}

export function useUpdateSOAPNote(id: string) {
  return useMutation<ApiSOAPNote, Partial<ApiSOAPNote>>('put', `/soap-notes/${id}`)
}

// ── Encounters CRUD ─────────────────────────────────────────────────────────

export function useCreateEncounter() {
  return useMutation<ApiEncounter, Partial<ApiEncounter>>('post', '/encounters')
}

export function useUpdateEncounter(id: string) {
  return useMutation<ApiEncounter, Partial<ApiEncounter>>('put', `/encounters/${id}`)
}

// ── Credentialing CRUD ──────────────────────────────────────────────────────

export function useCreateCredentialing() {
  return useMutation<ApiCredentialing, Partial<ApiCredentialing>>('post', '/credentialing')
}

export function useUpdateCredentialing(id: string) {
  return useMutation<ApiCredentialing, Partial<ApiCredentialing>>('put', `/credentialing/${id}`)
}

// ── Sprint 2 v5: New Routes ─────────────────────────────────────────────────

export interface Api271ParseResult {
  eligibility_check_id: string
  status: string
  plan_name?: string
  group_number?: string
  coinsurance_pct?: number
  copay?: number
  deductible?: number
  out_of_pocket_max?: number
  benefits: Array<{
    info_code: string
    coverage_level?: string
    service_type?: string
    amount?: number
    percent?: number
  }>
}

export function useParse271(eligibilityCheckId: string) {
  return useMutation<Api271ParseResult, { edi_content: string }>('post', `/eligibility/${eligibilityCheckId}/parse-271`)
}

export interface ApiUnderpaymentResult {
  claim_id: string
  claim_number: string
  total_billed: number
  total_paid: number
  total_underpaid: number
  has_fee_schedule: boolean
  underpayments: Array<{
    cpt_code: string
    contracted_rate: number
    expected_payment: number
    actual_allowed: number
    underpaid_amount: number
    variance_pct: string
  }>
}

export function useUnderpaymentCheck(claimId: string) {
  return useMutation<ApiUnderpaymentResult, Record<string, never>>('post', `/claims/${claimId}/underpayment-check`)
}

export interface ApiBatchSubmitResult {
  submitted: number
  failed: number
  details: Array<{ claim_id: string; claim_number?: string; status: string; reason?: string }>
}

export function useBatchSubmitClaims() {
  return useMutation<ApiBatchSubmitResult, { claim_ids: string[] }>('post', '/claims/batch-submit')
}

export interface ApiFeeSchedule {
  id: string
  org_id: string
  payer_id: string
  payer_name?: string
  cpt_code: string
  modifier?: string
  contracted_rate: number
  effective_date: string
  termination_date?: string
  rate_type: string
}

export function useFeeSchedules(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiFeeSchedule>>('/fee-schedules', params)
}

export function useCreateFeeSchedule() {
  return useMutation<ApiFeeSchedule, Partial<ApiFeeSchedule>>('post', '/fee-schedules')
}

export function useUpdateFeeSchedule(id: string) {
  return useMutation<ApiFeeSchedule, Partial<ApiFeeSchedule>>('put', `/fee-schedules/${id}`)
}

// ── Denial Prediction ───────────────────────────────────────────────────────

export interface ApiDenialPrediction {
  claim_id: string
  claim_number: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  risk_factors: Array<{ category: string; score: number; detail: string }>
  recommendation: string
}

export function usePredictDenial(claimId: string) {
  return useMutation<ApiDenialPrediction, Record<string, never>>('post', `/claims/${claimId}/predict-denial`)
}

// ── 276/277 Claim Status ────────────────────────────────────────────────────

export function useGenerate276(claimId: string) {
  return useMutation<{ edi_content: string; claim_id: string; format: string }, Record<string, never>>('post', `/claims/${claimId}/generate-276`)
}

export interface Api277ParseResult {
  claim_id: string
  claim_number: string
  new_claim_status: string | null
  latest_status: string
  statuses: Array<{
    category_code: string
    description: string
    effective_date?: string
    total_charge?: number
    total_paid?: number
    payer_claim_number?: string
  }>
}

export function useParse277(claimId: string) {
  return useMutation<Api277ParseResult, { edi_content: string }>('post', `/claims/${claimId}/parse-277`)
}

// ── Analytics KPIs ──────────────────────────────────────────────────────────

export interface ApiAnalyticsKPIs {
  overview: {
    total_claims: number
    total_billed: number
    total_collected: number
    collection_rate: string
    clean_claim_rate: string
    denial_rate: string
  }
  ar_aging: {
    b0_30: number
    b31_60: number
    b61_90: number
    b91_120: number
    b120_plus: number
  }
  denial_breakdown: Array<{ carc: string; cnt: number; amt: number }>
  payer_performance: Array<{ name: string; total: number; paid: number; denied: number; billed: number }>
  coding: { total: number; completed: number; ai_coded: number }
}

export function useAnalyticsKPIs(extra?: ApiListParams & { from?: string; to?: string }) {
  const params = useClientParams(extra)
  return useApi<ApiAnalyticsKPIs>('/analytics', params)
}

// ── Sprint 2 v7: 837I Institutional Generator ─────────────────────────────────
export function useGenerate837I(claimId: string) {
  return useMutation<{ edi_content: string; claim_id: string; claim_number: string; format: string }, Record<string, never>>(
    'post', `/claims/${claimId}/generate-837i`
  )
}

// ── Sprint 2 v7: Charge Capture AI (Feature #11) ─────────────────────────────
export interface ApiChargeCapture {
  encounter_id: string
  charges: Array<{ cpt_code: string; description: string; units: number; modifier?: string; charge_amount: number; confidence: number }>
  diagnoses: Array<{ icd_code: string; description: string; is_primary: boolean; confidence: number }>
  em_level?: string
  em_rationale?: string
  total_estimated_charge: number
  missing_documentation: string[]
  source: string
}

export function useChargeCapture(encounterId: string) {
  return useMutation<ApiChargeCapture, Record<string, never>>('post', `/encounters/${encounterId}/charge-capture`)
}

// ── Sprint 2 v7: Document Classification AI ──────────────────────────────────
export interface ApiDocClassification {
  document_id: string
  file_name: string
  classification: string
  confidence: number
  method: string
}

export function useClassifyDocument(documentId: string) {
  return useMutation<ApiDocClassification, Record<string, never>>('post', `/documents/${documentId}/classify`)
}

// ── Sprint 2 v7: Prior Auth Workflow ─────────────────────────────────────────
export interface ApiPriorAuth {
  id: string
  org_id: string
  client_id?: string
  claim_id?: string
  patient_id: string
  payer_id: string
  provider_id?: string
  auth_number: string
  auth_number_payer?: string
  cpt_codes: string[]
  icd_codes: string[]
  urgency: string
  clinical_rationale?: string
  dos_from?: string
  dos_to?: string
  approved_units?: number
  status: string
  patient_name?: string
  payer_name?: string
  provider_name?: string
  created_at: string
}

export function usePriorAuths(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiPriorAuth>>('/prior-auth', params)
}

export function usePriorAuth(id: string) {
  return useApi<ApiPriorAuth>(`/prior-auth/${id}`)
}

export function useCreatePriorAuth() {
  return useMutation<ApiPriorAuth, {
    patient_id: string
    payer_id: string
    claim_id?: string
    provider_id?: string
    cpt_codes?: string[]
    icd_codes?: string[]
    urgency?: string
    clinical_rationale?: string
    dos_from?: string
    dos_to?: string
  }>('post', '/prior-auth')
}

export function useUpdatePriorAuth(id: string) {
  return useMutation<ApiPriorAuth, {
    status?: string
    auth_number_payer?: string
    approved_units?: number
    approved_from?: string
    approved_to?: string
    denial_reason?: string
    peer_to_peer_date?: string
    notes?: string
  }>('put', `/prior-auth/${id}`)
}

// ── Sprint 2 v7: Patient Statements ──────────────────────────────────────────
export interface ApiPatientStatement {
  id: string
  org_id: string
  patient_id: string
  statement_number: string
  statement_date: string
  total_charges: number
  insurance_payments: number
  patient_payments: number
  balance_due: number
  line_items: Array<{ claim_number: string; dos: string; total_charge: number; patient_responsibility: number; payer: string }>
  status: string
  created_at: string
}

export function usePatientStatements(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiPatientStatement>>('/patient-statements', params)
}

export function useGenerateStatement() {
  return useMutation<ApiPatientStatement, { patient_id: string }>('post', '/patient-statements/generate')
}

export function useUpdateStatement(id: string) {
  return useMutation<ApiPatientStatement, { status?: string; sent_via?: string; notes?: string }>('put', `/patient-statements/${id}`)
}

// ── Sprint 2 v7: Secondary Claim / COB ───────────────────────────────────────
export interface ApiSecondaryClaim {
  secondary_claim_id: string
  claim_number: string
  primary_claim_id: string
  secondary_payer_id: string
  primary_paid: number
  remaining_charge: number
  status: string
  next_step: string
}

export function useTriggerSecondaryClaim(claimId: string) {
  return useMutation<ApiSecondaryClaim, Record<string, never>>('post', `/claims/${claimId}/secondary`)
}

// ── Sprint 2 v7: Credentialing Dashboard + Enrollment ────────────────────────
export interface ApiCredentialingDashboard {
  total: number
  active: number
  pending: number
  expiring_soon: number
  expired: number
  alerts: Array<{ id: string; provider_name: string; payer_name: string; expiry_date: string; days_until_expiry: number; alert: string }>
  items: Array<Record<string, unknown>>
}

export function useCredentialingDashboard() {
  const params = useClientParams()
  return useApi<ApiCredentialingDashboard>('/credentialing/dashboard', params)
}

export function useCreateEnrollment() {
  return useMutation<{ id: string; status: string }, {
    provider_id: string
    payer_id: string
    enrollment_type?: string
    effective_date?: string
    notes?: string
  }>('post', '/credentialing/enrollment')
}

// ── Sprint 2 v7: Report Export ───────────────────────────────────────────────
export interface ApiReport {
  report: string
  generated: string
  columns: string[]
  rows: Array<Record<string, unknown>>
  summary?: Record<string, unknown>
  csv?: string
}

export function useReport(reportType: string, extra?: ApiListParams & { from?: string; to?: string; format?: string }) {
  const params = useClientParams({ ...extra, type: reportType })
  return useApi<ApiReport>('/reports', params)
}

// ── Sprint 3: Auto-Appeals (AI Feature #4) ───────────────────────────────────
export interface ApiAppealGenerated {
  appeal_id?: string
  denial_id: string
  claim_number?: string
  appeal_level: number
  appeal_type: string
  appeal_letter: string
  appeal_strategy?: string
  supporting_evidence: string[]
  regulatory_citations: string[]
  success_probability: number
  source: string
}

export interface ApiAppealFull {
  id: string
  org_id: string
  denial_id: string
  claim_id?: string
  appeal_level: number
  appeal_type: string
  appeal_letter: string
  strategy?: string
  supporting_evidence: string[]
  regulatory_citations: string[]
  success_probability: number
  status: string
  patient_name?: string
  payer_name?: string
  claim_number?: string
  carc_code?: string
  denial_reason?: string
  created_at: string
}

export function useGenerateAppeal(denialId: string) {
  return useMutation<ApiAppealGenerated, Record<string, never>>('post', `/denials/${denialId}/generate-appeal`)
}

export function useAppealsList(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiAppealFull>>('/appeals', params)
}

export function useAppealDetail(id: string) {
  return useApi<ApiAppealFull>(`/appeals/${id}`)
}

export function useUpdateAppealStatus(id: string) {
  return useMutation<ApiAppealFull, {
    status?: string; submitted_at?: string; submitted_via?: string;
    response_date?: string; response_notes?: string; payer_reference?: string
  }>('put', `/appeals/${id}`)
}

// ── Sprint 3: Denial Categorization ──────────────────────────────────────────
export interface ApiDenialCategorized {
  denials: Array<Record<string, unknown> & { category: string; name: string; priority: number }>
  summary: Array<{ name: string; count: number; total_amount: number; priority: number }>
  total: number
  total_amount: number
}

export function useDenialCategories() {
  const params = useClientParams()
  return useApi<ApiDenialCategorized>('/denials/categorize', params)
}

// ── Sprint 3: Chart Completeness Check (AI Feature #14) ──────────────────────
export interface ApiChartCheck {
  encounter_id: string
  completeness_score: number
  coding_ready: boolean
  checks: Array<{ field: string; present: boolean; weight: number; message?: string }>
  missing_count: number
  ai_analysis?: {
    missing_elements: string[]
    query_message: string
    estimated_em_impact: string
    coding_ready: boolean
  }
  auto_query_sent: boolean
}

export function useChartCheck(encounterId: string) {
  return useMutation<ApiChartCheck, Record<string, never>>('post', `/encounters/${encounterId}/chart-check`)
}

// ── Sprint 3: Contract Rate Extraction (AI Feature #12 enhancement) ──────────
export interface ApiContractExtraction {
  document_id: string
  payer_id: string
  payer_name?: string
  rates: Array<{ cpt_code: string; description: string; contracted_rate: number; modifier?: string }>
  rates_extracted: number
  rates_inserted: number
  contract_effective_date?: string
  contract_termination_date?: string
  rate_type?: string
  general_terms?: Record<string, unknown>
  extraction_confidence?: number
  source: string
}

export function useExtractContractRates(documentId: string) {
  return useMutation<ApiContractExtraction, { payer_id: string }>('post', `/documents/${documentId}/extract-rates`)
}

// ── Sprint 3: Payment Reconciliation ─────────────────────────────────────────
export interface ApiReconciliation {
  era_file_id: string
  total_payments: number
  matched: Array<{ payment_id: string; claim_number: string; amount_paid: number }>
  unmatched: Array<Record<string, unknown>>
  recoupments: Array<{ payment_id: string; claim_number: string; amount: number; reason: string }>
  overpayments: Array<{ payment_id: string; claim_number: string; paid: number; allowed: number; overage: number }>
  underpayments: Array<{ payment_id: string; claim_number: string; cpt_code: string; paid: number; expected: number; variance: number }>
  zero_pays: Array<{ payment_id: string; claim_number: string; billed: number; reason: string }>
  actions_taken: string[]
  summary: Record<string, number>
}

export function useReconcilePayments(eraFileId: string) {
  return useMutation<ApiReconciliation, Record<string, never>>('post', `/era-files/${eraFileId}/reconcile`)
}

// ── Sprint 3: Write-Off Workflow ─────────────────────────────────────────────
export interface ApiWriteOff {
  id: string
  write_off_id?: string
  claim_id: string
  claim_number?: string
  amount: number
  reason?: string
  category?: string
  approval_required: string
  status: string
  auto_approved?: boolean
  created_at?: string
}

export function useWriteOffs(extra?: ApiListParams) {
  const params = useClientParams(extra)
  return useApi<ApiListResponse<ApiWriteOff>>('/write-offs', params)
}

export function useRequestWriteOff() {
  return useMutation<ApiWriteOff, { claim_id: string; amount?: number; reason?: string; category?: string }>('post', '/write-offs')
}

export function useApproveWriteOff(id: string) {
  return useMutation<ApiWriteOff, { action: 'approve' | 'deny'; notes?: string }>('put', `/write-offs/${id}`)
}

// ── Sprint 3: Notifications ──────────────────────────────────────────────────
export interface ApiNotification {
  id: string
  title: string
  message?: string
  type: string
  priority: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  read: boolean
  created_at: string
}

export function useNotifications(extra?: ApiListParams & { unread?: string }) {
  const params = useClientParams(extra)
  return useApi<{ data: ApiNotification[]; total: number; unread_count: number }>('/notifications', params)
}

export function useCreateNotification() {
  return useMutation<{ id: string }, {
    user_id: string; title: string; message?: string; type?: string;
    priority?: string; entity_type?: string; entity_id?: string; action_url?: string
  }>('post', '/notifications')
}

export function useMarkNotificationRead(id: string) {
  return useMutation<{ id: string; read: boolean }, Record<string, never>>('put', `/notifications/${id}`)
}

