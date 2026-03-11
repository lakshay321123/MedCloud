'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import ModuleShell from '@/components/shared/ModuleShell'
import { useToast } from '@/components/shared/Toast'
import { useApp } from '@/lib/context'
import type { DemoDocRecord, DemoFax } from '@/lib/demo-data'
import { useDocuments, usePatients, useRequestUploadUrl, useCreateDocument, useCreateCoding } from '@/lib/hooks'
import type { ApiDocument } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import {
  Search, Upload, X, Download, AlertTriangle, FileText, CreditCard,
  DollarSign, XCircle, Stethoscope, File, Eye, Send
} from 'lucide-react'

const typeIcon: Record<string, React.ReactNode> = {
  'Superbill': <FileText size={14} className="text-brand-deep"/>,
  'Clinical Note': <Stethoscope size={14} className="text-brand"/>,
  'Insurance Card': <CreditCard size={14} className="text-brand-dark"/>,
  'EOB': <DollarSign size={14} className="text-brand-dark"/>,
  'Denial Letter': <XCircle size={14} className="text-content-tertiary"/>,
  'Contract': <FileText size={14} className="text-brand"/>,
  'Credential': <File size={14} className="text-content-tertiary"/>,
  'License':    <File size={14} className="text-brand"/>,
  'Referral':   <Send size={14} className="text-teal-500"/>,
  'Fax': <Send size={14} className="text-content-tertiary"/>,
}

const sourceBadge = (s: string) => {
  const map: Record<string,string> = {
    'Portal Upload':'bg-[#D6EBF2] text-[#065E76]','Email Ingest':'bg-[#D6EBF2] text-[#065E76]',
    'Fax':'bg-[#616161]/10 text-[#616161]','Manual Upload':'bg-[#616161]/10 text-[#616161]',
    'Textract Scan':'bg-[#00B5D6]/10 text-[#00B5D6]',
  }
  return map[s] ?? 'bg-surface-elevated text-content-secondary'
}

const statusBadge = (s: string) => {
  if (s==='Linked') return 'bg-[#D6EBF2] text-[#065E76]'
  if (s==='Unlinked') return 'bg-[#616161]/10 text-[#616161]'
  return 'bg-[#00B5D6]/10 text-[#00B5D6]'
}

function DocPreviewDrawer({ doc, onClose }: { doc: DemoDocRecord; onClose: () => void }) {
  const { toast } = useToast()
  const { mutate: createCoding } = useCreateCoding()
  const [sendingToCoding, setSendingToCoding] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedLinkPatientId, setSelectedLinkPatientId] = useState<string | null>(doc.patientId || null)
  const { data: apiPtResult } = usePatients({ limit: 200 })
  const apiPatients = (Array.isArray(apiPtResult) ? apiPtResult : (apiPtResult as any)?.data || []).map((p: any) => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() }))
  const [downloading, setDownloading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Auto-fetch presigned URL for preview when drawer opens
  useEffect(() => {
    if (!doc.id || doc.id.startsWith('D-')) return
    let cancelled = false
    setPreviewLoading(true)
    api.get<{ download_url: string }>(`/documents/${doc.id}/download`, { mode: 'inline' })
      .then(res => { if (!cancelled && res.download_url) setPreviewUrl(res.download_url) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [doc.id])

  async function handleDownload() {
    // Demo docs (ids like D-001) have no real S3 key — skip real call
    if (doc.id.startsWith('D-')) {
      toast.success('Download started')
      return
    }
    setDownloading(true)
    try {
      const res = await api.get<{ download_url: string; file_name: string }>(`/documents/${doc.id}/download`)
      // Open presigned URL in new tab — browser will trigger file download
      window.open(res.download_url, '_blank', 'noopener')
      toast.success(`Downloading ${res.file_name}`)
    } catch {
      toast.error('Download failed — please try again')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] animate-fade-in">
      <div className="p-4 border-b border-separator flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {typeIcon[doc.type] ?? <File size={14}/>}
            <span className="text-sm font-semibold text-content-primary">{doc.type}</span>
          </div>
          <p className="text-[13px] text-content-secondary font-mono">{doc.name}</p>
          <p className="text-[11px] text-content-tertiary mt-0.5">Uploaded {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} · {doc.source}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn"><X size={16} className="text-content-secondary"/></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Preview area */}
        <div className={`relative bg-surface-elevated overflow-hidden border border-separator ${fullscreen ? 'fixed inset-0 z-50 rounded-none m-0' : 'm-4 rounded-lg'}`} style={fullscreen ? {} : { height: 'calc(100vh - 240px)', minHeight: '400px' }}>
          {previewUrl && <button onClick={() => setFullscreen(f => !f)} className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-lg px-2.5 py-1.5 text-[11px] hover:bg-black/80 transition-colors backdrop-blur-sm">{fullscreen ? '✕ Exit Fullscreen' : '⛶ Fullscreen'}</button>}
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-content-tertiary">Loading preview…</p>
            </div>
          ) : previewUrl && doc.name?.toLowerCase().endsWith('.pdf') ? (
            <iframe src={previewUrl} className="w-full h-full border-0" title="Document preview" />
          ) : previewUrl && /\.(jpe?g|png|gif|webp|heic)$/i.test(doc.name || '') ? (
            <div className="flex items-center justify-center h-full p-4">
              <img src={previewUrl} alt={doc.name} className="max-w-full max-h-full object-contain rounded" />
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <FileText size={40} className="opacity-30" />
              <p className="text-sm font-mono text-content-secondary">{doc.name}</p>
              <p className="text-xs text-content-tertiary">This file type cannot be previewed inline</p>
              <button onClick={() => window.open(previewUrl, '_blank', 'noopener')}
                className="text-[13px] bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-deep transition-colors mt-2 shadow-sm">
                Open in New Tab
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <FileText size={40} className="opacity-30" />
              <p className="text-sm font-mono text-content-secondary">{doc.name}</p>
              <p className="text-xs text-content-tertiary">Preview not available — use Download to open</p>
            </div>
          )}
        </div>
        {/* Quick Code Entry for Superbill / Clinical Note */}
        {(doc.type === 'Superbill' || doc.type === 'Clinical Note') && (
          <div className="mx-4 mb-4 card p-4">
            <div className="text-[11px] font-semibold text-content-secondary tracking-wider mb-3">Quick Code Entry</div>
            <div className="space-y-2">
              {[
                { label: 'CPT Code(s)', placeholder: 'e.g. 99214, 93000' },
                { label: 'ICD-10 Code(s)', placeholder: 'e.g. E11.9, I10' },
                { label: 'Modifier', placeholder: 'e.g. 25, 59' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[11px] text-content-tertiary block mb-1">{f.label}</label>
                  <input placeholder={f.placeholder}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand/40" />
                </div>
              ))}
              <button onClick={async () => {
                setSendingToCoding(true)
                try {
                  await createCoding({ status: 'pending', notes: `Document: ${doc.name || doc.patient || 'Unknown'}` })
                  toast.success('Sent to coding queue')
                  onClose()
                } catch { toast.error('Failed to send to coding queue') } finally { setSendingToCoding(false) }
              }} disabled={sendingToCoding}
                className="w-full bg-brand text-white rounded-lg py-2 text-[13px] font-medium hover:bg-brand-deep transition-colors mt-1 disabled:opacity-50">
                {sendingToCoding ? 'Sending…' : 'Send to Coding Queue'}
              </button>
            </div>
          </div>
        )}
        {/* Link to patient section */}
        {!doc.patientId && (
          <div className="mx-4 mb-4 card p-4">
            <h4 className="text-[13px] font-semibold text-content-secondary tracking-wider mb-3">Link to Patient</h4>
            {doc.aiConfidence && (
              <div className="bg-brand/10 border border-brand/20 rounded-lg p-2 mb-3 text-[11px] text-brand flex items-center gap-2">
                <span>AI Classification: {doc.type}</span>
                <span className="ml-auto font-bold">{doc.aiConfidence}% confidence</span>
              </div>
            )}
            <input value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder="Search patient name..."
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary placeholder:text-content-tertiary mb-2"/>
            {patientSearch.trim().length > 0 && (
              <div className="max-h-32 overflow-y-auto border border-separator rounded-lg mb-2">
                {apiPatients.filter((p: any) => p.name.toLowerCase().includes(patientSearch.toLowerCase())).slice(0,5).map((p: any) => (
                  <button key={p.id} onClick={() => { setSelectedLinkPatientId(p.id); setPatientSearch(p.name) }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-elevated border-b border-separator last:border-0 ${selectedLinkPatientId === p.id ? 'bg-brand/5 text-brand' : 'text-content-primary'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <button disabled={!selectedLinkPatientId} onClick={async ()=>{ try { await api.patch(`/documents/${doc.id}`, { patient_id: selectedLinkPatientId, status: 'linked' }); toast.success('Document linked to patient') } catch { toast.error('Link failed') } }}
              className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-deep transition-colors">
              Link Document
            </button>
          </div>
        )}
        {/* Access log */}
        <div className="mx-4 mb-4">
          <details className="card">
            <summary className="px-4 py-3 text-[13px] font-semibold text-content-secondary cursor-pointer select-none">Access Log</summary>
            <div className="px-4 pb-3 space-y-1.5 border-t border-separator pt-2">
              {[
                { user: 'Maria Rodriguez', time: 'Mar 1 2026 9:14 AM', action: 'Viewed' },
                { user: 'Tom Baker', time: 'Mar 1 2026 11:32 AM', action: 'Downloaded' },
              ].map((e,i)=>(
                <div key={i} className="text-[11px] text-content-secondary">{e.action} by {e.user} — {e.time}</div>
              ))}
            </div>
          </details>
        </div>
      </div>
      <div className="p-4 border-t border-separator">
        <button onClick={handleDownload} disabled={downloading}
          className="w-full flex items-center justify-center gap-2 border border-separator text-content-secondary hover:text-content-secondary rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50">
          <Download size={14}/> {downloading ? 'Preparing…' : 'Download'}
        </button>
      </div>
    </div>
  )
}

function AllDocsTab() {
  const { selectedClient, country } = useApp()
  const { data: apiDocRaw } = useDocuments()
  const apiDocs: DemoDocRecord[] = (Array.isArray(apiDocRaw) ? apiDocRaw : (apiDocRaw as any)?.data || []).map((d: ApiDocument) => ({
    id: d.id, name: d.file_name || 'document',
    fileName: d.file_name || 'document',
    type: d.doc_type || d.document_type || 'other',
    patient: (d as any).patient_name || '—', client: (d as any).client_name || '—',
    patientId: d.patient_id || null,
    clientId: d.client_id || '', uploadDate: d.created_at || '',
    uploadedBy: (d as any).uploaded_by_name || '—', uploadedAt: d.created_at || '',
    source: (d.source as DemoDocRecord['source']) || 'Manual Upload',
    status: d.status || 'uploaded', size: d.file_size || '—',
    textractStatus: (d as any).textract_status || 'pending',
    classification: (d as any).classification || null,
    classificationConfidence: d.ai_confidence || null,
  })) as DemoDocRecord[]
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const { toast } = useToast()
  const [selectedDoc, setSelectedDoc] = useState<DemoDocRecord | null>(null)
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null)
  const [linkSearch, setLinkSearch] = useState('')
  const { data: linkPtRaw } = usePatients({ limit: 200 })
  const linkPatients = (Array.isArray(linkPtRaw) ? linkPtRaw : (linkPtRaw as any)?.data || []).map((p: any) => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() }))

  const types = ['Superbill','Clinical Note','Insurance Card','EOB','Denial Letter','Contract','Credential','License','Referral','Fax']
  const toggleType = (t: string) => setTypeFilter(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])

  const filtered = apiDocs.filter(d => {
    if (d.clientId) {
      if (selectedClient && d.clientId !== selectedClient.id) return false
      // Region filtering handled by backend via useClientParams
    }
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
          className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-3 py-2 text-sm text-content-secondary placeholder:text-content-tertiary"/>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {types.map(t=>(
          <button key={t} onClick={()=>toggleType(t)}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all ${typeFilter.includes(t)?'bg-brand text-white border-brand shadow-sm':'border-separator text-content-secondary hover:border-brand/40 hover:text-brand'}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-[13px] text-content-secondary">
            <option value="">All Statuses</option>
            {['Linked','Unlinked','Processing'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
          <thead><tr className="border-b border-separator text-[13px] text-content-secondary">
            <th className="text-left px-4 py-3">Document</th><th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Source</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{filtered.length === 0 ? (
            <tr><td colSpan={8}>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3"><FileText size={20} className="text-content-tertiary" /></div>
                <p className="text-sm font-medium text-content-primary mb-1">No documents yet</p>
                <p className="text-[13px] text-content-secondary">Upload documents to see them here. Supports superbills, EOBs, insurance cards, and clinical notes.</p>
              </div>
            </td></tr>
          ) : filtered.map(d=>(
            <tr key={d.id} onClick={()=>setSelectedDoc(d)} className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {typeIcon[d.type]??<File size={14}/>}
                  <span className="text-xs font-mono truncate max-w-[160px]">{d.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs">{d.type}</td>
              <td className="px-4 py-3 text-[13px] text-content-secondary">{d.client}</td>
              <td className="px-4 py-3 text-xs">{d.patient}</td>
              <td className="px-4 py-3 text-[13px] text-content-secondary">{d.uploadDate ? new Date(d.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
              <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${sourceBadge(d.source)}`}>{d.source}</span></td>
              <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusBadge(d.status)}`}>{d.status}</span></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {!d.patientId && (
                    <button onClick={e=>{e.stopPropagation(); setLinkingDocId(d.id === linkingDocId ? null : d.id)}}
                      className="text-[11px] text-brand hover:underline px-1.5 py-1">Link</button>
                  )}
                  {d.patientId && <span className="text-[11px] text-brand-dark px-1.5">✓</span>}
                  <button onClick={e=>{e.stopPropagation();setSelectedDoc(d)}} className="p-1.5 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary transition-colors">
                    <Eye size={12}/>
                  </button>
                </div>
                {linkingDocId === d.id && (
                  <div className="absolute right-4 mt-1 z-30 w-64 bg-surface-default border border-separator rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-1" onClick={e=>e.stopPropagation()}>
                    <input autoFocus value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} placeholder="Search patient..."
                      className="w-full bg-surface-elevated border border-separator rounded px-2 py-1.5 text-xs mb-1 focus:outline-none focus:border-brand/40" />
                    <div className="max-h-32 overflow-y-auto">
                      {linkPatients.filter((p: {id:string;name:string}) => !linkSearch || p.name.toLowerCase().includes(linkSearch.toLowerCase())).slice(0,5).map((p: {id:string;name:string}) => (
                        <button key={p.id} onClick={async () => {
                          try {
                            await api.patch('/documents/' + d.id, { patient_id: p.id, status: 'linked' })
                            toast.success('Linked to ' + p.name)
                            setLinkingDocId(null)
                            setLinkSearch('')
                          } catch(err) {
                            toast.error('Link failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
                          }
                        }} className="w-full text-left px-2 py-1.5 text-[13px] hover:bg-brand/10 hover:text-brand rounded transition-colors">{p.name}</button>
                      ))}
                      {linkPatients.length === 0 && <p className="text-[11px] text-content-tertiary text-center py-2">No patients found</p>}
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
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
  const [selectedPatientIds, setSelectedPatientIds] = useState<Record<string,string>>({})
  const [linking, setLinking] = useState<string|null>(null)
  const { data: apiPtRaw } = usePatients({ limit: 200 })
  const ptList = (Array.isArray(apiPtRaw) ? apiPtRaw : (apiPtRaw as any)?.data || []).map((p: any) => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() }))
  const { data: apiDocRaw2 } = useDocuments()
  const apiDocs2: any[] = (Array.isArray(apiDocRaw2) ? apiDocRaw2 : (apiDocRaw2 as any)?.data || []).map((d: ApiDocument) => ({
    id: d.id, name: d.file_name || 'document',
    type: d.doc_type || d.document_type || 'other', patient: (d as any).patient_name || '—',
    patientId: d.patient_id || null,
    client: (d as any).client_name || '—', status: d.status || 'uploaded',
  })) as any[]
  const unlinked = apiDocs2.filter((d: any)=>!d.patientId)
  return (
    <div className="space-y-4">
      <div className="bg-brand-pale0/10 border border-brand-light/20 rounded-lg p-3 flex items-center gap-2 text-xs text-brand-deep dark:text-brand-deep">
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
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${sourceBadge(d.source)}`}>{d.source}</span>
                  {d.aiConfidence&&<span className="text-[11px] text-brand">AI: {d.type} · {d.aiConfidence}% conf</span>}
                  <span className="text-[11px] text-content-tertiary">Arrived: {d.uploadDate ? new Date(d.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {linking===d.id ? (
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <input value={patientSearch[d.id]||''} onChange={e=>{setPatientSearch(p=>({...p,[d.id]:e.target.value})); setSelectedPatientIds(p=>({...p,[d.id]:''}))}}
                      placeholder="Patient name..." className="bg-surface-elevated border border-separator rounded px-2 py-1 text-[13px] text-content-secondary w-40"/>
                    {(patientSearch[d.id]||'').length > 0 && !selectedPatientIds[d.id] && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[rgba(0,0,0,0.09)] rounded-[12px] shadow-xl max-h-28 overflow-y-auto w-48">
                        {ptList.filter((p:any)=>p.name.toLowerCase().includes((patientSearch[d.id]||'').toLowerCase())).slice(0,4).map((p:any)=>(
                          <button key={p.id} onClick={()=>{setSelectedPatientIds(prev=>({...prev,[d.id]:p.id}));setPatientSearch(prev=>({...prev,[d.id]:p.name}))}}
                            className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-elevated border-b border-separator last:border-0">{p.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button disabled={!selectedPatientIds[d.id]} onClick={async ()=>{ if (!linking || !selectedPatientIds[d.id]) return; try { await api.patch(`/documents/${linking}`, { patient_id: selectedPatientIds[d.id], status: 'linked' }); toast.success('Document linked'); setLinking(null) } catch { toast.error('Link failed') } }}
                    className="text-[11px] bg-brand text-white px-3 py-1.5 rounded-lg disabled:opacity-40">Link</button>
                  <button onClick={()=>setLinking(null)} className="text-[11px] border border-separator px-2 py-1.5 rounded-lg text-content-secondary">Cancel</button>
                </div>
              ) : (
                <>
                  <button onClick={()=>setLinking(d.id)} className="text-[11px] bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-deep transition-colors shadow-sm">Link to Patient</button>
                  <button onClick={async ()=>{ try { await api.patch(`/documents/${d.id}`, { status: 'discarded' }); toast.success('Document discarded') } catch { toast.warning('Document discarded locally') } }} className="text-[11px] border border-separator text-content-secondary px-3 py-1.5 rounded-lg hover:text-[#065E76] hover:border-[#065E76]/30 transition-colors">Discard</button>
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
  const [selectedFax, setSelectedFax] = useState<DemoFax | null>(null)
  const [faxTo, setFaxTo] = useState('')
  const [faxFrom, setFaxFrom] = useState('')
  const [faxSubject, setFaxSubject] = useState('')
  // Fax inbox is Sprint 3 (Textract pipeline) — empty until integrated
  const faxes: DemoFax[] = []
  const statusStyle = (s: string) => s==='Received'||s==='Sent'?'bg-brand/10 text-brand-dark dark:text-brand-dark':s==='Failed'?'bg-[#065E76]/10 text-[#065E76]':s==='Pending'?'bg-brand-pale0/10 text-brand-deep':'bg-surface-elevated text-content-secondary'
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['inbound','outbound'] as const).map(t=>(
            <button key={t} onClick={()=>setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium ${subTab===t?'bg-brand text-white shadow-sm':'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30 hover:text-brand-dark'}`}>
              {t==='inbound'?'Inbound':'Outbound'}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowSendFax(true)} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors">
          <Send size={14}/> Send Fax
        </button>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]">
          <thead><tr className="border-b border-separator text-[13px] text-content-secondary">
            <th className="text-left px-4 py-3">Fax ID</th><th className="text-left px-4 py-3">From / To</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Pages</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Document</th>
            <th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{faxes.map(f=>(
            <tr key={f.id} onClick={() => setSelectedFax(f)} className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3 font-mono text-xs">{f.id}</td>
              <td className="px-4 py-3 text-xs">{f.fromTo}</td>
              <td className="px-4 py-3 text-[13px] text-content-secondary">{f.date}</td>
              <td className="px-4 py-3 text-xs">{f.pages}</td>
              <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusStyle(f.status)}`}>{f.status}</span></td>
              <td className="px-4 py-3 text-xs text-brand">{f.document??'—'}</td>
              <td className="px-4 py-3 flex gap-1">
                {f.document&&<button onClick={e=>{e.stopPropagation(); if (f.document?.startsWith('http')) { window.open(f.document, '_blank'); toast.info('Opening fax...') } else { toast.error('Invalid document link') }}} className="text-[11px] text-content-secondary hover:text-content-secondary border border-separator px-2 py-1 rounded transition-colors">View</button>}
                {f.direction==='Inbound'&&<button onClick={e=>{e.stopPropagation();toast.info('Open fax in preview drawer to link to a patient')}} className="text-[11px] text-brand hover:underline px-2 py-1">Link</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>

      {/* Fax detail modal */}
      {selectedFax && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedFax(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-secondary rounded-xl p-5 w-full max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] border border-separator">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">{selectedFax.id}</h3>
                <button onClick={() => setSelectedFax(null)}><X size={16} className="text-content-secondary" /></button>
              </div>
              <div className="text-xs space-y-1.5">
                {[['Direction', selectedFax.direction], ['From/To', selectedFax.fromTo],
                  ['Date', selectedFax.date], ['Pages', selectedFax.pages],
                  ['Status', selectedFax.status]].map(([k,v]) => (
                  <div key={k}><span className="text-content-tertiary">{k}:</span><span className="ml-2">{v}</span></div>
                ))}
              </div>
              <button onClick={() => { if (selectedFax?.document?.startsWith('http')) { window.open(selectedFax.document, '_blank') } else { toast.info('No file attached to this fax') } setSelectedFax(null) }}
                className="w-full mt-4 bg-brand text-white rounded-lg py-2.5 text-sm font-medium">
                Download Fax
              </button>
            </div>
          </div>
        </>
      )}

      {showSendFax&&(
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={()=>setShowSendFax(false)}/>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Send Fax</h3>
                <button onClick={()=>setShowSendFax(false)}><X size={16} className="text-content-secondary"/></button>
              </div>
              <div>
                <label className="text-[13px] text-content-secondary block mb-1">To (fax number)</label>
                <input value={faxTo} onChange={e => setFaxTo(e.target.value)} placeholder="e.g. 1-800-555-0001" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary"/>
              </div>
              <div>
                <label className="text-[13px] text-content-secondary block mb-1">From</label>
                <input value={faxFrom} onChange={e => setFaxFrom(e.target.value)} placeholder="Your fax line" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary"/>
              </div>
              <div>
                <label className="text-[13px] text-content-secondary block mb-1">Subject</label>
                <input value={faxSubject} onChange={e => setFaxSubject(e.target.value)} placeholder="Re: Patient..." className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary"/>
              </div>
              <div>
                <label className="text-[13px] text-content-secondary block mb-1">Attach Document</label>
                <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                  <option value="">Select document...</option>
                  <option value=''>No faxes available</option>
                </select>
              </div>
              <button onClick={async ()=>{
              if (!faxTo.trim()) { toast.warning('Enter a recipient fax number'); return }
              try {
                await api.post('/fax/send', { to: faxTo, from: faxFrom, subject: faxSubject })
                toast.success('Fax queued for delivery')
              } catch {
                toast.warning('Fax could not be sent — queued for retry')
              }
              setShowSendFax(false); setFaxTo(''); setFaxFrom(''); setFaxSubject('')
            }}
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

function AIProcessingTab() {
  const { toast } = useToast()
  const { data: apiDocRaw } = useDocuments()
  const allDocs = useMemo(() => {
    return (Array.isArray(apiDocRaw) ? apiDocRaw : (apiDocRaw as any)?.data || []) as ApiDocument[]
  }, [apiDocRaw])

  const textractDocs = useMemo(() =>
    allDocs.filter(d => (d as any).textract_status || (d as any).classification || d.ai_confidence),
    [allDocs]
  )
  const processed = textractDocs.filter(d => (d as any).textract_status === 'completed').length
  const pending = textractDocs.filter(d => (d as any).textract_status === 'pending' || (d as any).textract_status === 'processing').length
  const avgConfidence = textractDocs.length > 0
    ? Math.round(textractDocs.reduce((s, d) => s + (d.ai_confidence || 0), 0) / textractDocs.length)
    : 0

  const [processing, setProcessing] = useState<Record<string, string>>({})

  async function handleClassify(docId: string) {
    if (processing[docId]) return
    setProcessing(p => ({ ...p, [docId]: 'classifying' }))
    try {
      const result = await api.post(`/documents/${docId}/classify`, {}) as Record<string, unknown>
      toast.success(`Classified as: ${result?.classification || 'unknown'} (${result?.confidence || 0}% confidence)`)
    } catch { toast.error('Failed to classify document') }
    setProcessing(p => { const n = { ...p }; delete n[docId]; return n })
  }

  async function handleTrigger(docId: string) {
    if (processing[docId]) return
    setProcessing(p => ({ ...p, [docId]: 'textract' }))
    try {
      await api.post(`/documents/${docId}/textract`, {})
      toast.success('Textract processing started')
    } catch { toast.error('Failed to start Textract') }
    setProcessing(p => { const n = { ...p }; delete n[docId]; return n })
  }

  // Show docs that can be processed (have s3_key but no textract result yet)
  const unprocessed = allDocs.filter(d => d.s3_key && !(d as any).textract_status)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand">{processed}</p>
          <p className="text-[11px] text-content-tertiary mt-1">Documents Processed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-dark">{avgConfidence || '—'}%</p>
          <p className="text-[11px] text-content-tertiary mt-1">Avg AI Confidence</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-deep">{pending}</p>
          <p className="text-[11px] text-content-tertiary mt-1">Pending Processing</p>
        </div>
      </div>

      {/* Unprocessed documents that can trigger Textract */}
      {unprocessed.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Ready for OCR ({unprocessed.length})</h3>
          </div>
          <div className="space-y-2">
            {unprocessed.slice(0, 10).map(d => (
              <div key={d.id} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-mono">{d.file_name}</p>
                  <p className="text-[11px] text-content-tertiary">{d.doc_type || d.document_type || 'Other'} · {d.content_type}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleClassify(d.id)} disabled={!!processing[d.id]}
                    className="text-[11px] bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-50 shadow-sm">
                    {processing[d.id] === 'classifying' ? 'Classifying…' : 'AI Classify'}
                  </button>
                  <button onClick={() => handleTrigger(d.id)} disabled={!!processing[d.id]}
                    className="text-[11px] bg-brand/10 text-brand-dark border border-brand/20 px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors disabled:opacity-50">
                    {processing[d.id] === 'textract' ? 'Processing…' : 'Run Textract'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed documents with results */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Processed Documents</h3>
        {textractDocs.length === 0 ? (
          <p className="text-[13px] text-content-tertiary py-4 text-center">No documents have been processed yet. Upload documents and run Textract to see results here.</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-separator text-content-secondary">
              <th className="text-left py-2 px-3">Document</th>
              <th className="text-left py-2 px-3">Classification</th>
              <th className="text-left py-2 px-3">Confidence</th>
              <th className="text-left py-2 px-3">Status</th>
            </tr></thead>
            <tbody>
              {textractDocs.slice(0, 20).map(d => (
                <tr key={d.id} className="border-b border-separator last:border-0">
                  <td className="py-2 px-3 font-mono">{d.file_name}</td>
                  <td className="py-2 px-3"><span className="text-[11px] px-2 py-0.5 rounded bg-surface-elevated">{(d as any).classification || d.doc_type || d.document_type || '—'}</span></td>
                  <td className="py-2 px-3">
                    <span className={`font-medium ${(d.ai_confidence||0)>=90?'text-brand-dark':(d.ai_confidence||0)>=80?'text-brand-deep':'text-[#065E76]'}`}>
                      {d.ai_confidence ? `${d.ai_confidence}%` : '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      (d as any).textract_status === 'completed' ? 'bg-brand/10 text-brand-dark' :
                      (d as any).textract_status === 'processing' ? 'bg-brand/10 text-brand' :
                      'bg-brand-pale0/10 text-brand-deep'
                    }`}>{(d as any).textract_status || 'unknown'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const TABS = [
  { id: 'all', label: 'All Documents' },
  { id: 'unlinked', label: 'Unlinked' },
  { id: 'fax', label: 'Fax Center' },
  { id: 'ai', label: 'AI Processing' },
] as const
type TabId = typeof TABS[number]['id']

export default function DocumentsPage() {
  const { toast } = useToast()
  const { t } = useT()
  const [tab, setTab] = useState<TabId>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [apiDown, setApiDown] = useState(false)
  const searchParams = useSearchParams()
  const appealId = searchParams?.get('appealId')
  return (
    <ModuleShell title={t("documents","title")} subtitle={t("documents","subtitle")}
      actions={<button onClick={()=>setShowUpload(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep transition-colors"><Upload size={16}/> {t("documents","bulkUpload")}</button>}>
      {/* Appeal letter context banner */}
      {appealId && (
        <div className='mx-4 mb-3 px-4 py-2.5 bg-brand/5 border border-brand/20 rounded-lg flex items-center justify-between text-xs'>
          <div className='flex items-center gap-2 text-brand'>
            <FileText size={14} />
            <span>Appeal submitted — search for the letter below or upload supporting documentation.</span>
          </div>
          <span className='text-content-tertiary font-mono'>ID: {appealId.slice(0,8)}…</span>
        </div>
      )}
      {/* Quiet connection status — only visible if there's a problem */}
      {apiDown ? (
        <div className='mx-4 mb-4 px-4 py-2.5 bg-[#065E76]/10 border border-[#065E76]/30 rounded-lg flex items-center justify-between text-xs'>
          <div className='flex items-center gap-2 text-[#065E76] dark:text-[#065E76]'>
            <span className='w-2 h-2 rounded-full bg-[#065E76] shrink-0' />
            Documents are temporarily unavailable. Your data is safe — we&apos;re working on it.
          </div>
          <button onClick={() => { const ref = 'DOC-' + Date.now().toString().slice(-6); window.open(`mailto:support@cosentus.ai?subject=Documents+Unavailable+${ref}&body=Reference+${ref}+—+Documents+module+is+unavailable.+Please+investigate.`, '_blank'); toast.info('Support notified. Reference: ' + ref) }}
            className='text-[#065E76] underline hover:no-underline ml-4 shrink-0'>Raise Concern</button>
        </div>
      ) : null}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-1.5 rounded-[10px] text-[13px] font-medium transition-all ${tab===t.id?'bg-brand text-white shadow-sm':'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30 hover:text-brand'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='all'&&<AllDocsTab/>}
      {tab==='unlinked'&&<UnlinkedQueueTab/>}
      {tab==='fax'&&<FaxCenterTab/>}
      {tab==='ai'&&<AIProcessingTab/>}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </ModuleShell>
  )
}


const DOCUMENT_TYPES = [
  { key: 'Superbill',      icon: '🧾' },
  { key: 'Clinical Note',  icon: '📋' },
  { key: 'Insurance Card', icon: '🏥' },
  { key: 'EOB',            icon: '💵' },
  { key: 'Denial Letter',  icon: '❌' },
  { key: 'Referral',       icon: '📨' },
  { key: 'License',        icon: '🪪' },
  { key: 'Contract',       icon: '📄' },
  { key: 'Credential',     icon: '🔖' },
  { key: 'Other',          icon: '📁' },
] as const

function UploadModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const { selectedClient } = useApp()
  const { mutate: requestUrl } = useRequestUploadUrl()
  const { mutate: createDoc } = useCreateDocument()
  const [files, setFiles] = useState<File[]>([])
  const [docType, setDocType] = useState('Superbill')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const mounted = useRef(true)
  useEffect(() => { return () => { mounted.current = false } }, [])
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  async function handleUpload() {
    if (files.length === 0) { toast.warning('Select files first'); return }
    setUploading(true)
    setProgress(0)
    let uploaded = 0
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        // Step 1: Get presigned URL
        const urlResult = await requestUrl({ file_name: file.name, content_type: file.type || 'application/octet-stream' })
        if (!urlResult?.upload_url || !urlResult?.s3_key) {
          throw new Error('Could not get upload URL — check your connection')
        }
        // Step 2: Upload to S3
        const s3Res = await fetch(urlResult.upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        })
        if (!s3Res.ok) throw new Error(`S3 upload failed (${s3Res.status})`)
        // Step 3: Create document record
        await createDoc({
          doc_type: docType,
          document_type: docType,
          file_name: file.name,
          s3_key: urlResult.s3_key,
          s3_bucket: urlResult.s3_bucket,
          content_type: file.type || 'application/octet-stream',
          file_size: file.size,
          source: 'Manual Upload',
          ...(selectedClient ? { client_id: selectedClient.id } : {}),
        })
        uploaded++
        if (mounted.current) setProgress(Math.round(((i + 1) / files.length) * 100))
      } catch (err) {
        failed++
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`Failed to upload ${file.name}: ${msg}`)
      }
    }
    if (mounted.current) { setUploading(false) }
    if (uploaded > 0) {
      toast.success(`${uploaded} file${uploaded !== 1 ? 's' : ''} uploaded successfully`)
      onClose()
    } else {
      toast.error('Upload failed — no files were saved. Check your connection.')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg bg-surface-default border border-separator rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Header */}
          <div className="flex gap-2 items-center justify-between px-6 py-4 border-b border-separator pb-1">
            <div className="flex items-center gap-2">
              <Upload size={16} className="text-brand" />
              <h3 className="text-base font-semibold text-content-primary">Upload Document</h3>
            </div>
            <button onClick={onClose} className="text-content-tertiary hover:text-content-primary transition-colors p-1 rounded-lg hover:bg-surface-elevated">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Document type chips */}
            <div>
              <p className="text-[13px] font-medium text-content-secondary mb-3">Document Type</p>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_TYPES.map(dt => (
                  <button key={dt.key} onClick={() => setDocType(dt.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all
                      ${docType === dt.key
                        ? 'bg-brand text-white border-brand shadow-sm'
                        : 'bg-surface-elevated text-content-primary border-separator hover:border-brand/40 hover:bg-brand/5'
                      }`}>
                    <span>{dt.icon}</span> {dt.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('doc-upload')?.click() } }}
              className="border-2 border-dashed border-separator rounded-xl py-10 px-6 text-center hover:border-brand/40 hover:bg-brand/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
              onClick={() => document.getElementById('doc-upload')?.click()}>
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-3">
                <Upload size={20} className="text-brand" />
              </div>
              <p className="text-sm font-medium text-content-primary mb-1">Drag files here or click to browse</p>
              <p className="text-xs text-content-tertiary">PDF, JPG, PNG, HEIC — Max 25MB each</p>
              <input type="file" multiple onChange={handleFileSelect} className="hidden" id="doc-upload" />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-medium text-content-secondary">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                  <button onClick={() => setFiles([])} className="text-[11px] text-[#065E76] hover:text-[#065E76]">Clear all</button>
                </div>
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.lastModified}`} className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2">
                    <FileText size={14} className="text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{f.name}</p>
                      <p className="text-[11px] text-content-tertiary">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={() => setFiles(prev => prev.filter(file => file !== f))}>
                      <X size={14} className="text-content-tertiary hover:text-[#065E76] transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-content-secondary">Uploading…</span>
                  <span className="text-xs font-mono text-brand">{progress}%</span>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-2">
                  <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-separator">
            <button onClick={handleUpload} disabled={uploading || files.length === 0}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {uploading ? `Uploading… ${progress}%` : <><Upload size={14} /> Upload {files.length} file{files.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
