'use client'

import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { Eye, Search, FileText, Clock, CheckCircle, AlertTriangle, XCircle, DollarSign, TrendingUp, Filter } from 'lucide-react'

type ClaimStatus = 'submitted' | 'acknowledged' | 'in_process' | 'paid' | 'denied' | 'appealed' | 'partial'

const statusConfig: Record<ClaimStatus, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-400' },
  acknowledged: { label: 'Acknowledged', color: 'bg-cyan-500/10 text-cyan-400' },
  in_process: { label: 'In Process', color: 'bg-amber-500/10 text-amber-400' },
  paid: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-400' },
  denied: { label: 'Denied', color: 'bg-red-500/10 text-red-400' },
  appealed: { label: 'Appealed', color: 'bg-purple-500/10 text-purple-400' },
  partial: { label: 'Partial Pay', color: 'bg-orange-500/10 text-orange-400' },
}

const demoClaims = [
  { id: 'CLM-4521', patient: 'John Smith', payer: 'UHC', dos: '2026-02-28', cpt: '99214', charges: '$280', paid: '$280', status: 'paid' as ClaimStatus, daysOld: 8 },
  { id: 'CLM-4522', patient: 'Sarah Johnson', payer: 'Aetna', dos: '2026-02-27', cpt: '99213, 93000', charges: '$420', paid: '$0', status: 'in_process' as ClaimStatus, daysOld: 12 },
  { id: 'CLM-4523', patient: 'Ahmed Al Rashid', payer: 'NAS', dos: '2026-02-25', cpt: '99215', charges: '$350', paid: '$0', status: 'submitted' as ClaimStatus, daysOld: 4 },
  { id: 'CLM-4524', patient: 'Maria Garcia', payer: 'BCBS', dos: '2026-02-20', cpt: '99214, 12001', charges: '$680', paid: '$510', status: 'partial' as ClaimStatus, daysOld: 18 },
  { id: 'CLM-4525', patient: 'Robert Williams', payer: 'Cigna', dos: '2026-02-15', cpt: '99213', charges: '$180', paid: '$0', status: 'denied' as ClaimStatus, daysOld: 22 },
  { id: 'CLM-4526', patient: 'Lisa Brown', payer: 'Humana', dos: '2026-02-22', cpt: '99214', charges: '$280', paid: '$0', status: 'appealed' as ClaimStatus, daysOld: 16 },
  { id: 'CLM-4527', patient: 'David Lee', payer: 'UHC', dos: '2026-02-26', cpt: '99213, 81002', charges: '$220', paid: '$220', status: 'paid' as ClaimStatus, daysOld: 6 },
  { id: 'CLM-4528', patient: 'Emma Wilson', payer: 'Aetna', dos: '2026-02-24', cpt: '99215, 93000', charges: '$520', paid: '$0', status: 'acknowledged' as ClaimStatus, daysOld: 10 },
]

export default function WatchTrackPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = demoClaims.filter(c => {
    const matchSearch = `${c.id} ${c.patient} ${c.payer} ${c.cpt}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalCharges = demoClaims.reduce((s, c) => s + parseFloat(c.charges.replace('$', '').replace(',', '')), 0)
  const totalPaid = demoClaims.reduce((s, c) => s + parseFloat(c.paid.replace('$', '').replace(',', '')), 0)

  return (
    <ModuleShell title="Watch & Track" subtitle="Track claims, revenue, and collections in real-time" sprint="Sprint 3" icon={<Eye size={20} />}>
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Claims" value={String(demoClaims.length)} icon={<FileText size={18} />} />
        <KPICard title="Total Charges" value={`$${totalCharges.toLocaleString()}`} icon={<DollarSign size={18} />} />
        <KPICard title="Collected" value={`$${totalPaid.toLocaleString()}`} change={Math.round((totalPaid/totalCharges)*100)} icon={<TrendingUp size={18} />} />
        <KPICard title="Avg Days to Pay" value="14" change={-3} changeLabel="faster" icon={<Clock size={18} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by claim #, patient, payer, CPT..." className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-brand/50" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)]">
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Claims Table */}
      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              {['Claim #', 'Patient', 'Payer', 'DOS', 'CPT', 'Charges', 'Paid', 'Status', 'Age'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-brand">{c.id}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{c.patient}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{c.payer}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{c.dos}</td>
                <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{c.cpt}</td>
                <td className="px-4 py-3 text-xs font-mono text-[var(--text-primary)]">{c.charges}</td>
                <td className="px-4 py-3 text-xs font-mono text-emerald-400">{c.paid}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${statusConfig[c.status].color}`}>{statusConfig[c.status].label}</span></td>
                <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{c.daysOld}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
