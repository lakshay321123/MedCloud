'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { demoERALineItems, EOBLineItem } from '@/lib/demo-data'
import { Receipt, AlertTriangle, ArrowLeft, CheckCircle2, TrendingUp } from 'lucide-react'

const eras = [
  { id: 'ERA-001', file: 'UHC_ERA_20260301.835', payer: 'UnitedHealthcare', client: 'Irvine Family Practice', claims: 23, total: 12450, status: 'posted', exceptions: 2 },
  { id: 'ERA-002', file: 'AETNA_ERA_20260301.835', payer: 'Aetna', client: 'Irvine Family Practice', claims: 8, total: 4280, status: 'posted', exceptions: 1 },
  { id: 'ERA-003', file: 'MEDICARE_ERA_20260228.835', payer: 'Medicare', client: 'Patel Cardiology', claims: 15, total: 18900, status: 'processing', exceptions: 0 },
  { id: 'ERA-004', file: 'DAMAN_REM_20260301.csv', payer: 'Daman', client: 'Gulf Medical Center', claims: 12, total: 8200, status: 'new', exceptions: 0 },
  { id: 'ERA-005', file: 'NAS_REM_20260228.csv', payer: 'NAS', client: 'Dubai Wellness Clinic', claims: 6, total: 2100, status: 'posted', exceptions: 0 },
]

const unmatched = [
  { id: 'UNM-001', payer: 'BCBS', amount: 340, reason: 'Claim # not found in system', client: 'Patel Cardiology' },
  { id: 'UNM-002', payer: 'UHC', amount: 125, reason: 'Patient ID mismatch', client: 'Irvine Family Practice' },
]

const actionColors: Record<string, string> = {
  approve: 'bg-emerald-500/5 border-l-2 border-emerald-500',
  deny: 'bg-red-500/5 border-l-2 border-red-500',
  pend: 'bg-amber-500/5 border-l-2 border-amber-500',
  posted: '',
}

const actionBadge: Record<string, string> = {
  approve: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  deny: 'bg-red-500/10 text-red-600 dark:text-red-400',
  pend: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  posted: 'bg-surface-elevated text-content-tertiary',
}

export default function PaymentPostingPage() {
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, Partial<EOBLineItem>>>({})
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)

  const selectedEra = eras.find(e => e.id === selectedEraId)
  const filteredLines = demoERALineItems.filter(l => l.eraId === selectedEraId)

  function getVal<K extends keyof EOBLineItem>(line: EOBLineItem, field: K): EOBLineItem[K] {
    return (edits[line.id]?.[field] ?? line[field]) as EOBLineItem[K]
  }

  function setEdit(id: string, field: keyof EOBLineItem, value: string | number) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const totals = filteredLines.reduce((acc, l) => ({
    billed: acc.billed + l.billed,
    allowed: acc.allowed + (Number(getVal(l, 'allowed'))),
    paid: acc.paid + (Number(getVal(l, 'paid'))),
    denied: acc.denied + l.denied,
    patientBalance: acc.patientBalance + (Number(getVal(l, 'patientBalance'))),
  }), { billed: 0, allowed: 0, paid: 0, denied: 0, patientBalance: 0 })

  function EditableNumCell({ line, field }: { line: EOBLineItem; field: keyof EOBLineItem }) {
    const isEditing = editingCell?.id === line.id && editingCell?.field === field
    const val = getVal(line, field)
    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-20 bg-surface-primary border border-brand/50 rounded px-1 py-0.5 text-xs font-mono text-right outline-none"
          defaultValue={String(val)}
          onBlur={e => { setEdit(line.id, field, parseFloat(e.target.value) || 0); setEditingCell(null) }}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      )
    }
    return (
      <span
        onClick={() => setEditingCell({ id: line.id, field })}
        className="cursor-pointer hover:bg-brand/10 rounded px-1 py-0.5 transition-colors font-mono"
      >
        ${Number(val).toFixed(2)}
      </span>
    )
  }

  function EditableTextCell({ line, field }: { line: EOBLineItem; field: keyof EOBLineItem }) {
    const isEditing = editingCell?.id === line.id && editingCell?.field === field
    const val = getVal(line, field)
    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-20 bg-surface-primary border border-brand/50 rounded px-1 py-0.5 text-xs font-mono outline-none"
          defaultValue={String(val)}
          onBlur={e => { setEdit(line.id, field, e.target.value); setEditingCell(null) }}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      )
    }
    return (
      <span
        onClick={() => setEditingCell({ id: line.id, field })}
        className="cursor-pointer hover:bg-brand/10 rounded px-1 py-0.5 transition-colors font-mono text-xs"
      >
        {String(val)}
      </span>
    )
  }

  function ActionCell({ line }: { line: EOBLineItem }) {
    const val = String(getVal(line, 'action'))
    const isEditing = editingCell?.id === line.id && editingCell?.field === 'action'
    if (isEditing) {
      return (
        <select
          autoFocus
          className="bg-surface-primary border border-brand/50 rounded px-1 py-0.5 text-xs outline-none"
          defaultValue={val}
          onChange={e => { setEdit(line.id, 'action', e.target.value); setEditingCell(null) }}
          onBlur={() => setEditingCell(null)}
        >
          <option value="approve">Approve</option>
          <option value="deny">Deny</option>
          <option value="pend">Pend</option>
          <option value="posted">Posted</option>
        </select>
      )
    }
    return (
      <span
        onClick={() => val !== 'posted' ? setEditingCell({ id: line.id, field: 'action' }) : undefined}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${actionBadge[val]} ${val !== 'posted' ? 'cursor-pointer' : ''}`}
      >
        {val}
      </span>
    )
  }

  // ERA list view
  if (!selectedEraId) {
    return (
      <ModuleShell title="Payment Posting" subtitle="Process ERAs and post payments">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <KPICard label="ERAs Pending" value={eras.filter(e => e.status !== 'posted').length} icon={<Receipt size={20} />} />
          <KPICard label="Posted Today" value="89" trend="up" />
          <KPICard label="Auto-Post Rate (AI)" value="76%" />
          <KPICard label="Unmatched" value={unmatched.length} trend="down" />
        </div>
        {unmatched.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertTriangle size={14} /> {unmatched.length} unmatched payment(s) need manual review
          </div>
        )}
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-separator text-xs font-semibold text-content-secondary">ERA Files — click to review EOB line items</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-separator text-xs text-content-secondary">
              <th className="text-left px-4 py-3">File</th>
              <th className="text-left px-4 py-3">Payer</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-right px-4 py-3">Claims</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Exceptions</th>
            </tr></thead>
            <tbody>{eras.map(e => (
              <tr
                key={e.id}
                onClick={() => setSelectedEraId(e.id)}
                className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-brand hover:underline">{e.file}</td>
                <td className="px-4 py-3 text-xs">{e.payer}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{e.client}</td>
                <td className="px-4 py-3 text-right">{e.claims}</td>
                <td className="px-4 py-3 text-right">${e.total.toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status === 'posted' ? 'completed' : e.status === 'processing' ? 'in_progress' : 'received'} small /></td>
                <td className="px-4 py-3 text-right">{e.exceptions > 0 ? <span className="text-amber-600 dark:text-amber-400">{e.exceptions}</span> : '0'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-separator text-xs font-semibold text-content-secondary">Unmatched Payments</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-separator text-xs text-content-secondary">
              <th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Client</th>
              <th className="text-right px-4 py-3">Amount</th><th className="text-left px-4 py-3">Reason</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr></thead>
            <tbody>{unmatched.map(u => (
              <tr key={u.id} className="border-b border-separator last:border-0 table-row">
                <td className="px-4 py-3">{u.payer}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{u.client}</td>
                <td className="px-4 py-3 text-right">${u.amount}</td>
                <td className="px-4 py-3 text-xs text-amber-600 dark:text-amber-400">{u.reason}</td>
                <td className="px-4 py-3"><button className="text-[10px] text-brand hover:underline">Manual Match</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </ModuleShell>
    )
  }

  // EOB Scrubber view
  return (
    <ModuleShell title="Payment Posting" subtitle={`EOB Line-Item Scrubber — ${selectedEra?.file}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSelectedEraId(null)}
          className="flex items-center gap-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to ERA List
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-content-secondary">{selectedEra?.payer} · {selectedEra?.client}</span>
          <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-btn transition-colors">
            <CheckCircle2 size={13} /> Post All Approved
          </button>
          <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5 rounded-btn transition-colors">
            <TrendingUp size={13} /> Route Denials to AR
          </button>
        </div>
      </div>

      {/* Scrubber table */}
      <div className="card overflow-auto mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-separator text-content-secondary sticky top-0 bg-surface-secondary">
              <th className="text-left px-3 py-2.5">Patient</th>
              <th className="text-left px-3 py-2.5">CPT</th>
              <th className="text-left px-3 py-2.5 max-w-[180px]">Description</th>
              <th className="text-right px-3 py-2.5">Billed</th>
              <th className="text-right px-3 py-2.5">Allowed ✎</th>
              <th className="text-right px-3 py-2.5">Paid ✎</th>
              <th className="text-right px-3 py-2.5">Denied</th>
              <th className="text-center px-3 py-2.5">Adj Code ✎</th>
              <th className="text-right px-3 py-2.5">Adj Amt ✎</th>
              <th className="text-right px-3 py-2.5">Pt Bal ✎</th>
              <th className="text-center px-3 py-2.5">Action ✎</th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map(line => {
              const action = String(getVal(line, 'action'))
              return (
                <tr key={line.id} className={`border-b border-separator last:border-0 ${actionColors[action] || ''}`}>
                  <td className="px-3 py-2.5 font-medium text-content-primary">{line.patientName}</td>
                  <td className="px-3 py-2.5 font-mono text-content-primary">{line.cptCode}</td>
                  <td className="px-3 py-2.5 text-content-secondary max-w-[180px] truncate" title={line.description}>{line.description}</td>
                  <td className="px-3 py-2.5 text-right font-mono">${line.billed.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right"><EditableNumCell line={line} field="allowed" /></td>
                  <td className="px-3 py-2.5 text-right"><EditableNumCell line={line} field="paid" /></td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-600 dark:text-red-400">{line.denied > 0 ? `$${line.denied.toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2.5 text-center"><EditableTextCell line={line} field="adjustmentCode" /></td>
                  <td className="px-3 py-2.5 text-right"><EditableNumCell line={line} field="adjustmentAmount" /></td>
                  <td className="px-3 py-2.5 text-right"><EditableNumCell line={line} field="patientBalance" /></td>
                  <td className="px-3 py-2.5 text-center"><ActionCell line={line} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div className="card p-3 flex items-center gap-6 text-xs">
        <span className="font-semibold text-content-secondary uppercase tracking-wide">Totals</span>
        <div className="flex items-center gap-1"><span className="text-content-tertiary">Billed:</span><span className="font-mono font-semibold text-content-primary">${totals.billed.toFixed(2)}</span></div>
        <div className="flex items-center gap-1"><span className="text-content-tertiary">Allowed:</span><span className="font-mono font-semibold text-content-primary">${totals.allowed.toFixed(2)}</span></div>
        <div className="flex items-center gap-1"><span className="text-content-tertiary">Paid:</span><span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">${totals.paid.toFixed(2)}</span></div>
        <div className="flex items-center gap-1"><span className="text-content-tertiary">Denied:</span><span className="font-mono font-semibold text-red-600 dark:text-red-400">${totals.denied.toFixed(2)}</span></div>
        <div className="flex items-center gap-1"><span className="text-content-tertiary">Pt Balance:</span><span className="font-mono font-semibold text-amber-600 dark:text-amber-400">${totals.patientBalance.toFixed(2)}</span></div>
        <div className="ml-auto text-content-tertiary">{filteredLines.length} line items · click any ✎ cell to edit</div>
      </div>
    </ModuleShell>
  )
}
