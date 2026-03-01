'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Phone, PhoneOff, Clock } from 'lucide-react'

const calls = [
  { id: 'CALL-001', type: 'Payer Status', target: 'UHC — Claim #CLM-4502', client: 'Gulf Medical Center', duration: '4:32', status: 'completed', outcome: 'In process — check back in 7 days' },
  { id: 'CALL-002', type: 'Patient Balance', target: 'Robert Chen — $488', client: 'Patel Cardiology', duration: '2:15', status: 'completed', outcome: 'Payment plan set up — $162/mo x 3' },
  { id: 'CALL-003', type: 'Payer Appeal', target: 'Aetna — Claim #CLM-4504', client: 'Irvine Family Practice', duration: '-', status: 'in_progress', outcome: 'On hold — 12 min' },
  { id: 'CALL-004', type: 'Patient Reminder', target: 'Maria Garcia — Appt Mar 3', client: 'Irvine Family Practice', duration: '0:45', status: 'completed', outcome: 'Confirmed via voicemail' },
  { id: 'CALL-005', type: 'Payer Status', target: 'NAS — Claim #CLM-4505', client: 'Dubai Wellness Clinic', duration: '-', status: 'queued', outcome: '-' },
  { id: 'CALL-006', type: 'Patient Balance', target: 'Khalid Ibrahim — AED 1,175', client: 'Dubai Wellness Clinic', duration: '3:08', status: 'completed', outcome: 'Patient will pay next week' },
  { id: 'CALL-007', type: 'Payer Status', target: 'Medicare — Claim #CLM-4503', client: 'Patel Cardiology', duration: '6:22', status: 'completed', outcome: 'Partial — applied to deductible' },
  { id: 'CALL-008', type: 'Patient Reminder', target: 'Robert Chen — Appt Mar 2', client: 'Patel Cardiology', duration: '0:38', status: 'completed', outcome: 'Confirmed' },
]

export default function VoiceAIPage() {
  return (
    <ModuleShell title="Voice AI" subtitle="Automated calls to payers and patients">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Calls Today" value={calls.filter(c=>c.status==='completed').length} icon={<Phone size={20}/>}/>
        <KPICard label="Avg Duration" value="3.2m" icon={<Clock size={20}/>}/>
        <KPICard label="Success Rate" value="87%"/>
        <KPICard label="Active Now" value={calls.filter(c=>c.status==='in_progress').length}/>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Target</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Duration</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Outcome</th>
          </tr></thead>
          <tbody>{calls.map(c=>(
            <tr key={c.id} className="border-b border-separator last:border-0 table-row cursor-pointer">
              <td className="px-4 py-3 text-xs">{c.type}</td>
              <td className="px-4 py-3 text-xs">{c.target}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{c.client}</td>
              <td className="px-4 py-3 font-mono text-xs">{c.duration}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status === 'queued' ? 'booked' : c.status} small/></td>
              <td className="px-4 py-3 text-xs text-content-secondary">{c.outcome}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
