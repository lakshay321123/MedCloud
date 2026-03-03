'use client'
import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { TrendingUp, X, Phone, Bot, User, PhoneCall, Plus, AlertTriangle, FileText } from 'lucide-react'

const buckets = [{ l: '0-30', v: 145000, c: 'bg-emerald-500' }, { l: '31-60', v: 98000, c: 'bg-cyan-500' }, { l: '61-90', v: 52000, c: 'bg-amber-500' }, { l: '91-120', v: 28000, c: 'bg-orange-500' }, { l: '120+', v: 12000, c: 'bg-red-500' }]
const max = Math.max(...buckets.map(b => b.v))

// Timely filing deadlines per payer (days)
const TF_DEADLINES: Record<string, number> = {
  Medicare: 365, Aetna: 180, UHC: 180, BCBS: 365, NAS: 90, Daman: 90,
}

const accounts = [
  { id: 'AR-001', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', original: 1200, balance: 488, age: 95, lastAction: 'Voice AI call — "In process"', nextFollowup: '2026-03-04', priority: 'urgent' as const, source: 'denied_claim' as const, dos: '2025-11-30' },
  { id: 'AR-002', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', original: 320, balance: 320, age: 46, lastAction: 'Initial submission', nextFollowup: '2026-03-03', priority: 'high' as const, source: 'underpayment' as const, dos: '2026-01-17' },
  { id: 'AR-003', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', original: 350, balance: 126, age: 12, lastAction: 'Partial payment posted', nextFollowup: '2026-03-10', priority: 'medium' as const, source: 'patient_balance' as const, dos: '2026-02-19' },
  { id: 'AR-004', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UHC', original: 250, balance: 0, age: 5, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const, source: 'denied_claim' as const, dos: '2026-02-26' },
  { id: 'AR-005', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', original: 480, balance: 0, age: 31, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const, source: 'denied_claim' as const, dos: '2026-02-01' },
  { id: 'AR-006', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', original: 890, balance: 890, age: 120, lastAction: 'Appeal L1 submitted', nextFollowup: '2026-03-02', priority: 'urgent' as const, source: 'timely_filing_risk' as const, dos: '2025-11-04' },
]

// Demo call history keyed by account id
const demoCallHistory: Record<string, Array<{
  id: string; date: string; type: 'ai' | 'manual'; status: string; ref?: string; rep?: string; duration?: string; note: string
}>> = {
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
  underpayment: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Underpayment' },
  patient_balance: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Patient Balance' },
  timely_filing_risk: { color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'Timely Filing Risk' },
}

type Account = typeof accounts[0]

function ARDrawer({ account, onClose }: { account: Account; onClose: () => void }) {
  const { toast } = useToast()
  const [drawerTab, setDrawerTab] = useState<'summary' | 'calls' | 'notes' | 'claims'>('summary')
  const [followUpDate, setFollowUpDate] = useState(account.nextFollowup !== '-' ? account.nextFollowup : '')
  const [followUpNote, setFollowUpNote] = useState('')

  // Log Manual Call modal
  const [showCallModal, setShowCallModal] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [callRef, setCallRef] = useState('')
  const [callRep, setCallRep] = useState('')
  const [callFollowup, setCallFollowup] = useState('')
  const [callNextAction, setCallNextAction] = useState('')

  // Write-off modal
  const [showWriteoffModal, setShowWriteoffModal] = useState(false)
  const [writeoffReason, setWriteoffReason] = useState('')

  const callHistory = demoCallHistory[account.id] || []
  const tfDays = TF_DEADLINES[account.payer] || 180
  const dosDate = new Date(account.dos)
  const deadlineDate = new Date(dosDate)
  deadlineDate.setDate(deadlineDate.getDate() + tfDays)
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)

  const handleLogCall = () => {
    if (!callStatus) { toast.error('Call status is required'); return }
    toast.success('Manual call logged successfully')
    setShowCallModal(false)
    setCallStatus(''); setCallRef(''); setCallRep(''); setCallFollowup(''); setCallNextAction('')
  }

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
        <div className="flex items-center justify-between p-4 border-b border-separator shrink-0">
          <div>
            <h3 className="font-semibold text-content-primary">{account.patient}</h3>
            <p className="text-xs text-content-secondary">{account.client} · {account.payer}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn">
            <X size={16} className="text-content-secondary" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-separator px-3 shrink-0">
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
                  <div className="text-[10px] text-content-secondary">Original</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className={`text-lg font-bold ${account.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>${account.balance}</div>
                  <div className="text-[10px] text-content-secondary">Balance</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-content-primary">{account.age}d</div>
                  <div className="text-[10px] text-content-secondary">Age</div>
                </div>
              </div>

              {/* Timely filing */}
              <div className={`flex items-start gap-2 rounded-lg p-3 text-[12px] ${daysUntilDeadline < 30 ? 'bg-red-500/10 border border-red-500/20' : daysUntilDeadline < 60 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-surface-elevated'}`}>
                <AlertTriangle size={13} className={`mt-0.5 shrink-0 ${daysUntilDeadline < 30 ? 'text-red-500' : daysUntilDeadline < 60 ? 'text-amber-500' : 'text-content-tertiary'}`} />
                <div>
                  <p className={`font-medium ${daysUntilDeadline < 30 ? 'text-red-500' : daysUntilDeadline < 60 ? 'text-amber-600 dark:text-amber-400' : 'text-content-secondary'}`}>
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
                <label className="text-xs text-content-secondary block mb-1">Next Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { toast.success('Voice AI call queued'); onClose() }}
                  className="bg-brand/10 text-brand rounded-lg py-2.5 text-xs font-medium hover:bg-brand/20 transition-colors flex items-center justify-center gap-2">
                  <Phone size={13} /> Queue AI Call
                </button>
                <button onClick={() => setShowCallModal(true)}
                  className="bg-surface-elevated border border-separator rounded-lg py-2.5 text-xs font-medium hover:text-content-primary transition-colors flex items-center justify-center gap-2">
                  <PhoneCall size={13} /> Log Manual Call
                </button>
                <button onClick={() => {
                  if (!followUpDate) { toast.error('Please select a follow-up date'); return }
                  toast.success(`Follow-up saved for ${followUpDate}`)
                  onClose()
                }} className="bg-surface-elevated border border-separator rounded-lg py-2.5 text-xs font-medium hover:text-content-primary transition-colors">
                  Save Follow-up
                </button>
                <button onClick={() => { toast.success('Routed to appeals'); onClose() }}
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg py-2.5 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                  Route to Appeals
                </button>
                <button onClick={() => setShowWriteoffModal(true)}
                  className="col-span-2 bg-red-500/10 text-red-500 rounded-lg py-2.5 text-xs font-medium hover:bg-red-500/20 transition-colors">
                  Request Write-off
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
                      <span className="flex items-center gap-1 text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">
                        <Bot size={10} /> AI Call
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] bg-surface-secondary border border-separator text-content-secondary px-2 py-0.5 rounded-full font-medium">
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
                  <p className="text-[12px] text-content-secondary">{c.note}</p>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'notes' && (
            <div className="space-y-3">
              <textarea rows={4} placeholder="Add a note…" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-brand/40 resize-none" />
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${account.source === 'denied_claim' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {sourceInfo[account.source]?.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Manual Call Modal */}
      {showCallModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCallModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-secondary rounded-xl shadow-2xl w-full max-w-md border border-separator">
              <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
                <h3 className="font-semibold text-content-primary">Log Manual Call</h3>
                <button onClick={() => setShowCallModal(false)}><X size={16} className="text-content-secondary" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-[11px] text-content-tertiary block mb-1">Call Status *</label>
                  <input value={callStatus} onChange={e => setCallStatus(e.target.value)} placeholder="e.g. In process, Needs resubmission…"
                    className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-content-tertiary block mb-1">Reference #</label>
                    <input value={callRef} onChange={e => setCallRef(e.target.value)} placeholder="REF-XXXX"
                      className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] font-mono text-content-primary focus:outline-none focus:border-brand/40" />
                  </div>
                  <div>
                    <label className="text-[11px] text-content-tertiary block mb-1">Rep Name</label>
                    <input value={callRep} onChange={e => setCallRep(e.target.value)} placeholder="Payer rep name"
                      className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand/40" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-content-tertiary block mb-1">Follow-up Date</label>
                  <input type="date" value={callFollowup} onChange={e => setCallFollowup(e.target.value)}
                    className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand/40" />
                </div>
                <div>
                  <label className="text-[11px] text-content-tertiary block mb-1">Next Action</label>
                  <input value={callNextAction} onChange={e => setCallNextAction(e.target.value)} placeholder="e.g. Wait for EOB, Resubmit corrected claim…"
                    className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand/40" />
                </div>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={handleLogCall} className="flex-1 bg-brand text-white rounded-btn py-2.5 text-[13px] font-medium">Log Call</button>
                <button onClick={() => setShowCallModal(false)} className="px-4 py-2.5 bg-surface-elevated border border-separator rounded-btn text-[13px] text-content-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Write-off Request Modal */}
      {showWriteoffModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowWriteoffModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-secondary rounded-xl shadow-2xl w-full max-w-md border border-separator">
              <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
                <h3 className="font-semibold text-content-primary">Request Write-off</h3>
                <button onClick={() => setShowWriteoffModal(false)}><X size={16} className="text-content-secondary" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-amber-600 dark:text-amber-400">Write-off requests require supervisor approval before they are applied. Balance: <span className="font-bold">${account.balance}</span></p>
                </div>
                <div>
                  <label className="text-[11px] text-content-tertiary block mb-1">Reason *</label>
                  <select value={writeoffReason} onChange={e => setWriteoffReason(e.target.value)}
                    className="w-full bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand/40">
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
                <button onClick={handleWriteoff} className="flex-1 bg-red-500 text-white rounded-btn py-2.5 text-[13px] font-medium">Submit for Approval</button>
                <button onClick={() => setShowWriteoffModal(false)} className="px-4 py-2.5 bg-surface-elevated border border-separator rounded-btn text-[13px] text-content-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function ARManagementPage() {
  const { selectedClient } = useApp()
  const [selected, setSelected] = useState<typeof accounts[0] | null>(null)

  const filtered = accounts.filter(a => !selectedClient || a.client.includes(selectedClient.name.split(' ')[0]))

  // Compute TF deadline days for table column
  const tfDaysRemaining = (a: typeof accounts[0]) => {
    const tfDays = TF_DEADLINES[a.payer] || 180
    const deadline = new Date(a.dos)
    deadline.setDate(deadline.getDate() + tfDays)
    return Math.ceil((deadline.getTime() - Date.now()) / 86400000)
  }

  return (
    <ModuleShell title="A/R Management" subtitle="Accounts receivable follow-up and collections">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Total A/R" value="$335K" icon={<TrendingUp size={20} />} />
        <KPICard label="Worked Today" value="28" sub="+6" trend="up" />
        <KPICard label="Follow-ups Due" value="42" />
        <KPICard label="Avg Days Outstanding" value="34.2" />
      </div>
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-semibold text-content-secondary mb-2">AGING BUCKETS</h3>
        <div className="flex items-end gap-4 h-28 px-4">{buckets.map(b => (
          <div key={b.l} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-content-secondary">${(b.v / 1000).toFixed(0)}K</span>
            <div className={`w-full ${b.c} rounded-t transition-all`} style={{ height: `${(b.v / max) * 90}px` }} />
            <span className="text-[10px] text-content-secondary">{b.l} days</span>
          </div>
        ))}</div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
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
            const tf = tfDaysRemaining(a)
            return (
              <tr key={a.id}
                onClick={() => setSelected(a)}
                className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
                <td className="px-4 py-3 font-medium">{a.patient}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{a.client}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{a.payer}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sourceInfo[a.source]?.color || 'bg-surface-elevated text-content-secondary'}`}>
                    {sourceInfo[a.source]?.label || a.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{a.balance > 0 ? `$${a.balance}` : <span className="text-emerald-600 dark:text-emerald-400">Paid</span>}</td>
                <td className="px-4 py-3 text-right text-xs">{a.age}d</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`font-medium ${tf < 0 ? 'text-red-500' : tf < 30 ? 'text-red-500' : tf < 60 ? 'text-amber-500' : 'text-content-secondary'}`}>
                    {tf < 0 ? 'PASSED' : `${tf}d`}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-content-secondary">{a.lastAction}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{a.nextFollowup}</td>
                <td className="px-4 py-3"><StatusBadge status={a.priority} small /></td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>

      {selected && <ARDrawer account={selected} onClose={() => setSelected(null)} />}
    </ModuleShell>
  )
}
