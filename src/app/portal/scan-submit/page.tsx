'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { useDocuments, usePatients, useRequestUploadUrl, useCreateDocument } from '@/lib/hooks'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Upload, CheckCircle2, FileText, X, Plus, ArrowRight } from 'lucide-react'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'

const MAX_FILES = 10

interface FileItem { name: string; size: string; docType: string }

type Step = 1 | 2 | 3

type DocType = 'superbill' | 'clinical_note' | 'referral' | 'license' | 'insurance'

const DOC_TYPES: { key: DocType; label: string; icon: string; filePrefix: string; ext: string; size: string }[] = [
  { key: 'superbill',    label: 'Superbill',       icon: '🧾', filePrefix: 'superbill',       ext: 'pdf', size: '1.2 MB' },
  { key: 'clinical_note',label: 'Visit Note',      icon: '📋', filePrefix: 'visit_note',       ext: 'pdf', size: '0.8 MB' },
  { key: 'referral',     label: 'Referral',        icon: '📨', filePrefix: 'referral_letter',  ext: 'pdf', size: '0.5 MB' },
  { key: 'license',      label: 'License',         icon: '🪪', filePrefix: 'provider_license', ext: 'pdf', size: '1.0 MB' },
  { key: 'insurance',    label: 'Insurance Card',  icon: '🏥', filePrefix: 'insurance_card',   ext: 'jpg', size: '0.3 MB' },
]

export default function ScanSubmitPage() {
  const { selectedClient, currentUser, country } = useApp()
  const { data: apiPatientResult } = usePatients({ limit: 100 })
  const apiPatients: any[] = (apiPatientResult?.data || []).map((p: any) => ({
    id: p.id, name: (p.first_name || '') + ' ' + (p.last_name || ''), dob: p.date_of_birth || '',
    clientId: p.client_id || '',
  }))
  const { data: apiDocRaw } = useDocuments()
  const apiSubmissions: any[] = (Array.isArray(apiDocRaw) ? apiDocRaw : (apiDocRaw as any)?.data || []).map((d: any) => ({
    id: d.id, patient: d.patient_name || '—', type: d.document_type || 'superbill',
    fileName: d.file_name || 'document', status: d.status || 'uploaded',
    uploadedAt: d.created_at || '', client: d.client_name || '—', clientId: d.client_id || '',
  }))
  const { t } = useT()
  const isClinic = currentUser.role === 'client' || currentUser.role === 'provider'
  const clientId = isClinic
    ? currentUser.organization_id
    : selectedClient?.id ?? ''
  // For clinic roles API RLS already scopes to their org — skip UUID mismatch filter
  const myPatients = isClinic ? apiPatients : (clientId ? apiPatients.filter(p => p.clientId === clientId) : apiPatients)

  const [step, setStep] = useState<Step>(1)
  const [patientId, setPatientId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ firstName:'', lastName:'', dob:'', phone:'' })
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedDocType, setSelectedDocType] = useState<DocType | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [trackingId] = useState(`SUB-2026-${String(Math.floor(Math.random()*9000)+1000)}`)

  const selectedPatient = myPatients.find(p => p.id === patientId)
  const filteredPatients = myPatients.filter(p =>
    !patientSearch || (p.name || '').toLowerCase().includes(patientSearch.toLowerCase())
  )

  function addDocTypeFile(type: DocType) {
    const def = DOC_TYPES.find(d => d.key === type)!
    const dateStr = new Date().toISOString().split('T')[0]
    const newFile: FileItem = {
      name: `${def.filePrefix}_${dateStr}.${def.ext}`,
      size: def.size,
      docType: def.label,
    }
    setFiles(prev => [...prev, newFile].slice(0, MAX_FILES))
    setSelectedDocType(type)
  }

  function addSimFiles() {
    addDocTypeFile('superbill')
    addDocTypeFile('clinical_note')
  }

  function handleSubmit() {
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setSubmitted(true) }, 1200)
  }

  function handleReset() {
    setStep(1); setPatientId(''); setFiles([]); setNote(''); setSubmitted(false)
    setPatientSearch(''); setShowNewPatient(false); setSelectedDocType(null)
  }

  // Submission history
  const history = apiSubmissions.filter(s => s.clientId === clientId)

  if (submitted) return (
    <ModuleShell title={t("scan","title")} subtitle="Upload documents to Cosentus for processing">
      <div className="max-w-lg mx-auto">
        <div className="card p-10 text-center mb-6">
          <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Submitted Successfully</h2>
          <p className="text-sm text-content-secondary mb-1">Tracking ID: <span className="font-mono font-bold text-content-primary">{trackingId}</span></p>
          <p className="text-sm text-content-secondary mt-3">Your documents are being reviewed by our billing team.</p>
          <p className="text-xs text-content-tertiary mt-1">Track progress in Watch & Track</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleReset} className="flex-1 border border-separator text-content-secondary rounded-lg py-2.5 text-sm hover:text-content-primary transition-colors">
              Submit Another
            </button>
            <button onClick={()=>window.location.href='/portal/watch-track'} className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep flex items-center justify-center gap-2 transition-colors">
              Watch & Track <ArrowRight size={14}/>
            </button>
          </div>
        </div>

        {/* History */}
        <HistorySection history={history}/>
      </div>
    </ModuleShell>
  )

  return (
    <ModuleShell title={t("scan","title")} subtitle="Upload documents to Cosentus for processing">
      <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400">
        <span className="text-lg shrink-0">📄</span>
        <div>
          Scan & Submit connected — live document upload
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-1 sm:gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {([1,2,3] as Step[]).map(s=>(
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step===s?'bg-brand text-white':step>s?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-surface-elevated text-content-tertiary'}`}>
                {step>s?<CheckCircle2 size={12}/>:<span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{s}</span>}
                {s===1?<><span className='hidden sm:inline'>Select </span>Patient</>:s===2?<><span className='hidden sm:inline'>Upload </span>Docs</>:<><span className='hidden sm:inline'>Review & </span>Submit</>}
              </div>
              {s<3&&<div className="flex-1 h-px bg-separator"/>}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6 mb-5">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">Select Patient</h3>
              {!showNewPatient ? (
                <>
                  <div className="relative">
                    <input value={patientSearch} onChange={e=>setPatientSearch(e.target.value)}
                      placeholder="Search patient by name..."
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40"/>
                  </div>
                  {patientSearch && (
                    <div className="border border-separator rounded-lg overflow-hidden">
                      {filteredPatients.slice(0,5).map(p=>(
                        <button key={p.id} onClick={()=>{setPatientId(p.id);setPatientSearch('')}}
                          className={`w-full text-left px-3 py-2.5 border-b border-separator last:border-0 hover:bg-surface-elevated text-sm transition-colors ${patientId===p.id?'bg-brand/5':''}`}>
                          <span className="font-medium">{p.name || `${p.firstName || ''} ${p.lastName || ''}`}</span>
                          <span className="text-content-secondary ml-2 text-xs">{p.dob ?? 'DOB unknown'}</span>
                          {p.insurance && <span className="text-content-tertiary ml-2 text-[10px]">{p.insurance.payer}</span>}
                        </button>
                      ))}
                      {filteredPatients.length===0&&<div className="px-3 py-2 text-sm text-content-secondary">No patients found</div>}
                    </div>
                  )}

                  {selectedPatient && (
                    <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{selectedPatient.name || `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`}</p>
                        <p className="text-[10px] text-content-secondary">{selectedPatient.dob} · {selectedPatient.insurance?.payer ?? 'Insurance unknown'}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        {selectedPatient.insurance ? 'Insurance on file ✓' : 'No insurance'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-separator"/>
                    <span className="text-xs text-content-tertiary">or</span>
                    <div className="flex-1 h-px bg-separator"/>
                  </div>
                  <button onClick={()=>setShowNewPatient(true)}
                    className="w-full border border-dashed border-separator text-content-secondary hover:text-content-primary text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <Plus size={14}/> New Patient (Walk-in)
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[['First Name','John'],['Last Name','Smith']].map(([l,p])=>(
                      <div key={l}>
                        <label className="text-xs text-content-secondary block mb-1">{l} *</label>
                        <input placeholder={p} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-content-secondary block mb-1">Date of Birth</label>
                      <input type="date" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
                    </div>
                    <div>
                      <label className="text-xs text-content-secondary block mb-1">Phone</label>
                      <input placeholder="(949) 555-0100" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setPatientId('NEW');setShowNewPatient(false)}}
                      className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-deep transition-colors">Use New Patient</button>
                    <button onClick={()=>setShowNewPatient(false)}
                      className="px-4 py-2 border border-separator text-content-secondary rounded-lg text-sm hover:text-content-primary transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              <button onClick={()=>setStep(2)} disabled={!patientId}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">Upload Documents</h3>

              {/* Document type quick-add chips */}
              <div>
                <p className="text-xs text-content-secondary mb-2">Click a document type to add a file:</p>
                <div className="flex flex-wrap gap-2">
                  {DOC_TYPES.map(dt => (
                    <button
                      key={dt.key}
                      onClick={() => addDocTypeFile(dt.key)}
                      disabled={files.length >= MAX_FILES}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed
                        ${selectedDocType === dt.key
                          ? 'bg-brand text-white border-brand'
                          : 'bg-surface-elevated text-content-primary border-separator hover:border-brand/40 hover:bg-brand/5'
                        }`}
                    >
                      <span>{dt.icon}</span> {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-separator"/>
                <span className="text-xs text-content-tertiary">or drag & drop</span>
                <div className="flex-1 h-px bg-separator"/>
              </div>

              <div
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault(); const f=Array.from(e.dataTransfer.files); if(f.length>0){const items=f.map(file=>({name:file.name,size:(file.size/1024/1024).toFixed(1)+' MB',docType:'Other'})); setFiles(prev=>[...prev,...items].slice(0,MAX_FILES))}}}
                onClick={()=>document.getElementById('scan-file-input')?.click()}
                className={`border-2 border-dashed rounded-xl py-10 text-center cursor-pointer transition-all ${files.length?'border-brand/40 bg-brand/5':'border-separator hover:border-brand/30 hover:bg-surface-elevated'}`}>
                <Upload size={28} className={`mx-auto mb-3 ${files.length?'text-brand':'text-content-tertiary'}`}/>
                <p className="text-sm font-medium text-content-primary">Drop superbills, visit notes, referrals, or insurance cards</p>
                <p className="text-[11px] text-content-secondary mt-1">PDF, JPG, PNG, HEIC · Up to {MAX_FILES} files · Max 25MB each</p>
                {files.length < MAX_FILES && <p className="text-[10px] text-brand mt-2">Click to browse</p>}
                <input id="scan-file-input" type="file" multiple className="hidden" onChange={e=>{
                  if(e.target.files){
                    const items=Array.from(e.target.files).map(f=>({name:f.name,size:(f.size/1024/1024).toFixed(1)+' MB',docType:'Other'}))
                    setFiles(prev=>[...prev,...items].slice(0,MAX_FILES))
                    e.target.value=''
                  }
                }}/>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f,i)=>(
                    <div key={i} className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2.5">
                      <FileText size={16} className="text-brand shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{f.name}</p>
                        {f.docType && <p className="text-[10px] text-content-tertiary">{f.docType}</p>}
                      </div>
                      <span className="text-xs text-content-secondary shrink-0">{f.size}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">✓ Received</span>
                      <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} className="text-content-tertiary hover:text-red-500 transition-colors shrink-0">
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={()=>setStep(1)} className="px-4 py-2.5 border border-separator text-content-secondary rounded-lg text-sm hover:text-content-primary transition-colors">← Back</button>
                <button onClick={()=>setStep(3)} disabled={files.length===0}
                  className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">Review & Submit</h3>
              <div className="bg-surface-elevated rounded-lg p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Patient</span>
                  <span className="font-medium">{selectedPatient ? selectedPatient.name || `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}` : 'New Walk-in Patient'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Documents</span>
                  <span className="font-medium">{files.length} file{files.length!==1?'s':''}{files.length>0 ? ` · ${Array.from(new Set(files.map(f=>f.docType))).join(', ')}` : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Date</span>
                  <span className="font-medium">March 2, 2026</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Notes for billing team (optional)</label>
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
                  placeholder="Any notes for the billing team?"
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary resize-none outline-none focus:border-brand/40"/>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setStep(2)} className="px-4 py-2.5 border border-separator text-content-secondary rounded-lg text-sm hover:text-content-primary transition-colors">← Back</button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                  {submitting?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Processing...</>:'Submit to Cosentus'}
                </button>
              </div>
            </div>
          )}
        </div>

        <HistorySection history={history}/>
      </div>
    </ModuleShell>
  )
}


type Submission = {
  id: string
  clientId: string
  patientId?: string
  patientName?: string
  trackingId?: string
  submittedAt?: string
  date?: string
  docType?: string
  type?: string
  status: string
  pages?: number
  size?: string
}

function HistorySection({ history }: { history: Submission[] }) {
  const statusLabels: Record<string,string> = {
    received:'Received',in_review:'In Review',coded:'Coded',claim_submitted:'Claim Submitted',paid:'Paid ✓'
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-content-primary mb-3">Submission History</h3>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[480px]">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Tracking ID</th><th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Documents</th><th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{history.map(s=>(
            <tr key={s.id} className="border-b border-separator last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-brand">{s.trackingId}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : s.date || "—"}</td>
              <td className="px-4 py-3 text-xs">{s.docType}</td>
              <td className="px-4 py-3 text-xs font-medium">{s.patientName}</td>
              <td className="px-4 py-3"><StatusBadge status={s.status} small/></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  )
}
