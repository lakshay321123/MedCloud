'use client'
import React, { useState } from 'react'
import { demoClaims, getClientName } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react'

export default function WatchTrackPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const myClaims = demoClaims.filter(c => c.clientId === 'org-102')
  const filtered = myClaims.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search) { const s = search.toLowerCase(); return c.patientName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || c.payer.toLowerCase().includes(s) }
    return true
  })

  const totalCharges = myClaims.reduce((s,c) => s + c.charges, 0)
  const totalPaid = myClaims.reduce((s,c) => s + c.paid, 0)

  return (
    <ModuleShell title="Watch & Track" subtitle="Track your claims and revenue">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Claims" value={myClaims.length} icon={<FileText size={20}/>}/>
        <KPICard label="Total Charges" value={`$${totalCharges.toLocaleString()}`} icon={<DollarSign size={20}/>}/>
        <KPICard label="Collected" value={`$${totalPaid.toLocaleString()}`} sub={`${((totalPaid/totalCharges)*100).toFixed(1)}% rate`} trend="up"/>
        <KPICard label="Avg Days to Pay" value="22" icon={<Clock size={20}/>}/>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search claims..." className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary max-w-xs"/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Statuses</option>
          {['submitted','in_process','paid','partial_pay','denied','appealed'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Claim #</th><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Payer</th>
            <th className="text-left px-4 py-3">DOS</th><th className="text-right px-4 py-3">Charges</th><th className="text-right px-4 py-3">Paid</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Age</th>
          </tr></thead>
          <tbody>{filtered.map(c=>(
            <tr key={c.id} className="border-b border-separator last:border-0 table-row cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
              <td className="px-4 py-3">{c.patientName}</td>
              <td className="px-4 py-3 text-content-secondary text-xs">{c.payer}</td>
              <td className="px-4 py-3 text-content-secondary text-xs">{c.dos}</td>
              <td className="px-4 py-3 text-right">${c.charges.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-emerald-600 text-emerald-600 dark:text-emerald-400">{c.paid > 0 ? `$${c.paid.toLocaleString()}` : '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} small/></td>
              <td className="px-4 py-3 text-right text-xs text-content-secondary">{c.age}d</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
