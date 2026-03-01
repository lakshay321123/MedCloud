'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useApp } from '@/lib/context'
import { demoClaims } from '@/lib/demo-data'
import { getClientName } from '@/lib/demo-data'
import { FileText, CheckCircle2, Activity, Clock, Search } from 'lucide-react'

export default function ClaimsPage() {
  const { selectedClient } = useApp()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const claims = demoClaims.filter(c => (!selectedClient || c.clientId === selectedClient.id) && (!statusFilter || c.status === statusFilter) && (!filter || c.patientName.toLowerCase().includes(filter.toLowerCase()) || c.id.toLowerCase().includes(filter.toLowerCase())))
  const submitted = claims.filter(c => c.status === 'submitted').length
  const paidAmt = claims.reduce((s, c) => s + (c.paid || 0), 0)

  return (
    <ModuleShell title="Claims Center" subtitle="Manage claims across all clients">
      <div className="grid grid-cols-4 gap-5 mb-8">
        <KPICard label="Total Claims" value={claims.length} icon={<FileText size={20}/>} />
        <KPICard label="Submitted Today" value={submitted} icon={<CheckCircle2 size={20}/>} />
        <KPICard label="Clean Claim Rate" value="83.3%" icon={<Activity size={20}/>} />
        <KPICard label="Avg Days to Payment" value="24" icon={<Clock size={20}/>} />
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 flex gap-3 border-b border-separator">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input placeholder="Search claim #, patient, payer..." value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full bg-surface-elevated rounded-btn pl-9 pr-4 py-2 text-[13px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-elevated rounded-btn px-3 py-2 text-[13px] text-content-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="">All Statuses</option>
            {['draft','submitted','in_process','paid','denied','appealed','partial_pay'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-separator">
            {['Claim #','Patient','Client','Payer','DOS','Charges','Paid','Status','Age'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody>{claims.map(c => (
            <tr key={c.id} className="border-b border-separator last:border-0 table-row cursor-pointer">
              <td className="px-4 py-3 font-mono font-medium text-content-primary">{c.id}</td>
              <td className="px-4 py-3 font-medium text-content-primary">{c.patientName}</td>
              <td className="px-4 py-3 text-content-secondary">{getClientName(c.clientId)}</td>
              <td className="px-4 py-3 text-content-secondary">{c.payer}</td>
              <td className="px-4 py-3 text-content-secondary font-mono">{c.dos}</td>
              <td className="px-4 py-3 text-content-primary font-medium">${c.charges}</td>
              <td className="px-4 py-3 font-medium">{c.paid ? <span className="text-emerald-600 dark:text-emerald-400">${c.paid}</span> : <span className="text-content-tertiary">—</span>}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} small /></td>
              <td className="px-4 py-3 text-content-tertiary">{c.age}d</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
