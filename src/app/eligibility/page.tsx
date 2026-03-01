'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ShieldCheck, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'

const demoChecks = [
  { id: 'ELG-001', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UnitedHealthcare', status: 'active', network: 'In-Network', copay: '$30', deductible: '$450 remaining', dos: '2026-03-02' },
  { id: 'ELG-002', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', status: 'active', network: 'In-Network', copay: '$25', deductible: '$200 remaining', dos: '2026-03-02' },
  { id: 'ELG-003', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', status: 'active', network: 'In-Network', copay: '0%', deductible: 'N/A', dos: '2026-03-02' },
  { id: 'ELG-004', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', status: 'active', network: 'In-Network', copay: '20%', deductible: '$0 remaining', dos: '2026-03-02' },
  { id: 'ELG-005', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', status: 'inactive', network: '-', copay: '-', deductible: '-', dos: '2026-03-02' },
  { id: 'ELG-006', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', status: 'active', network: 'In-Network', copay: '20%', deductible: 'AED 500 remaining', dos: '2026-03-02' },
]

export default function EligibilityPage() {
  const [tab, setTab] = useState<'single'|'batch'>('single')
  return (
    <ModuleShell title="Eligibility Verification" subtitle="Check insurance coverage and benefits" sprint={2}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Checks Today" value="34" icon={<ShieldCheck size={20}/>}/>
        <KPICard label="Active" value="31" sub="91%" trend="up"/>
        <KPICard label="Inactive/Issues" value="3" trend="down"/>
        <KPICard label="Prior Auth Required" value="5"/>
      </div>
      <div className="flex gap-2 mb-4">
        {(['single','batch'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium ${tab === t ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-white/5 text-muted border border-border'}`}>
            {t === 'single' ? 'Single Check' : 'Batch Overnight'}
          </button>
        ))}
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Network</th><th className="text-left px-4 py-3">Copay</th>
            <th className="text-left px-4 py-3">Deductible</th>
          </tr></thead>
          <tbody>{demoChecks.map(c => (
            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-white/5">
              <td className="px-4 py-3 font-medium">{c.patient}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.client}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.payer}</td>
              <td className="px-4 py-3">{c.status === 'active' ? <span className="text-emerald-400 flex items-center gap-1 text-xs"><CheckCircle2 size={12}/> Active</span> : <span className="text-red-400 flex items-center gap-1 text-xs"><AlertTriangle size={12}/> Inactive</span>}</td>
              <td className="px-4 py-3 text-xs">{c.network}</td>
              <td className="px-4 py-3 text-xs">{c.copay}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.deductible}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
