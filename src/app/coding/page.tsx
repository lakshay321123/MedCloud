'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { getClientName } from '@/lib/demo-data'
import { getSLAStatus } from '@/lib/utils/time'
import { useCodingQueue } from '@/lib/hooks'
import {
  BrainCircuit, CheckCircle2, Activity, Clock, MessageCircle, Mic, FileUp,
  ChevronDown, ChevronUp, Play, FileText, AlertTriangle, Plus, PauseCircle
} from 'lucide-react'

// ── Demo code lookup tables ─────────────────────────────────────────────────
const ICD_DEMO_LOOKUP = [
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'Z79.4', description: 'Long-term (current) use of insulin' },
  { code: 'Z00.00', description: 'Encounter for general adult medical examination' },
  { code: 'R00.0', description: 'Tachycardia, unspecified' },
]

const CPT_DEMO_LOOKUP = [
  { code: '99213', description: 'Office visit, established patient, low complexity' },
  { code: '99214', description: 'Office visit, established patient, moderate complexity' },
  { code: '99215', description: 'Office visit, established patient, high complexity' },
  { code: '99202', description: 'Office visit, new patient, straightforward' },
  { code: '99203', description: 'Office visit, new patient, low complexity' },
  { code: '93000', description: 'Electrocardiogram, routine ECG with interpretation' },
  { code: '93306', description: 'Echocardiography, transthoracic, real-time' },
  { code: '90837', description: 'Psychotherapy, 60 minutes with patient' },
  { code: '99495', description: 'Transitional care management, moderate complexity' },
]

const getDemoIcdMatches = (q: string) => q.length < 2 ? [] :
  ICD_DEMO_LOOKUP.filter(r => r.code.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

const getDemoCptMatches = (q: string) => q.length < 2 ? [] :
  CPT_DEMO_LOOKUP.filter(r => r.code.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

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
const priorityColor: Record<'urgent' | 'high' | 'medium' | 'low', string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-brand',
  low: 'bg-gray-400',
}

// ── Types ────────────────────────────────────────────────────────────────────
type CodingTab = 'note' | 'superbill' | 'history'

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
    status: (c.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'on_hold',
    receivedAt: c.received_at || c.created_at || new Date().toISOString(),
    priority: (c.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    visitNote: {
      subjective: 'Visit note not yet available \u2014 Bedrock integration Sprint 2',
      objective: '',
      assessment: '',
      plan: '',
    },
    aiSuggestedIcd: [] as { code: string; description: string; confidence?: number }[],
    aiSuggestedCpt: [] as { code: string; description: string; confidence?: number }[],
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

  const coders = [
    { id: 'demo-002', name: 'Sarah Kim' },
    { id: 'demo-003', name: 'Amy Chen' },
    { id: 'demo-004', name: 'James Wilson' },
  ]

  // UAE org IDs
  const uaeClientIds = ['org-101', 'org-104']

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
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [holdReason, setHoldReason] = useState('')

  const item = queue.find(q => q.id === selected)

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
  }

  const getApprovedCptCodes = (): string[] => {
    if (!item) return []
    return [
      ...item.aiSuggestedCpt
        .filter(c => selectedCodes[`cpt-${c.code}`] && codeOverrides[`cpt-${c.code}`]?.action !== 'removed')
        .map(c => codeOverrides[`cpt-${c.code}`]?.newCode || c.code),
      ...manualCodes.filter(m => m.type === 'cpt' && selectedCodes[m.key]).map(m => m.code),
    ]
  }

  const getUnreviewedLowConfidenceCodes = () => {
    if (!item) return []
    return [
      ...item.aiSuggestedIcd.filter(c =>
        c.confidence < 70 &&
        !forcedReviewCodes.has(`icd-${c.code}`) &&
        selectedCodes[`icd-${c.code}`]
      ),
      ...item.aiSuggestedCpt.filter(c =>
        c.confidence < 70 &&
        !forcedReviewCodes.has(`cpt-${c.code}`) &&
        selectedCodes[`cpt-${c.code}`]
      ),
    ]
  }

  const handleApprove = () => {
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

    toast.success(`Chart approved → CLM-${Math.floor(Math.random() * 9000 + 1000)} created. Sent to billing queue.`)
    const nextIdx = queue.findIndex(q => q.id === selected) + 1
    setSelected(queue[nextIdx]?.id || queue[0]?.id || '')
    resetChart()
    setExpanded({})
  }

  return (
    <ModuleShell title="AI Coding" subtitle="Review and approve AI-suggested codes">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="My Queue" value={apiQueueResult?.meta?.total ?? queue.length} icon={<BrainCircuit size={20} />} />
        <KPICard label="Coded Today" value="4" icon={<CheckCircle2 size={20} />} />
        <KPICard label="AI Acceptance" value="89%" icon={<Activity size={20} />} />
        <KPICard label="Avg Time/Chart" value="6.2m" icon={<Clock size={20} />} />
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
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
                    }}
                    className={`w-full text-left p-2 rounded-btn border transition-colors ${selected === q.id ? 'bg-brand/10 border-brand/20' : 'border-transparent hover:bg-surface-elevated'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-semibold text-content-primary leading-tight">{q.patientName}</p>
                      <span className={`w-2 h-2 rounded-full mt-1 ${priorityColor[q.priority ?? 'medium']}`} />
                    </div>
                    <p className="text-[12px] text-content-secondary truncate">{getClientName(q.clientId)} · {q.dos}</p>
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
                          <button key={c.id} onClick={() => { toast.success(`Reassigned to ${c.name}`); setReassignTarget(null) }}
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
        <div className="col-span-5">
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
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {([
                      ['DOB', item.patientDob],
                      ['Gender', item.patientGender],
                      ['Payer', item.patientPayer],
                      ['Visit Type', item.visitType],
                      ['DOS', item.dos],
                      ['POS', item.placeOfService],
                      ['Specialty', item.providerSpecialty],
                      ['Source', item.source === 'ai_scribe' ? '🎙 AI Scribe' : '📄 Upload'],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="bg-surface-elevated rounded-lg px-2 py-1.5">
                        <span className="text-[10px] text-content-tertiary block">{label}</span>
                        <span className="text-[12px] text-content-primary font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="px-4 border-b border-separator flex gap-2">
                  <button onClick={() => setTab('note')} className={tabClass(tab === 'note')}>Visit Note</button>
                  {item.hasSuperbill && <button onClick={() => setTab('superbill')} className={tabClass(tab === 'superbill')}>Superbill</button>}
                  <button onClick={() => setTab('history')} className={tabClass(tab === 'history')}>History</button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  {tab === 'note' && (
                    <div className="space-y-3">
                      {item.source === 'ai_scribe' ? (
                        <div className="bg-brand/5 border border-brand/20 rounded-card p-3 flex items-center gap-3 mb-3 shrink-0">
                          <Mic size={14} className="text-brand shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-content-primary">AI Scribe Recording</p>
                            <p className="text-[11px] text-content-secondary">Transcribed from live session</p>
                          </div>
                          <button onClick={() => toast.info('Audio playback from AI Scribe session')} className="text-xs text-brand underline shrink-0">Play Recording</button>
                        </div>
                      ) : (
                        <div className="bg-surface-elevated border border-separator rounded-card p-3 flex items-center gap-3 mb-3 shrink-0">
                          <FileText size={14} className="text-content-secondary shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-content-primary">Uploaded Document</p>
                            <p className="text-[11px] text-content-secondary">Source chart — {item.patientName}</p>
                          </div>
                          <button onClick={() => toast.info('Opening document in Documents module...')} className="text-xs text-brand underline shrink-0">View Original</button>
                        </div>
                      )}
                      {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
                        <div key={section} className="pb-2 border-b border-separator last:border-0">
                          <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-1">{section}</p>
                          <p className="text-[13px] text-content-secondary whitespace-pre-line">{item.visitNote[section]}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'superbill' && item.hasSuperbill && (
                    <div className="space-y-3">
                      <div className="bg-surface-elevated border border-separator rounded-card p-6 text-center text-content-secondary text-[13px]">
                        📄 PDF Viewer — {item.patientName} superbill
                      </div>
                      <p className="text-[13px] text-content-secondary">Superbill codes ticked: <span className="font-mono text-content-primary">{item.superbillCpt?.join(', ')}</span></p>
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

                  {tab === 'history' && (
                    <div className='text-center py-8 text-xs text-content-secondary'>
                      Prior visit history — available Sprint 2
                    </div>
                  )}
                </div>
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
                      <p className="text-[11px] text-content-secondary">This client uses ICD-10-AM and DHA activity codes. Full UAE code set is Sprint 4. Flag for manual review.</p>
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
                    {/* ICD Codes */}
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Diagnosis Codes (ICD-10)</h4>
                    <div className="space-y-2 mb-3">
                      {item.aiSuggestedIcd.map(code => {
                        const key = `icd-${code.code}`
                        const isRemoved = codeOverrides[key]?.action === 'removed'
                        const isEdited = codeOverrides[key]?.action === 'edited'
                        const isLowConfidence = code.confidence < 70
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
                              <span className={`text-[12px] font-semibold ${code.confidence >= 90 ? 'text-emerald-500' : code.confidence >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{code.confidence}%</span>
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
                      {item.aiSuggestedCpt.map(code => {
                        const key = `cpt-${code.code}`
                        const isRemoved = codeOverrides[key]?.action === 'removed'
                        const isEdited = codeOverrides[key]?.action === 'edited'
                        const isLowConfidence = code.confidence < 70
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
                              <span className={`text-[12px] font-semibold ${code.confidence >= 90 ? 'text-emerald-500' : code.confidence >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{code.confidence}%</span>
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
                onClick={() => {
                  if (!queryText.trim()) { toast.error('Please enter a question'); return }
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
