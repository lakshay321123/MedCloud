'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Plug, X, RotateCcw, FileText } from 'lucide-react'

interface Integration {
  id: string; name: string; description: string; initials: string; color: string
  category: string; status: 'connected' | 'error' | 'not_configured' | 'pending'
  lastSync?: string; errorMsg?: string
}

const integrations: Integration[] = [
  // Clearinghouses
  { id:'availity', name:'Availity', description:'Real-time eligibility & claims', initials:'AV', color:'bg-blue-500', category:'Clearinghouses', status:'connected', lastSync:'2 min ago' },
  { id:'change', name:'Change Healthcare', description:'Claims clearinghouse & EDI', initials:'CH', color:'bg-indigo-500', category:'Clearinghouses', status:'error', errorMsg:'API timeout — last success 3h ago' },
  { id:'dha', name:'DHA eClaim (UAE)', description:'UAE DOH claims gateway', initials:'DH', color:'bg-emerald-500', category:'Clearinghouses', status:'connected', lastSync:'14 min ago' },
  { id:'eclinical', name:'eClinicalWorks', description:'EHR integration & patient data', initials:'EC', color:'bg-cyan-500', category:'EHR Systems', status:'pending' },
  // EHR Systems
  { id:'epic', name:'Epic FHIR', description:'Epic EHR FHIR R4 API', initials:'EP', color:'bg-violet-500', category:'EHR Systems', status:'not_configured' },
  { id:'cerner', name:'Cerner HL7', description:'Cerner Millennium HL7 v2.x', initials:'CE', color:'bg-rose-500', category:'EHR Systems', status:'not_configured' },
  { id:'athena', name:'athenahealth', description:'Practice management & EHR', initials:'AT', color:'bg-orange-500', category:'EHR Systems', status:'not_configured' },
  // Communication
  { id:'twilio', name:'Twilio', description:'Voice AI & SMS outreach', initials:'TW', color:'bg-red-500', category:'Communication', status:'connected', lastSync:'1 min ago' },
  { id:'cloudfax', name:'Cloud Fax (SRFax)', description:'Inbound / outbound fax', initials:'CF', color:'bg-gray-500', category:'Communication', status:'error', errorMsg:'Auth failed — token expired' },
  { id:'email', name:'Email Ingest', description:'Automated email parsing', initials:'EM', color:'bg-sky-500', category:'Communication', status:'connected', lastSync:'8 min ago' },
  // Storage
  { id:'s3', name:'AWS S3', description:'Document storage & backups', initials:'S3', color:'bg-amber-500', category:'Storage', status:'connected', lastSync:'2 min ago' },
  { id:'sharepoint', name:'SharePoint', description:'Document collaboration', initials:'SP', color:'bg-blue-600', category:'Storage', status:'not_configured' },
  { id:'sftp', name:'SFTP Server', description:'EDI file transfer', initials:'FT', color:'bg-teal-500', category:'Storage', status:'not_configured' },
]

const statusIcon = (s: string) => {
  if (s==='connected') return <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>
  if (s==='error') return <AlertTriangle size={16} className="text-red-500 shrink-0"/>
  if (s==='pending') return <Clock size={16} className="text-amber-500 shrink-0"/>
  return <XCircle size={16} className="text-gray-500 shrink-0"/>
}

const statusLabel = (s: string) => ({ connected:'Connected ✓', error:'Error ✗', not_configured:'Not Configured', pending:'Pending Setup' }[s]??s)
const statusColor = (s: string) => ({ connected:'text-emerald-600 dark:text-emerald-400', error:'text-red-500', pending:'text-amber-500', not_configured:'text-gray-400' }[s]??'text-gray-400')

function ConfigModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const { toast } = useToast()
  const { t } = useT()
  const [loading, setLoading] = useState(false)
  function handleSave() {
    setLoading(true)
    setTimeout(()=>{ setLoading(false); toast.success(`${integration.name} connected successfully`); onClose() }, 1800)
  }
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}/>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${integration.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>{integration.initials}</div>
              <div><h3 className="text-base font-semibold">{integration.name}</h3><p className="text-xs text-content-secondary">{integration.description}</p></div>
            </div>
            <button onClick={onClose}><X size={16} className="text-content-secondary"/></button>
          </div>
          {[['API Key','•••••••••••••••••'],['Endpoint URL','https://api.example.com'],['Region','us-east-1']].map(([l,p])=>(
            <div key={l}>
              <label className="text-xs text-content-secondary block mb-1">{l}</label>
              <input type={l==='API Key'?'password':'text'} placeholder={p}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <label className="text-xs text-content-secondary">Test Mode</label>
            <button className="w-10 h-5 bg-brand/30 rounded-full relative"><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow"/></button>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {loading&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            {loading?'Testing Connection...':'Save & Test Connection'}
          </button>
        </div>
      </div>
    </>
  )
}

function LogDrawer({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const logs = [
    { ts:'2026-03-02 09:14', dir:'Outbound', status:'Success', records:42, duration:'1.2s', error:'' },
    { ts:'2026-03-02 07:30', dir:'Inbound', status:'Success', records:18, duration:'0.8s', error:'' },
    { ts:'2026-03-01 17:45', dir:'Outbound', status:'Failed', records:0, duration:'30.0s', error:'Connection timeout' },
    { ts:'2026-03-01 15:00', dir:'Inbound', status:'Success', records:7, duration:'0.5s', error:'' },
  ]
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose}/>
      <div className="fixed inset-y-0 right-0 w-[480px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl animate-fade-in">
        <div className="p-4 border-b border-separator flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${integration.color} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>{integration.initials}</div>
            <div><p className="text-sm font-semibold">{integration.name}</p><p className="text-[10px] text-content-secondary">Sync Logs</p></div>
          </div>
          <button onClick={onClose}><X size={16} className="text-content-secondary"/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-separator text-[10px] text-content-secondary">
              <th className="text-left px-4 py-2">Timestamp</th><th className="text-left px-4 py-2">Dir</th>
              <th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Records</th>
              <th className="text-left px-4 py-2">Duration</th>
            </tr></thead>
            <tbody>{logs.map((l,i)=>(
              <tr key={i} className="border-b border-separator last:border-0">
                <td className="px-4 py-2.5 font-mono text-[10px] text-content-secondary">{l.ts}</td>
                <td className="px-4 py-2.5 text-[10px]">{l.dir}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${l.status==='Success'?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-red-500/10 text-red-500'}`}>{l.status}</span>
                </td>
                <td className="px-4 py-2.5 text-[10px]">{l.records}</td>
                <td className="px-4 py-2.5 text-[10px] text-content-secondary">{l.duration}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default function IntegrationsPage() {
  const { t } = useT()
  const { toast } = useToast()
  const [configFor, setConfigFor] = useState<Integration | null>(null)
  const [logsFor, setLogsFor] = useState<Integration | null>(null)

  const stats = {
    connected: integrations.filter(i=>i.status==='connected').length,
    errors: integrations.filter(i=>i.status==='error').length,
    pending: integrations.filter(i=>i.status==='pending').length,
    total: integrations.length,
  }

  const categories = integrations.map(i=>i.category).filter((c,idx,arr)=>arr.indexOf(c)===idx)

  return (
    <ModuleShell title={t("integrations","title")} subtitle={t("integrations","subtitle")}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label={t("integrations","connected")} value={stats.connected} icon={<CheckCircle2 size={20}/>}/>
        <KPICard label="Errors" value={stats.errors} icon={<AlertTriangle size={20}/>}/>
        <KPICard label="Pending" value={stats.pending} icon={<Clock size={20}/>}/>
        <KPICard label="Total" value={stats.total} icon={<Plug size={20}/>}/>
      </div>

      {categories.map(cat=>(
        <div key={cat} className="mb-6">
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-3 gap-4">
            {integrations.filter(i=>i.category===cat).map(intg=>(
              <div key={intg.id} className="card p-4 hover:border-brand/30 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 ${intg.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0`}>{intg.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-content-primary truncate">{intg.name}</p>
                      {statusIcon(intg.status)}
                    </div>
                    <p className="text-[10px] text-content-secondary truncate">{intg.description}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <span className={`text-[11px] font-medium ${statusColor(intg.status)}`}>{statusLabel(intg.status)}</span>
                  {intg.lastSync&&<p className="text-[10px] text-content-tertiary">Last sync: {intg.lastSync}</p>}
                  {intg.errorMsg&&<p className="text-[10px] text-red-500 mt-0.5 truncate">{intg.errorMsg}</p>}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={()=>setConfigFor(intg)} className="flex-1 text-[10px] font-medium border border-brand/30 text-brand py-1.5 rounded hover:bg-brand/10 transition-colors">Configure</button>
                  {intg.status==='connected'&&<button onClick={()=>toast.info(`Testing ${intg.name}...`)} className="flex-1 text-[10px] font-medium border border-separator text-content-secondary py-1.5 rounded hover:text-content-primary transition-colors">Test</button>}
                  <button onClick={()=>setLogsFor(intg)} className="flex-1 text-[10px] font-medium border border-separator text-content-secondary py-1.5 rounded hover:text-content-primary transition-colors">Logs</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {configFor&&<ConfigModal integration={configFor} onClose={()=>setConfigFor(null)}/>}
      {logsFor&&<LogDrawer integration={logsFor} onClose={()=>setLogsFor(null)}/>}
    </ModuleShell>
  )
}
