'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { Plug, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

const integrations = [
  { name: 'Availity (Clearinghouse)', status: 'connected', lastSync: '2 min ago', errors: 0 },
  { name: 'Change Healthcare', status: 'connected', lastSync: '5 min ago', errors: 0 },
  { name: 'DHA eClaim (UAE)', status: 'connected', lastSync: '1 hr ago', errors: 0 },
  { name: 'Cloud Fax (SRFax)', status: 'error', lastSync: '3 hrs ago', errors: 2 },
  { name: 'Email Ingest', status: 'connected', lastSync: '10 min ago', errors: 0 },
  { name: 'Epic EHR (FHIR)', status: 'not_configured', lastSync: '-', errors: 0 },
  { name: 'Cerner EHR (HL7)', status: 'not_configured', lastSync: '-', errors: 0 },
  { name: 'SharePoint Sync', status: 'not_configured', lastSync: '-', errors: 0 },
]

const icon = (s: string) => s === 'connected' ? <CheckCircle2 size={16} className="text-emerald-600 text-emerald-600 dark:text-emerald-400"/> : s === 'error' ? <AlertTriangle size={16} className="text-red-600 text-red-600 dark:text-red-400"/> : <XCircle size={16} className="text-gray-500"/>

export default function IntegrationsPage() {
  return (
    <ModuleShell title="Integration Hub" subtitle="External system connections and data pipes">
      <div className="grid grid-cols-2 gap-4">{integrations.map(i=>(
        <div key={i.name} className="card p-4 flex items-center justify-between hover:border-brand/30 transition-all">
          <div className="flex items-center gap-3">
            {icon(i.status)}
            <div>
              <div className="text-sm font-medium">{i.name}</div>
              <div className="text-[10px] text-content-secondary">{i.status === 'connected' ? `Last sync: ${i.lastSync}` : i.status === 'error' ? `${i.errors} errors — last sync: ${i.lastSync}` : 'Not configured'}</div>
            </div>
          </div>
          <button className={`text-xs px-3 py-1 rounded-lg border ${i.status==='not_configured'?'border-brand/30 text-brand hover:bg-brand/10':'border-separator text-content-secondary hover:text-content-primary'}`}>
            {i.status === 'not_configured' ? 'Configure' : 'Settings'}
          </button>
        </div>
      ))}</div>
    </ModuleShell>
  )
}
