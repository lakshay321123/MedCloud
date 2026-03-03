'use client'
import React, { useState, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import DocViewer from '@/components/shared/DocViewer'
import { useApp } from '@/lib/context'
import { demoClaims, demoMessages } from '@/lib/demo-data'
import type { DemoClaim, ClaimTimelineEvent } from '@/lib/demo-data'
import { useToast } from '@/components/shared/Toast'
import {
  FileText, CheckCircle2, Activity, Clock, Search, X, ChevronDown, ChevronUp,
  AlertTriangle, ShieldAlert, MessageCircle, DollarSign, Eye, RotateCcw,
  Filter, Download, CheckSquare, Edit3, Save
} from 'lucide-react'

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
function ClaimDrawer({ claim, onClose }: { claim: DemoClaim; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'lines' | 'docs' | 'messages' | 'audit' | 'scrub'>('overview')
  const { toast } = useToast()
  const [localMessages, setLocalMessages] = useState(demoMessages.filter(m => m.entityId === claim.id))
  const [msgInput, setMsgInput] = useState('')

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

  // Manual scrub checklist
  const [checkedRules, setCheckedRules] = useState<Set<string>>(new Set())
  const toggleRule = (id: string) => setCheckedRules(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const allRulesChecked = checkedRules.size === SCRUB_RULES.length

  const statusAction = () => {
    if (claim.status === 'scrub_failed') toast.error('Fix scrub errors before re-submitting')
    else if (claim.status === 'ready') toast.success(`${claim.id} submitted to Availity`)
    else if (claim.status === 'denied') toast.success('Routed to denial queue')
    else if (claim.status === 'paid') toast.info('Opening payment details…')
  }

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
                <div>
                  {claim.status === 'scrub_failed' && <button onClick={statusAction} className="w-full bg-red-500 text-white rounded-btn py-2.5 text-[13px] font-medium">Fix & Re-Scrub</button>}
                  {claim.status === 'ready' && <button onClick={statusAction} className="w-full bg-brand text-white rounded-btn py-2.5 text-[13px] font-medium">Submit to Clearinghouse</button>}
                  {claim.status === 'denied' && <button onClick={statusAction} className="w-full bg-amber-500 text-white rounded-btn py-2.5 text-[13px] font-medium">Route to Denials</button>}
                  {claim.status === 'paid' && <button onClick={statusAction} className="w-full bg-surface-elevated border border-separator text-content-primary rounded-btn py-2.5 text-[13px] font-medium">View Payment</button>}
                </div>
              )}
            </div>
          )}

          {tab === 'lines' && (
            <div>
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-separator text-[11px] text-content-tertiary uppercase tracking-wider">
                  {['CPT','Modifier','Description','Units','Billed','Allowed','Paid','Adj Code'].map(h => (
                    <th key={h} className="text-left py-2 pr-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {claim.cptCodes.map((cpt) => (
                    <tr key={cpt} className="border-b border-separator last:border-0">
                      <td className="py-3 pr-3 font-mono font-medium text-content-primary">{cpt}</td>
                      <td className="py-3 pr-3 font-mono text-content-tertiary">—</td>
                      <td className="py-3 pr-3 text-content-secondary">Office/Procedure visit</td>
                      <td className="py-3 pr-3">1</td>
                      <td className="py-3 pr-3">${Math.round(claim.billed / claim.cptCodes.length)}</td>
                      <td className="py-3 pr-3">{claim.allowed ? `$${Math.round(claim.allowed / claim.cptCodes.length)}` : '—'}</td>
                      <td className="py-3 pr-3 text-emerald-500">{claim.paid ? `$${Math.round(claim.paid / claim.cptCodes.length)}` : '—'}</td>
                      <td className="py-3 text-content-tertiary">CO-45</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[12px] text-content-secondary mt-4">
                Diagnoses: <span className="font-mono text-content-primary">{claim.icdCodes.join(', ')}</span>
              </p>
            </div>
          )}

          {tab === 'scrub' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <CheckSquare size={14} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-blue-400">
                  Complete all 20 scrub rules before submitting. All {checkedRules.size} / {SCRUB_RULES.length} checked.
                </p>
              </div>
              <div className="space-y-1">
                {SCRUB_RULES.map(rule => (
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
                {allRulesChecked ? 'Submit Manual Scrub' : `Check all ${SCRUB_RULES.length - checkedRules.size} remaining rules to continue`}
              </button>
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
  const { selectedClient } = useApp()
  const { toast } = useToast()

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

  const allClaims = useMemo(() => {
    return demoClaims.filter(c => {
      if (selectedClient && c.clientId !== selectedClient.id) return false
      if (search && !c.patientName.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilters.length && !statusFilters.includes(c.status)) return false
      if (dosFrom && c.dos < dosFrom) return false
      if (dosTo && c.dos > dosTo) return false
      return true
    }).sort((a, b) => {
      let av = sortKey === 'id' ? a.id : sortKey === 'age' ? a.age : a.billed
      let bv = sortKey === 'id' ? b.id : sortKey === 'age' ? b.age : b.billed
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [selectedClient, search, statusFilters, dosFrom, dosTo, sortKey, sortDir])

  const paginated = allClaims.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(allClaims.length / PER_PAGE)

  // KPIs
  const today = new Date().toISOString().split('T')[0]
  const submittedToday = demoClaims.filter(c => c.submittedDate === today).length
  const cleanClaims = demoClaims.filter(c => !['scrub_failed'].includes(c.status))
  const cleanRate = Math.round((cleanClaims.length / demoClaims.length) * 100)
  const paidClaimsWithDates = demoClaims.filter(c => c.status === 'paid' && c.submittedDate && c.paymentDate)
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
    <ModuleShell title="Claims Center" subtitle="Manage claims across all clients">
      {/* KPI Bar */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KPICard label="Total Claims" value={demoClaims.length} icon={<FileText size={20}/>} />
        <KPICard label="Submitted Today" value={submittedToday} icon={<CheckCircle2 size={20}/>} />
        <KPICard label="Clean Claim Rate" value={`${cleanRate}%`} icon={<Activity size={20}/>} />
        <KPICard label="Avg Days to Payment" value={`${avgDays}d`} icon={<Clock size={20}/>} />
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
              <span className="text-[12px] text-content-tertiary">{allClaims.length} claims</span>
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
                              { label: 'Correct Claim', action: () => { toast.info('Correction mode opened'); setMenuOpen(null) } },
                              { label: 'Route to Denials', action: () => { toast.success('Routed to denial queue'); setMenuOpen(null) } },
                              { label: 'Void Claim', action: () => { toast.warning('Void requires supervisor approval'); setMenuOpen(null) } },
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

      {drawerClaim && <ClaimDrawer claim={drawerClaim} onClose={() => setDrawerClaim(null)} />}
    </ModuleShell>
  )
}
