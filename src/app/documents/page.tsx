'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { useToast } from '@/components/shared/Toast'
import { demoDocs, demoFaxes, DemoDocRecord } from '@/lib/demo-data'
import {
  Search, Upload, X, Download, AlertTriangle, FileText, CreditCard,
  DollarSign, XCircle, Stethoscope, File, Eye, Send
} from 'lucide-react'

const typeIcon: Record<string, React.ReactNode> = {
  'Superbill': <FileText size={14} className="text-amber-500"/>,
  'Clinical Note': <Stethoscope size={14} className="text-blue-500"/>,
  'Insurance Card': <CreditCard size={14} className="text-emerald-500"/>,
  'EOB': <DollarSign size={14} className="text-purple-500"/>,
  'Denial Letter': <XCircle size={14} className="text-red-500"/>,
  'Contract': <FileText size={14} className="text-brand"/>,
  'Credential': <File size={14} className="text-gray-400"/>,
  'Fax': <Send size={14} className="text-gray-400"/>,
}

const sourceBadge = (s: string) => {
  const map: Record<string,string> = {
    'Portal Upload':'bg-brand/10 text-brand','Email Ingest':'bg-blue-500/10 text-blue-500',
    'Fax':'bg-amber-500/10 text-amber-500','Manual Upload':'bg-surface-elevated text-content-secondary',
    'Textract Scan':'bg-purple-500/10 text-purple-500',
  }
  return map[s] ?? 'bg-surface-elevated text-content-secondary'
}

const statusBadge = (s: string) => {
  if (s==='Linked') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (s==='Unlinked') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  return 'bg-blue-500/10 text-blue-500'
}

function DocPreviewDrawer({ doc, onClose }: { doc: DemoDocRecord; onClose: () => void }) {
  const { toast } = useToast()
  const [patientSearch, setPatientSearch] = useState('')
  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl animate-fade-in">
      <div className="p-4 border-b border-separator flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {typeIcon[doc.type] ?? <File size={14}/>}
            <span className="text-sm font-semibold text-content-primary">{doc.type}</span>
          </div>
          <p className="text-xs text-content-secondary font-mono">{doc.name}</p>
          <p className="text-[10px] text-content-tertiary mt-0.5">Uploaded {doc.uploadDate} · {doc.source}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn"><X size={16} className="text-content-secondary"/></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Preview area */}
        <div className="m-4 bg-surface-elevated rounded-lg h-64 flex items-center justify-center border border-separator">
          <div className="text-center">
            {typeIcon[doc.type] ?? <File size={32}/>}
            <p className="text-xs text-content-secondary mt-2 font-mono">{doc.name}</p>
            <p className="text-[10px] text-content-tertiary mt-1">Document preview</p>
          </div>
        </div>
        {/* Link to patient section */}
        {doc.status === 'Unlinked' && (
          <div className="mx-4 mb-4 card p-4">
            <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Link to Patient</h4>
            {doc.aiConfidence && (
              <div className="bg-brand/10 border border-brand/20 rounded-lg p-2 mb-3 text-[11px] text-brand flex items-center gap-2">
                <span>AI Classification: {doc.type}</span>
                <span className="ml-auto font-bold">{doc.aiConfidence}% confidence</span>
              </div>
            )}
            <input value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder="Search patient name..."
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary mb-3"/>
            <button onClick={()=>toast.success('Document linked to patient')}
              className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-deep transition-colors">
              Link Document
            </button>
          </div>
        )}
        {/* Access log */}
        <div className="mx-4 mb-4">
          <details className="card">
            <summary className="px-4 py-3 text-xs font-semibold text-content-secondary cursor-pointer select-none">Access Log</summary>
            <div className="px-4 pb-3 space-y-1.5 border-t border-separator pt-2">
              {[
                { user: 'Maria Rodriguez', time: 'Mar 1 2026 9:14 AM', action: 'Viewed' },
                { user: 'Tom Baker', time: 'Mar 1 2026 11:32 AM', action: 'Downloaded' },
              ].map((e,i)=>(
                <div key={i} className="text-[10px] text-content-secondary">{e.action} by {e.user} — {e.time}</div>
              ))}
            </div>
          </details>
        </div>
      </div>
      <div className="p-4 border-t border-separator">
        <button onClick={()=>toast.success('Download started')}
          className="w-full flex items-center justify-center gap-2 border border-separator text-content-secondary hover:text-content-primary rounded-lg py-2.5 text-sm transition-colors">
          <Download size={14}/> Download
        </button>
      </div>
    </div>
  )
}

function AllDocsTab() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<DemoDocRecord | null>(null)

  const types = ['Superbill','Clinical Note','Insurance Card','EOB','Denial Letter','Contract','Credential','Fax']
  const toggleType = (t: string) => setTypeFilter(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])

  const filtered = demoDocs.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.patient.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter.length > 0 && !typeFilter.includes(d.type)) return false
    if (statusFilter && d.status !== statusFilter) return false
    return true
  })

  return (
    <div>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents, patients..."
          className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary"/>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {types.map(t=>(
          <button key={t} onClick={()=>toggleType(t)}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all ${typeFilter.includes(t)?'bg-brand/10 text-brand border-brand/30':'border-separator text-content-secondary hover:text-content-primary'}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
            <option value="">All Statuses</option>
            {['Linked','Unlinked','Processing'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Document</th><th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Source</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(d=>(
            <tr key={d.id} onClick={()=>setSelectedDoc(d)} className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {typeIcon[d.type]??<File size={14}/>}
                  <span className="text-xs font-mono truncate max-w-[160px]">{d.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs">{d.type}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{d.client}</td>
              <td className="px-4 py-3 text-xs">{d.patient}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{d.uploadDate}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${sourceBadge(d.source)}`}>{d.source}</span></td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(d.status)}`}>{d.status}</span></td>
              <td className="px-4 py-3">
                <button onClick={e=>{e.stopPropagation();setSelectedDoc(d)}} className="p-1.5 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary transition-colors">
                  <Eye size={12}/>
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {selectedDoc&&<>
        <div className="fixed inset-0 bg-black/20 z-30" onClick={()=>setSelectedDoc(null)}/>
        <DocPreviewDrawer doc={selectedDoc} onClose={()=>setSelectedDoc(null)}/>
      </>}
    </div>
  )
}

function UnlinkedQueueTab() {
  const { toast } = useToast()
  const [patientSearch, setPatientSearch] = useState<Record<string,string>>({})
  const [linking, setLinking] = useState<string|null>(null)
  const unlinked = demoDocs.filter(d=>d.status==='Unlinked')
  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle size={14}/> {unlinked.length} document(s) need to be linked to a patient
      </div>
      {unlinked.map(d=>(
        <div key={d.id} className="card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {typeIcon[d.type]??<File size={14}/>}
              <div>
                <p className="text-sm font-medium font-mono">{d.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${sourceBadge(d.source)}`}>{d.source}</span>
                  {d.aiConfidence&&<span className="text-[10px] text-brand">AI: {d.type} · {d.aiConfidence}% conf</span>}
                  <span className="text-[10px] text-content-tertiary">Arrived: {d.uploadDate}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {linking===d.id ? (
                <div className="flex gap-2 items-center">
                  <input value={patientSearch[d.id]||''} onChange={e=>setPatientSearch(p=>({...p,[d.id]:e.target.value}))}
                    placeholder="Patient name..." className="bg-surface-elevated border border-separator rounded px-2 py-1 text-xs text-content-primary w-40"/>
                  <button onClick={()=>{toast.success('Document linked to patient');setLinking(null)}}
                    className="text-[10px] bg-brand text-white px-3 py-1.5 rounded-lg">Link</button>
                  <button onClick={()=>setLinking(null)} className="text-[10px] border border-separator px-2 py-1.5 rounded-lg text-content-secondary">Cancel</button>
                </div>
              ) : (
                <>
                  <button onClick={()=>setLinking(d.id)} className="text-[10px] bg-brand/10 text-brand px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors">Link to Patient</button>
                  <button onClick={()=>toast.warning('Document discarded')} className="text-[10px] border border-separator text-content-secondary px-3 py-1.5 rounded-lg hover:text-red-500 hover:border-red-500/30 transition-colors">Discard</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FaxCenterTab() {
  const { toast } = useToast()
  const [subTab, setSubTab] = useState<'inbound'|'outbound'>('inbound')
  const [showSendFax, setShowSendFax] = useState(false)
  const faxes = demoFaxes.filter(f => subTab==='inbound' ? f.direction==='Inbound' : f.direction==='Outbound')
  const statusStyle = (s: string) => s==='Received'||s==='Sent'?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':s==='Failed'?'bg-red-500/10 text-red-500':s==='Pending'?'bg-amber-500/10 text-amber-500':'bg-surface-elevated text-content-secondary'
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['inbound','outbound'] as const).map(t=>(
            <button key={t} onClick={()=>setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium ${subTab===t?'bg-brand/10 text-brand':'bg-surface-elevated text-content-secondary border border-separator'}`}>
              {t==='inbound'?'Inbound':'Outbound'}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowSendFax(true)} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors">
          <Send size={14}/> Send Fax
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Fax ID</th><th className="text-left px-4 py-3">From / To</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Pages</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Document</th>
            <th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{faxes.map(f=>(
            <tr key={f.id} className="border-b border-separator last:border-0 table-row">
              <td className="px-4 py-3 font-mono text-xs">{f.id}</td>
              <td className="px-4 py-3 text-xs">{f.fromTo}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{f.date}</td>
              <td className="px-4 py-3 text-xs">{f.pages}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle(f.status)}`}>{f.status}</span></td>
              <td className="px-4 py-3 text-xs text-brand">{f.document??'—'}</td>
              <td className="px-4 py-3 flex gap-1">
                {f.document&&<button onClick={()=>toast.success('Download started')} className="text-[10px] text-content-secondary hover:text-content-primary border border-separator px-2 py-1 rounded transition-colors">View</button>}
                {f.direction==='Inbound'&&<button onClick={()=>toast.success('Fax linked to patient record')} className="text-[10px] text-brand hover:underline px-2 py-1">Link</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showSendFax&&(
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={()=>setShowSendFax(false)}/>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Send Fax</h3>
                <button onClick={()=>setShowSendFax(false)}><X size={16} className="text-content-secondary"/></button>
              </div>
              {[['To (fax number)','e.g. 1-800-555-0001'],['From','Your fax line'],['Subject','Re: Patient...']].map(([l,p])=>(
                <div key={l}>
                  <label className="text-xs text-content-secondary block mb-1">{l}</label>
                  <input placeholder={p} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
                </div>
              ))}
              <div>
                <label className="text-xs text-content-secondary block mb-1">Attach Document</label>
                <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                  <option value="">Select document...</option>
                  {demoDocs.filter(d=>d.status==='Linked').slice(0,5).map(d=><option key={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button onClick={()=>{toast.success('Fax queued for delivery');setShowSendFax(false)}}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors">
                Send Fax
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const TABS = [
  { id: 'all', label: 'All Documents' },
  { id: 'unlinked', label: `Unlinked (${demoDocs.filter(d=>d.status==='Unlinked').length})` },
  { id: 'fax', label: 'Fax Center' },
] as const
type TabId = typeof TABS[number]['id']

export default function DocumentsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<TabId>('all')
  return (
    <ModuleShell title="Documents" subtitle="Document vault, fax center, and unlinked queue"
      actions={<button onClick={()=>toast.info('Bulk upload opened')} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep transition-colors"><Upload size={16}/> Bulk Upload</button>}>
      <div className="flex gap-2 mb-4">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium ${tab===t.id?'bg-brand/10 text-brand':'bg-surface-elevated text-content-secondary border border-separator'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='all'&&<AllDocsTab/>}
      {tab==='unlinked'&&<UnlinkedQueueTab/>}
      {tab==='fax'&&<FaxCenterTab/>}
    </ModuleShell>
  )
}
