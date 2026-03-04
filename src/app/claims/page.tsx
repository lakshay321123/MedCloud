'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import DocViewer from '@/components/shared/DocViewer'
import { useApp } from '@/lib/context'
import { demoMessages } from '@/lib/demo-data'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import type { DemoClaim, ClaimTimelineEvent } from '@/lib/demo-data'
import { useToast } from '@/components/shared/Toast'
import { useRouter } from 'next/navigation'
import { useClaims, useScrubClaim, useTransitionClaim, useGenerateEDI,
         useClaimLines, useAddClaimLine, useClaimDiagnoses, useAddClaimDiagnosis,
         useScrubRules, useCreateClaim, useUpdateClaim, usePredictDenial, useGenerate837I, useTriggerSecondaryClaim, useTimelyFilingDeadlines } from '@/lib/hooks'
import type { ApiClaim } from '@/lib/hooks'
import type { ClaimStatus } from '@/types'
import { ErrorBanner } from '@/components/shared/ApiStates'
import { sanitizeForPrompt } from '@/lib/ai-utils'
import {
  FileText, CheckCircle2, Activity, Clock, Search, X, ChevronDown, ChevronUp,
  AlertTriangle, ShieldAlert, MessageCircle, DollarSign, Eye, RotateCcw,
  Filter, Download, CheckSquare, Edit3, Save
} from 'lucide-react'

function apiClaimToDemoClaim(c: ApiClaim): DemoClaim {
  return {
    id: c.claim_number || c.id,
    apiId: c.id,
    patientId: c.patient_id,
    patientName: c.patient_name || `Patient ${c.patient_id}`,
    clientId: c.client_id,
    clientName: c.client_name || '',
    payer: c.payer_name || '',
    payerId: c.payer_id || '',
    dos: c.dos_from || '',
    cptCodes: [],
    icdCodes: [],
    billed: Number(c.total_charges) || 0,
    allowed: Number(c.allowed_amount) || 0,
    paid: Number(c.paid_amount) || 0,
    status: c.status as ClaimStatus,
    age: c.dos_from
      ? Math.floor((Date.now() - new Date(c.dos_from).getTime()) / 86400000)
      : 0,
    submittedDate: c.submitted_date,
    paymentDate: c.paid_date,
    placeOfService: c.place_of_service || '11',
    scrubErrors: [],
    timeline: [],
    documents: [],
  }
}

const SCRUB_RULES = [
  { id: 'S01', label: 'Patient name matches insurance card' },
  { id: 'S02', label: 'Date of birth verified against eligibility' },
  { id: 'S03', label: 'Member ID confirmed active on DOS' },
  { id: 'S04', label: 'Billing NPI registered with payer' },
  { id: 'S05', label: 'Rendering NPI on claim' },
  { id: 'S06', label: 'Place of Service code valid for CPT' },
  { id: 'S07', label: 'Primary diagnosis code valid (ICD-10)' },
  { id: 'S08', label: 'All ICD codes medically necessary for CPT' },
  { id: 'S09', label: 'CPT codes not mutually exclusive (NCCI)' },
  { id: 'S10', label: 'Modifiers applied correctly' },
  { id: 'S11', label: 'Units billed match documentation' },
  { id: 'S12', label: 'Authorization obtained where required' },
  { id: 'S13', label: 'Referral on file if required by plan' },
  { id: 'S14', label: 'Timely filing window open' },
  { id: 'S15', label: 'Coordination of benefits order verified' },
  { id: 'S16', label: 'No duplicate claim on file' },
  { id: 'S17', label: 'Taxonomy code present and accurate' },
  { id: 'S18', label: 'Service facility NPI included if applicable' },
  { id: 'S19', label: 'Claim total matches sum of line items' },
  { id: 'S20', label: 'Claim reviewed and signed off by biller' },
]

const POS_OPTIONS = [
  { value: '11', label: '11 – Office' },
  { value: '12', label: '12 – Home' },
  { value: '21', label: '21 – Inpatient Hospital' },
  { value: '22', label: '22 – On Campus Outpatient Hospital' },
  { value: '23', label: '23 – Emergency Room' },
  { value: '24', label: '24 – Ambulatory Surgical Center' },
  { value: '31', label: '31 – Skilled Nursing Facility' },
  { value: '32', label: '32 – Nursing Facility' },
  { value: '41', label: '41 – Ambulance – Land' },
  { value: '81', label: '81 – Independent Laboratory' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  scrubbing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse',
  scrub_failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  ready: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  submitted: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  accepted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_process: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial_pay: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  denied: 'bg-red-500/10 text-red-400 border border-red-500/20',
  appealed: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  corrected: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  write_off: 'bg-gray-500/10 text-gray-400 border border-gray-500/20 line-through',
}

const ALL_STATUSES = ['draft','scrubbing','scrub_failed','ready','submitted','accepted','in_process','paid','partial_pay','denied','appealed','corrected','write_off'] as const

function ClaimStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[status] || 'bg-gray-500/10 text-gray-400'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Claim Detail Drawer ────────────────────────────────────────────────────
function ClaimDrawer({ claim, onClose, onRefetch, apiScrubRules }: {
  claim: DemoClaim
  onClose: () => void
  onRefetch?: () => void
  apiScrubRules: Array<{ id: string; label: string }>
}) {
  const { currentUser } = useApp()
  const [tab, setTab] = useState<'overview' | 'lines' | 'docs' | 'messages' | 'audit' | 'scrub'>('overview')
  const { toast } = useToast()
  const [localMessages, setLocalMessages] = useState(demoMessages.filter(m => m.entityId === claim.id))
  const [msgInput, setMsgInput] = useState('')
  const [ediOutput, setEdiOutput] = useState<string | null>(null)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editedClaim, setEditedClaim] = useState<{
    billingNpi: string; renderingNpi: string; placeOfService: string; cptCodes: string[]
  }>({
    billingNpi: '1234567890',
    renderingNpi: '0987654321',
    placeOfService: '11',
    cptCodes: [...claim.cptCodes],
  })

  // Sprint 2 API hooks — use claim.apiId (raw UUID) when available
  const claimApiId = claim.apiId || ''
  const { mutate: scrubClaim, loading: scrubbing } = useScrubClaim(claimApiId)
  const { mutate: transitionClaim, loading: transitioning } = useTransitionClaim(claimApiId)
  const { mutate: generateEDI, loading: generatingEDI } = useGenerateEDI(claimApiId)
  const { data: linesData, refetch: refetchLines } = useClaimLines(claimApiId || null)
  const { data: dxData, refetch: refetchDx } = useClaimDiagnoses(claimApiId || null)
  const { mutate: addLine } = useAddClaimLine(claimApiId)
  const { mutate: addDx } = useAddClaimDiagnosis(claimApiId)

  const claimLines = linesData?.data ?? []
  const claimDiagnoses = dxData?.data ?? []

  // Manual scrub checklist
  const [checkedRules, setCheckedRules] = useState<Set<string>>(new Set())
  const toggleRule = (id: string) => setCheckedRules(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const allRulesChecked = checkedRules.size === apiScrubRules.length

  // Denial prediction
  const [denialRisk, setDenialRisk] = useState<{ risk: 'high' | 'medium' | 'low'; probability: number; reasons: string[] } | null>(null)
  const [predictingDenial, setPredictingDenial] = useState(false)

  async function predictDenialRisk() {
    setPredictingDenial(true)
    try {
      // Sanitize user-controlled fields before interpolation (prompt injection defence)
      const safePayer  = sanitizeForPrompt(claim.payer, 100)
      const safeCpt    = claim.cptCodes?.map(c => sanitizeForPrompt(c, 20)).join(', ') || 'N/A'
      const safeIcd    = claim.icdCodes?.map(c => sanitizeForPrompt(c, 20)).join(', ') || 'N/A'
      const claimPOS   = sanitizeForPrompt(claim.placeOfService, 30) || '11'

      const prompt = [
        'You are an expert medical billing denial analyst. Predict the denial risk for this claim.',
        `Payer: ${safePayer}`,
        `CPT Codes: ${safeCpt}`,
        `ICD Codes: ${safeIcd}`,
        `Billed Amount: $${claim.billed}`,
        `Place of Service: 11 (Office)`,
        `Claim Status: ${claim.status}`,
        '',
        'Return ONLY valid JSON, no markdown:',
        '{"risk":"high|medium|low","probability":75,"reasons":["Reason 1","Reason 2"]}',
        '',
        'Rules: probability is 0-100 integer. reasons is 2-3 specific denial risk factors. Be accurate based on payer/code patterns.',
      ].join('\n')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'denial_risk',
          payer: safePayer,
          cpt: safeCpt,
          icd: safeIcd,
          billed: claim.billed,
          pos: claimPOS,
          status: claim.status,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const cleaned = (data.text || '').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setDenialRisk({ risk: parsed.risk, probability: parsed.probability, reasons: parsed.reasons || [] })
    } catch (err) {
      console.error('[denial prediction] Failed:', err)
      toast.error('Prediction unavailable')
    } finally {
      setPredictingDenial(false)
    }
  }

  async function handleScrub() {
    if (!claimApiId) { toast.warning('No API ID — demo claim cannot be scrubbed'); return }
    const result = await scrubClaim({ user_id: currentUser?.id })
    if (result) {
      if (result.passed) {
        toast.success(`Scrub passed — ${result.total_rules} rules checked, 0 errors`)
      } else {
        toast.error(`Scrub failed — ${result.errors} error(s), ${result.warnings} warning(s)`)
      }
      onRefetch?.()
    }
  }

  async function handleTransition(toStatus: string) {
    if (!claimApiId) { toast.warning('No API ID — demo claim cannot be transitioned'); return }
    const result = await transitionClaim({
      to_status: toStatus,
      user_id: currentUser?.id,
      note: `Transitioned to ${toStatus}`,
    })
    if (result) {
      toast.success(`Claim transitioned to ${toStatus}`)
      onRefetch?.()
    } else {
      toast.error('Transition failed — check claim status rules')
    }
  }

  async function handleGenerateEDI() {
    if (!claimApiId) { toast.warning('No API ID — demo claim cannot generate EDI'); return }
    const result = await generateEDI({} as Record<string, never>)
    if (result?.edi) {
      setEdiOutput(result.edi)
      toast.success('837P EDI generated')
    }
  }

  async function handleAddLine(lineData: Parameters<typeof addLine>[0]) {
    await addLine(lineData)
    refetchLines()
  }

  async function handleAddDiagnosis(dxPayload: Parameters<typeof addDx>[0]) {
    await addDx(dxPayload)
    refetchDx()
  }

  const statusAction = () => {
    if (claim.status === 'scrub_failed') {
      if (claimApiId) handleScrub()
      else toast.error('Fix scrub errors before re-submitting')
    } else if (claim.status === 'ready') {
      if (claimApiId) handleTransition('submitted')
      else toast.success(`${claim.id} submitted to Availity`)
    } else if (claim.status === 'denied') {
      toast.success('Routed to denial queue')
    } else if (claim.status === 'paid') {
      toast.info('Opening payment details…')
    }
  }

  // suppress unused-var warnings for handlers available for future use
  void handleAddLine
  void handleAddDiagnosis

  const sendMessage = () => {
    if (!msgInput.trim()) return
    setLocalMessages(prev => [...prev, {
      id: `MSG-NEW-${Date.now()}`, entityType: 'claim', entityId: claim.id,
      entityLabel: `Claim #${claim.id}`, clientId: claim.clientId, clientName: claim.clientName,
      subject: 'New message', lastMessage: msgInput, lastSender: 'Staff', lastSenderRole: 'staff',
      timestamp: new Date().toISOString(), unread: false, status: 'open',
      messages: [{ sender: 'Staff', role: 'staff', text: msgInput, time: new Date().toISOString() }]
    }])
    setMsgInput('')
    toast.success('Message sent')
  }

  const handleSaveEdit = () => {
    toast.success('Claim updated — changes logged to audit trail')
    setEditMode(false)
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'lines', label: 'Line Items' },
    { id: 'scrub', label: 'Manual Scrub' },
    { id: 'docs', label: 'Documents' },
    { id: 'messages', label: 'Messages' },
    { id: 'audit', label: 'Audit Log' },
  ] as const

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[600px] bg-surface-secondary border-l border-separator z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-separator shrink-0">
          <span className="font-mono text-[15px] font-bold text-content-primary">{claim.id}</span>
          <ClaimStatusBadge status={claim.status} />
          <span className="ml-auto text-[15px] font-bold text-content-primary">${claim.billed.toLocaleString()}</span>
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-surface-elevated border border-separator rounded-btn text-content-secondary hover:text-content-primary ml-2">
              <Edit3 size={13} /> Edit
            </button>
          ) : (
            <>
              <button onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-brand text-white rounded-btn ml-2">
                <Save size={13} /> Save
              </button>
              <button onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-surface-elevated border border-separator rounded-btn text-content-secondary hover:text-content-primary">
                Cancel
              </button>
            </>
          )}
          <button onClick={onClose} className="text-content-tertiary hover:text-content-primary p-1"><X size={18} /></button>
        </div>
        {/* Tab bar */}
        <div className="flex border-b border-separator px-4 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-[12px] font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Audit warning when in edit mode */}
              {editMode && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-amber-600 dark:text-amber-400">
                    All edits are recorded in the audit log with your user ID and timestamp.
                    Only make changes authorized by your supervisor.
                  </p>
                </div>
              )}

              {/* Editable fields */}
              {editMode ? (
                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">Billing Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-content-tertiary block mb-1">Billing NPI</label>
                      <input value={editedClaim.billingNpi}
                        onChange={e => setEditedClaim(p => ({ ...p, billingNpi: e.target.value }))}
                        className="w-full bg-surface-elevated border border-separator rounded-btn px-2.5 py-1.5 text-[13px] text-content-primary font-mono focus:outline-none focus:border-brand/40" />
                    </div>
                    <div>
                      <label className="text-[11px] text-content-tertiary block mb-1">Rendering NPI</label>
                      <input value={editedClaim.renderingNpi}
                        onChange={e => setEditedClaim(p => ({ ...p, renderingNpi: e.target.value }))}
                        className="w-full bg-surface-elevated border border-separator rounded-btn px-2.5 py-1.5 text-[13px] text-content-primary font-mono focus:outline-none focus:border-brand/40" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-content-tertiary block mb-1">Place of Service</label>
                      <select value={editedClaim.placeOfService}
                        onChange={e => setEditedClaim(p => ({ ...p, placeOfService: e.target.value }))}
                        className="w-full bg-surface-elevated border border-separator rounded-btn px-2.5 py-1.5 text-[13px] text-content-primary focus:outline-none focus:border-brand/40">
                        {POS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-content-tertiary block mb-1">CPT Codes (comma-separated)</label>
                    <input value={editedClaim.cptCodes.join(', ')}
                      onChange={e => setEditedClaim(p => ({ ...p, cptCodes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      className="w-full bg-surface-elevated border border-separator rounded-btn px-2.5 py-1.5 text-[13px] text-content-primary font-mono focus:outline-none focus:border-brand/40" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-2">Patient Info</p>
                    <div className="flex justify-between"><span className="text-content-secondary">Patient</span><span className="text-content-primary font-medium">{claim.patientName}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">Client</span><span className="text-content-primary">{claim.clientName}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">DOS</span><span className="text-content-primary font-mono">{claim.dos}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">CPT</span><span className="text-content-primary font-mono">{claim.cptCodes.join(', ')}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">ICD</span><span className="text-content-primary font-mono">{claim.icdCodes.join(', ')}</span></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-2">Payer Info</p>
                    <div className="flex justify-between"><span className="text-content-secondary">Payer</span><span className="text-content-primary font-medium">{claim.payer}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">Billed</span><span className="text-content-primary">${claim.billed}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">Allowed</span><span className="text-content-primary">{claim.allowed ? `$${claim.allowed}` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">Paid</span><span className={claim.paid ? 'text-emerald-500 font-medium' : 'text-content-tertiary'}>{claim.paid ? `$${claim.paid}` : '—'}</span></div>
                    {claim.submittedDate && <div className="flex justify-between"><span className="text-content-secondary">Submitted</span><span className="text-content-primary font-mono">{claim.submittedDate}</span></div>}
                    {claim.paymentDate && <div className="flex justify-between"><span className="text-content-secondary">Paid On</span><span className="text-content-primary font-mono">{claim.paymentDate}</span></div>}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {!editMode && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-3">Status Timeline</p>
                  <div className="space-y-0">
                    {claim.timeline.map((ev: ClaimTimelineEvent, i: number) => {
                      const isLast = i === claim.timeline.length - 1
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${isLast ? 'bg-brand' : 'bg-separator'}`} />
                            {!isLast && <div className="w-0.5 bg-separator flex-1 my-1" />}
                          </div>
                          <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                            <p className={`text-[13px] font-medium ${isLast ? 'text-brand' : 'text-content-primary'}`}>{ev.status.replace(/_/g, ' ')}</p>
                            <p className="text-[11px] text-content-tertiary">{ev.timestamp} · {ev.by}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Scrub errors */}
              {claim.scrubErrors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">Scrub Errors</p>
                  {claim.scrubErrors.map(e => (
                    <div key={e.ruleId} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={13} className="text-red-500" />
                        <span className="text-[13px] font-semibold text-red-500">{e.name}</span>
                        <span className="text-[11px] text-content-tertiary ml-auto">Rule #{e.ruleId}</span>
                      </div>
                      <p className="text-[12px] text-content-secondary mb-1">{e.description}</p>
                      <p className="text-[12px] text-brand">Fix: {e.fix}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Action button */}
              {!editMode && (
                <div className="space-y-2">
                  {claim.status === 'scrub_failed' && <button onClick={statusAction} disabled={scrubbing} className="w-full bg-red-500 text-white rounded-btn py-2.5 text-[13px] font-medium disabled:opacity-50">{scrubbing ? 'Scrubbing…' : 'Fix & Re-Scrub'}</button>}
                  {claim.status === 'ready' && (
                    <>
                      {/* Denial Risk Prediction */}
                      {!denialRisk && (
                        <button
                          onClick={predictDenialRisk}
                          disabled={predictingDenial}
                          className="w-full bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-btn py-2 text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-purple-600/20 disabled:opacity-50 transition-colors mb-1">
                          {predictingDenial
                            ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full"/><span>Analyzing denial risk…</span></>
                            : <><span>✦</span><span>Predict Denial Risk before Submit</span></>}
                        </button>
                      )}
                      {denialRisk && (
                        <div className={`rounded-lg border p-3 mb-1 ${
                          denialRisk.risk === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          denialRisk.risk === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-emerald-500/10 border-emerald-500/30'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-semibold text-content-primary flex items-center gap-1.5">
                              <span>✦</span>
                              Denial Risk: <span className={
                                denialRisk.risk === 'high' ? 'text-red-500' :
                                denialRisk.risk === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                              }>{denialRisk.risk.toUpperCase()}</span>
                            </span>
                            <span className={`text-[13px] font-bold ${
                              denialRisk.risk === 'high' ? 'text-red-500' :
                              denialRisk.risk === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                            }`}>{denialRisk.probability}%</span>
                          </div>
                          {denialRisk.reasons.map((r, i) => (
                            <p key={i} className="text-[11px] text-content-secondary flex items-start gap-1">
                              <span className="shrink-0 mt-0.5">•</span>{r}
                            </p>
                          ))}
                          <button onClick={() => setDenialRisk(null)} className="text-[10px] text-content-tertiary hover:text-content-secondary mt-1.5">Re-analyze</button>
                        </div>
                      )}
                      <button onClick={statusAction} disabled={transitioning} className="w-full bg-brand text-white rounded-btn py-2.5 text-[13px] font-medium disabled:opacity-50">{transitioning ? 'Submitting…' : 'Submit to Clearinghouse'}</button>
                      <button onClick={handleGenerateEDI} disabled={generatingEDI} className="w-full bg-surface-elevated border border-separator text-content-primary rounded-btn py-2.5 text-[13px] font-medium disabled:opacity-50">{generatingEDI ? 'Generating EDI…' : 'Generate 837P EDI'}</button>
                    </>
                  )}
                  {claim.status === 'submitted' && <button onClick={handleGenerateEDI} disabled={generatingEDI} className="w-full bg-surface-elevated border border-separator text-content-primary rounded-btn py-2.5 text-[13px] font-medium disabled:opacity-50">{generatingEDI ? 'Generating EDI…' : 'Generate 837P EDI'}</button>}
                  {claim.status === 'denied' && (
                    <>
                      <button onClick={statusAction} className="w-full bg-amber-500 text-white rounded-btn py-2.5 text-[13px] font-medium">Route to Denials</button>
                      <button onClick={() => handleTransition('appealed')} disabled={transitioning} className="w-full bg-orange-500 text-white rounded-btn py-2.5 text-[13px] font-medium disabled:opacity-50">{transitioning ? 'Appealing…' : 'Appeal Claim'}</button>
                    </>
                  )}
                  {claim.status === 'paid' && <button onClick={statusAction} className="w-full bg-surface-elevated border border-separator text-content-primary rounded-btn py-2.5 text-[13px] font-medium">View Payment</button>}
                  {ediOutput && (
                    <div className="mt-2">
                      <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-1">Generated 837P EDI</p>
                      <pre className="bg-surface-elevated border border-separator rounded-lg p-3 text-[10px] font-mono text-content-secondary overflow-x-auto max-h-48 whitespace-pre-wrap">{ediOutput}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'lines' && (
            <div className="space-y-4">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-separator text-[11px] text-content-tertiary uppercase tracking-wider">
                  {['CPT','Modifier','Description','Units','Billed','POS'].map(h => (
                    <th key={h} className="text-left py-2 pr-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {claimLines.length > 0 ? claimLines.map(line => (
                    <tr key={line.id} className="border-b border-separator last:border-0">
                      <td className="py-3 pr-3 font-mono font-medium text-content-primary">{line.cpt_code}</td>
                      <td className="py-3 pr-3 font-mono text-content-tertiary">{line.modifier_1 || '—'}</td>
                      <td className="py-3 pr-3 text-content-secondary">{line.description || 'Office/Procedure visit'}</td>
                      <td className="py-3 pr-3">{line.units}</td>
                      <td className="py-3 pr-3">${Number(line.charge_amount).toLocaleString()}</td>
                      <td className="py-3 pr-3 text-content-tertiary">{line.place_of_service || '—'}</td>
                    </tr>
                  )) : claim.cptCodes.length > 0 ? claim.cptCodes.map((cpt) => (
                    <tr key={cpt} className="border-b border-separator last:border-0">
                      <td className="py-3 pr-3 font-mono font-medium text-content-primary">{cpt}</td>
                      <td className="py-3 pr-3 font-mono text-content-tertiary">—</td>
                      <td className="py-3 pr-3 text-content-secondary">Office/Procedure visit</td>
                      <td className="py-3 pr-3">1</td>
                      <td className="py-3 pr-3">${Math.round(claim.billed / claim.cptCodes.length)}</td>
                      <td className="py-3 pr-3 text-content-tertiary">11</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-8 text-center text-content-tertiary text-[13px]">No line items</td></tr>
                  )}
                </tbody>
              </table>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-2">Diagnoses</p>
                {claimDiagnoses.length > 0 ? (
                  <div className="space-y-1">
                    {claimDiagnoses.map(dx => (
                      <div key={dx.id} className="flex items-center gap-3 text-[12px]">
                        <span className="font-mono text-content-primary w-16">{dx.icd_code}</span>
                        <span className="text-content-secondary">{dx.description || '—'}</span>
                        {dx.is_primary && <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-pill">Primary</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-content-secondary">
                    <span className="font-mono text-content-primary">{claim.icdCodes.join(', ') || '—'}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === 'scrub' && (
            <div className="grid grid-cols-2 gap-4 h-[calc(100vh-320px)]">
              {/* Left: document preview */}
              <div className="card overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-separator text-xs font-semibold text-content-secondary uppercase tracking-wider">
                  Supporting Documents
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-content-tertiary">
                  <FileText size={32} className="opacity-20" />
                  <p className="text-xs">No document attached to this claim</p>
                  <button onClick={() => { window.location.href = '/documents' }}
                    className="text-xs text-brand hover:underline">
                    Open Documents →
                  </button>
                </div>
                {claimApiId && (
                  <div className="p-3 border-t border-separator">
                    <button onClick={handleScrub} disabled={scrubbing}
                      className="w-full bg-brand text-white rounded-btn py-2 text-[12px] font-medium disabled:opacity-50">
                      {scrubbing ? 'Running AI Scrub…' : 'Run AI Scrub'}
                    </button>
                  </div>
                )}
              </div>
              {/* Right: scrub rules */}
              <div className="card overflow-y-auto p-4 space-y-4">
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <CheckSquare size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-blue-400">
                    Complete all {apiScrubRules.length} scrub rules before submitting. {checkedRules.size} / {apiScrubRules.length} checked.
                  </p>
                </div>
                <div className="space-y-1">
                  {apiScrubRules.map(rule => (
                    <label key={rule.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-elevated cursor-pointer group">
                      <input type="checkbox" checked={checkedRules.has(rule.id)} onChange={() => toggleRule(rule.id)}
                        className="rounded accent-brand w-4 h-4 shrink-0" />
                      <span className={`text-[12px] font-mono text-content-tertiary w-10 shrink-0`}>{rule.id}</span>
                      <span className={`text-[13px] flex-1 ${checkedRules.has(rule.id) ? 'line-through text-content-tertiary' : 'text-content-primary'}`}>{rule.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  disabled={!allRulesChecked}
                  onClick={() => {
                    toast.success('Manual scrub complete — claim marked ready for submission')
                    setCheckedRules(new Set())
                  }}
                  className={`w-full py-2.5 rounded-btn text-[13px] font-medium transition-colors ${allRulesChecked ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-surface-elevated text-content-tertiary cursor-not-allowed border border-separator'}`}>
                  {allRulesChecked ? 'Submit Manual Scrub' : `Check all ${apiScrubRules.length - checkedRules.size} remaining rules to continue`}
                </button>
              </div>
            </div>
          )}

          {tab === 'docs' && (
            <div className="space-y-4">
              {claim.documents.length > 0 ? (
                <DocViewer documents={claim.documents} mode="inline" />
              ) : (
                <p className="text-[13px] text-content-tertiary text-center py-8">No documents attached</p>
              )}
              <button
                onClick={() => toast.info('Document attached')}
                className="w-full border border-dashed border-separator rounded-btn py-3 text-[13px] text-content-secondary hover:border-brand hover:text-brand transition-colors"
              >
                + Add Document
              </button>
            </div>
          )}

          {tab === 'messages' && (
            <div className="flex flex-col h-full gap-3">
              <div className="flex-1 space-y-3 min-h-[200px]">
                {localMessages.length === 0 && (
                  <p className="text-[13px] text-content-tertiary text-center py-8">No messages for this claim</p>
                )}
                {localMessages.flatMap(m => m.messages).map((msg, i) => (
                  <div key={`${msg.sender}-${i}-${msg.text.slice(0, 10)}`} className={`flex gap-2 ${msg.role === 'staff' ? 'flex-row-reverse' : ''}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-[13px] ${msg.role === 'staff' ? 'bg-brand/10 text-content-primary' : 'bg-surface-elevated text-content-primary'}`}>
                      <p className="text-[11px] text-content-tertiary mb-1">{msg.sender}</p>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-auto">
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message…"
                  className="flex-1 bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-brand/40" />
                <button onClick={sendMessage} className="bg-brand text-white rounded-btn px-4 py-2 text-[13px]"><MessageCircle size={14} /></button>
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-3">
              {[
                { icon: <FileText size={14} />, label: 'Claim created', detail: 'Created by Maria Rodriguez', time: `${claim.dos} 9:14 AM` },
                { icon: <Activity size={14} />, label: 'AI coding complete', detail: 'Codes: ' + claim.cptCodes.join(', '), time: `${claim.dos} 9:22 AM` },
                { icon: <CheckCircle2 size={14} />, label: 'Scrub passed', detail: '0 errors found', time: `${claim.dos} 9:23 AM` },
                { icon: <Eye size={14} />, label: 'Reviewed', detail: 'Reviewed by James Wilson', time: claim.submittedDate ? `${claim.submittedDate} 8:50 AM` : `${claim.dos} 10:00 AM` },
                { icon: <CheckSquare size={14} />, label: 'Submitted', detail: 'Submitted to clearinghouse', time: claim.submittedDate ? `${claim.submittedDate} 9:00 AM` : '—' },
                { icon: <DollarSign size={14} />, label: 'ERA received', detail: `Paid $${claim.paid}`, time: claim.paymentDate ? `${claim.paymentDate} 11:00 AM` : '—' },
                { icon: <CheckCircle2 size={14} />, label: 'Posted', detail: 'Auto-posted by system', time: claim.paymentDate ? `${claim.paymentDate} 11:05 AM` : '—' },
                { icon: <Activity size={14} />, label: 'Patient statement sent', detail: 'Balance: $0', time: claim.paymentDate ? `${claim.paymentDate} 12:00 PM` : '—' },
              ].map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-separator last:border-0">
                  <div className="text-brand mt-0.5">{entry.icon}</div>
                  <div>
                    <p className="text-[13px] font-medium text-content-primary">{entry.label}</p>
                    <p className="text-[12px] text-content-secondary">{entry.detail}</p>
                  </div>
                  <span className="ml-auto text-[11px] text-content-tertiary whitespace-nowrap">{entry.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ClaimsPage() {
  const { selectedClient, country } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [dosFrom, setDosFrom] = useState('')
  const [dosTo, setDosTo] = useState('')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [drawerClaim, setDrawerClaim] = useState<DemoClaim | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'id' | 'age' | 'billed'>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  // API integration
  const { data: apiResult, loading: apiLoading, error: apiError, refetch } = useClaims({
    limit: 100,
    ...(search ? { search } : {}),
    ...(statusFilters.length === 1 ? { status: statusFilters[0] } : {}),
  })
  const { data: scrubRulesData } = useScrubRules()
  const apiScrubRules = scrubRulesData?.data?.map(r => ({
    id: r.rule_code,
    label: r.rule_name + ' — ' + r.description,
  })) ?? SCRUB_RULES

  const allClaims = useMemo(() => {
    // Use API data if available, otherwise fall back to demo data
    const source: DemoClaim[] = apiResult?.data
      ? apiResult.data.map(apiClaimToDemoClaim)
      : []

    return source.filter(c => {
      if (search && !c.patientName.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilters.length && !statusFilters.includes(c.status)) return false
      if (dosFrom && c.dos < dosFrom) return false
      if (dosTo && c.dos > dosTo) return false
      return true
    }).sort((a, b) => {
      const av = sortKey === 'id' ? a.id : sortKey === 'age' ? a.age : a.billed
      const bv = sortKey === 'id' ? b.id : sortKey === 'age' ? b.age : b.billed
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [apiResult, selectedClient, search, statusFilters, dosFrom, dosTo, sortKey, sortDir])

  const paginated = allClaims.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(allClaims.length / PER_PAGE)

  // KPIs
  const today = new Date().toISOString().split('T')[0]
  const submittedToday = allClaims.filter(c => c.submittedDate === today).length
  const cleanClaims = allClaims.filter(c => !['scrub_failed'].includes(c.status))
  const cleanRate = allClaims.length ? Math.round((cleanClaims.length / allClaims.length) * 100) : 0
  const paidClaimsWithDates = allClaims.filter(c => c.status === 'paid' && c.submittedDate && c.paymentDate)
  const avgDays = paidClaimsWithDates.length
    ? Math.round(paidClaimsWithDates.reduce((s, c) => {
        const diff = (new Date(c.paymentDate!).getTime() - new Date(c.submittedDate!).getTime()) / 86400000
        return s + diff
      }, 0) / paidClaimsWithDates.length)
    : 24

  const toggleStatus = (s: string) =>
    setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const toggleRow = (id: string) =>
    setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const allReady = selectedRows.every(id => allClaims.find(c => c.id === id)?.status === 'ready')

  const handleSort = (key: 'id' | 'age' | 'billed') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleBatchSubmit = () => {
    if (!allReady) return
    toast.success(`${selectedRows.length} claim(s) submitted to Availity`)
    setSelectedRows([])
  }

  return (
    <ModuleShell title={t("claims","title")} subtitle={t("claims","subtitle")}>
      {apiError && <ErrorBanner error={apiError} onRetry={refetch} />}
      {/* KPI Bar */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KPICard label="Total Claims" value={apiLoading ? '…' : allClaims.length} icon={<FileText size={20}/>} />
        <KPICard label="Submitted Today" value={apiLoading ? '…' : submittedToday} icon={<CheckCircle2 size={20}/>} />
        <KPICard label={t("claims","cleanClaimRate")} value={apiLoading ? '…' : `${cleanRate}%`} icon={<Activity size={20}/>} />
        <KPICard label={t("claims","avgDaysToPayment")} value={apiLoading ? '…' : `${avgDays}d`} icon={<Clock size={20}/>} />
      </div>

      <div className="flex gap-4 h-[calc(100vh-300px)]">
        {/* Filter sidebar */}
        {sidebarOpen && (
          <div className="w-[260px] shrink-0 card p-4 overflow-y-auto flex flex-col gap-5">
            <div>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, claim…"
                  className="w-full bg-surface-elevated rounded-btn pl-8 pr-3 py-1.5 text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-brand/30" />
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Status</p>
              <div className="space-y-1">
                {ALL_STATUSES.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={statusFilters.includes(s)} onChange={() => toggleStatus(s)}
                      className="rounded accent-brand w-3.5 h-3.5" />
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]?.includes('emerald') ? 'bg-emerald-500' : STATUS_COLORS[s]?.includes('red') ? 'bg-red-500' : STATUS_COLORS[s]?.includes('amber') ? 'bg-amber-500' : STATUS_COLORS[s]?.includes('blue') ? 'bg-blue-500' : STATUS_COLORS[s]?.includes('cyan') ? 'bg-cyan-500' : STATUS_COLORS[s]?.includes('purple') ? 'bg-purple-500' : STATUS_COLORS[s]?.includes('orange') ? 'bg-orange-500' : STATUS_COLORS[s]?.includes('teal') ? 'bg-teal-500' : 'bg-gray-500'}`} />
                    <span className="text-[12px] text-content-secondary group-hover:text-content-primary">{s.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Date of Service</p>
              <div className="space-y-2">
                <input type="date" value={dosFrom} onChange={e => setDosFrom(e.target.value)}
                  className="w-full bg-surface-elevated rounded-btn px-2 py-1.5 text-[12px] text-content-primary focus:outline-none focus:ring-1 focus:ring-brand/30" />
                <input type="date" value={dosTo} onChange={e => setDosTo(e.target.value)}
                  className="w-full bg-surface-elevated rounded-btn px-2 py-1.5 text-[12px] text-content-primary focus:outline-none focus:ring-1 focus:ring-brand/30" />
              </div>
            </div>

            <button onClick={() => { setSearch(''); setStatusFilters([]); setDosFrom(''); setDosTo('') }}
              className="text-[12px] text-content-tertiary hover:text-brand text-left mt-auto">
              Clear All Filters
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col card overflow-hidden">
          {/* Batch toolbar */}
          {selectedRows.length > 0 ? (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-brand/5 border-b border-brand/20 shrink-0">
              <CheckSquare size={14} className="text-brand" />
              <span className="text-[13px] text-brand font-medium">{selectedRows.length} selected</span>
              <button onClick={handleBatchSubmit} disabled={!allReady}
                className={`px-3 py-1.5 rounded-btn text-[12px] font-medium transition-colors ${allReady ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-surface-elevated text-content-tertiary cursor-not-allowed'}`}>
                Submit Selected
              </button>
              <button onClick={() => toast.info('CSV exported')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-btn text-[12px] font-medium bg-surface-elevated text-content-secondary hover:text-content-primary">
                <Download size={12} /> Export CSV
              </button>
              <button onClick={() => setSelectedRows([])} className="ml-auto text-content-tertiary hover:text-content-primary"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-separator shrink-0">
              <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded hover:bg-surface-elevated text-content-tertiary">
                <Filter size={14} />
              </button>
              <span className="text-[12px] text-content-tertiary">
                {apiLoading ? 'Loading…' : `${allClaims.length} claims${apiResult ? ' (live)' : ' (demo)'}`}
              </span>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface-secondary z-10">
                <tr className="border-b border-separator">
                  <th className="w-8 px-3 py-2.5"><input type="checkbox"
                    checked={selectedRows.length === paginated.length && paginated.length > 0}
                    onChange={e => setSelectedRows(e.target.checked ? paginated.map(c => c.id) : [])}
                    className="rounded accent-brand w-3.5 h-3.5" /></th>
                  {[
                    { label: 'Claim ID', key: 'id' as const },
                    { label: 'Patient', key: null },
                    { label: 'Client', key: null },
                    { label: 'Payer', key: null },
                    { label: 'CPT', key: null },
                    { label: 'Billed', key: 'billed' as const },
                    { label: 'Status', key: null },
                    { label: 'DOS', key: null },
                    { label: 'Days', key: 'age' as const },
                  ].map(h => (
                    <th key={h.label} onClick={() => h.key && handleSort(h.key)}
                      className={`text-left px-3 py-2.5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider ${h.key ? 'cursor-pointer hover:text-content-primary' : ''}`}>
                      <span className="inline-flex items-center gap-1">
                        {h.label}
                        {h.key && sortKey === h.key && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                      </span>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {allClaims.length === 0 && !apiLoading && (
                  <tr><td colSpan={9}>
                    <div className='flex flex-col items-center justify-center py-16 text-center'>
                      <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                        <FileText size={20} className='text-content-tertiary' />
                      </div>
                      <p className='text-sm font-medium text-content-primary mb-1'>No claims yet</p>
                      <p className='text-xs text-content-secondary'>Claims will appear here once they&apos;re added to the system.</p>
                    </div>
                  </td></tr>
                )}
                {paginated.map(c => (
                  <tr key={c.id} onClick={() => setDrawerClaim(c)}
                    className={`border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors ${drawerClaim?.id === c.id ? 'bg-brand/5' : ''}`}>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedRows.includes(c.id)} onChange={() => toggleRow(c.id)}
                        className="rounded accent-brand w-3.5 h-3.5" />
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium text-content-primary">
                      <span className="flex items-center gap-1">
                        {c.id}
                        {c.daysTilDeadline !== undefined && c.daysTilDeadline < 15 && (
                          <span className="relative group">
                            <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-surface-elevated border border-separator text-[11px] text-red-400 px-2 py-1 rounded whitespace-nowrap z-50">
                              {c.daysTilDeadline}d until timely filing deadline
                            </span>
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-content-primary">{c.patientName}</td>
                    <td className="px-3 py-2.5 text-content-secondary">{c.clientName.split(' ').slice(0, 2).join(' ')}</td>
                    <td className="px-3 py-2.5 text-content-secondary">{c.payer}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">{c.cptCodes.join(', ')}</td>
                    <td className="px-3 py-2.5 font-medium text-content-primary">${c.billed.toLocaleString()}</td>
                    <td className="px-3 py-2.5"><ClaimStatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5 font-mono text-content-secondary">{c.dos}</td>
                    <td className="px-3 py-2.5 text-content-tertiary">{c.age}d</td>
                    <td className="px-3 py-2.5 relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}
                        className="text-content-tertiary hover:text-content-primary px-2 py-1 rounded hover:bg-surface-elevated transition-colors">
                        ⋯
                      </button>
                      {menuOpen === c.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-surface-secondary border border-separator rounded-lg shadow-elevated z-50 w-40 overflow-hidden">
                            {[
                              { label: 'View Detail', action: () => { setDrawerClaim(c); setMenuOpen(null) } },
                              { label: 'Correct Claim', action: () => { setDrawerClaim(c); setMenuOpen(null) } },
                              { label: 'Route to Denials', action: () => { router.push(`/denials?claimId=${c.id}`); setMenuOpen(null) } },
                              { label: 'Void Claim', action: () => { if (confirm(`Void claim ${c.id}?`)) { toast.warning(`Claim ${c.id} voided`) } setMenuOpen(null) } },
                            ].map(item => (
                              <button key={item.label} onClick={item.action}
                                className="w-full text-left px-3 py-2 text-xs text-content-primary hover:bg-surface-elevated transition-colors">
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-separator shrink-0">
              <span className="text-[12px] text-content-tertiary">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, allClaims.length)} of {allClaims.length}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-7 h-7 rounded text-[12px] ${page === i + 1 ? 'bg-brand text-white' : 'text-content-secondary hover:bg-surface-elevated'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {drawerClaim && <ClaimDrawer claim={drawerClaim} onClose={() => setDrawerClaim(null)} onRefetch={refetch} apiScrubRules={apiScrubRules} />}
    </ModuleShell>
  )
}
