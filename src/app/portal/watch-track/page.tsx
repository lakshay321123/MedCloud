'use client'
import React, { useState } from 'react'
import { demoClaims } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { FileText, DollarSign, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '@/lib/context'

export default function WatchTrackPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { currentUser, selectedClient, country } = useApp()

  const myClaims = demoClaims.filter(c => {
    if (selectedClient) return c.clientId === selectedClient.id
    if (currentUser.role === 'client' || currentUser.role === 'provider')
      return c.clientId === currentUser.organization_id
    if (country === 'uae') return ['org-101','org-104'].includes(c.clientId)
    if (country === 'usa') return ['org-102','org-103'].includes(c.clientId)
    return true
  })
  const filtered = myClaims.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search) { const s = search.toLowerCase(); return c.patientName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || c.payer.toLowerCase().includes(s) }
    return true
  })

  const totalCharges = myClaims.reduce((s,c) => s + c.billed, 0)
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
            <th className="w-8"></th>
            <th className="text-left px-4 py-3">Claim #</th><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Payer</th>
            <th className="text-left px-4 py-3">DOS</th><th className="text-right px-4 py-3">Charges</th><th className="text-right px-4 py-3">Paid</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Age</th>
          </tr></thead>
          <tbody>{filtered.map(c=>(
            <React.Fragment key={c.id}>
              <tr onClick={()=>setExpanded(expanded===c.id?null:c.id)} className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
                <td className="pl-3 text-content-tertiary">{expanded===c.id?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3">{c.patientName}</td>
                <td className="px-4 py-3 text-content-secondary text-xs">{c.payer}</td>
                <td className="px-4 py-3 text-content-secondary text-xs">{c.dos}</td>
                <td className="px-4 py-3 text-right">${c.billed.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{c.paid > 0 ? `$${c.paid.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} small/></td>
                <td className="px-4 py-3 text-right text-xs text-content-secondary">{c.age}d</td>
              </tr>
              {expanded===c.id&&(
                <tr className="border-b border-separator bg-surface-elevated">
                  <td colSpan={9} className="px-8 py-4">
                    <div className="grid grid-cols-3 gap-6 text-xs">
                      <div>
                        <p className="text-content-tertiary uppercase tracking-wider mb-2 font-semibold">Claim Detail</p>
                        <div className="space-y-1">
                          <p><span className="text-content-secondary">CPT Codes:</span> <span className="font-mono">{(c.cptCodes??[]).join(', ')||'—'}</span></p>
                          <p><span className="text-content-secondary">ICD Codes:</span> <span className="font-mono">{(c.icdCodes??[]).join(', ')||'—'}</span></p>
                          <p><span className="text-content-secondary">Billed:</span> <span className="font-mono">${c.billed.toLocaleString()}</span></p>
                          <p><span className="text-content-secondary">Paid:</span> <span className="font-mono text-emerald-600 dark:text-emerald-400">{c.paid>0?`$${c.paid.toLocaleString()}`:'—'}</span></p>
                        </div>
                      </div>
                      <div>
                        <p className="text-content-tertiary uppercase tracking-wider mb-2 font-semibold">Payer Info</p>
                        <div className="space-y-1">
                          <p><span className="text-content-secondary">Payer:</span> {c.payer}</p>
                          <p><span className="text-content-secondary">Age:</span> {c.age} days</p>
                          <p><span className="text-content-secondary">DOS:</span> {c.dos}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-content-tertiary uppercase tracking-wider mb-2 font-semibold">Status</p>
                        <div className="space-y-2">
                          <StatusBadge status={c.status} small/>
                          {c.status==='denied'&&<p className="text-red-600 dark:text-red-400 flex items-center gap-1"><AlertTriangle size={12}/>Denial — contact billing team</p>}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
