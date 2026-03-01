'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Scale, AlertTriangle } from 'lucide-react'

const contracts = [
  { id: 'CTR-001', payer: 'UnitedHealthcare', client: 'Irvine Family Practice', effective: '2025-01-01', expiry: '2026-12-31', status: 'active', underpayments: 3 },
  { id: 'CTR-002', payer: 'Aetna', client: 'Irvine Family Practice', effective: '2025-06-01', expiry: '2026-05-31', status: 'expiring', underpayments: 0 },
  { id: 'CTR-003', payer: 'Medicare', client: 'Patel Cardiology', effective: '2025-01-01', expiry: '2026-12-31', status: 'active', underpayments: 1 },
  { id: 'CTR-004', payer: 'Daman', client: 'Gulf Medical Center', effective: '2025-03-01', expiry: '2026-02-28', status: 'expired', underpayments: 0 },
  { id: 'CTR-005', payer: 'NAS', client: 'Dubai Wellness Clinic', effective: '2025-07-01', expiry: '2026-06-30', status: 'active', underpayments: 2 },
  { id: 'CTR-006', payer: 'BCBS', client: 'Patel Cardiology', effective: '2025-01-01', expiry: '2026-04-30', status: 'expiring', underpayments: 0 },
]

export default function ContractsPage() {
  return (
    <ModuleShell title="Contract Manager" subtitle="Payer contracts, fee schedules, and underpayment detection" sprint={3}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Active Contracts" value={contracts.filter(c=>c.status==='active').length} icon={<Scale size={20}/>}/>
        <KPICard label="Expiring (90 days)" value={contracts.filter(c=>c.status==='expiring').length} trend="down"/>
        <KPICard label="Underpayment Alerts" value={contracts.reduce((s,c)=>s+c.underpayments,0)}/>
        <KPICard label="Total Payers" value={contracts.length}/>
      </div>
      {contracts.filter(c=>c.status==='expiring').length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14}/> {contracts.filter(c=>c.status==='expiring').length} contract(s) expiring within 90 days
        </div>
      )}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Effective</th><th className="text-left px-4 py-3">Expiry</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Underpayments</th>
          </tr></thead>
          <tbody>{contracts.map(c=>(
            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-foreground/5 cursor-pointer">
              <td className="px-4 py-3 font-medium">{c.payer}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.client}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.effective}</td>
              <td className="px-4 py-3 text-xs text-muted">{c.expiry}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status === 'expiring' ? 'high' : c.status === 'expired' ? 'denied' : 'active'} small/></td>
              <td className="px-4 py-3 text-right">{c.underpayments > 0 ? <span className="text-amber-400">{c.underpayments}</span> : '0'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
