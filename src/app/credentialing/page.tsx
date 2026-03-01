'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { BadgeCheck, AlertTriangle } from 'lucide-react'

const providers = [
  { id: 'PRV-001', name: 'Dr. Martinez', npi: '1234567890', client: 'Irvine Family Practice', license: '2027-06-30', malpractice: '2026-12-31', dea: '2027-03-15', caqh: 'Current', payers: 4, status: 'active' },
  { id: 'PRV-002', name: 'Dr. Patel', npi: '0987654321', client: 'Patel Cardiology', license: '2027-09-30', malpractice: '2026-04-15', dea: '2027-01-20', caqh: 'Current', payers: 5, status: 'expiring' },
  { id: 'PRV-003', name: 'Dr. Al Zaabi', npi: '1122334455', client: 'Gulf Medical Center', license: '2027-12-31', malpractice: '2026-11-30', dea: 'N/A', caqh: 'N/A', payers: 3, status: 'active' },
  { id: 'PRV-004', name: 'Dr. Noor', npi: '5544332211', client: 'Dubai Wellness Clinic', license: '2026-05-31', malpractice: '2026-05-31', dea: 'N/A', caqh: 'N/A', payers: 2, status: 'expiring' },
  { id: 'PRV-005', name: 'Dr. Williams', npi: '6677889900', client: 'Patel Cardiology', license: '2027-03-31', malpractice: '2026-09-30', dea: '2027-06-30', caqh: 'Due in 30d', payers: 3, status: 'active' },
  { id: 'PRV-006', name: 'Dr. Amira Khalil', npi: 'Pending', client: 'Gulf Medical Center', license: 'Pending', malpractice: 'Pending', dea: 'N/A', caqh: 'N/A', payers: 0, status: 'onboarding' },
]

export default function CredentialingPage() {
  const expiring = providers.filter(p => p.status === 'expiring').length
  return (
    <ModuleShell title="Credentialing" subtitle="Provider credentials and payer enrollment" sprint={4}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Active Providers" value={providers.filter(p=>p.status==='active').length} icon={<BadgeCheck size={20}/>}/>
        <KPICard label="Expiring (30 days)" value={expiring} trend="down"/>
        <KPICard label="Onboarding" value={providers.filter(p=>p.status==='onboarding').length}/>
        <KPICard label="Total Enrollments" value={providers.reduce((s,p)=>s+p.payers,0)}/>
      </div>
      {expiring > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14}/> {expiring} provider(s) have credentials expiring within 30 days
        </div>
      )}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Provider</th><th className="text-left px-4 py-3">NPI</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">License Exp</th>
            <th className="text-left px-4 py-3">Malpractice Exp</th><th className="text-left px-4 py-3">CAQH</th>
            <th className="text-right px-4 py-3">Payers</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{providers.map(p=>(
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-white/5 cursor-pointer">
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{p.npi}</td>
              <td className="px-4 py-3 text-xs text-muted">{p.client}</td>
              <td className="px-4 py-3 text-xs">{p.license}</td>
              <td className="px-4 py-3 text-xs">{p.malpractice}</td>
              <td className="px-4 py-3 text-xs text-muted">{p.caqh}</td>
              <td className="px-4 py-3 text-right">{p.payers}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.status==='active'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':p.status==='expiring'?'bg-amber-500/10 text-amber-400 border-amber-500/20':'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{p.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
