'use client'
import React, { useState } from 'react'
import { demoPatients, demoSubmissions } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Upload, CheckCircle2, FileText } from 'lucide-react'

export default function ScanSubmitPage() {
  const [patientId, setPatientId] = useState('')
  const [docType, setDocType] = useState('Superbill')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const myPatients = demoPatients.filter(p => p.clientId === 'org-102')

  const handleSubmit = () => {
    if (!patientId || files.length === 0) return
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setPatientId(''); setFiles([]); setNote('') }, 3000)
  }

  return (
    <ModuleShell title="Scan & Submit" subtitle="Upload documents to Cosentus for processing">
      <div className="grid grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="col-span-2">
          <div className="card p-4 space-y-4">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle2 size={48} className="text-emerald-600 text-emerald-600 dark:text-emerald-400 mx-auto mb-3"/>
                <h3 className="text-lg font-semibold text-emerald-600 text-emerald-600 dark:text-emerald-400">Received!</h3>
                <p className="text-sm text-content-secondary mt-1">Tracking ID: #SUB-2026-0848</p>
                <p className="text-xs text-content-secondary mt-2">Track progress in Watch & Track</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Select Patient *</label>
                  <select value={patientId} onChange={e => setPatientId(e.target.value)}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                    <option value="">Choose patient...</option>
                    {myPatients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Document Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                    {['Superbill','Clinical Note','Op Report','Insurance Card','ID Card','Lab Results','Other'].map(t=>(
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Upload Files *</label>
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); setFiles(['document.pdf']) }}
                    onClick={() => setFiles(['superbill_upload.pdf'])}
                    className={`border-2 border-dashed rounded-card py-10 text-center cursor-pointer transition-all ${files.length ? 'border-brand/40 bg-brand/5' : 'border-separator hover:border-brand/30'}`}>
                    {files.length ? (
                      <div className="flex items-center justify-center gap-2 text-brand">
                        <FileText size={20}/><span className="text-sm">{files.join(', ')}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={24} className="text-content-secondary mx-auto mb-2"/>
                        <p className="text-sm text-content-secondary">Drag & drop files or click to browse</p>
                        <p className="text-[10px] text-content-secondary mt-1">PDF, JPG, PNG, TIFF — Max 25MB</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Note (optional)</label>
                  <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g., Two visits same day"
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary"/>
                </div>
                <button onClick={handleSubmit} disabled={!patientId || !files.length}
                  className="w-full bg-brand text-white rounded-lg py-3 text-sm font-medium hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed">
                  Submit to Cosentus
                </button>
              </>
            )}
          </div>
        </div>

        {/* Submission History */}
        <div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Submission History</h3>
            <div className="space-y-3">{demoSubmissions.filter(s=>s.clientId==='org-102').map(s=>(
              <div key={s.id} className="border-b border-separator pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{s.patientName}</span>
                  <StatusBadge status={s.status} small/>
                </div>
                <div className="text-[10px] text-content-secondary mt-0.5">{s.trackingId} • {s.docType}</div>
                <div className="text-[10px] text-content-secondary">{new Date(s.submittedAt).toLocaleDateString()}</div>
              </div>
            ))}</div>
          </div>
        </div>
      </div>
    </ModuleShell>
  )
}
