'use client'

import React, { useState, useRef } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { ScanLine, Upload, FileText, CreditCard, Image, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'

type DocType = 'superbill' | 'insurance_card' | 'id_card' | 'clinical_note' | 'eob' | 'other'
type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error'

interface UploadedDoc {
  id: string
  name: string
  type: DocType
  size: string
  status: UploadStatus
  patient?: string
  extractedFields?: Record<string, string>
  uploadedAt: string
}

const docTypeLabels: Record<DocType, { label: string; icon: React.ElementType }> = {
  superbill: { label: 'Superbill', icon: FileText },
  insurance_card: { label: 'Insurance Card', icon: CreditCard },
  id_card: { label: 'ID Card', icon: CreditCard },
  clinical_note: { label: 'Clinical Note', icon: FileText },
  eob: { label: 'EOB / Remittance', icon: FileText },
  other: { label: 'Other Document', icon: FileText },
}

const demoUploads: UploadedDoc[] = [
  { id: 'DOC-001', name: 'superbill_smith_20260228.pdf', type: 'superbill', size: '245 KB', status: 'complete', patient: 'John Smith', extractedFields: { 'CPT Codes': '99214, 99213', 'ICD-10': 'E11.9, I10', 'DOS': '2026-02-28', 'Provider': 'Dr. Martinez', 'Charges': '$350.00' }, uploadedAt: '2026-02-28 14:32' },
  { id: 'DOC-002', name: 'ins_card_johnson_front.jpg', type: 'insurance_card', size: '1.2 MB', status: 'complete', patient: 'Sarah Johnson', extractedFields: { 'Payer': 'Aetna', 'Policy #': 'AET-55123', 'Group #': 'GRP-200', 'Member ID': 'MEM-77231', 'Copay': '$25' }, uploadedAt: '2026-02-28 15:10' },
  { id: 'DOC-003', name: 'clinical_note_garcia.pdf', type: 'clinical_note', size: '180 KB', status: 'processing', patient: 'Maria Garcia', uploadedAt: '2026-03-01 09:45' },
]

export default function ScanSubmitPage() {
  const [uploads, setUploads] = useState<UploadedDoc[]>(demoUploads)
  const [docType, setDocType] = useState<DocType>('superbill')
  const [patientName, setPatientName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [selected, setSelected] = useState<UploadedDoc | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const simulateUpload = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file, i) => {
      const newDoc: UploadedDoc = {
        id: `DOC-${String(uploads.length + i + 1).padStart(3, '0')}`,
        name: file.name,
        type: docType,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        status: 'uploading',
        patient: patientName || undefined,
        uploadedAt: new Date().toLocaleString(),
      }
      setUploads(prev => [newDoc, ...prev])

      // Simulate upload → processing → complete
      setTimeout(() => {
        setUploads(prev => prev.map(u => u.id === newDoc.id ? { ...u, status: 'processing' } : u))
      }, 1000)
      setTimeout(() => {
        setUploads(prev => prev.map(u => u.id === newDoc.id ? {
          ...u,
          status: 'complete',
          extractedFields: docType === 'superbill' ? { 'CPT Codes': '99213', 'ICD-10': 'Z00.00', 'DOS': '2026-03-01', 'Status': 'AI extraction complete' } :
            docType === 'insurance_card' ? { 'Payer': 'Detected via AI', 'Policy #': 'Extracted', 'Status': 'AI extraction complete' } :
            { 'Status': 'Document classified and stored' }
        } : u))
      }, 3000)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    simulateUpload(e.dataTransfer.files)
  }

  return (
    <ModuleShell
      title="Scan & Submit"
      subtitle="Upload superbills, insurance cards, IDs, and clinical documents"
      sprint="Sprint 2"
      icon={<ScanLine size={20} />}
    >
      {/* Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <div
            onDragOver={e => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragActive ? 'border-brand bg-brand/5' : 'border-[var(--border-color)] hover:border-brand/50 bg-[var(--bg-card)]'
            }`}
          >
            <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff" className="hidden" onChange={e => simulateUpload(e.target.files)} />
            <Upload size={40} className="mx-auto mb-3 text-brand opacity-60" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              {dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Supports PDF, JPG, PNG, TIFF — Max 25MB per file
            </p>
            <p className="text-[10px] text-brand mt-2 font-mono">
              AI will automatically extract fields from superbills and insurance cards
            </p>
          </div>
        </div>

        {/* Upload Options */}
        <div className="p-4 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Upload Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value as DocType)} className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                {Object.entries(docTypeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Patient Name (optional)</label>
              <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="John Smith" className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
            </div>
            <div className="p-3 rounded-lg bg-brand/5 border border-brand/10">
              <p className="text-[10px] font-mono text-brand">AI Processing Pipeline:</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Upload → AWS Textract → Field Extraction → Confidence Scoring → Review Queue</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Extraction Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Extracted Fields</h2>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-brand" />
                <span className="text-xs font-mono text-[var(--text-secondary)]">{selected.name}</span>
              </div>
              {selected.extractedFields ? (
                <div className="space-y-2">
                  {Object.entries(selected.extractedFields).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-primary)]">
                      <span className="text-xs text-[var(--text-secondary)]">{k}</span>
                      <span className="text-xs font-mono text-[var(--text-primary)]">{v}</span>
                    </div>
                  ))}
                  <button className="w-full mt-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
                    Confirm & Submit to Coding
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">Processing...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Uploads</h3>
        </div>
        <div className="divide-y divide-[var(--border-color)]">
          {uploads.map(doc => (
            <div key={doc.id} onClick={() => doc.status === 'complete' ? setSelected(doc) : null} className={`flex items-center gap-3 px-4 py-3 transition-colors ${doc.status === 'complete' ? 'hover:bg-[var(--bg-hover)] cursor-pointer' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                doc.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400' :
                doc.status === 'processing' ? 'bg-brand/10 text-brand' :
                doc.status === 'uploading' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {doc.status === 'complete' ? <CheckCircle size={16} /> :
                 doc.status === 'processing' || doc.status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> :
                 <AlertCircle size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">{doc.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{docTypeLabels[doc.type].label} {doc.patient ? `• ${doc.patient}` : ''}</p>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{doc.size}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                doc.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400' :
                doc.status === 'processing' ? 'bg-brand/10 text-brand' :
                doc.status === 'uploading' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {doc.status}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">{doc.uploadedAt}</span>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  )
}
