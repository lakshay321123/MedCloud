'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoPatients, demoSubmissions } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Upload, CheckCircle2, FileText, X, Plus, ArrowRight } from 'lucide-react'

const MAX_FILES = 10

interface FileItem { name: string; size: string }

type Step = 1 | 2 | 3

export default function ScanSubmitPage() {
  const { selectedClient } = useApp()
  const clientId = selectedClient?.id ?? 'org-102'
  const myPatients = demoPatients.filter(p => p.clientId === clientId)

  const [step, setStep] = useState<Step>(1)
  const [patientId, setPatientId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ firstName:'', lastName:'', dob:'', phone:'' })
  const [files, setFiles] = useState<FileItem[]>([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [trackingId] = useState(`SUB-2026-${String(Math.floor(Math.random()*9000)+1000)}`)

  const selectedPatient = myPatients.find(p => p.id === patientId)
  const filteredPatients = myPatients.filter(p =>
    !patientSearch || `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase())
  )

  function addSimFiles() {
    const simFiles: FileItem[] = [
      { name:'superbill_2026-03-02.pdf', size:'1.2 MB' },
      { name:'clinical_note.pdf', size:'0.8 MB' },
    ]
    setFiles(prev => [...prev, ...simFiles].slice(0, MAX_FILES))
  }

  function handleSubmit() {
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setSubmitted(true) }, 1200)
  }

  function handleReset() {
    setStep(1); setPatientId(''); setFiles([]); setNote(''); setSubmitted(false)
    setPatientSearch(''); setShowNewPatient(false)
  }

  // Submission history
  const history = demoSubmissions.filter(s => s.clientId === clientId)

  if (submitted) return (
    <ModuleShell title="Scan & Submit" subtitle="Upload documents to Cosentus for processing">
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
    <ModuleShell title="Scan & Submit" subtitle="Upload documents to Cosentus for processing">
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {([1,2,3] as Step[]).map(s=>(
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step===s?'bg-brand text-white':step>s?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-surface-elevated text-content-tertiary'}`}>
                {step>s?<CheckCircle2 size={12}/>:<span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{s}</span>}
                {s===1?'Select Patient':s===2?'Upload Documents':'Review & Submit'}
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
                          <span className="font-medium">{p.firstName} {p.lastName}</span>
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
                        <p className="text-sm font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</p>
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
                  <div className="grid grid-cols-2 gap-3">
                    {[['First Name','John'],['Last Name','Smith']].map(([l,p])=>(
                      <div key={l}>
                        <label className="text-xs text-content-secondary block mb-1">{l} *</label>
                        <input placeholder={p} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
              <div
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();addSimFiles()}}
                onClick={addSimFiles}
                className={`border-2 border-dashed rounded-xl py-12 text-center cursor-pointer transition-all ${files.length?'border-brand/40 bg-brand/5':'border-separator hover:border-brand/30 hover:bg-surface-elevated'}`}>
                <Upload size={32} className={`mx-auto mb-3 ${files.length?'text-brand':'text-content-tertiary'}`}/>
                <p className="text-sm font-medium text-content-primary">Drop superbills, clinical notes, or referrals</p>
                <p className="text-[11px] text-content-secondary mt-1">PDF, JPG, PNG, HEIC · Up to {MAX_FILES} files · Max 25MB each</p>
                {files.length < MAX_FILES && <p className="text-[10px] text-brand mt-2">Click to browse</p>}
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f,i)=>(
                    <div key={i} className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2.5">
                      <FileText size={16} className="text-brand shrink-0"/>
                      <span className="text-sm flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-content-secondary">{f.size}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">✓ Received</span>
                      <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} className="text-content-tertiary hover:text-red-500 transition-colors">
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
                  <span className="font-medium">{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'New Walk-in Patient'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Documents</span>
                  <span className="font-medium">{files.length} file{files.length!==1?'s':''}</span>
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

function HistorySection({ history }: { history: ReturnType<typeof demoSubmissions['filter']> }) {
  const statusLabels: Record<string,string> = {
    received:'Received',in_review:'In Review',coded:'Coded',claim_submitted:'Claim Submitted',paid:'Paid ✓'
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-content-primary mb-3">Submission History</h3>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Tracking ID</th><th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Documents</th><th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{history.map(s=>(
            <tr key={s.id} className="border-b border-separator last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-brand">{s.trackingId}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{new Date(s.submittedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-xs">{s.docType}</td>
              <td className="px-4 py-3 text-xs font-medium">{s.patientName}</td>
              <td className="px-4 py-3"><StatusBadge status={s.status} small/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
