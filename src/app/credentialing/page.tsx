'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { BadgeCheck, AlertTriangle, X } from 'lucide-react'
import { useCredentialing } from '@/lib/hooks'

const providers = [
  { id: 'PRV-001', name: 'Dr. Martinez', npi: '1234567890', client: 'Irvine Family Practice', license: '2027-06-30', malpractice: '2026-12-31', dea: '2027-03-15', caqh: 'Current', payers: 4, status: 'active' },
  { id: 'PRV-002', name: 'Dr. Patel', npi: '0987654321', client: 'Patel Cardiology', license: '2027-09-30', malpractice: '2026-04-15', dea: '2027-01-20', caqh: 'Current', payers: 5, status: 'expiring' },
  { id: 'PRV-003', name: 'Dr. Al Zaabi', npi: '1122334455', client: 'Gulf Medical Center', license: '2027-12-31', malpractice: '2026-11-30', dea: 'N/A', caqh: 'N/A', payers: 3, status: 'active' },
  { id: 'PRV-004', name: 'Dr. Noor', npi: '5544332211', client: 'Dubai Wellness Clinic', license: '2026-05-31', malpractice: '2026-05-31', dea: 'N/A', caqh: 'N/A', payers: 2, status: 'expiring' },
  { id: 'PRV-005', name: 'Dr. Williams', npi: '6677889900', client: 'Patel Cardiology', license: '2027-03-31', malpractice: '2026-09-30', dea: '2027-06-30', caqh: 'Due in 30d', payers: 3, status: 'active' },
  { id: 'PRV-006', name: 'Dr. Amira Khalil', npi: 'Pending', client: 'Gulf Medical Center', license: 'Pending', malpractice: 'Pending', dea: 'N/A', caqh: 'N/A', payers: 0, status: 'onboarding' },
]

type Provider = typeof providers[0]

export default function CredentialingPage() {
  const { toast } = useToast()
  const [selected, setSelected] = useState<Provider | null>(null)
  const { data: apiCredResult } = useCredentialing({ limit: 50 })
  const expiring = providers.filter(p => p.status === 'expiring').length

  return (
    <ModuleShell title="Credentialing" subtitle="Provider credentials and payer enrollment">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Active Providers" value={apiCredResult ? apiCredResult.data.filter(p=>p.status==='active').length : providers.filter(p=>p.status==='active').length} icon={<BadgeCheck size={20}/>}/>
        <KPICard label="Expiring (30 days)" value={apiCredResult ? apiCredResult.data.filter(p=>p.status==='expiring').length : expiring} trend="down"/>
        <KPICard label="Onboarding" value={apiCredResult ? apiCredResult.data.filter(p=>p.status==='onboarding').length : providers.filter(p=>p.status==='onboarding').length}/>
        <KPICard label="Total Enrollments" value={apiCredResult ? apiCredResult.data.reduce((s,p)=>s+(p.payer_enrollment_count||0),0) : providers.reduce((s,p)=>s+p.payers,0)}/>
      </div>
      {expiring > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14}/> {expiring} provider(s) have credentials expiring within 30 days
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Provider</th><th className="text-left px-4 py-3">NPI</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">License Exp</th>
            <th className="text-left px-4 py-3">Malpractice Exp</th><th className="text-left px-4 py-3">CAQH</th>
            <th className="text-right px-4 py-3">Payers</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{providers.map(p=>(
            <tr key={p.id}
              onClick={() => setSelected(p)}
              className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-content-secondary">{p.npi}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{p.client}</td>
              <td className="px-4 py-3 text-xs">{p.license}</td>
              <td className="px-4 py-3 text-xs">{p.malpractice}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{p.caqh}</td>
              <td className="px-4 py-3 text-right">{p.payers}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.status==='active'?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20':p.status==='expiring'?'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20':'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'}`}>{p.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-separator">
              <h3 className="font-semibold text-content-primary">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface-elevated rounded-btn">
                <X size={16} className="text-content-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
                  {selected.name.split(' ').pop()?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-content-primary">{selected.name}</div>
                  <div className="text-xs text-content-secondary">NPI: {selected.npi} · {selected.client}</div>
                </div>
              </div>

              {[
                { label: 'Medical License', value: selected.license },
                { label: 'Malpractice', value: selected.malpractice },
                { label: 'DEA', value: selected.dea },
                { label: 'CAQH', value: selected.caqh },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-separator">
                  <span className="text-xs text-content-secondary">{item.label}</span>
                  <span className={`text-xs font-medium ${item.value === 'Pending' ? 'text-amber-500' : item.value === 'N/A' ? 'text-content-tertiary' : 'text-content-primary'}`}>
                    {item.value}
                  </span>
                </div>
              ))}

              <div>
                <div className="text-xs text-content-secondary mb-2">Active Payer Enrollments: {selected.payers}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => toast.success('Re-credentialing initiated')}
                  className="bg-brand/10 text-brand rounded-lg py-2 text-xs font-medium hover:bg-brand/20 transition-colors">
                  Initiate Re-credentialing
                </button>
                <button onClick={() => toast.info('CAQH portal opened')}
                  className="bg-surface-elevated border border-separator rounded-lg py-2 text-xs font-medium">
                  Update CAQH
                </button>
                <button onClick={() => toast.success('Enrollment started')}
                  className="bg-surface-elevated border border-separator rounded-lg py-2 text-xs font-medium col-span-2">
                  Add Payer Enrollment
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ModuleShell>
  )
}
