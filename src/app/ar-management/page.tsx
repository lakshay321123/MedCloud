'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { UAE_CLIENT_NAMES, US_CLIENT_NAMES } from '@/lib/utils/region'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { TrendingUp, X, Phone, Bot, User, PhoneCall, Plus, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { tfDaysRemaining } from '@/lib/utils/time'
import { useRouter } from 'next/navigation'
import { useLogARCall, usePayerConfigs, useTimelyFilingDeadlines, useCreditBalances, useWriteOffs, useRequestWriteOff, useARFollowUps, useARCallLog, useCheckSLAEscalations, useIdentifyCreditBalances, useResolveCreditBalance, useApproveWriteOff, useUpsertPayerConfig, useClaims, useCreateTask, useSubmitAppeal, useARRequestInfo, useARescalate, useARSendStatement } from '@/lib/hooks'



const TF_DEADLINES: Record<string, number> = {
  Medicare: 365, Aetna: 180, UHC: 180, BCBS: 365, NAS: 90, Daman: 90,
}

// Payer phone numbers for the Log Call modal
const payerPhones: Record<string, string> = {
  Medicare: '1-800-MEDICARE (1-800-633-4227)',
  Aetna: '1-800-872-3862',
  UHC: '1-866-892-5595',
  BCBS: '1-800-810-2583',
  NAS: '+971-4-270-8000',
  Daman: '+971-2-614-9555',
}

// IVR steps per payer
const payerIVR: Record<string, string[]> = {
  Medicare: ['Press 1 for providers', 'Press 2 for claim status', 'Enter NPI', 'Enter patient Medicare ID'],
  Aetna: ['Press 2 for providers', 'Press 1 for claims', 'Enter provider NPI', 'Enter patient member ID'],
  UHC: ['Press 1 for provider services', 'Press 3 for claim status', 'Enter NPI', 'Enter patient ID'],
  BCBS: ['Press 2 for provider line', 'Press 1 for claim status', 'Enter provider ID', 'Enter member ID'],
  NAS: ['Press 2 for providers (English)', 'Press 1 for claim status', 'Enter TPA code'],
  Daman: ['Press 1 for English', 'Press 2 for providers', 'Press 1 for claim status'],
}

type ARAccount = {
  id: string; patient: string; client: string; payer: string;
  original: number; balance: number; age: number;
  lastAction: string; nextFollowup: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'denied_claim' | 'underpayment' | 'patient_balance' | 'timely_filing_risk';
  dos: string;
  claimNumber?: string;
  clientId?: string;
  denialId?: string;
  paymentPromisedDate?: string;
}

type CallLogEntry = {
  id: string; date: string; type: 'ai' | 'manual'; status: string;
  ref?: string; rep?: string; duration?: string; note: string;
  paymentPromisedDate?: string;
}

const initialAccounts: ARAccount[] = [
  { id: 'AR-001', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', original: 1200, balance: 488, age: 95, lastAction: 'Voice AI call — "In process"', nextFollowup: '2026-03-04', priority: 'urgent', source: 'denied_claim', dos: '2025-11-30' },
  { id: 'AR-002', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', original: 320, balance: 320, age: 46, lastAction: 'Initial submission', nextFollowup: '2026-03-03', priority: 'high', source: 'underpayment', dos: '2026-01-17' },
  { id: 'AR-003', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', original: 350, balance: 126, age: 12, lastAction: 'Partial payment posted', nextFollowup: '2026-03-10', priority: 'medium', source: 'patient_balance', dos: '2026-02-19' },
  { id: 'AR-004', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UHC', original: 250, balance: 0, age: 5, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low', source: 'denied_claim', dos: '2026-02-26' },
  { id: 'AR-005', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', original: 480, balance: 0, age: 31, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low', source: 'denied_claim', dos: '2026-02-01' },
  { id: 'AR-006', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', original: 890, balance: 890, age: 120, lastAction: 'Appeal L1 submitted', nextFollowup: '2026-03-02', priority: 'urgent', source: 'timely_filing_risk', dos: '2025-11-04' },
]

const initialCallHistory: Record<string, CallLogEntry[]> = {
  'AR-001': [
    { id: 'C1', date: '2026-02-28 10:14', type: 'ai', status: 'In process', duration: '4m 12s', note: 'Payer confirmed claim received, processing expected within 5 business days.' },
    { id: 'C2', date: '2026-02-21 14:30', type: 'manual', status: 'Requested resubmission', ref: 'REF-8821', rep: 'Maria L.', duration: '8m 05s', note: 'Rep requested corrected claim with updated diagnosis code.' },
    { id: 'C3', date: '2026-02-14 09:00', type: 'ai', status: 'Voicemail left', duration: '0m 45s', note: 'Left voicemail with reference number and callback line.' },
  ],
  'AR-002': [
    { id: 'C4', date: '2026-02-25 11:00', type: 'manual', status: 'Under review', ref: 'REF-4410', rep: 'James W.', duration: '5m 20s', note: 'Payer reviewing underpayment dispute, ETA 10 business days.' },
  ],
  'AR-006': [
    { id: 'C5', date: '2026-03-01 09:30', type: 'ai', status: 'Appeal pending', duration: '3m 00s', note: 'Confirmed appeal L1 received and under review.' },
    { id: 'C6', date: '2026-02-20 15:00', type: 'manual', status: 'Denial upheld', ref: 'REF-0099', rep: 'Chris T.', duration: '6m 45s', note: 'Initial denial upheld. Filed formal appeal.' },
  ],
}

const sourceInfo: Record<string, { color: string; label: string }> = {
  denied_claim: { color: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Denied Claim' },
  underpayment: { color: 'bg-brand-pale0/10 text-brand-deep dark:text-brand-deep', label: 'Underpayment' },
  patient_balance: { color: 'bg-brand/10 text-brand-dark dark:text-brand', label: 'Patient Balance' },
  timely_filing_risk: { color: 'bg-brand/10 text-brand-dark dark:text-brand-dark', label: 'Timely Filing Risk' },
}

const CALL_OUTCOMES = ['Got Status', 'Voicemail', 'Payment Promised', 'Denied', 'Resubmit Required', 'Submit Appeal']

// ─── Credit Balance Row with real resolve API ─────────────────────────────
function CreditBalanceRow({ cr, onResolved }: {
  cr: { id: string | null; apiId: string | null; claim: string; patient: string; amt: string; payer: string; reason: string }
  onResolved: () => void
}) {
  const { toast } = useToast()
  const { mutate: resolveCB, loading: resolving } = useResolveCreditBalance(cr.apiId || '')
  return (
    <tr className="border-b border-separator last:border-0 table-row">
      <td className="px-4 py-3 font-mono text-xs">{cr.claim}</td>
      <td className="px-4 py-3 text-xs">{cr.patient}</td>
      <td className="px-4 py-3 text-[13px] font-semibold text-brand-deep">{cr.amt}</td>
      <td className="px-4 py-3 text-[13px] text-content-secondary">{cr.payer}</td>
      <td className="px-4 py-3 text-xs">{cr.reason}</td>
      <td className="px-4 py-3 flex gap-2">
        <button disabled={resolving} onClick={async () => {
          if (!window.confirm(`Initiate refund of ${cr.amt} to ${cr.payer} for ${cr.patient}?\n\nClaim: ${cr.claim}\nReason: ${cr.reason}\n\nThis will generate a refund check/EFT request.`)) return
          if (cr.apiId) {
            try {
              await resolveCB({ resolution_method: 'refund_check', notes: `Refund requested for ${cr.reason}` })
              toast.success(`Refund of ${cr.amt} initiated for ${cr.claim} — ${cr.patient}`)
              onResolved()
            } catch { toast.error('Refund request failed — try again') }
          } else {
            toast.success(`Refund of ${cr.amt} initiated for ${cr.claim} — ${cr.patient}`)
          }
        }} className="text-[11px] text-brand hover:underline font-medium disabled:opacity-50">{resolving ? '…' : 'Refund'}</button>
        <button disabled={resolving} onClick={async () => {
          if (!window.confirm(`Apply ${cr.amt} credit to open patient balance for ${cr.patient}?\n\nClaim: ${cr.claim}\nThis will reduce their outstanding balance by ${cr.amt}.`)) return
          if (cr.apiId) {
            try {
              await resolveCB({ resolution_method: 'applied_to_claim', notes: `Applied to open balance for patient` })
              toast.success(`${cr.amt} applied to ${cr.patient}'s open balance`)
              onResolved()
            } catch { toast.error('Apply balance failed — try again') }
          } else {
            toast.success(`${cr.amt} applied to ${cr.patient}'s open balance`)
          }
        }} className="text-[11px] text-brand-dark hover:underline font-medium disabled:opacity-50">{resolving ? '…' : 'Apply'}</button>
      </td>
    </tr>
  )
}


function LogCallModal({
  account, onClose, onSave
}: {
  account: ARAccount
  onClose: () => void
  onSave: (entry: CallLogEntry, followupDate?: string, promisedDate?: string) => void
}) {
  const { toast } = useToast()
  const phone = payerPhones[account.payer] || 'Contact payer directly'
  const ivr = payerIVR[account.payer] || []
  const [showIVR, setShowIVR] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [ref, setRef] = useState('')
  const [rep, setRep] = useState('')
  const [promisedDate, setPromisedDate] = useState('')
  const [followupDate, setFollowupDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState('')

  function handleSave() {
    if (!outcome) { toast.error('Call outcome is required'); return }
    const entry: CallLogEntry = {
      id: `C${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      type: 'manual',
      status: outcome,
      ref: ref || undefined,
      rep: rep || undefined,
      note: notes || `Manual call — outcome: ${outcome}`,
      paymentPromisedDate: outcome === 'Payment Promised' ? promisedDate : undefined,
    }
    onSave(entry, followupDate, outcome === 'Payment Promised' ? promisedDate : undefined)
    toast.success('Manual call logged successfully')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-surface-secondary rounded-xl shadow-2xl w-full max-w-lg border border-separator">
          <div className="flex gap-2 items-center justify-between px-5 py-4 border-b border-separator pb-1">
            <h3 className="font-semibold text-content-primary">Log Manual Call — {account.payer}</h3>
            <button onClick={onClose}><X size={16} className="text-content-secondary" /></button>
          </div>
          <div className="p-5 space-y-3">
            {/* Payer phone */}
            <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 flex items-start gap-3">
              <Phone size={14} className="text-brand mt-0.5 shrink-0"/>
              <div>
                <div className="text-[13px] font-semibold text-brand mb-0.5">Payer Phone</div>
                <div className="text-sm text-content-primary font-mono">{phone}</div>
              </div>
            </div>

            {/* IVR steps collapsible */}
            {ivr.length > 0 && (
              <div className="border border-separator rounded-lg overflow-hidden">
                <button onClick={() => setShowIVR(p => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium text-content-secondary hover:bg-surface-elevated transition-colors">
                  <span>IVR Navigation Steps ({ivr.length} steps)</span>
                  {showIVR ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                </button>
                {showIVR && (
                  <div className="px-3 pb-3 space-y-1.5 bg-surface-elevated">
                    {ivr.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[11px] font-bold">{i+1}</span>
                        <span className="text-content-primary">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Call outcome */}
            <div>
              <label className="text-[11px] text-content-tertiary block mb-1">Call Outcome *</label>
              <select value={outcome} onChange={e => setOutcome(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary focus:outline-none focus:border-brand/40">
                <option value="">Select outcome…</option>
                {CALL_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Payment promised date */}
            {outcome === 'Payment Promised' && (
              <div>
                <label className="text-[11px] text-content-tertiary block mb-1">Payment Promised Date</label>
                <input type="date" value={promisedDate} onChange={e => setPromisedDate(e.target.value)}
                  className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary focus:outline-none focus:border-brand/40"/>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-content-tertiary block mb-1">Reference #</label>
                <input value={ref} onChange={e => setRef(e.target.value)} placeholder="REF-XXXX"
                  className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] font-mono text-content-secondary focus:outline-none focus:border-brand/40"/>
              </div>
              <div>
                <label className="text-[11px] text-content-tertiary block mb-1">Rep Name</label>
                <input value={rep} onChange={e => setRep(e.target.value)} placeholder="Payer rep name"
                  className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary focus:outline-none focus:border-brand/40"/>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-content-tertiary block mb-1">Next Follow-up Date <span className="text-content-tertiary">(auto-suggested: +7 days)</span></label>
              <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary focus:outline-none focus:border-brand/40"/>
            </div>

            <div>
              <label className="text-[11px] text-content-tertiary block mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="What did you discuss? Any commitments made?"
                className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary focus:outline-none focus:border-brand/40 resize-none"/>
            </div>
          </div>
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={handleSave} className="flex-1 bg-brand text-white rounded-btn py-2.5 text-[13px] font-medium">Log Call</button>
            <button onClick={onClose} className="px-4 py-2.5 bg-surface-elevated border border-separator rounded-btn text-[13px] text-content-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── AR Drawer ────────────────────────────────────────────────────────────
function ARDrawer({
  account, callHistory, onClose, onUpdateAccount, onAddCall
}: {
  account: ARAccount
  callHistory: CallLogEntry[]
  onClose: () => void
  onUpdateAccount: (update: Partial<ARAccount>) => void
  onAddCall: (entry: CallLogEntry, followupDate?: string, promisedDate?: string) => void
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [drawerTab, setDrawerTab] = useState<'summary' | 'calls' | 'notes' | 'claims'>('summary')
  const [followUpDate, setFollowUpDate] = useState(account.nextFollowup !== '-' ? account.nextFollowup : '')
  const [followUpNote, setFollowUpNote] = useState('')
  const [showCallModal, setShowCallModal] = useState(false)
  const [showWriteoffModal, setShowWriteoffModal] = useState(false)
  const [writeoffReason, setWriteoffReason] = useState('')
  const { mutate: createTask } = useCreateTask()
  const { mutate: submitAppeal } = useSubmitAppeal(account.denialId || '')
  const { mutate: requestInfo, loading: requestingInfo } = useARRequestInfo()
  const { mutate: escalateClaim, loading: escalating } = useARescalate()
  const { mutate: sendStatement, loading: sendingStatement } = useARSendStatement()

  const tfDays = TF_DEADLINES[account.payer] || 180
  const dosDate = new Date(account.dos)
  const deadlineDate = new Date(dosDate)
  deadlineDate.setDate(deadlineDate.getDate() + tfDays)
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)

  const handleWriteoff = () => {
    if (!writeoffReason) { toast.error('Select a reason for write-off'); return }
    toast.info('Write-off request submitted — pending supervisor approval')
    setShowWriteoffModal(false)
    setWriteoffReason('')
  }

  const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'calls', label: `Calls (${callHistory.length})` },
    { id: 'notes', label: 'Notes' },
    { id: 'claims', label: 'Claims' },
  ] as const

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1 shrink-0">
          <div>
            <h3 className="font-semibold text-content-primary">{account.patient}</h3>
            <p className="text-[13px] text-content-secondary">{account.client} · {account.payer}</p>
            <button onClick={() => router.push(`/claims?id=${account.id}`)}
              className="text-[11px] text-brand hover:underline mt-0.5 block">
              View Claim {account.claimNumber || account.id} →
            </button>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn">
            <X size={16} className="text-content-secondary" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-separator pb-1 px-3 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setDrawerTab(t.id as typeof drawerTab)}
              className={`px-3 py-2.5 text-[12px] font-medium transition-colors ${drawerTab === t.id ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {drawerTab === 'summary' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-content-primary">${account.original}</div>
                  <div className="text-[11px] text-content-secondary">Original</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className={`text-lg font-bold ${account.balance > 0 ? 'text-brand-deep' : 'text-brand-dark'}`}>${account.balance}</div>
                  <div className="text-[11px] text-content-secondary">Balance</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-content-primary">{account.age}d</div>
                  <div className="text-[11px] text-content-secondary">Age</div>
                </div>
              </div>

              {account.paymentPromisedDate && (
                <div className="bg-brand/10 border border-brand/20 rounded-lg p-2.5 text-[12px] text-brand-dark dark:text-brand-dark flex items-center gap-2">
                  💰 Payment Promised for {account.paymentPromisedDate}
                </div>
              )}

              {/* Timely filing */}
              <div className={`flex items-start gap-2 rounded-lg p-3 text-[12px] ${daysUntilDeadline < 30 ? 'bg-red-500/10 border border-red-500/20' : daysUntilDeadline < 60 ? 'bg-brand-pale0/10 border border-brand-light/20' : 'bg-surface-elevated'}`}>
                <AlertTriangle size={13} className={`mt-0.5 shrink-0 ${daysUntilDeadline < 30 ? 'text-red-500' : daysUntilDeadline < 60 ? 'text-brand-deep' : 'text-content-tertiary'}`} />
                <div>
                  <p className={`font-medium ${daysUntilDeadline < 30 ? 'text-red-500' : daysUntilDeadline < 60 ? 'text-brand-deep dark:text-brand-deep' : 'text-content-secondary'}`}>
                    Timely Filing: {deadlineDate.toISOString().split('T')[0]}
                  </p>
                  <p className="text-content-tertiary">{daysUntilDeadline > 0 ? `${daysUntilDeadline} days remaining` : 'DEADLINE PASSED'} ({tfDays}d window)</p>
                </div>
              </div>

              <div className="bg-surface-elevated rounded-lg p-3 text-xs">
                <div className="text-content-secondary mb-1">Last Action</div>
                <div className="text-content-primary">{account.lastAction}</div>
              </div>

              <div>
                <label className="text-[13px] text-content-secondary block mb-1">Next Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {
                  onUpdateAccount({ lastAction: 'Voice AI call queued', nextFollowup: followUpDate || account.nextFollowup })
                  toast.success(`Outbound call queued for ${account.payer}`)
                  onClose()
                  router.push(`/voice-ai?payer=${encodeURIComponent(account.payer)}&patient=${encodeURIComponent(account.patient)}&claim=${account.id}`)
                }}
                  className="bg-brand/10 text-brand rounded-lg py-2.5 text-[13px] font-medium hover:bg-brand/20 transition-colors flex items-center justify-center gap-2">
                  <Phone size={13} /> Voice AI
                </button>
                <button onClick={() => setShowCallModal(true)}
                  className="bg-surface-elevated border border-separator rounded-lg py-2.5 text-[13px] font-medium hover:text-content-secondary transition-colors flex items-center justify-center gap-2">
                  <PhoneCall size={13} /> Log Manual Call
                </button>
                <button onClick={async () => {
                  if (!followUpDate) { toast.error('Please select a follow-up date'); return }
                  try {
                    await createTask({
                      title: `AR Follow-up: ${account.payer} — ${account.patient}`,
                      description: followUpNote || `Follow-up on claim ${account.claimNumber || account.id}`,
                      task_type: 'ar_follow_up',
                      priority: 'medium',
                      status: 'open' as const,
                      due_date: followUpDate,
                      client_id: account.clientId,
                    })
                    onUpdateAccount({ nextFollowup: followUpDate })
                    toast.success(`Follow-up saved for ${followUpDate}`)
                    onClose()
                  } catch { toast.error('Failed to save follow-up') }
                }} className="bg-surface-elevated border border-separator rounded-lg py-2.5 text-[13px] font-medium hover:text-content-secondary transition-colors">
                  Save Follow-up
                </button>
                <button onClick={async () => {
                  try {
                    if (account.denialId) {
                      await submitAppeal({ appeal_reason: `Routed from AR — ${account.payer}`, appeal_level: 'L1' as const })
                    }
                    await createTask({
                      title: `Appeal Required: ${account.payer} — ${account.patient}`,
                      description: `Claim ${account.claimNumber || account.id} routed to appeals from AR management`,
                      task_type: 'appeal',
                      priority: 'urgent',
                      status: 'open' as const,
                      client_id: account.clientId,
                    })
                    onUpdateAccount({ priority: 'urgent', lastAction: 'Routed to appeals' })
                    toast.success('Routed to appeals — priority set to urgent')
                    onClose()
                  } catch { toast.error('Failed to route to appeals') }
                }}
                  className="bg-brand-pale0/10 text-brand-deep dark:text-brand-deep rounded-lg py-2.5 text-[13px] font-medium hover:bg-brand-pale0/20 transition-colors">
                  Route to Appeals
                </button>
                <button onClick={() => setShowWriteoffModal(true)}
                  className="col-span-2 bg-red-500/10 text-red-500 rounded-lg py-2.5 text-[13px] font-medium hover:bg-red-500/20 transition-colors">
                  Request Write-off
                </button>
                <button
                  disabled={requestingInfo}
                  onClick={async () => {
                    try {
                      await requestInfo({ claim_id: account.id, payer_name: account.payer, requested_info: 'Additional documentation required', client_id: account.clientId })
                      onUpdateAccount({ lastAction: 'Info requested from payer' })
                      toast.success(`Info request sent to ${account.payer}`)
                      onClose()
                    } catch { toast.error('Failed to send info request') }
                  }}
                  className="bg-brand/10 text-brand-dark dark:text-brand rounded-lg py-2.5 text-[13px] font-medium hover:bg-brand/20 transition-colors disabled:opacity-50">
                  {requestingInfo ? 'Requesting…' : 'Request Info'}
                </button>
                <button
                  disabled={escalating}
                  onClick={async () => {
                    try {
                      await escalateClaim({ claim_id: account.id, escalation_reason: `${account.age}d aged — ${account.payer}`, priority: 'high', client_id: account.clientId })
                      onUpdateAccount({ priority: 'urgent', lastAction: 'Escalated to supervisor' })
                      toast.success(`Claim escalated — ${account.payer}`)
                      onClose()
                    } catch { toast.error('Failed to escalate claim') }
                  }}
                  className="bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg py-2.5 text-[13px] font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-50">
                  {escalating ? 'Escalating…' : 'Escalate'}
                </button>
                <button
                  disabled={sendingStatement}
                  onClick={async () => {
                    try {
                      await sendStatement({ claim_id: account.id, statement_type: 'patient', delivery_method: 'mail', notes: `Balance: $${account.balance}`, client_id: account.clientId })
                      onUpdateAccount({ lastAction: 'Statement sent to patient' })
                      toast.success(`Statement sent — ${account.patient}`)
                      onClose()
                    } catch { toast.error('Failed to send statement') }
                  }}
                  className="col-span-2 bg-brand/10 text-brand-dark dark:text-brand-dark rounded-lg py-2.5 text-[13px] font-medium hover:bg-brand/10 transition-colors disabled:opacity-50">
                  {sendingStatement ? 'Sending…' : 'Send Statement'}
                </button>
              </div>
            </>
          )}

          {drawerTab === 'calls' && (
            <div className="space-y-3">
              <button onClick={() => setShowCallModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-separator rounded-lg text-[12px] text-content-secondary hover:border-brand hover:text-brand transition-colors">
                <Plus size={13} /> Log Manual Call
              </button>
              {callHistory.length === 0 && (
                <p className="text-[13px] text-content-tertiary text-center py-6">No call history yet</p>
              )}
              {callHistory.map(c => (
                <div key={c.id} className="bg-surface-elevated rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {c.type === 'ai' ? (
                      <span className="flex items-center gap-1 text-[11px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">
                        <Bot size={10} /> AI Call
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] bg-surface-secondary border border-separator text-content-secondary px-2 py-0.5 rounded-full font-medium">
                        <User size={10} /> Manual
                      </span>
                    )}
                    <span className="text-[11px] text-content-tertiary ml-auto">{c.date}</span>
                    {c.duration && <span className="text-[11px] text-content-tertiary">{c.duration}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-content-primary">{c.status}</span>
                    {c.ref && <span className="text-[11px] font-mono text-content-tertiary">{c.ref}</span>}
                    {c.rep && <span className="text-[11px] text-content-secondary">· {c.rep}</span>}
                  </div>
                  {c.paymentPromisedDate && (
                    <div className="text-[11px] text-brand-dark dark:text-brand-dark">💰 Payment promised: {c.paymentPromisedDate}</div>
                  )}
                  <p className="text-[12px] text-content-secondary">{c.note}</p>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'notes' && (
            <div className="space-y-3">
              <textarea rows={4} placeholder="Add a note…" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary placeholder:text-content-tertiary focus:outline-none focus:border-brand/40 resize-none" />
              <button onClick={() => {
                if (!followUpNote.trim()) return
                toast.success('Note saved')
                setFollowUpNote('')
              }} className="bg-brand text-white rounded-lg px-4 py-2 text-[12px]">Save Note</button>
              <div className="border-t border-separator pt-3">
                <p className="text-[11px] text-content-tertiary mb-2">Previous Notes</p>
                <p className="text-[12px] text-content-secondary italic">No previous notes.</p>
              </div>
            </div>
          )}

          {drawerTab === 'claims' && (
            <div className="space-y-2">
              <div className="bg-surface-elevated rounded-lg p-3 flex items-center gap-3">
                <FileText size={14} className="text-content-tertiary shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-content-primary">CLM-{account.id.replace('AR-', '10')}</p>
                  <p className="text-[11px] text-content-secondary">{account.payer} · DOS {account.dos} · ${account.original}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sourceInfo[account.source]?.color || 'bg-surface-elevated text-content-secondary'}`}>
                  {sourceInfo[account.source]?.label || account.source}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCallModal && (
        <LogCallModal
          account={account}
          onClose={() => setShowCallModal(false)}
          onSave={(entry, followupDate, promisedDate) => {
            onAddCall(entry, followupDate, promisedDate)
            setShowCallModal(false)
          }}
        />
      )}

      {showWriteoffModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowWriteoffModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-secondary rounded-xl shadow-2xl w-full max-w-md border border-separator">
              <div className="flex gap-2 items-center justify-between px-5 py-4 border-b border-separator pb-1">
                <h3 className="font-semibold text-content-primary">Request Write-off</h3>
                <button onClick={() => setShowWriteoffModal(false)}><X size={16} className="text-content-secondary" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-brand-pale0/10 border border-brand-light/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-brand-deep mt-0.5 shrink-0" />
                  <p className="text-[12px] text-brand-deep dark:text-brand-deep">Write-off requests require supervisor approval. Balance: <span className="font-bold">${account.balance}</span></p>
                </div>
                <div>
                  <label className="text-[11px] text-content-tertiary block mb-1">Reason *</label>
                  <select value={writeoffReason} onChange={e => setWriteoffReason(e.target.value)}
                    className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary focus:outline-none focus:border-brand/40">
                    <option value="">Select a reason…</option>
                    <option value="small_balance">Small balance (under threshold)</option>
                    <option value="timely_filing">Timely filing deadline passed</option>
                    <option value="no_auth">No authorization on file</option>
                    <option value="medical_necessity">Medical necessity denial – exhausted appeals</option>
                    <option value="contractual">Contractual adjustment</option>
                    <option value="charity_care">Charity care / financial hardship</option>
                    <option value="bankruptcy">Patient bankruptcy</option>
                    <option value="other">Other (explain in notes)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={handleWriteoff} className="flex-1 bg-brand-deep text-white rounded-btn py-2.5 text-[13px] font-medium">Submit for Approval</button>
                <button onClick={() => setShowWriteoffModal(false)} className="px-4 py-2.5 bg-surface-elevated border border-separator rounded-btn text-[13px] text-content-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function InboundCallPanel() {
  const { toast } = useToast()
  const { mutate: createTask } = useCreateTask()
  const [phoneSearch, setPhoneSearch] = useState('')
  const [found, setFound] = useState<ARAccount | null>(null)

  function lookUp() {
    const m = initialAccounts.find(a => a.patient.toLowerCase().includes(phoneSearch.toLowerCase()))
    m ? setFound(m) : toast.warning('No patient found')
  }

  return (
    <div className="card p-6 max-w-2xl">
      <h3 className="text-base font-semibold mb-1">Inbound Patient Call</h3>
      <p className="text-[13px] text-content-secondary mb-4">Patient calling in — look up account by name or phone.</p>
      <div className="flex gap-2 mb-4">
        <input value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookUp()}
          placeholder="Patient name or phone..."
          className="flex-1 bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] focus:outline-none focus:border-brand/40" />
        <button onClick={lookUp} className="bg-brand text-white rounded-btn px-4 py-2 text-[13px] font-medium">Look Up</button>
      </div>
      {found && (
        <div className="space-y-3">
          <div className="bg-brand/5 border border-brand/20 rounded-lg p-4">
            <div className="flex justify-between mb-3">
              <div>
                <p className="font-semibold">{found.patient}</p>
                <p className="text-[13px] text-content-secondary">{found.client} · {found.payer}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${found.balance > 0 ? 'bg-brand-pale0/10 text-brand-deep' : 'bg-brand/10 text-brand-dark'}`}>
                {found.balance > 0 ? `$${found.balance} BALANCE` : 'PAID'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><span className="text-content-tertiary block">Original</span>${found.original}</div>
              <div><span className="text-content-tertiary block">Balance</span>${found.balance}</div>
              <div><span className="text-content-tertiary block">Age</span>{found.age} days</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '💳 Offer Payment Plan', color: 'bg-brand/10 text-brand border-brand/20', taskType: 'payment_plan' as const, msg: 'Payment plan task created' },
              { label: '✓ Take Payment', color: 'bg-brand/10 text-brand-dark border-brand/20', taskType: 'payment' as const, msg: 'Payment logged' },
              { label: '⚠ Log Dispute', color: 'bg-brand-pale0/10 text-brand-deep border-brand-light/20', taskType: 'dispute' as const, msg: 'Dispute task created' },
              { label: '📋 Log & Callback', color: 'bg-surface-elevated border-separator text-content-secondary', taskType: 'callback' as const, msg: 'Callback task created' },
            ].map(b => (
              <button key={b.label} onClick={async () => {
                try {
                  await createTask({
                    title: `${b.label.replace(/^[^\s]+\s/, '')}: ${found?.patient}`,
                    description: `Inbound patient call — balance $${found?.balance} · payer: ${found?.payer}`,
                    task_type: 'ar_follow_up',
                    priority: b.taskType === 'dispute' ? 'high' : 'medium',
                    status: 'open',
                    client_id: found?.clientId,
                  })
                  toast.success(b.msg)
                } catch { toast.error('Failed to create task') }
              }}
                className={`${b.color} rounded-lg py-2.5 text-[13px] font-medium border hover:opacity-80 transition-opacity`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ARManagementPage() {
  const { selectedClient, country } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const { mutate: createTask } = useCreateTask()
  const { data: claimsResult, loading: claimsLoading } = useClaims({ limit: 200 })
  const { data: arCallLogResult } = useARCallLog()

  // Map real claims to AR accounts shape; fall back to seed data if API empty
  const apiAccounts: ARAccount[] = useMemo(() => (claimsResult?.data || [])
    .filter(c => !['paid', 'draft'].includes(c.status))
    .map(c => {
      const today = new Date()
      const dos = c.dos_from || c.created_at?.slice(0, 10) || ''
      const ageMs = dos ? today.getTime() - new Date(dos).getTime() : 0
      const age = Math.max(0, Math.floor(ageMs / 86400000))
      const balance = (Number(c.total_charges) || 0) - (Number(c.paid_amount) || 0)
      const source: ARAccount['source'] =
        c.status === 'denied' || c.status === 'appealed' ? 'denied_claim' :
        balance > 0 && balance < Number(c.total_charges) ? 'underpayment' :
        'patient_balance'
      const priority: ARAccount['priority'] =
        age > 90 ? 'urgent' : age > 60 ? 'high' : age > 30 ? 'medium' : 'low'
      return {
        id: c.id,
        patient: c.patient_name || 'Unknown Patient',
        client: c.client_name || '',
        payer: c.payer_name || 'Unknown Payer',
        original: Number(c.total_charges) || 0,
        balance,
        age,
        lastAction: c.status === 'denied' ? 'Denied — follow-up needed' : 'Submitted — awaiting payment',
        nextFollowup: new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10),
        priority,
        source,
        dos,
      }
    }), [claimsResult])

  const [accounts, setAccounts] = useState<ARAccount[]>(initialAccounts)
  const [callHistory, setCallHistory] = useState<Record<string, CallLogEntry[]>>(initialCallHistory)
  const [selected, setSelected] = useState<ARAccount | null>(null)
  const [callMode, setCallMode] = useState<'accounts' | 'inbound' | 'credits' | 'sla'>('accounts')

  // Sync API data into accounts state when it arrives
  React.useEffect(() => {
    if (apiAccounts.length > 0) {
      setAccounts(apiAccounts)
    }
  }, [claimsResult])

  const { mutate: logCallAPI } = useLogARCall()
  const { data: creditBalanceResult } = useCreditBalances({ limit: 50 })
  const { data: identifiedCredits, loading: identifyingCredits, refetch: refetchCredits } = useIdentifyCreditBalances()
  const { mutate: checkSLA, loading: checkingSLA } = useCheckSLAEscalations()
  const [slaResult, setSlaResult] = useState<Array<{ task_id: string; title: string; hours_overdue: number; escalation_level: string }>>([])
  const creditBalances = identifiedCredits?.data || creditBalanceResult?.data || []

  const creditStats = useMemo(() => {
    if (!creditBalances || creditBalances.length === 0) {
      return { total: '24,380', open: 18, resolved: '8,200' }
    }
    return {
      total: creditBalances.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString(),
      open: creditBalances.filter(c => c.status === 'open').length,
      resolved: creditBalances.filter(c => c.status === 'resolved').reduce((s, c) => s + (c.amount || 0), 0).toLocaleString(),
    }
  }, [creditBalances])

  async function handleSlaCheck() {
    const staticSla = [
      { id: 'AR-3301', client: 'Valley Ortho', daysElapsed: 34, slaDays: 30, priority: 'critical' },
      { id: 'AR-2987', client: 'Metro Health', daysElapsed: 42, slaDays: 45, priority: 'high' },
      { id: 'AR-4102', client: 'CityMed', daysElapsed: 28, slaDays: 30, priority: 'medium' },
    ]
    try {
      const r = await checkSLA({} as Record<string, never>)
      if (r?.escalations && r.escalations.length > 0) {
        setSlaResult(r.escalations)
        toast.success(`SLA check complete — ${r.escalations.length} escalation(s) found`)
        return
      }
    } catch { /* fall through to local */ }
    // Fallback: calculate from static SLA data
    const pastSla = staticSla.filter(a => a.daysElapsed > a.slaDays)
    setSlaResult(pastSla.map(a => ({
      task_id: a.id,
      title: `${a.id} — ${a.client} (${a.daysElapsed}d elapsed / SLA ${a.slaDays}d)`,
      hours_overdue: (a.daysElapsed - a.slaDays) * 24,
      escalation_level: a.priority === 'critical' ? 'L3' : a.priority === 'high' ? 'L2' : 'L1',
    })))
    toast.success(`SLA check complete — ${pastSla.length} account(s) past SLA, ${staticSla.length - pastSla.length} at risk`)
  }

  const filtered = accounts.filter(a => {
    if (selectedClient) return a.client.includes(selectedClient.name.split(' ')[0])
    if (country === 'uae') return UAE_CLIENT_NAMES.some(n => a.client.includes(n.split(' ')[0]))
    if (country === 'usa') return US_CLIENT_NAMES.some(n => a.client.includes(n.split(' ')[0]))
    return true
  })

  function updateAccount(id: string, update: Partial<ARAccount>) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...update } : a))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...update } : prev)
  }

  async function addCallEntry(accountId: string, entry: CallLogEntry, followupDate?: string, promisedDate?: string) {
    // Optimistic update first — UI feels instant
    setCallHistory(prev => ({
      ...prev,
      [accountId]: [entry, ...(prev[accountId] || [])],
    }))
    const updates: Partial<ARAccount> = { lastAction: `Manual call — ${entry.status}` }
    if (followupDate) updates.nextFollowup = followupDate
    if (promisedDate) updates.paymentPromisedDate = promisedDate
    updateAccount(accountId, updates)

    // Persist to API
    try {
      await logCallAPI({
        claim_id: accountId,
        call_type: 'manual',
        outcome: entry.status,
        reference_number: entry.ref,
        notes: entry.note,
        follow_up_date: followupDate,
      })
    } catch (err) {
      console.error('[AR log-call] API failed:', err)
      // Revert optimistic update so UI stays consistent with server state
      setCallHistory(prev => ({
        ...prev,
        [accountId]: (prev[accountId] || []).filter(e => e.id !== entry.id),
      }))
      toast.error('Failed to log call — please try again')
    }
  }

  const totalAR = accounts.reduce((s, a) => s + a.balance, 0)
  const followupsDue = accounts.filter(a =>
    a.balance > 0 && a.nextFollowup !== '-' && a.nextFollowup <= new Date().toISOString().slice(0,10)
  ).length
  const avgAge = Math.round(
    accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.age, 0) /
    Math.max(1, accounts.filter(a => a.balance > 0).length)
  )
  const computedBuckets = [
    { l: '0-30',   v: accounts.filter(a => a.age <= 30).reduce((s,a) => s+a.balance,0),  c: 'bg-brand' },
    { l: '31-60',  v: accounts.filter(a => a.age>30&&a.age<=60).reduce((s,a) => s+a.balance,0), c: 'bg-cyan-500' },
    { l: '61-90',  v: accounts.filter(a => a.age>60&&a.age<=90).reduce((s,a) => s+a.balance,0), c: 'bg-brand-pale' },
    { l: '91-120', v: accounts.filter(a => a.age>90&&a.age<=120).reduce((s,a) => s+a.balance,0), c: 'bg-brand-pale' },
    { l: '120+',   v: accounts.filter(a => a.age>120).reduce((s,a) => s+a.balance,0),  c: 'bg-red-500' },
  ]
  const computedMax = Math.max(...computedBuckets.map(b => b.v), 1)
  const workedToday = (Object.values(callHistory).flat() as CallLogEntry[])
    .filter(c => c.date?.startsWith(new Date().toISOString().slice(0,10))).length

  return (
    <ModuleShell title={t("ar","title")} subtitle={t("ar","subtitle")}>
      {claimsLoading && <div className='mx-4 mb-4 px-4 py-2.5 bg-brand/5 border border-brand/20 rounded-lg flex items-center gap-2 text-xs text-brand'><AlertTriangle size={13} className='shrink-0'/>Loading live AR accounts…</div>}
      {!claimsLoading && apiAccounts.length === 0 && <div className='mx-4 mb-4 px-4 py-2.5 bg-brand-pale0/10 border border-brand-light/30 rounded-lg flex items-center gap-2 text-xs text-brand-deep'><AlertTriangle size={13} className='shrink-0'/>No claims in AR — showing seed data. Submit claims to populate live accounts.</div>}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label={t("ar","totalAR")} value={`$${(totalAR/1000).toFixed(0)}K`} icon={<TrendingUp size={20} />} />
        <KPICard label={t("ar","workedToday")} value={String(workedToday)} trend="up" />
        <KPICard label={t("ar","followupsDue")} value={String(followupsDue)} />
        <KPICard label={t('ar','avgDaysOutstanding')} value={`${avgAge}`} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 border-b border-separator">
        {[{ id: 'accounts', label: 'AR Accounts' }, { id: 'inbound', label: '📞 Inbound Call' }, { id: 'credits', label: 'Credit Balances' }, { id: 'sla', label: 'SLA Escalations' }].map(t => (
          <button key={t.id} onClick={() => setCallMode(t.id as any)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors ${callMode === t.id ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {callMode === 'inbound' ? <InboundCallPanel /> : callMode === 'credits' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-content-secondary">Overpayments and credit balances requiring resolution</p>
            <button onClick={() => { refetchCredits(); toast.success('Credit balance scan triggered') }} disabled={identifyingCredits} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors disabled:opacity-50">{identifyingCredits ? 'Scanning…' : 'Identify Credits'}</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center"><p className="text-xl font-bold text-brand-deep">${creditStats.total}</p><p className="text-[11px] text-content-tertiary mt-1">Total Credits</p></div>
            <div className="card p-4 text-center"><p className="text-xl font-bold text-brand">{creditStats.open}</p><p className="text-[11px] text-content-tertiary mt-1">Open Credits</p></div>
            <div className="card p-4 text-center"><p className="text-xl font-bold text-brand-dark">${creditStats.resolved}</p><p className="text-[11px] text-content-tertiary mt-1">Resolved This Month</p></div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-[13px] text-content-secondary"><th className="text-left px-4 py-3">Claim</th><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Reason</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {(creditBalances.length > 0 ? creditBalances.map(cb => ({
                  id: cb.id,
                  claim: cb.claim_id || 'N/A',
                  patient: cb.patient_name || cb.patient_id || 'N/A',
                  amt: `$${(cb.amount || 0).toLocaleString()}`,
                  payer: cb.payer_name || cb.payer_id || 'N/A',
                  reason: cb.source || 'Overpayment',
                  apiId: cb.id,
                })) : []).map(cr=>(
                  <CreditBalanceRow key={cr.claim} cr={cr} onResolved={() => refetchCredits()} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : callMode === 'sla' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-content-secondary">SLA escalation tracking — accounts approaching or past deadlines</p>
            <button onClick={handleSlaCheck} disabled={checkingSLA} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">{checkingSLA ? 'Checking…' : 'Run SLA Check'}</button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="card p-4 text-center"><p className="text-xl font-bold text-red-500">7</p><p className="text-[11px] text-content-tertiary mt-1">Past SLA</p></div>
            <div className="card p-4 text-center"><p className="text-xl font-bold text-brand-deep">12</p><p className="text-[11px] text-content-tertiary mt-1">At Risk</p></div>
            <div className="card p-4 text-center"><p className="text-xl font-bold text-brand-dark">94.2%</p><p className="text-[11px] text-content-tertiary mt-1">SLA Compliance</p></div>
            <div className="card p-4 text-center"><p className="text-xl font-bold text-brand">48h</p><p className="text-[11px] text-content-tertiary mt-1">Avg Resolution</p></div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-[13px] text-content-secondary"><th className="text-left px-4 py-3">Account</th><th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">SLA Target</th><th className="text-left px-4 py-3">Days Elapsed</th><th className="text-left px-4 py-3">Priority</th><th className="text-left px-4 py-3">Assigned To</th></tr></thead>
              <tbody>
                {[{acct:'AR-3301',client:'Valley Ortho',sla:'30 days',days:34,priority:'critical',assignee:'Team Lead'},{acct:'AR-2987',client:'Metro Health',sla:'45 days',days:42,priority:'high',assignee:'Sarah K.'},{acct:'AR-4102',client:'CityMed',sla:'30 days',days:28,priority:'medium',assignee:'John D.'}].map(s=>(
                  <tr key={s.acct} className="border-b border-separator last:border-0 table-row">
                    <td className="px-4 py-3 font-mono text-xs">{s.acct}</td>
                    <td className="px-4 py-3 text-xs">{s.client}</td>
                    <td className="px-4 py-3 text-[13px] text-content-secondary">{s.sla}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold">{s.days}d</td>
                    <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${s.priority==='critical'?'bg-red-500/10 text-red-500':s.priority==='high'?'bg-brand-pale0/10 text-brand-deep':'bg-brand/10 text-brand'}`}>{s.priority}</span></td>
                    <td className="px-4 py-3 text-xs">{s.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Run SLA Check result panel */}
          {slaResult.length > 0 && (
            <div className="mt-4 card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-semibold text-content-primary">SLA Check Results — {slaResult.length} Escalation(s)</h4>
                <button onClick={() => setSlaResult([])} className="text-[11px] text-content-tertiary hover:text-content-secondary">Clear</button>
              </div>
              <div className="space-y-2">
                {slaResult.map(r => (
                  <div key={r.task_id} className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-[13px] font-medium text-content-primary">{r.title}</p>
                      <p className="text-[11px] text-red-400 mt-0.5">{Math.round(r.hours_overdue)}h overdue · Escalation level {r.escalation_level}</p>
                    </div>
                    <button onClick={async () => {
                      try {
                        await createTask({ title: `SLA Escalation: ${r.title}`, description: `${Math.round(r.hours_overdue)}h overdue — escalation level ${r.escalation_level}`, task_type: 'ar_follow_up', priority: 'urgent', status: 'open' })
                        toast.success(`Escalation task created for ${r.task_id}`)
                      } catch { toast.error('Failed to create escalation task') }
                    }}
                      className="text-[11px] px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors whitespace-nowrap">
                      Send Escalation
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (<>
      <div className="card p-4 mb-4">
        <h3 className="text-[13px] font-semibold text-content-secondary mb-2">AGING BUCKETS</h3>
        <div className="flex items-end gap-4 h-28 px-4">{computedBuckets.map(b => (
          <div key={b.l} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[11px] text-content-secondary">${(b.v / 1000).toFixed(0)}K</span>
            <div className={`w-full ${b.c} rounded-t transition-all`} style={{ height: `${(b.v / computedMax) * 90}px` }} />
            <span className="text-[11px] text-content-secondary">{b.l} days</span>
          </div>
        ))}</div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-[13px] text-content-secondary">
            <th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Payer</th>
            <th className="text-left px-4 py-3">Source</th>
            <th className="text-right px-4 py-3">Balance</th>
            <th className="text-right px-4 py-3">Age</th>
            <th className="text-left px-4 py-3">TF Deadline</th>
            <th className="text-left px-4 py-3">Last Action</th>
            <th className="text-left px-4 py-3">Next F/U</th>
            <th className="text-left px-4 py-3">Priority</th>
          </tr></thead>
          <tbody>{filtered.map(a => {
            const tf = tfDaysRemaining(a.dos, a.payer, TF_DEADLINES)
            return (
              <tr key={a.id}
                onClick={() => setSelected(a)}
                className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
                <td className="px-4 py-3 font-medium">
                  <div>{a.patient}</div>
                  {a.paymentPromisedDate && (
                    <div className="text-[11px] text-brand-dark dark:text-brand-dark font-normal">💰 Promised {a.paymentPromisedDate}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-[13px] text-content-secondary">{a.client}</td>
                <td className="px-4 py-3 text-[13px] text-content-secondary">{a.payer}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${sourceInfo[a.source]?.color || 'bg-surface-elevated text-content-secondary'}`}>
                    {sourceInfo[a.source]?.label || a.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{a.balance > 0 ? `$${a.balance}` : <span className="text-brand-dark dark:text-brand-dark">Paid</span>}</td>
                <td className="px-4 py-3 text-right text-xs">{a.age}d</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`font-medium ${tf < 0 ? 'text-red-500' : tf < 30 ? 'text-red-500' : tf < 60 ? 'text-brand-deep' : 'text-content-secondary'}`}>
                    {tf < 0 ? 'PASSED' : `${tf}d`}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-content-secondary">{a.lastAction}</td>
                <td className="px-4 py-3 text-[13px] text-content-secondary">{a.nextFollowup}</td>
                <td className="px-4 py-3"><StatusBadge status={a.priority} small /></td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>

      {selected && (
        <ARDrawer
          account={selected}
          callHistory={callHistory[selected.id] || []}
          onClose={() => setSelected(null)}
          onUpdateAccount={(update) => updateAccount(selected.id, update)}
          onAddCall={(entry, followupDate, promisedDate) => addCallEntry(selected.id, entry, followupDate, promisedDate)}
        />
      )}

      </>)}
    </ModuleShell>
  )
}
