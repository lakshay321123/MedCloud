'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ListChecks } from 'lucide-react'

const tasks = [
  { id: 'TSK-001', type: 'Missing Docs', entity: 'John Smith — visit Feb 25', client: 'Irvine Family Practice', priority: 'medium' as const, status: 'open' as const, assigned: 'Sarah K.', due: '2026-03-03', sla: 'green' },
  { id: 'TSK-002', type: 'Denial Review', entity: 'CLM-4504 — Sarah Johnson', client: 'Irvine Family Practice', priority: 'high' as const, status: 'in_progress' as const, assigned: 'Mike R.', due: '2026-03-04', sla: 'green' },
  { id: 'TSK-003', type: 'ERA Exception', entity: 'UHC ERA — unmatched $340', client: 'Patel Cardiology', priority: 'medium' as const, status: 'open' as const, assigned: 'Lisa T.', due: '2026-03-03', sla: 'yellow' },
  { id: 'TSK-004', type: 'Coding Query', entity: 'Robert Chen — Dr. Patel', client: 'Patel Cardiology', priority: 'high' as const, status: 'blocked' as const, assigned: 'Amy C.', due: '2026-03-02', sla: 'red' },
  { id: 'TSK-005', type: 'Credentialing', entity: 'Dr. Martinez — license renewal', client: 'Irvine Family Practice', priority: 'urgent' as const, status: 'in_progress' as const, assigned: 'Tom B.', due: '2026-03-10', sla: 'green' },
  { id: 'TSK-006', type: 'A/R Follow-up', entity: 'Emily Williams — $890 balance', client: 'Patel Cardiology', priority: 'urgent' as const, status: 'open' as const, assigned: 'Mike R.', due: '2026-03-02', sla: 'red' },
  { id: 'TSK-007', type: 'Appeal Deadline', entity: 'CLM-4511 — Khalid Ibrahim', client: 'Dubai Wellness Clinic', priority: 'high' as const, status: 'open' as const, assigned: 'Sarah K.', due: '2026-03-05', sla: 'yellow' },
  { id: 'TSK-008', type: 'Patient Contact', entity: 'Robert Chen — payment plan follow-up', client: 'Patel Cardiology', priority: 'low' as const, status: 'completed' as const, assigned: 'Voice AI', due: '2026-03-01', sla: 'green' },
]

export default function TasksPage() {
  const slaColor = (s: string) => s === 'green' ? 'bg-emerald-500' : s === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
  return (
    <ModuleShell title="Tasks & Workflows" subtitle="Track and manage work across all departments">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Open Tasks" value={tasks.filter(t=>t.status!=='completed').length} icon={<ListChecks size={20}/>}/>
        <KPICard label="In Progress" value={tasks.filter(t=>t.status==='in_progress').length}/>
        <KPICard label="Blocked" value={tasks.filter(t=>t.status==='blocked').length} trend="down"/>
        <KPICard label="SLA Breached" value={tasks.filter(t=>t.sla==='red').length} trend="down"/>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="w-2"></th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Entity</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Assigned</th>
            <th className="text-left px-4 py-3">Due</th><th className="text-left px-4 py-3">Priority</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{tasks.map(t=>(
            <tr key={t.id} className="border-b border-separator last:border-0 table-row cursor-pointer">
              <td className="pl-2"><div className={`w-1.5 h-6 rounded-full ${slaColor(t.sla)}`}/></td>
              <td className="px-4 py-3 text-xs font-medium">{t.type}</td>
              <td className="px-4 py-3 text-xs">{t.entity}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{t.client}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{t.assigned}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{t.due}</td>
              <td className="px-4 py-3"><StatusBadge status={t.priority} small/></td>
              <td className="px-4 py-3"><StatusBadge status={t.status} small/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
