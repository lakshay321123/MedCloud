'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoClaims } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { FileText, Search } from 'lucide-react'

export default function ClaimsPage() {
  const { selectedClient } = useApp()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const claims = demoClaims.filter(c => {
    if (selectedClient && c.clientId !== selectedClient.id) return false
    if (statusFilter && c.status !== statusFilter) return false
    if (search) { const s = search.toLowerCase(); return c.patientName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || c.payer.toLowerCase().includes(s) }
    return true
  })

  const submitted = demoClaims.filter(c => c.status === 'submitted').length
  const cleanRate = ((demoClaims.filter(c => !['scrub_failed','denied'].includes(c.status)).length / demoClaims.length) * 100).toFixed(1)

  return (
    <ModuleShell title="Claims Center" subtitle="Manage claims across all clients" sprint={2}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Total Claims" value={demoClaims.length} icon={<FileText size={20}/>}/>
        <KPICard label="Submitted Today" value={submitted}/>
        <KPICard label="Clean Claim Rate" value={`${cleanRate}%`}/>
        <KPICard label="Avg Days to Payment" value="24"/>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search claim #, patient, payer..."
            className="w-full bg-white/5 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-white/5 border border-border rounded-lg px-3 py-1.5 text-xs text-white">
          <option value="">All Statuses</option>
          {['draft','scrubbing','scrub_failed','ready','submitted','accepted','in_process','paid','partial_pay','denied','appealed','corrected','write_off'].map(s=>(
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Claim #</th><th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Payer</th>
            <th className="text-left px-4 py-3">DOS</th><th className="text-right px-4 py-3">Charges</th>
            <th className="text-right px-4 py-3">Paid</th><th className="text-left px-4 py-3">Status</th>
            <th className="text-right px-4 py-3">Age</th>
          </tr></thead>
          <tbody>{claims.map(c=>(
            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-white/5 cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
              <td className="px-4 py-3">{c.patientName}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.clientName}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.payer}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.dos}</td>
              <td className="px-4 py-3 text-right">${c.charges.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{c.paid > 0 ? <span className="text-emerald-400">${c.paid.toLocaleString()}</span> : '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} small/></td>
              <td className="px-4 py-3 text-right text-xs text-muted">{c.age}d</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
