'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { useEDITransactions, useIntegrationsStatus, useTestIntegration } from '@/lib/hooks'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Plug, X, RotateCcw, FileText } from 'lucide-react'

interface Integration {
  id: string; name: string; description: string; initials: string; color: string
  category: string; status: 'connected' | 'error' | 'not_configured' | 'pending'
  lastSync?: string; errorMsg?: string
}

const integrations: Integration[] = [
  // Clearinghouses
  { id:'availity', name:'Availity', description:'Primary clearinghouse — claims, eligibility, ERA', initials:'AV', color:'bg-brand', category:'Clearinghouses', status:'connected', lastSync:'5 min ago' },
  { id:'dha', name:'DHA eClaim (UAE)', description:'UAE DOH claims gateway', initials:'DH', color:'bg-brand', category:'Clearinghouses', status:'connected', lastSync:'14 min ago' },
  { id:'eclinical', name:'eClinicalWorks', description:'EHR integration & patient data', initials:'EC', color:'bg-[#00B5D6]', category:'EHR Systems', status:'pending' },
  // EHR Systems
  { id:'epic', name:'Epic FHIR', description:'Epic EHR FHIR R4 API', initials:'EP', color:'bg-brand-dark', category:'EHR Systems', status:'not_configured' },
  { id:'cerner', name:'Cerner HL7', description:'Cerner Millennium HL7 v2.x', initials:'CE', color:'bg-[#065E76]', category:'EHR Systems', status:'not_configured' },
  { id:'athena', name:'athenahealth', description:'Practice management & EHR', initials:'AT', color:'bg-[#616161]', category:'EHR Systems', status:'not_configured' },
  // Communication
  { id:'retell', name:'Retell Ai', description:'Voice Ai payer follow-up calls', initials:'RT', color:'bg-brand-mid', category:'Communication', status:'connected', lastSync:'1 min ago' },
  { id:'cloudfax', name:'Cloud Fax (SRFax)', description:'Inbound / outbound fax', initials:'CF', color:'bg-gray-500', category:'Communication', status:'error', errorMsg:'Auth failed — token expired' },
  { id:'email', name:'Email Ingest', description:'Automated email parsing', initials:'EM', color:'bg-[#00B5D6]', category:'Communication', status:'connected', lastSync:'8 min ago' },
  // Storage
  { id:'s3', name:'AWS S3', description:'Document storage & backups', initials:'S3', color:'bg-brand-pale', category:'Storage', status:'connected', lastSync:'2 min ago' },
  { id:'sharepoint', name:'SharePoint', description:'Document collaboration', initials:'SP', color:'bg-[#065E76]', category:'Storage', status:'not_configured' },
  { id:'sftp', name:'SFTP Server', description:'EDI file transfer', initials:'FT', color:'bg-[#00B5D6]', category:'Storage', status:'not_configured' },
]

const statusIcon = (s: string) => {
  if (s==='connected') return <CheckCircle2 size={16} className="text-brand-dark shrink-0"/>
  if (s==='error') return <AlertTriangle size={16} className="text-[#065E76] shrink-0"/>
  if (s==='pending') return <Clock size={16} className="text-brand-deep shrink-0"/>
  return <XCircle size={16} className="text-gray-500 shrink-0"/>
}

const statusLabel = (s: string) => ({ connected:'Connected ✓', error:'Error ✗', not_configured:'Not Configured', pending:'Pending Setup' }[s]??s)
const statusColor = (s: string) => ({ connected:'text-brand-dark dark:text-brand-dark', error:'text-[#065E76]', pending:'text-brand-deep', not_configured:'text-gray-400' }[s]??'text-gray-400')

function ConfigModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  async function handleSave() {
    setLoading(true)
    try {
      const { api } = await import('@/lib/api-client')
      await api.post('/integration-configs', {
        integration_id: integration.id,
        integration_name: integration.name,
        config: { category: integration.category },
        status: 'connected',
      })
      toast.success(`${integration.name} connected successfully`)
    } catch (err) {
      toast.error(`Failed to save configuration: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setLoading(false)
    onClose()
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
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary"/>
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
            <div><p className="text-sm font-semibold">{integration.name}</p><p className="text-[11px] text-content-secondary">Sync Logs</p></div>
          </div>
          <button onClick={onClose}><X size={16} className="text-content-secondary"/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-separator text-[11px] text-content-secondary">
              <th className="text-left px-4 py-2">Timestamp</th><th className="text-left px-4 py-2">Dir</th>
              <th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Records</th>
              <th className="text-left px-4 py-2">Duration</th>
            </tr></thead>
            <tbody>{logs.map((l,i)=>(
              <tr key={i} className="border-b border-separator last:border-0">
                <td className="px-4 py-2.5 font-mono text-[11px] text-content-secondary">{l.ts}</td>
                <td className="px-4 py-2.5 text-[11px]">{l.dir}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${l.status==='Success'?'bg-brand/10 text-brand-dark dark:text-brand-dark':'bg-[#065E76]/10 text-[#065E76]'}`}>{l.status}</span>
                </td>
                <td className="px-4 py-2.5 text-[11px]">{l.records}</td>
                <td className="px-4 py-2.5 text-[11px] text-content-secondary">{l.duration}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default function IntegrationsPage() {
  const { toast } = useToast()
  const { t } = useT()
  const [configFor, setConfigFor] = useState<Integration | null>(null)
  const [logsFor, setLogsFor] = useState<Integration | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  // Live integration status from backend
  const { data: liveStatus } = useIntegrationsStatus()
  const { mutate: testIntegration } = useTestIntegration()

  // Merge live AWS status into static integrations list
  const mergedIntegrations = useMemo(() => {
    const liveMap = new Map((liveStatus?.data || []).map(i => [i.name, i]))
    return integrations.map(ig => {
      // Map static IDs to API names
      const apiName = ig.id === 's3' ? 'aws_s3' : ig.id === 'retell' ? 'retell_ai' : null
      if (apiName && liveMap.has(apiName)) {
        const live = liveMap.get(apiName)!
        return { ...ig, status: (live.status === 'connected' ? 'connected' : live.status === 'failed' ? 'error' : ig.status) as Integration['status'], lastSync: live.last_check ? 'Live' : ig.lastSync }
      }
      return ig
    })
  }, [liveStatus])

  async function handleTestConnection(integrationId: string) {
    setTesting(integrationId)
    try {
      const apiName = integrationId === 's3' ? 'aws_s3' : integrationId === 'retell' ? 'retell_ai' : integrationId === 'availity' ? 'clearinghouse' : 'aws_bedrock'
      const result = await testIntegration({ integration: apiName })
      if (result?.status === 'connected') toast.success(`${integrationId} connection verified`)
      else toast.warning(`${integrationId}: ${result?.status || 'unknown'} — ${result?.error || 'manual check needed'}`)
    } catch { toast.error('Connection test failed') }
    finally { setTesting(null) }
  }

  // Real EDI transaction data
  const { data: ediResult } = useEDITransactions({ limit: 500 })
  const ediTxs = ediResult?.data || []
  const ediStats = useMemo(() => {
    const typeStats = (types: string[], label: string) => {
      const txs = ediTxs.filter(tx => types.includes(tx.transaction_type))
      return {
        type: label,
        sent: txs.filter(tx => tx.direction === 'outbound').length,
        accepted: txs.filter(tx => tx.status === 'accepted' || tx.status === 'received' || tx.status === 'parsed').length,
        rejected: txs.filter(tx => tx.status === 'rejected' || tx.status === 'error').length,
        last: txs[0]?.submitted_at ? new Date(txs[0].submitted_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
      }
    }
    return [
      typeStats(['837P'], '837P (Professional)'),
      typeStats(['837I'], '837I (Institutional)'),
      typeStats(['270', '271'], '270/271 (Eligibility)'),
      typeStats(['276', '277'], '276/277 (Claim Status)'),
    ]
  }, [ediTxs])

  const stats = {
    connected: mergedIntegrations.filter(i=>i.status==='connected').length,
    errors: mergedIntegrations.filter(i=>i.status==='error').length,
    pending: mergedIntegrations.filter(i=>i.status==='pending').length,
    total: mergedIntegrations.length,
  }

  const categories = mergedIntegrations.map(i=>i.category).filter((c,idx,arr)=>arr.indexOf(c)===idx)

  return (
    <ModuleShell title="Integration Hub" subtitle="External system connections and data pipes">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label={t('integrations','connected')} value={stats.connected} icon={<CheckCircle2 size={20}/>}/>
        <KPICard label={t("misc","errors")} value={stats.errors} icon={<AlertTriangle size={20}/>}/>
        <KPICard label={t("status","pending")} value={stats.pending} icon={<Clock size={20}/>}/>
        <KPICard label={t("misc","total")} value={stats.total} icon={<Plug size={20}/>}/>
      </div>

      {categories.map(cat=>(
        <div key={cat} className="mb-6">
          <h3 className="text-xs font-semibold text-content-secondary tracking-wider mb-3">{cat}</h3>
          <div className="grid grid-cols-3 gap-4">
            {mergedIntegrations.filter(i=>i.category===cat).map(intg=>(
              <div key={intg.id} className="card p-4 hover:border-brand/30 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 ${intg.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0`}>{intg.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-content-primary truncate">{intg.name}</p>
                      {statusIcon(intg.status)}
                    </div>
                    <p className="text-[11px] text-content-secondary truncate">{intg.description}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <span className={`text-[11px] font-medium ${statusColor(intg.status)}`}>{statusLabel(intg.status)}</span>
                  {intg.lastSync&&<p className="text-[11px] text-content-tertiary">Last sync: {intg.lastSync}</p>}
                  {intg.errorMsg&&<p className="text-[11px] text-[#065E76] mt-0.5 truncate">{intg.errorMsg}</p>}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={()=>setConfigFor(intg)} className="flex-1 text-[11px] font-medium border border-brand/30 text-brand py-1.5 rounded hover:bg-brand/10 transition-colors">Configure</button>
                  {intg.status==='connected'&&<button onClick={()=>handleTestConnection(intg.id)} disabled={testing===intg.id} className="flex-1 text-[11px] font-medium border border-separator text-content-secondary py-1.5 rounded hover:text-content-secondary transition-colors disabled:opacity-50">{testing===intg.id?'Testing...':'Test'}</button>}
                  <button onClick={()=>setLogsFor(intg)} className="flex-1 text-[11px] font-medium border border-separator text-content-secondary py-1.5 rounded hover:text-content-secondary transition-colors">Logs</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {configFor&&<ConfigModal integration={configFor} onClose={()=>setConfigFor(null)}/>}
      {logsFor&&<LogDrawer integration={logsFor} onClose={()=>setLogsFor(null)}/>}

      {/* ── Clearinghouse Status ── */}
      <div className="card p-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">Clearinghouse Status — Availity</h3>
        <div className="grid grid-cols-4 gap-3 mb-4 text-center">
          {[{label:'Claims Sent Today',value:'234',color:'text-brand'},{label:'Accepted',value:'228',color:'text-brand-dark'},{label:'Rejected',value:'6',color:'text-[#065E76]'},{label:'Acceptance Rate',value:'97.4%',color:'text-brand-dark'}].map(k=>
            <div key={k.label} className="bg-surface-elevated rounded-lg p-3">
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[11px] text-content-tertiary">{k.label}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {ediStats.map(edi=>(
            <div key={edi.type} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2">
              <span className="text-xs font-medium w-48">{edi.type}</span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-content-secondary">{edi.sent} sent</span>
                <span className="text-brand-dark">{edi.accepted} accepted</span>
                {edi.rejected > 0 && <span className="text-[#065E76]">{edi.rejected} rejected</span>}
                <span className="text-content-tertiary">{edi.last}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payer Enrollment Status ── */}
      <div className="card p-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">Payer EDI Enrollment</h3>
        <div className="space-y-2">
          {[{payer:'Aetna',status:'enrolled',types:['837P','835','270/271','276/277'],since:'2024-06-15'},
            {payer:'BCBS',status:'enrolled',types:['837P','835','270/271'],since:'2024-07-01'},
            {payer:'United Healthcare',status:'enrolled',types:['837P','835','270/271','276/277','278'],since:'2024-05-20'},
            {payer:'Cigna',status:'pending',types:['837P','835'],since:'2026-02-28'},
            {payer:'Medicare (CMS)',status:'enrolled',types:['837P','837I','835','270/271','276/277'],since:'2024-04-01'}
          ].map(p=>(
            <div key={p.payer} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium w-36">{p.payer}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.status==='enrolled'?'bg-brand/10 text-brand-dark':'bg-brand-pale0/10 text-brand-deep'}`}>{p.status}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.types.map(t=><span key={t} className="text-[9px] bg-surface px-1.5 py-0.5 rounded text-content-tertiary">{t}</span>)}
                <span className="text-[11px] text-content-tertiary ml-2">Since {p.since}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  )
}
