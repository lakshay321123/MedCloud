'use client'
import React, { useEffect, useMemo, useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useApp } from '@/lib/context'
import { demoERAFiles, demoERALineItems, demoUnmatchedPayments } from '@/lib/demo-data'
import { useToast } from '@/components/shared/Toast'
import { Receipt, ArrowLeft, AlertTriangle, CheckCircle2, Send, FileText, StickyNote } from 'lucide-react'

export default function PaymentPostingPage() {
  const { selectedClient } = useApp()
  const { toast } = useToast()
  const eras = demoERAFiles.filter(era => !selectedClient || era.clientId === selectedClient.id)
  const [selectedEra, setSelectedEra] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState(demoERALineItems)
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)

  const era = eras.find(e => e.id === selectedEra)
  const eraLines = lineItems.filter(line => line.eraId === selectedEra)

  useEffect(() => {
    if (!selectedEra && eras.length > 0) return
    if (selectedEra && !eras.find(e => e.id === selectedEra)) setSelectedEra(null)
  }, [selectedEra, eras])

  const totals = useMemo(() => eraLines.reduce((acc, row) => ({
    billed: acc.billed + row.billed,
    allowed: acc.allowed + row.allowed,
    paid: acc.paid + row.paid,
    denied: acc.denied + row.denied,
    patBalance: acc.patBalance + row.patBalance,
  }), { billed: 0, allowed: 0, paid: 0, denied: 0, patBalance: 0 }), [eraLines])

  const setValue = (id: string, field: string, value: number | string) => {
    setLineItems(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  if (!selectedEra) {
    return (
      <ModuleShell title="Payment Posting" subtitle="Process ERAs and post payments">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <KPICard label="ERAs Pending" value={eras.filter(e => e.status !== 'posted').length} icon={<Receipt size={20} />} />
          <KPICard label="Posted Today" value="89" icon={<CheckCircle2 size={20} />} />
          <KPICard label="Auto-Post Rate" value="76%" icon={<Send size={20} />} />
          <KPICard label="Unmatched" value={demoUnmatchedPayments.length} icon={<AlertTriangle size={20} />} />
        </div>

        <div className="card overflow-hidden mb-4">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-separator text-content-secondary text-[12px]">
              <th className="text-left px-4 py-3">File</th><th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Client</th><th className="text-right px-4 py-3">Claims</th><th className="text-right px-4 py-3">Total</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Exceptions</th>
            </tr></thead>
            <tbody>{eras.map(r => (
              <tr key={r.id} onClick={() => setSelectedEra(r.id)} className="table-row cursor-pointer border-b border-separator last:border-0">
                <td className="px-4 py-3 font-mono">{r.file}</td><td className="px-4 py-3">{r.payer}</td><td className="px-4 py-3 text-content-secondary">{r.client}</td><td className="px-4 py-3 text-right font-mono">{r.claims}</td><td className="px-4 py-3 text-right font-mono">${r.total.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status === 'posted' ? 'completed' : r.status === 'processing' ? 'in_progress' : 'received'} small /></td>
                <td className={`px-4 py-3 ${r.exceptions > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-content-secondary'}`}>{r.exceptions}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card p-4">
          <h3 className="text-[12px] font-semibold text-content-tertiary uppercase tracking-wider mb-2">Unmatched Payments</h3>
          <div className="space-y-2 text-[13px]">
            {demoUnmatchedPayments.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-surface-elevated rounded-btn p-2">
                <span>{item.payer} · {item.reason}</span>
                <span className="font-mono">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </ModuleShell>
    )
  }

  return (
    <ModuleShell title="Payment Posting" subtitle="Process ERAs and post payments">
      <button onClick={() => setSelectedEra(null)} className="inline-flex items-center gap-2 text-[13px] text-content-secondary hover:text-content-primary mb-3"><ArrowLeft size={14} />Back to ERA Files</button>
      <div className="card p-3 mb-3 text-[13px] text-content-secondary">{era?.file} · {era?.payer} · {era?.client} · Received: <span className="font-mono">{era?.receivedAt?.slice(0, 10)}</span></div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-separator text-content-secondary bg-surface-secondary">
              <th className="text-left px-3 py-2">Patient</th><th className="text-left px-3 py-2">CPT</th><th className="text-left px-3 py-2">DOS</th><th className="text-right px-3 py-2">Billed</th><th className="text-right px-3 py-2">Allowed</th><th className="text-right px-3 py-2">Paid</th><th className="text-right px-3 py-2">Denied</th><th className="text-left px-3 py-2">Adj Code</th><th className="text-left px-3 py-2">Adj Reason</th><th className="text-right px-3 py-2">Pat Bal</th><th className="text-left px-3 py-2">Notes</th><th className="text-left px-3 py-2">Action</th>
            </tr></thead>
            <tbody>{eraLines.map(row => {
              const bg = row.denied > 0 ? 'bg-red-500/5' : row.action === 'review' ? 'bg-amber-500/5' : row.action === 'patient_bill' ? 'bg-blue-500/5' : ''
              return <tr key={row.id} className={`border-b border-separator ${bg}`}>
                <td className="px-3 py-2 text-[13px]">{row.patientName}</td>
                <td className="px-3 py-2 font-mono" title={row.cptDesc}>{row.cpt}</td>
                <td className="px-3 py-2 font-mono">{row.dos}</td>
                {(['billed', 'allowed', 'paid', 'denied', 'patBalance'] as const).map(field => (
                  <td key={field} className={`px-3 py-2 text-right font-mono ${field === 'denied' && row.denied > 0 ? 'text-red-600 dark:text-red-400' : ''} ${field === 'patBalance' && row.patBalance > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {editingCell?.rowId === row.id && editingCell.field === field ? (
                      <input
                        type="number"
                        autoFocus
                        defaultValue={row[field]}
                        className="w-20 bg-transparent border-b border-brand text-right font-mono"
                        onBlur={e => { setValue(row.id, field, Number(e.target.value) || 0); setEditingCell(null) }}
                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                    ) : <button onClick={() => setEditingCell({ rowId: row.id, field })}>${row[field].toFixed(2)}</button>}
                  </td>
                ))}
                <td className="px-3 py-2 font-mono text-[11px]">{row.adjCode}</td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={row.adjReason}>{row.adjReason}</td>
                <td className="px-3 py-2">{row.notes ? <button onClick={() => setValue(row.id, 'notes', `${row.notes} (reviewed)`)} className="text-amber-600 dark:text-amber-400"><StickyNote size={14} /></button> : <button onClick={() => setValue(row.id, 'notes', 'Add note')} className="text-content-tertiary"><StickyNote size={14} /></button>}</td>
                <td className="px-3 py-2"><select value={row.action} onChange={e => setValue(row.id, 'action', e.target.value)} className="bg-surface-elevated border border-separator rounded-btn px-2 py-1">
                  <option value="post">✓ Post</option><option value="deny_route">❌ → Denials</option><option value="patient_bill">💳 → Patient Bill</option><option value="review">👁 Review</option><option value="posted">✅ Posted</option>
                </select></td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <div className="bg-surface-elevated border-t border-separator px-3 py-2 text-[12px] flex flex-wrap gap-3 justify-between">
          <span>Billed: <span className="font-mono">${totals.billed.toFixed(2)}</span></span>
          <span>Allowed: <span className="font-mono">${totals.allowed.toFixed(2)}</span></span>
          <span>Paid: <span className="font-mono">${totals.paid.toFixed(2)}</span></span>
          <span>Denied: <span className="font-mono">${totals.denied.toFixed(2)}</span></span>
          <span>Patient Balance: <span className="font-mono">${totals.patBalance.toFixed(2)}</span></span>
          <span>Lines: <span className="font-mono">{eraLines.length}</span></span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={() => {
          const approved = eraLines.filter(l => l.action === 'post')
          if (approved.length === 0) { toast.warning('No lines marked for posting'); return }
          toast.success(`${approved.length} line(s) posted successfully`)
          setLineItems(prev => prev.map(row => row.eraId === selectedEra && row.action === 'post' ? { ...row, action: 'posted' } : row))
        }} className="bg-brand text-white rounded-btn px-4 py-2 text-[13px]">Post All Approved</button>
        <button onClick={() => {
          const denied = eraLines.filter(l => l.action === 'deny_route')
          if (denied.length === 0) { toast.warning('No lines marked for denial routing'); return }
          toast.success(`${denied.length} denial(s) routed to AR queue`)
        }} className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-btn px-4 py-2 text-[13px]">Route Denials to AR</button>
        <button onClick={() => {
          const patBal = eraLines.filter(l => l.action === 'patient_bill')
          toast.success(`${patBal.length || 2} patient statement(s) queued for delivery`)
        }} className="bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-btn px-4 py-2 text-[13px] inline-flex items-center gap-1"><FileText size={14} />Generate Patient Statements</button>
      </div>
    </ModuleShell>
  )
}
