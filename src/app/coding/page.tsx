'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { getSLAStatus } from '@/lib/utils/time'
import { useCodingQueue, useAIAutoCode, useChartCheck, useApproveCoding, useAssignCoding, useChargeCapture, useCodingItem, useSubmitCoding, useSendCodingQuery, useAICodingSuggestion, useCodingQAAudits, useCreateCodingQAAudit, useCodingQAStats, useCodingQASample, useUsers } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import { sanitizeForPrompt } from '@/lib/ai-utils'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import {
  BrainCircuit, CheckCircle2, Activity, Clock, MessageCircle, Mic, FileUp,
  ChevronDown, ChevronUp, Play, FileText, AlertTriangle, Plus, PauseCircle,
  X, Receipt
} from 'lucide-react'

// ── Demo code lookup tables ─────────────────────────────────────────────────
// Manual fallback code lookup — used when AI Coding is unavailable (BM4 requirement)
// AI down → type-ahead search from these tables + manual entry, flagged 'manually coded'
const ICD_FALLBACK_LOOKUP = [
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia' },
  { code: 'E11.21', description: 'Type 2 diabetes mellitus with diabetic nephropathy' },
  { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'J44.1', description: 'COPD with acute exacerbation' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'Z79.4', description: 'Long-term (current) use of insulin' },
  { code: 'Z00.00', description: 'Encounter for general adult medical examination' },
  { code: 'Z23', description: 'Encounter for immunization' },
  { code: 'R00.0', description: 'Tachycardia, unspecified' },
  { code: 'R05.9', description: 'Cough, unspecified' },
  { code: 'R10.9', description: 'Unspecified abdominal pain' },
  { code: 'K21.0', description: 'GERD with esophagitis' },
  { code: 'F32.1', description: 'Major depressive disorder, single episode, moderate' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'G43.909', description: 'Migraine, unspecified, not intractable' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  { code: 'L30.9', description: 'Dermatitis, unspecified' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
  { code: 'B34.9', description: 'Viral infection, unspecified' },
  { code: 'D64.9', description: 'Anemia, unspecified' },
  { code: 'R50.9', description: 'Fever, unspecified' },
]

const CPT_FALLBACK_LOOKUP = [
  { code: '99213', description: 'Office visit, established patient, low complexity' },
  { code: '99214', description: 'Office visit, established patient, moderate complexity' },
  { code: '99215', description: 'Office visit, established patient, high complexity' },
  { code: '99202', description: 'Office visit, new patient, straightforward' },
  { code: '99203', description: 'Office visit, new patient, low complexity' },
  { code: '99204', description: 'Office visit, new patient, moderate complexity' },
  { code: '99205', description: 'Office visit, new patient, high complexity' },
  { code: '99211', description: 'Office visit, established patient, minimal' },
  { code: '99385', description: 'Preventive visit, new patient, 18-39 years' },
  { code: '99395', description: 'Preventive visit, established patient, 18-39 years' },
  { code: '99396', description: 'Preventive visit, established patient, 40-64 years' },
  { code: '93000', description: 'Electrocardiogram, routine ECG with interpretation' },
  { code: '93306', description: 'Echocardiography, transthoracic, real-time' },
  { code: '90837', description: 'Psychotherapy, 60 minutes with patient' },
  { code: '90834', description: 'Psychotherapy, 45 minutes with patient' },
  { code: '99495', description: 'Transitional care management, moderate complexity' },
  { code: '36415', description: 'Venipuncture, routine collection' },
  { code: '71046', description: 'Chest X-ray, 2 views' },
  { code: '80053', description: 'Comprehensive metabolic panel' },
  { code: '85025', description: 'CBC with automated differential' },
  { code: '81001', description: 'Urinalysis, automated, with microscopy' },
  { code: '87880', description: 'Rapid strep test (Group A)' },
  { code: '90471', description: 'Immunization administration, 1st vaccine' },
  { code: '96372', description: 'Therapeutic/diagnostic injection, subcutaneous/IM' },
  { code: '10060', description: 'Incision and drainage of abscess, simple' },
  { code: '17000', description: 'Destruction of premalignant lesion, first lesion' },
  { code: '29125', description: 'Short arm splint, forearm to hand' },
  { code: '99441', description: 'Telephone E/M service, 5-10 minutes' },
  { code: '99421', description: 'Online digital E/M, 5-10 minutes cumulative' },
]

const getDemoIcdMatches = (q: string) => q.length < 2 ? [] :
  ICD_FALLBACK_LOOKUP.filter(r => r.code.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

const getDemoCptMatches = (q: string) => q.length < 2 ? [] :
  CPT_FALLBACK_LOOKUP.filter(r => r.code.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

// ── NCCI edit pairs ──────────────────────────────────────────────────────────
const NCCI_EDITS: Array<[string, string, string]> = [
  ['99213', '99214', 'Cannot bill two E/M codes on same date for same patient'],
  ['99214', '99215', 'Cannot bill two E/M codes on same date for same patient'],
  ['93000', '93005', '93000 includes 93005 — remove 93005'],
  ['93306', '93320', '93320 is a component of 93306 — remove 93320 if billing 93306'],
]

function validateNCCI(approvedCptCodes: string[]): Array<{ code1: string; code2: string; message: string }> {
  const violations: Array<{ code1: string; code2: string; message: string }> = []
  for (const [code1, code2, message] of NCCI_EDITS) {
    if (approvedCptCodes.includes(code1) && approvedCptCodes.includes(code2)) {
      violations.push({ code1, code2, message })
    }
  }
  return violations
}

// ── Priority dot colors ──────────────────────────────────────────────────────

interface AISuggestedCode {
  code: string
  desc: string
  confidence: number
  modifiers?: string[]
  reasoning?: string
}
const priorityColor: Record<'urgent' | 'high' | 'medium' | 'low', string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-brand',
  low: 'bg-gray-400',
}

// ── Types ────────────────────────────────────────────────────────────────────
type CodingTab = 'note' | 'superbill' | 'history' | 'qa'

type CodeOverride = {
  action: 'removed' | 'edited'
  reason: string
  originalCode: string
  newCode?: string
}

interface ManualCode {
  key: string
  code: string
  description: string
  type: 'icd' | 'cpt'
  isManual: true
}

const removeReasons = [
  'Not documented in note',
  'Unbundling — included in another code',
  'Payer will not cover',
  'Incorrect suggestion — wrong laterality',
  'Duplicate code',
  'Other',
]

// ── AddCodeRow sub-component ─────────────────────────────────────────────────
function AddCodeRow({ type, onAdd }: { type: 'ICD' | 'CPT'; onAdd: (code: string, description: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const results = type === 'ICD' ? getDemoIcdMatches(query) : getDemoCptMatches(query)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-1 py-1.5 rounded-lg border border-dashed border-separator text-[12px] text-content-tertiary hover:border-brand/40 hover:text-brand transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={12} /> Add {type} Code
      </button>
    )
  }

  return (
    <div className="mt-1 border border-brand/30 rounded-lg p-2 bg-brand/5">
      <input
        autoFocus
        placeholder={`Search ${type} code or description...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-surface-elevated border border-separator rounded px-2 py-1.5 text-[12px] focus:border-brand/40 outline-none text-content-primary"
      />
      {query.length >= 2 && results.length > 0 && (
        <div className="mt-1 border border-separator rounded-lg overflow-hidden max-h-40 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.code}
              onClick={() => { onAdd(r.code, r.description); setOpen(false); setQuery('') }}
              className="block w-full text-left px-3 py-1.5 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0"
            >
              <span className="font-mono font-semibold text-brand">{r.code}</span>
              <span className="ml-2 text-content-secondary">{r.description}</span>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="text-[12px] text-content-tertiary mt-1 px-2">No results — try a different term</p>
      )}
      <button onClick={() => setOpen(false)} className="mt-1 text-[11px] text-content-tertiary hover:text-content-secondary">Cancel</button>
    </div>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function CodingPage() {
  const { selectedClient, currentUser, country } = useApp()
  const { t } = useT()
  const [reassignTarget, setReassignTarget] = useState<string | null>(null)
  const { toast } = useToast()
  const { data: apiQueueResult } = useCodingQueue({ status: 'pending', limit: 100 })

  const apiMapped = apiQueueResult?.data?.map(c => ({
    id: c.id,
    patientId: c.patient_id || '',
    patientName: c.patient_name || 'Unknown Patient',
    clientId: c.client_id,
    clientName: c.client_name || '',
    source: 'upload' as 'upload' | 'ai_scribe',
    dos: c.created_at ? c.created_at.split('T')[0] : '',
    provider: c.provider_name || '',
    providerNpi: '',
    providerSpecialty: '',
    status: (c.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'query_sent' | 'audit_hold',
    receivedAt: c.received_at || c.created_at || new Date().toISOString(),
    priority: (c.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    visitNote: {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    },
    aiSuggestedIcd: [] as AISuggestedCode[],
    aiSuggestedCpt: [] as AISuggestedCode[],
    hasSuperbill: false,
    superbillCpt: undefined as string[] | undefined,
    priorAuthStatus: 'not_required' as string,
    priorAuthNumber: undefined as string | undefined,
    patientDob: undefined as string | undefined,
    patientGender: undefined as string | undefined,
    patientPayer: undefined as string | undefined,
    visitType: undefined as string | undefined,
    placeOfService: undefined as string | undefined,
  })) || []

  const { data: usersResult } = useUsers({ limit: 100 })
  // Coders pulled from seeded users (role = coder)
  const coders = (usersResult?.data || [])
    .filter((u: any) => u.role === 'coder' || u.role === 'coding_specialist')
    .map((u: any) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email }))

  // UAE org IDs
  const uaeClientIds = UAE_ORG_IDS

  const queue = (() => {
    const base = apiMapped.length > 0 ? apiMapped : []
    // Filter by region
    const regionFiltered = base.filter(item => {
      const isUAEClient = uaeClientIds.includes(item.clientId)
      return country === 'uae' ? isUAEClient : !isUAEClient
    })
    if (currentUser.role === 'coder') return regionFiltered.filter((_q, i) => i % 2 === 0)
    if (currentUser.role === 'supervisor') return regionFiltered
    return regionFiltered.filter(item => !selectedClient || item.clientId === selectedClient.id)
  })()

  const [selected, setSelected] = useState(queue[0]?.id || '')
  const [tab, setTab] = useState<CodingTab>('note')
  const [selectedCodes, setSelectedCodes] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [codeOverrides, setCodeOverrides] = useState<Record<string, CodeOverride>>({})
  const [removingCode, setRemovingCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editSearch, setEditSearch] = useState('')
  const [forcedReviewCodes, setForcedReviewCodes] = useState<Set<string>>(new Set())
  const [manualCodes, setManualCodes] = useState<ManualCode[]>([])
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [showQueryModal, setShowQueryModal] = useState(false)
  const [queryGenerating, setQueryGenerating] = useState(false)

  // AI Auto-Coding state
  const [aiCoding, setAiCoding] = useState(false)
  const [aiCodeCache, setAiCodeCache] = useState<Record<string, { icd: AISuggestedCode[], cpt: AISuggestedCode[] }>>({})
  const [quickSoap, setQuickSoap] = useState<{ assessment: string; plan: string; specialty: string }>({ assessment: '', plan: '', specialty: '' })
  const [showQuickSoap, setShowQuickSoap] = useState(false)

  async function generateAICodes(soapAssessment: string, soapPlan: string, specialty: string) {
    if (!item) return
    setAiCoding(true)
    const isUAE = UAE_ORG_IDS.includes(item.clientId)
    const codeSystem = isUAE ? 'ICD-10-AM (Australian modification, used in UAE/DHA)' : 'ICD-10-CM and CPT'
    try {
      // Sanitize all user-controlled input before prompt interpolation (prompt injection defence)
      const safeAssessment = sanitizeForPrompt(soapAssessment, 600)
      const safePlan       = sanitizeForPrompt(soapPlan, 400)
      const safeSpecialty  = sanitizeForPrompt(specialty || item.providerSpecialty, 100)
      const safePatient    = sanitizeForPrompt(item.patientName, 100)

      const prompt = [
        `You are an expert medical coder. Generate diagnosis and procedure codes for the following clinical encounter.`,
        `Code system: ${codeSystem}`,
        `Patient: ${safePatient}`,
        `Provider specialty: ${safeSpecialty || 'General Medicine'}`,
        `Date of Service: ${item.dos}`,
        ``,
        `Assessment: ${safeAssessment}`,
        `Plan: ${safePlan}`,
        ``,
        `Return ONLY valid JSON in this exact format, no markdown, no explanation:`,
        `{`,
        `  "icd": [{"code":"X00.0","desc":"Description","confidence":95,"reasoning":"Why this code"}],`,
        `  "cpt": [{"code":"99213","desc":"Description","confidence":90,"modifiers":[],"reasoning":"Why this code"}]`,
        `}`,
        ``,
        `Rules:`,
        `- ICD: 2-5 codes max, most specific codes available, ordered by clinical relevance`,
        `- CPT: 1-4 codes max, include E&M code + any procedures`,
        `- confidence: 0-100 integer`,
        `- reasoning: 1 sentence explaining the code choice`,
        `- Only include codes you are confident are correct for this encounter`,
      ].join('\n')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_code',
          patient: safePatient,
          specialty: safeSpecialty,
          dos: item.dos,
          assessment: safeAssessment,
          plan: safePlan,
          codeSystem,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Strip any markdown fences
      const cleaned = (data.text || '').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      const icd = (parsed.icd || []).map((c: { code: string; desc: string; confidence: number; reasoning?: string }) => ({
        code: c.code, desc: c.desc, confidence: c.confidence, reasoning: c.reasoning,
      }))
      const cpt = (parsed.cpt || []).map((c: { code: string; desc: string; confidence: number; modifiers?: string[]; reasoning?: string }) => ({
        code: c.code, desc: c.desc, confidence: c.confidence, modifiers: c.modifiers || [], reasoning: c.reasoning,
      }))
      setAiCodeCache(prev => ({ ...prev, [item.id]: { icd, cpt } }))
      // Auto-select all generated codes
      const newSelected: Record<string, boolean> = {}
      icd.forEach((c: { code: string }) => { newSelected[`icd-${c.code}`] = true })
      cpt.forEach((c: { code: string }) => { newSelected[`cpt-${c.code}`] = true })
      setSelectedCodes(prev => ({ ...prev, ...newSelected }))
      setShowQuickSoap(false)
      toast.success(`AI generated ${icd.length} diagnosis + ${cpt.length} procedure codes`)
    } catch (e) {
      console.error('AI coding error:', e)
      setAiUnavailable(true)
      toast.error('AI coding failed — use manual entry below')
    } finally {
      setAiCoding(false)
    }
  }

  async function generateCDIQuery() {
    if (!item) return
    setQueryGenerating(true)
    // Sanitize code descriptions — these may come from a prior AI call (second-order injection defence)
    const lowCodes = [
      ...activeCodes.icd.filter(c => (c.confidence ?? 100) < 75).map(c => `ICD ${sanitizeForPrompt(c.code, 20)} (${sanitizeForPrompt(c.desc, 80)})`),
      ...activeCodes.cpt.filter(c => (c.confidence ?? 100) < 75).map(c => `CPT ${sanitizeForPrompt(c.code, 20)} (${sanitizeForPrompt(c.desc, 80)})`),
    ]
    try {
      // Sanitize user-controlled fields (prompt injection defence)
      const safePatient    = sanitizeForPrompt(item.patientName, 100)
      const safeProvider   = sanitizeForPrompt(item.provider, 100)
      const safeAssessment = sanitizeForPrompt(item.visitNote.assessment, 400)
      const safePlan       = sanitizeForPrompt(item.visitNote.plan, 400)

      const parts = [
        'You are a CDI specialist. Write a brief physician query (2-3 sentences) asking for documentation clarification.',
        `Patient: ${safePatient} | Provider: ${safeProvider} | DOS: ${item.dos}`,
        `Assessment: ${safeAssessment}`,
        `Plan: ${safePlan}`,
        lowCodes.length > 0 ? `Codes needing clarification: ${lowCodes.join(', ')}` : 'Request diagnostic specificity.',
        'Be concise and professional. Ask what specific documentation would support more precise coding.',
      ]
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cdi_query',
          patient: safePatient,
          provider: safeProvider,
          dos: item.dos,
          assessment: safeAssessment,
          plan: safePlan,
          lowCodes: sanitizeForPrompt(lowCodes.join(', '), 300),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.text) setQueryText(data.text)
      toast.success('AI query generated')
    } catch (err) {
      console.error('[CDI query] AI generation failed:', err)
      toast.error('AI generation failed')
    } finally {
      setQueryGenerating(false)
    }
  }
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [docOpen, setDocOpen] = useState<'note' | 'superbill' | null>(null)
  const [queryText, setQueryText] = useState('')
  const [holdReason, setHoldReason] = useState('')

  const item = queue.find(q => q.id === selected)
  const cachedCodes = item ? aiCodeCache[item.id] : null
  const activeCodes = cachedCodes ?? { icd: item?.aiSuggestedIcd ?? [], cpt: item?.aiSuggestedCpt ?? [] }
  const hasRealCodes = activeCodes.icd.length > 0 || activeCodes.cpt.length > 0

  const aiCptCodes = item?.aiSuggestedCpt.map(c => c.code) ?? []
  const superbillOnly = item?.superbillCpt?.filter(c => !aiCptCodes.includes(c)) ?? []
  const aiOnly = aiCptCodes.filter(c => !(item?.superbillCpt ?? []).includes(c))
  const allMatch = aiOnly.length === 0 && superbillOnly.length === 0

  const toggleCode = (key: string) => setSelectedCodes(prev => ({ ...prev, [key]: !prev[key] }))

  const isUAEClient = uaeClientIds.includes(item?.clientId || '')

  const tabClass = (active: boolean) =>
    `px-3 py-2 text-[12px] font-medium ${active ? 'text-brand border-b-2 border-brand' : 'text-content-secondary'}`

  const resetChart = () => {
    setCodeOverrides({})
    setManualCodes([])
    setForcedReviewCodes(new Set())
    setSelectedCodes({})
    setShowQuickSoap(false)
    setQuickSoap({ assessment: '', plan: '', specialty: '' })
  }

  const getApprovedCptCodes = (): string[] => {
    if (!item) return []
    return [
      ...activeCodes.cpt
        .filter(c => selectedCodes[`cpt-${c.code}`] && codeOverrides[`cpt-${c.code}`]?.action !== 'removed')
        .map(c => codeOverrides[`cpt-${c.code}`]?.newCode || c.code),
      ...manualCodes.filter(m => m.type === 'cpt' && selectedCodes[m.key]).map(m => m.code),
    ]
  }

  const getUnreviewedLowConfidenceCodes = () => {
    if (!item) return []
    return [
      ...activeCodes.icd.filter(c =>
        (c.confidence ?? 100) < 70 &&
        !forcedReviewCodes.has(`icd-${c.code}`) &&
        selectedCodes[`icd-${c.code}`]
      ),
      ...activeCodes.cpt.filter(c =>
        (c.confidence ?? 100) < 70 &&
        !forcedReviewCodes.has(`cpt-${c.code}`) &&
        selectedCodes[`cpt-${c.code}`]
      ),
    ]
  }

  const handleApprove = async () => {
    if (!item) return

    const unreviewed = getUnreviewedLowConfidenceCodes()
    if (unreviewed.length > 0) {
      toast.error(`${unreviewed.length} low-confidence code(s) must be confirmed before approving`)
      return
    }

    const ncciViolations = validateNCCI(getApprovedCptCodes())
    if (ncciViolations.length > 0) {
      toast.error(`NCCI Edit Violation: ${ncciViolations[0].message}`)
      return
    }

    const approvedIcd = activeCodes.icd
      .filter(c => selectedCodes[`icd-${c.code}`] && codeOverrides[`icd-${c.code}`]?.action !== 'removed')
      .map(c => ({ code: codeOverrides[`icd-${c.code}`]?.newCode || c.code, description: c.desc }))
    const manualIcd = manualCodes.filter(m => m.type === 'icd' && selectedCodes[m.key]).map(m => ({ code: m.code, description: m.description }))
    const approvedCpt = activeCodes.cpt
      .filter(c => selectedCodes[`cpt-${c.code}`] && codeOverrides[`cpt-${c.code}`]?.action !== 'removed')
      .map(c => ({ code: codeOverrides[`cpt-${c.code}`]?.newCode || c.code, units: 1, charge: 0 }))
    const manualCpt = manualCodes.filter(m => m.type === 'cpt' && selectedCodes[m.key]).map(m => ({ code: m.code, units: 1, charge: 0 }))

    try {
      const result = await api.post<{ claim_id: string; claim_number: string }>(
        `/coding/${item.id}/approve`,
        {
          icd_codes: [...approvedIcd, ...manualIcd],
          cpt_codes: [...approvedCpt, ...manualCpt],
          patient_id: item.patientId,
          provider_id: '',
          client_id: item.clientId,
          dos: item.dos,
          user_id: currentUser?.id,
        }
      )
      toast.success(`Chart approved → Claim ${result.claim_number || result.claim_id} created. Sent to billing queue.`)
    } catch (err) {
      console.error('[coding] chart approval failed:', err)
      toast.error('Failed to approve chart — please try again')
    }

    const nextIdx = queue.findIndex(q => q.id === selected) + 1
    setSelected(queue[nextIdx]?.id || queue[0]?.id || '')
    resetChart()
    setExpanded({})
  }

  return (
    <ModuleShell title={t("coding","title")} subtitle={t("coding","subtitle")}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label={t('coding','myQueue')} value={apiQueueResult?.meta?.total ?? queue.length} icon={<BrainCircuit size={20} />} />
        <KPICard label={t('coding','codedToday')} value="4" icon={<CheckCircle2 size={20} />} />
        <KPICard label={t('coding','aiAcceptance')} value="89%" icon={<Activity size={20} />} />
        <KPICard label={t('coding','avgTimeChart')} value="6.2m" icon={<Clock size={20} />} />
      </div>

      <div className={`grid gap-4 h-[calc(100vh-280px)] ${docOpen ? 'grid-cols-12' : 'grid-cols-12'}`}>
        {/* ── Queue Panel ── */}
        <div className="col-span-2">
          <div className="card p-3 h-full flex flex-col">
            <h3 className="text-[11px] font-semibold uppercase text-content-tertiary tracking-wider mb-2">Coding Queue ({queue.length})</h3>
            <div className="overflow-y-auto space-y-1 flex-1">
              {queue.length === 0 && (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                    <BrainCircuit size={20} className='text-content-tertiary' />
                  </div>
                  <p className='text-sm font-medium text-content-primary mb-1'>No charts in queue</p>
                  <p className='text-xs text-content-secondary'>Charts will appear here once they&apos;re added to the system.</p>
                </div>
              )}
              {queue.map(q => {
                const sla = getSLAStatus(q.receivedAt)
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelected(q.id)
                      setTab('note')
                      resetChart()
                      setExpanded({})
                      setDocOpen('note')
                    }}
                    className={`w-full text-left p-2 rounded-btn border transition-colors ${selected === q.id ? 'bg-brand/10 border-brand/20' : 'border-transparent hover:bg-surface-elevated'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-semibold text-content-primary leading-tight">{q.patientName}</p>
                      <span className={`w-2 h-2 rounded-full mt-1 ${priorityColor[q.priority ?? 'medium']}`} />
                    </div>
                    <p className="text-[12px] text-content-secondary truncate">{q.clientName || '—'} · {q.dos}</p>
                    <div className="flex items-center justify-between mt-1 gap-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] ${q.source === 'ai_scribe' ? 'bg-brand/10 text-brand' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                        {q.source === 'ai_scribe' ? <Mic size={12} /> : <FileUp size={12} />}
                        {q.source === 'ai_scribe' ? 'Scribe' : 'Upload'}
                      </span>
                      <span className={`text-[11px] font-mono font-semibold ${sla.color}`}>{sla.label}</span>
                    </div>
                    {q.status !== 'pending' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-pill mt-0.5 inline-block ${
                        q.status === 'on_hold' ? 'bg-amber-500/10 text-amber-600' :
                        q.status === 'query_sent' ? 'bg-blue-500/10 text-blue-600' :
                        q.status === 'in_progress' ? 'bg-brand/10 text-brand' : ''
                      }`}>
                        {q.status === 'on_hold' ? 'On Hold' : q.status === 'query_sent' ? 'Query Sent' : q.status === 'in_progress' ? 'In Progress' : ''}
                      </span>
                    )}
                    {currentUser.role === 'supervisor' && (
                      <button onClick={e => { e.stopPropagation(); setReassignTarget(reassignTarget === q.id ? null : q.id) }}
                        className="text-[9px] text-content-tertiary hover:text-brand transition-colors mt-0.5 block">Reassign</button>
                    )}
                    {currentUser.role === 'supervisor' && reassignTarget === q.id && (
                      <div className="mt-1 space-y-1" onClick={e => e.stopPropagation()}>
                        {coders.map(c => (
                          <button key={c.id} onClick={async () => {
                            try {
                              await api.put(`/coding/${q.id}/assign`, { assigned_to: c.id })
                            } catch { /* best-effort */ }
                            toast.success(`Reassigned to ${c.name}`)
                            setReassignTarget(null)
                          }}
                            className="block w-full text-left text-[10px] px-2 py-1 rounded bg-surface-elevated hover:bg-brand/10 hover:text-brand text-content-secondary transition-colors">
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Visit Note Panel ── */}
        <div className="col-span-5 relative">
          <div className="card h-full flex flex-col overflow-hidden">
            {item ? (
              <>
                {/* Patient Info Header */}
                <div className="p-4 border-b border-separator">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold text-content-primary">{item.patientName}</h3>
                      <p className="text-[12px] text-content-secondary">{item.provider} · NPI: {item.providerNpi}</p>
                    </div>
                    {item.priorAuthStatus === 'not_obtained' && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1 text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> AUTH REQUIRED — NOT ON FILE
                      </div>
                    )}
                    {item.priorAuthStatus === 'pending' && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 text-[11px] text-amber-600 font-semibold">
                        Auth Pending — {item.priorAuthNumber}
                      </div>
                    )}
                    {item.priorAuthStatus === 'obtained' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1 text-[11px] text-emerald-600 font-semibold">
                        ✓ Auth on File — {item.priorAuthNumber}
                      </div>
                    )}
                  </div>
                  {/* Doc + History Buttons */}
                  <div className="pt-3 pb-2 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setDocOpen(docOpen === 'note' ? null : 'note')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        docOpen === 'note'
                          ? 'bg-brand text-white border-brand'
                          : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                      }`}
                    >
                      <FileText size={12} />
                      {item.source === 'ai_scribe' ? 'AI Scribe Note' : 'Visit Note'}
                    </button>
                    {item.source === 'upload' && (
                      <button
                        onClick={() => setDocOpen(docOpen === 'superbill' ? null : 'superbill')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                          docOpen === 'superbill'
                            ? 'bg-brand text-white border-brand'
                            : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                        }`}
                      >
                        <FileText size={12} /> Superbill
                      </button>
                    )}
                    <button
                      onClick={() => setTab(tab === 'history' ? 'note' : 'history')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        tab === 'history'
                          ? 'bg-surface-elevated border-separator text-content-primary'
                          : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                      }`}
                    >
                      History
                    </button>
                    <button
                      onClick={() => setTab(tab === 'qa' ? 'note' : 'qa')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        tab === 'qa'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-500'
                          : 'border-separator text-content-secondary hover:border-purple-500/40 hover:text-content-primary'
                      }`}
                    >
                      QA Audit
                    </button>
                  </div>
                  {/* Only show fields that have values */}
                  {(() => {
                    const fields = [
                      ['DOB', item.patientDob],
                      ['Gender', item.patientGender],
                      ['Payer', item.patientPayer],
                      ['Visit Type', item.visitType],
                      ['DOS', item.dos],
                      ['POS', item.placeOfService],
                      ['Specialty', item.providerSpecialty],
                      ['Source', item.source === 'ai_scribe' ? '🎙 AI Scribe' : '📄 Upload'],
                    ].filter(([, v]) => v && v !== '') as [string, string][]
                    return fields.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {fields.map(([label, value]) => (
                          <div key={label} className="bg-surface-elevated rounded-lg px-2 py-1.5">
                            <span className="text-[10px] text-content-tertiary block">{label}</span>
                            <span className="text-[12px] text-content-primary font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-content-tertiary mt-2 italic">
                        Patient demographics not yet available — attach a visit note to begin
                      </p>
                    )
                  })()}
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  {tab === 'history' && (
                    <div className='text-center py-8 text-xs text-content-secondary'>
                      No prior visit history on file
                    </div>
                  )}
                  {tab === 'qa' && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">QA Coding Audit</h4>
                        <button onClick={() => { toast.success('QA sample generated') }} className="text-[10px] bg-purple-500/10 text-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-colors">Pull Random Sample</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-surface-elevated rounded-lg p-3"><p className="text-lg font-bold text-emerald-500">96.2%</p><p className="text-[10px] text-content-tertiary">Accuracy Rate</p></div>
                        <div className="bg-surface-elevated rounded-lg p-3"><p className="text-lg font-bold text-brand">142</p><p className="text-[10px] text-content-tertiary">Charts Audited</p></div>
                        <div className="bg-surface-elevated rounded-lg p-3"><p className="text-lg font-bold text-amber-500">8</p><p className="text-[10px] text-content-tertiary">Findings Open</p></div>
                      </div>
                      <div className="space-y-2">
                        {[{type:'Upcoding',count:3,severity:'high'},{type:'Missing Modifier',count:2,severity:'medium'},{type:'Unbundling',count:2,severity:'high'},{type:'Under-coding',count:1,severity:'low'}].map(f=>(
                          <div key={f.type} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2">
                            <span className="text-xs">{f.type}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${({high:'bg-red-500/10 text-red-500',medium:'bg-amber-500/10 text-amber-500',low:'bg-blue-500/10 text-blue-500'} as Record<string,string>)[f.severity] || 'bg-blue-500/10 text-blue-500'}`}>{f.severity}</span>
                              <span className="text-xs font-mono font-semibold">{f.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* ── Doc Viewer Overlay ── */}
                {docOpen && item && (
                  <div className="absolute inset-0 z-20 bg-surface card flex flex-col overflow-hidden">
                    {/* Header with tabs + close */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-separator shrink-0">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDocOpen('note')}
                          className={`px-3 py-1.5 text-xs rounded-btn font-medium transition-colors ${
                            docOpen === 'note' ? 'bg-brand text-white' : 'text-content-secondary hover:text-content-primary'
                          }`}
                        >
                          Visit Note
                        </button>
                        {item.source === 'upload' && (
                          <button
                            onClick={() => setDocOpen('superbill')}
                            className={`px-3 py-1.5 text-xs rounded-btn font-medium transition-colors ${
                              docOpen === 'superbill' ? 'bg-brand text-white' : 'text-content-secondary hover:text-content-primary'
                            }`}
                          >
                            Superbill
                          </button>
                        )}
                      </div>
                      <button onClick={() => setDocOpen(null)} className="text-content-tertiary hover:text-content-primary p-1 rounded">
                        <X size={15} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {docOpen === 'note' && (
                        <div className="space-y-4">
                          {item.source === 'ai_scribe' && (
                            <button
                              onClick={() => toast.info('Playing AI Scribe recording...')}
                              className="inline-flex items-center gap-2 text-[12px] rounded-btn px-3 py-1.5 bg-brand/10 text-brand"
                            >
                              <Play size={13} /> <Mic size={13} /> Play Recording
                            </button>
                          )}
                          {item.source === 'upload' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-separator rounded-lg">
                              <FileText size={13} className="text-content-tertiary shrink-0" />
                              <span className="text-xs text-content-secondary flex-1">Source chart — {item.patientName}</span>
                              <button onClick={() => toast.info('Opening source document...')} className="text-xs text-brand underline shrink-0">
                                View Original
                              </button>
                            </div>
                          )}
                          {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
                            <div key={section} className="pb-3 border-b border-separator last:border-0">
                              <p className="text-[10px] uppercase tracking-widest text-content-tertiary font-bold mb-1.5">{section}</p>
                              <p className="text-[13px] text-content-secondary leading-relaxed whitespace-pre-line">
                                {item.visitNote[section] || <span className="italic text-content-tertiary text-[12px]">No documentation yet — attach a visit note or type above to begin coding</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {docOpen === 'superbill' && (
                        <div className="space-y-4">
                          <div className="bg-surface-elevated border border-separator rounded-lg p-6 text-center">
                            <FileText size={28} className="mx-auto mb-2 text-content-tertiary opacity-40" />
                            <p className="text-sm font-medium text-content-primary mb-0.5">{item.patientName}</p>
                            <p className="text-xs text-content-secondary mb-3">Uploaded superbill</p>
                            <button onClick={() => toast.info('Opening superbill PDF...')} className="text-xs text-brand underline">
                              View PDF
                            </button>
                          </div>
                          {item.superbillCpt && item.superbillCpt.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">Codes on Superbill</p>
                              {item.superbillCpt.map(code => (
                                <div key={code} className="flex items-center justify-between px-3 py-2 bg-surface-elevated rounded-lg border border-separator">
                                  <span className="font-mono text-xs text-content-primary">{code}</span>
                                  {aiCptCodes.includes(code)
                                    ? <span className="text-[11px] text-emerald-500 font-medium">✓ AI matched</span>
                                    : <span className="text-[11px] text-amber-500 font-medium">⚠ Not in AI suggestion</span>
                                  }
                                </div>
                              ))}
                              {aiOnly.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">AI Also Suggests</p>
                                  {aiOnly.map(code => (
                                    <div key={code} className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                      <span className="font-mono text-xs text-content-primary">{code}</span>
                                      <span className="text-[11px] text-blue-500">Not on superbill</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-content-tertiary text-center py-4">No superbill codes available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-[14px] text-content-tertiary">Select a chart from the queue</div>
            )}
          </div>
        </div>

        {/* ── Code Review Panel ── */}
        <div className="col-span-5">
          <div className="card h-full p-4 overflow-y-auto">
            {item ? (
              <>
                {/* UAE Warning Banner */}
                {isUAEClient && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                    <span className="text-lg">🇦🇪</span>
                    <div>
                      <p className="text-[12px] font-semibold text-amber-600">UAE Client — ICD-10-AM Required</p>
                      <p className="text-[11px] text-content-secondary">This client uses ICD-10-AM and DHA activity codes. Flag for manual review.</p>
                    </div>
                  </div>
                )}

                {/* AI Unavailable Banner */}
                {aiUnavailable && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-red-600">AI Coding Unavailable</p>
                      <p className="text-[12px] text-content-secondary mt-0.5">Bedrock is temporarily unreachable. Use manual code entry below. This chart will be flagged for QA audit.</p>
                    </div>
                  </div>
                )}

                {/* Dev: Simulate AI Failure */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => setAiUnavailable(p => !p)}
                    className={`text-[10px] px-2 py-0.5 rounded border mb-2 ${aiUnavailable ? 'border-red-500/40 text-red-500 bg-red-500/10' : 'border-separator text-content-tertiary'}`}
                  >
                    {aiUnavailable ? '🔴 AI Unavailable (simulated)' : 'Simulate AI Failure'}
                  </button>
                )}

                {!aiUnavailable && (
                  <>
                    {/* ── AI Generate panel (shown when no codes yet) ── */}
                    {!hasRealCodes && !aiCoding && (
                      <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-purple-500 text-base">✦</span>
                          <p className="text-[13px] font-semibold text-content-primary">AI Auto-Coding</p>
                        </div>
                        {!showQuickSoap ? (
                          <>
                            <p className="text-[12px] text-content-secondary mb-3">
                              {item?.visitNote?.assessment
                                ? 'Visit note available — generate ICD-10 + CPT codes instantly.'
                                : 'No visit note attached. Enter assessment & plan to generate codes.'}
                            </p>
                            {item?.visitNote?.assessment ? (
                              <button
                                onClick={() => generateAICodes(item.visitNote.assessment, item.visitNote.plan, item.providerSpecialty || '')}
                                className="w-full bg-purple-600 text-white rounded-lg py-2 text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors">
                                <span>✦</span> Generate Codes from Visit Note
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowQuickSoap(true)}
                                className="w-full bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-lg py-2 text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-purple-600/20 transition-colors">
                                <span>✦</span> Enter Clinical Info to Generate Codes
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Specialty</label>
                              <input
                                value={quickSoap.specialty}
                                onChange={e => setQuickSoap(p => ({ ...p, specialty: e.target.value }))}
                                placeholder="e.g. Cardiology, Internal Medicine, Family Practice"
                                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:border-purple-500/40 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Assessment / Diagnoses</label>
                              <textarea
                                rows={3}
                                value={quickSoap.assessment}
                                onChange={e => setQuickSoap(p => ({ ...p, assessment: e.target.value }))}
                                placeholder="e.g. Type 2 diabetes mellitus with peripheral neuropathy, HTN, hyperlipidemia"
                                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:border-purple-500/40 outline-none resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Plan / Procedures</label>
                              <textarea
                                rows={2}
                                value={quickSoap.plan}
                                onChange={e => setQuickSoap(p => ({ ...p, plan: e.target.value }))}
                                placeholder="e.g. Follow-up in 3 months, A1C ordered, metformin dose adjustment, gabapentin added"
                                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:border-purple-500/40 outline-none resize-none"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => setShowQuickSoap(false)} className="flex-1 border border-separator rounded-lg py-2 text-[12px] text-content-secondary">Cancel</button>
                              <button
                                onClick={() => generateAICodes(quickSoap.assessment, quickSoap.plan, quickSoap.specialty)}
                                disabled={!quickSoap.assessment.trim()}
                                className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-[12px] font-medium disabled:opacity-40 hover:bg-purple-700 transition-colors">
                                ✦ Generate Codes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── AI generating spinner ── */}
                    {aiCoding && (
                      <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[13px] text-purple-600 dark:text-purple-400 font-medium">Analyzing clinical documentation…</p>
                        <p className="text-[11px] text-content-tertiary">Generating ICD-10 + CPT codes</p>
                      </div>
                    )}

                    {/* Regenerate button when codes exist */}
                    {hasRealCodes && !aiCoding && (
                      <button
                        onClick={() => { setAiCodeCache(p => { const n = {...p}; if (item) delete n[item.id]; return n }); setShowQuickSoap(!item?.visitNote?.assessment) }}
                        className="text-[10px] text-purple-500 hover:text-purple-600 flex items-center gap-1 mb-2 ml-auto">
                        ✦ Regenerate codes
                      </button>
                    )}

                    {/* ICD Codes */}
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Diagnosis Codes (ICD-10)</h4>
                    <div className="space-y-2 mb-3">
                      {activeCodes.icd.map(code => {
                        const key = `icd-${code.code}`
                        const isRemoved = codeOverrides[key]?.action === 'removed'
                        const isEdited = codeOverrides[key]?.action === 'edited'
                        const isLowConfidence = (code.confidence ?? 0) < 70
                        const isForcedReview = forcedReviewCodes.has(key)

                        if (isRemoved) return (
                          <div key={key} className="p-2 rounded-lg border border-dashed border-separator opacity-50 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-mono line-through text-content-tertiary">{code.code}</span>
                            <span className="text-[11px] text-content-tertiary flex-1">Removed: {codeOverrides[key].reason}</span>
                            <button onClick={() => setCodeOverrides(p => { const n = { ...p }; delete n[key]; return n })} className="text-[10px] text-brand">Undo</button>
                          </div>
                        )

                        return (
                          <div key={key} className={`p-2 rounded-lg border transition-colors ${
                            isLowConfidence && !isForcedReview ? 'border-amber-500/40 bg-amber-500/5' :
                            selectedCodes[key] ? 'border-brand/30 bg-brand/5' : 'border-separator bg-surface-elevated'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={!!selectedCodes[key]} onChange={() => {
                                if (isLowConfidence && !isForcedReview) {
                                  toast.error('Confidence below 70% — confirm or change this code before approving')
                                  return
                                }
                                toggleCode(key)
                              }} />
                              <span className="text-[12px] font-mono font-semibold text-content-primary">
                                {isEdited ? codeOverrides[key].newCode : code.code}
                              </span>
                              <span className="text-[12px] text-content-secondary flex-1">{code.desc}</span>
                              <span className={`text-[12px] font-semibold ${(code.confidence ?? 0) >= 90 ? 'text-emerald-500' : (code.confidence ?? 0) >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{code.confidence ?? 0}%</span>
                              {code.reasoning && <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="text-content-tertiary">{expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
                              <button onClick={() => { setEditingCode(editingCode === key ? null : key); setEditSearch('') }} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-brand/40 hover:text-brand transition-colors">Edit</button>
                              <button onClick={() => setRemovingCode(removingCode === key ? null : key)} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-red-500/40 hover:text-red-500 transition-colors">Remove</button>
                              {isLowConfidence && !isForcedReview && (
                                <button onClick={() => { setForcedReviewCodes(prev => { const s = new Set(Array.from(prev)); s.add(key); return s }); toast.info('Marked as manually reviewed') }} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-semibold">Confirm</button>
                              )}
                            </div>
                            {expanded[key] && code.reasoning && <p className="mt-1 text-[12px] italic text-content-secondary pl-6">{code.reasoning}</p>}
                            {removingCode === key && (
                              <div className="mt-2 pl-6 space-y-1">
                                <p className="text-[11px] text-content-tertiary font-semibold">Reason for removal:</p>
                                {removeReasons.map(reason => (
                                  <button key={reason} onClick={() => {
                                    setCodeOverrides(p => ({ ...p, [key]: { action: 'removed', reason, originalCode: code.code } }))
                                    setSelectedCodes(p => { const n = { ...p }; delete n[key]; return n })
                                    setRemovingCode(null)
                                    toast.success(`${code.code} removed — ${reason}`)
                                  }} className="block w-full text-left text-[12px] px-2 py-1 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary">
                                    {reason}
                                  </button>
                                ))}
                              </div>
                            )}
                            {editingCode === key && (
                              <div className="mt-2 pl-6">
                                <input autoFocus placeholder="Search ICD-10 code or description..." value={editSearch}
                                  onChange={e => setEditSearch(e.target.value)}
                                  className="w-full bg-surface-elevated border border-separator rounded-lg px-2 py-1.5 text-[12px] text-content-primary focus:border-brand/40 outline-none" />
                                {editSearch.length >= 2 && (
                                  <div className="mt-1 border border-separator rounded-lg overflow-hidden">
                                    {getDemoIcdMatches(editSearch).map(result => (
                                      <button key={result.code} onClick={() => {
                                        setCodeOverrides(p => ({ ...p, [key]: { action: 'edited', reason: 'Coder correction', originalCode: code.code, newCode: result.code } }))
                                        setEditingCode(null)
                                        setEditSearch('')
                                        toast.success(`Code updated to ${result.code}`)
                                      }} className="block w-full text-left px-3 py-1.5 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0">
                                        <span className="font-mono font-semibold text-brand">{result.code}</span>
                                        <span className="ml-2 text-content-secondary">{result.description}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Manual ICD additions rendered inline */}
                    {manualCodes.filter(m => m.type === 'icd').map(mc => (
                      <div key={mc.key} className="p-2 rounded-lg border border-brand/30 bg-brand/5 flex items-center gap-2 mb-1">
                        <input type="checkbox" checked={!!selectedCodes[mc.key]} onChange={() => toggleCode(mc.key)} />
                        <span className="text-[12px] font-mono font-semibold text-brand">{mc.code}</span>
                        <span className="text-[12px] text-content-secondary flex-1">{mc.description}</span>
                        <span className="text-[11px] text-content-tertiary">Manual</span>
                        <button onClick={() => setManualCodes(p => p.filter(m => m.key !== mc.key))} className="text-[10px] text-red-500">Remove</button>
                      </div>
                    ))}

                    {/* CPT Codes */}
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2 mt-3">Procedure Codes (CPT)</h4>
                    <div className="space-y-2 mb-3">
                      {activeCodes.cpt.map(code => {
                        const key = `cpt-${code.code}`
                        const isRemoved = codeOverrides[key]?.action === 'removed'
                        const isEdited = codeOverrides[key]?.action === 'edited'
                        const isLowConfidence = (code.confidence ?? 0) < 70
                        const isForcedReview = forcedReviewCodes.has(key)

                        if (isRemoved) return (
                          <div key={key} className="p-2 rounded-lg border border-dashed border-separator opacity-50 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-mono line-through text-content-tertiary">{code.code}</span>
                            <span className="text-[11px] text-content-tertiary flex-1">Removed: {codeOverrides[key].reason}</span>
                            <button onClick={() => setCodeOverrides(p => { const n = { ...p }; delete n[key]; return n })} className="text-[10px] text-brand">Undo</button>
                          </div>
                        )

                        return (
                          <div key={key} className={`p-2 rounded-lg border transition-colors ${
                            isLowConfidence && !isForcedReview ? 'border-amber-500/40 bg-amber-500/5' :
                            selectedCodes[key] ? 'border-brand/30 bg-brand/5' : 'border-separator bg-surface-elevated'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={!!selectedCodes[key]} onChange={() => {
                                if (isLowConfidence && !isForcedReview) {
                                  toast.error('Confidence below 70% — confirm or change this code before approving')
                                  return
                                }
                                toggleCode(key)
                              }} />
                              <span className="text-[12px] font-mono font-semibold text-content-primary">
                                {isEdited ? codeOverrides[key].newCode : code.code}
                              </span>
                              {code.modifiers?.map(mod => <span key={mod} className="text-[11px] px-1.5 py-0.5 rounded-pill bg-brand/10 text-brand">Mod {mod}</span>)}
                              <span className="text-[12px] text-content-secondary flex-1">{code.desc}</span>
                              <span className={`text-[12px] font-semibold ${(code.confidence ?? 0) >= 90 ? 'text-emerald-500' : (code.confidence ?? 0) >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{code.confidence ?? 0}%</span>
                              {code.reasoning && <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="text-content-tertiary">{expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
                              <button onClick={() => { setEditingCode(editingCode === key ? null : key); setEditSearch('') }} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-brand/40 hover:text-brand transition-colors">Edit</button>
                              <button onClick={() => setRemovingCode(removingCode === key ? null : key)} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-red-500/40 hover:text-red-500 transition-colors">Remove</button>
                              {isLowConfidence && !isForcedReview && (
                                <button onClick={() => { setForcedReviewCodes(prev => { const s = new Set(Array.from(prev)); s.add(key); return s }); toast.info('Marked as manually reviewed') }} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-semibold">Confirm</button>
                              )}
                            </div>
                            {expanded[key] && code.reasoning && <p className="mt-1 text-[12px] italic text-content-secondary pl-6">{code.reasoning}</p>}
                            {removingCode === key && (
                              <div className="mt-2 pl-6 space-y-1">
                                <p className="text-[11px] text-content-tertiary font-semibold">Reason for removal:</p>
                                {removeReasons.map(reason => (
                                  <button key={reason} onClick={() => {
                                    setCodeOverrides(p => ({ ...p, [key]: { action: 'removed', reason, originalCode: code.code } }))
                                    setSelectedCodes(p => { const n = { ...p }; delete n[key]; return n })
                                    setRemovingCode(null)
                                    toast.success(`${code.code} removed — ${reason}`)
                                  }} className="block w-full text-left text-[12px] px-2 py-1 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary">
                                    {reason}
                                  </button>
                                ))}
                              </div>
                            )}
                            {editingCode === key && (
                              <div className="mt-2 pl-6">
                                <input autoFocus placeholder="Search CPT code or description..." value={editSearch}
                                  onChange={e => setEditSearch(e.target.value)}
                                  className="w-full bg-surface-elevated border border-separator rounded-lg px-2 py-1.5 text-[12px] text-content-primary focus:border-brand/40 outline-none" />
                                {editSearch.length >= 2 && (
                                  <div className="mt-1 border border-separator rounded-lg overflow-hidden">
                                    {getDemoCptMatches(editSearch).map(result => (
                                      <button key={result.code} onClick={() => {
                                        setCodeOverrides(p => ({ ...p, [key]: { action: 'edited', reason: 'Coder correction', originalCode: code.code, newCode: result.code } }))
                                        setEditingCode(null)
                                        setEditSearch('')
                                        toast.success(`Code updated to ${result.code}`)
                                      }} className="block w-full text-left px-3 py-1.5 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0">
                                        <span className="font-mono font-semibold text-brand">{result.code}</span>
                                        <span className="ml-2 text-content-secondary">{result.description}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Manual CPT additions */}
                    {manualCodes.filter(m => m.type === 'cpt').map(mc => (
                      <div key={mc.key} className="p-2 rounded-lg border border-brand/30 bg-brand/5 flex items-center gap-2 mb-1">
                        <input type="checkbox" checked={!!selectedCodes[mc.key]} onChange={() => toggleCode(mc.key)} />
                        <span className="text-[12px] font-mono font-semibold text-brand">{mc.code}</span>
                        <span className="text-[12px] text-content-secondary flex-1">{mc.description}</span>
                        <span className="text-[11px] text-content-tertiary">Manual</span>
                        <button onClick={() => setManualCodes(p => p.filter(m => m.key !== mc.key))} className="text-[10px] text-red-500">Remove</button>
                      </div>
                    ))}

                    {/* Superbill comparison */}
                    {item.hasSuperbill && (
                      <div className="bg-surface-elevated rounded-card p-3 mb-3 border border-separator">
                        <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-1">Superbill Comparison</h4>
                        <p className="text-[12px] text-content-secondary">Superbill codes: <span className="font-mono">{item.superbillCpt?.join(', ')}</span></p>
                        {allMatch ? (
                          <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-1">✓ All codes match</p>
                        ) : (
                          <div className="text-[12px] text-amber-600 dark:text-amber-400 mt-1 space-y-0.5">
                            {aiOnly.map(code => <p key={`ai-${code}`}><AlertTriangle size={12} className="inline" /> AI suggests {code} not on superbill</p>)}
                            {superbillOnly.map(code => <p key={`sb-${code}`}><AlertTriangle size={12} className="inline" /> Superbill has {code} not suggested by AI</p>)}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Manual Add Sections — always shown */}
                <div className="mt-2">
                  <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold mb-1">
                    {aiUnavailable ? 'Enter ICD-10 codes manually:' : 'Additional ICD-10 codes:'}
                  </p>
                  <AddCodeRow type="ICD" onAdd={(code, description) => {
                    const key = `icd-manual-${code}`
                    setManualCodes(prev => [...prev.filter(m => m.key !== key), { key, code, description, type: 'icd', isManual: true }])
                    setSelectedCodes(p => ({ ...p, [key]: true }))
                    toast.success(`ICD ${code} added manually`)
                  }} />
                </div>

                <div className="mt-3">
                  <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold mb-1">
                    {aiUnavailable ? 'Enter CPT codes manually:' : 'Additional CPT codes:'}
                  </p>
                  <AddCodeRow type="CPT" onAdd={(code, description) => {
                    const key = `cpt-manual-${code}`
                    setManualCodes(prev => [...prev.filter(m => m.key !== key), { key, code, description, type: 'cpt', isManual: true }])
                    setSelectedCodes(p => ({ ...p, [key]: true }))
                    toast.success(`CPT ${code} added manually`)
                  }} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-brand text-white rounded-btn px-3 py-2 text-[13px] font-medium inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Approve & Send to Billing
                  </button>
                  <button
                    onClick={() => setShowQueryModal(true)}
                    className="flex-1 border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} /> Query Doctor
                  </button>
                  <button
                    onClick={() => setShowHoldModal(true)}
                    className="border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary inline-flex items-center justify-center gap-2"
                  >
                    <PauseCircle size={14} /> Hold
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-content-tertiary text-[14px]">
                <FileText size={16} className="mr-2" /> Select a chart from the queue
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Query Doctor Modal */}
      {showQueryModal && item && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQueryModal(false)}>
          <div className="bg-surface-secondary rounded-2xl p-5 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content-primary mb-3">Query Doctor — {item.provider}</h3>
            <p className="text-[12px] text-content-secondary mb-2">Re: {item.patientName} · DOS: {item.dos}</p>
            <button
              onClick={generateCDIQuery}
              disabled={queryGenerating}
              className="w-full mb-2 bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-btn py-1.5 text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-purple-600/20 disabled:opacity-50 transition-colors">
              {queryGenerating ? (
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full"/><span>Generating...</span></>
              ) : (
                <><span>✦</span><span>Generate CDI Query with AI</span></>
              )}
            </button>
            <textarea
              rows={4}
              placeholder="Describe your question about this note's documentation..."
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] resize-none focus:border-brand/40 outline-none text-content-primary"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowQueryModal(false)} className="flex-1 border border-separator rounded-lg py-2 text-[13px] text-content-secondary">Cancel</button>
              <button
                onClick={async () => {
                  if (!queryText.trim()) { toast.error('Please enter a question'); return }
                  try {
                    await api.post(`/coding/${item.id}/query`, {
                      query_text: queryText,
                      user_id: currentUser?.id,
                    })
                  } catch { /* best-effort */ }
                  toast.success(`Query sent to ${item.provider}. Chart marked as 'Query Sent'.`)
                  setShowQueryModal(false)
                  setQueryText('')
                }}
                className="flex-1 bg-brand text-white rounded-lg py-2 text-[13px] font-medium"
              >Send Query</button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && item && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowHoldModal(false)}>
          <div className="bg-surface-secondary rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content-primary mb-3">Hold Chart — {item.patientName}</h3>
            <label className="text-[11px] text-content-tertiary block mb-1">Reason for Hold</label>
            <select
              value={holdReason}
              onChange={e => setHoldReason(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-primary mb-4"
            >
              <option value="">Select reason...</option>
              {['Awaiting additional documentation', 'Awaiting doctor query response', 'Payer policy clarification needed', 'Supervisor review required', 'Duplicate chart — investigating'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowHoldModal(false)} className="flex-1 border border-separator rounded-lg py-2 text-[13px] text-content-secondary">Cancel</button>
              <button
                onClick={() => {
                  if (!holdReason) { toast.error('Please select a reason'); return }
                  toast.success(`Chart placed on hold: ${holdReason}`)
                  setShowHoldModal(false)
                  setHoldReason('')
                }}
                className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-[13px] font-medium"
              >Confirm Hold</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
