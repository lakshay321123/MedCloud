'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Receipt, AlertTriangle } from 'lucide-react'

const eras = [
  { id: 'ERA-001', file: 'UHC_ERA_20260301.835', client: 'Irvine Family Practice', claims: 23, total: 12450, status: 'posted', exceptions: 2 },
  { id: 'ERA-002', file: 'AETNA_ERA_20260301.835', client: 'Irvine Family Practice', claims: 8, total: 4280, status: 'posted', exceptions: 1 },
  { id: 'ERA-003', file: 'MEDICARE_ERA_20260228.835', client: 'Patel Cardiology', claims: 15, total: 18900, status: 'processing', exceptions: 0 },
  { id: 'ERA-004', file: 'DAMAN_REM_20260301.csv', client: 'Gulf Medical Center', claims: 12, total: 8200, status: 'new', exceptions: 0 },
  { id: 'ERA-005', file: 'NAS_REM_20260228.csv', client: 'Dubai Wellness Clinic', claims: 6, total: 2100, status: 'posted', exceptions: 0 },
]
const unmatched = [
  { id: 'UNM-001', payer: 'BCBS', amount: 340, reason: 'Claim # not found in system', client: 'Patel Cardiology' },
  { id: 'UNM-002', payer: 'UHC', amount: 125, reason: 'Patient ID mismatch', client: 'Irvine Family Practice' },
]

export default function PaymentPostingPage() {
  return (
    <ModuleShell title="Payment Posting" subtitle="Process ERAs and post payments" sprint={3}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="ERAs Pending" value={eras.filter(e=>e.status!=='posted').length} icon={<Receipt size={20}/>}/>
        <KPICard label="Posted Today" value="89" trend="up"/>
        <KPICard label="Auto-Post Rate (AI)" value="76%"/>
        <KPICard label="Unmatched" value={unmatched.length} trend="down"/>
      </div>
      {unmatched.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14}/> {unmatched.length} unmatched payment(s) need manual review
        </div>
      )}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-2 border-b border-border text-xs font-semibold text-muted">ERA Files</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">File</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-right px-4 py-3">Claims</th><th className="text-right px-4 py-3">Total</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Exceptions</th>
          </tr></thead>
          <tbody>{eras.map(e=>(
            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-white/5 cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs">{e.file}</td>
              <td className="px-4 py-3 text-xs text-muted">{e.client}</td>
              <td className="px-4 py-3 text-right">{e.claims}</td>
              <td className="px-4 py-3 text-right">${e.total.toLocaleString()}</td>
              <td className="px-4 py-3"><StatusBadge status={e.status === 'posted' ? 'completed' : e.status === 'processing' ? 'in_progress' : 'received'} small/></td>
              <td className="px-4 py-3 text-right">{e.exceptions > 0 ? <span className="text-amber-400">{e.exceptions}</span> : '0'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border text-xs font-semibold text-muted">Unmatched Payments</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-right px-4 py-3">Amount</th><th className="text-left px-4 py-3">Reason</th>
            <th className="text-left px-4 py-3">Action</th>
          </tr></thead>
          <tbody>{unmatched.map(u=>(
            <tr key={u.id} className="border-b border-border last:border-0 hover:bg-white/5">
              <td className="px-4 py-3">{u.payer}</td>
              <td className="px-4 py-3 text-xs text-muted">{u.client}</td>
              <td className="px-4 py-3 text-right">${u.amount}</td>
              <td className="px-4 py-3 text-xs text-amber-400">{u.reason}</td>
              <td className="px-4 py-3"><button className="text-[10px] text-brand hover:underline">Manual Match</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
