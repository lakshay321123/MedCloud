'use client'
import React from 'react'
import { useApp } from '@/lib/context'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { TrendingUp, Phone } from 'lucide-react'

const buckets = [{l:'0-30',v:145000,c:'bg-emerald-500'},{l:'31-60',v:98000,c:'bg-cyan-500'},{l:'61-90',v:52000,c:'bg-amber-500'},{l:'91-120',v:28000,c:'bg-orange-500'},{l:'120+',v:12000,c:'bg-red-500'}]
const max = Math.max(...buckets.map(b=>b.v))

const accounts = [
  { id: 'AR-001', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', original: 1200, balance: 488, age: 95, lastAction: 'Voice AI call — "In process"', nextFollowup: '2026-03-04', priority: 'urgent' as const },
  { id: 'AR-002', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', original: 320, balance: 320, age: 46, lastAction: 'Initial submission', nextFollowup: '2026-03-03', priority: 'high' as const },
  { id: 'AR-003', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', original: 350, balance: 126, age: 12, lastAction: 'Partial payment posted', nextFollowup: '2026-03-10', priority: 'medium' as const },
  { id: 'AR-004', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UHC', original: 250, balance: 0, age: 5, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const },
  { id: 'AR-005', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', original: 480, balance: 0, age: 31, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const },
  { id: 'AR-006', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', original: 890, balance: 890, age: 120, lastAction: 'Appeal L1 submitted', nextFollowup: '2026-03-02', priority: 'urgent' as const },
]

export default function ARManagementPage() {
  const { selectedClient } = useApp()
  const filtered = accounts.filter(a => !selectedClient || a.client.includes(selectedClient.name.split(' ')[0]))

  return (
    <ModuleShell title="A/R Management" subtitle="Accounts receivable follow-up and collections" sprint={3}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Total A/R" value="$335K" icon={<TrendingUp size={20}/>}/>
        <KPICard label="Worked Today" value="28" sub="+6" trend="up"/>
        <KPICard label="Follow-ups Due" value="42"/>
        <KPICard label="Avg Days Outstanding" value="34.2"/>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-muted mb-2">AGING BUCKETS</h3>
        <div className="flex items-end gap-4 h-28 px-4">{buckets.map(b=>(
          <div key={b.l} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted">${(b.v/1000).toFixed(0)}K</span>
            <div className={`w-full ${b.c} rounded-t transition-all`} style={{height:`${(b.v/max)*90}px`}}/>
            <span className="text-[10px] text-muted">{b.l} days</span>
          </div>
        ))}</div>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Payer</th><th className="text-right px-4 py-3">Balance</th>
            <th className="text-right px-4 py-3">Age</th><th className="text-left px-4 py-3">Last Action</th>
            <th className="text-left px-4 py-3">Next F/U</th><th className="text-left px-4 py-3">Priority</th>
          </tr></thead>
          <tbody>{filtered.map(a=>(
            <tr key={a.id} className="border-b border-border last:border-0 hover:bg-foreground/5 cursor-pointer">
              <td className="px-4 py-3 font-medium">{a.patient}</td>
              <td className="px-4 py-3 text-xs text-muted">{a.client}</td>
              <td className="px-4 py-3 text-xs text-muted">{a.payer}</td>
              <td className="px-4 py-3 text-right font-mono">{a.balance > 0 ? `$${a.balance}` : <span className="text-emerald-400">Paid</span>}</td>
              <td className="px-4 py-3 text-right text-xs">{a.age}d</td>
              <td className="px-4 py-3 text-xs text-muted">{a.lastAction}</td>
              <td className="px-4 py-3 text-xs text-muted">{a.nextFollowup}</td>
              <td className="px-4 py-3"><StatusBadge status={a.priority} small/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
