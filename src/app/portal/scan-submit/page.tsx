'use client'
import React, { useState, useRef, useEffect } from 'react'
import { useT } from '@/lib/i18n'
import { useApp } from '@/lib/context'
import { usePatients, useRequestUploadUrl, useCreateDocument } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import ModuleShell from '@/components/shared/ModuleShell'
import { useToast } from '@/components/shared/Toast'
import { Upload, CheckCircle2, FileText, X, Plus, ArrowRight, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

const MAX_FILES = 20

const DOC_TYPE_META: Record<string, { icon: string }> = {
  'Superbill':      { icon: '🧾' },
  'Clinical Note':  { icon: '📋' },
  'Referral':       { icon: '📨' },
  'License':        { icon: '🪪' },
  'Insurance Card': { icon: '🏥' },
  'EOB':            { icon: '💵' },
  'Denial Letter':  { icon: '❌' },
  'Contract':       { icon: '📄' },
  'Credential':     { icon: '🔖' },
  'Other':          { icon: '📁' },
}

type UploadStatus = 'pending' | 'uploading' | 'classifying' | 'done' | 'error'

interface FileEntry {
  id: string
  file: File
  name: string
  sizeMB: string
  status: UploadStatus
  documentId?: string
  aiType?: string
  aiConfidence?: number
  approvedType?: string
  error?: string
}

type Step = 1 | 2 | 3

export default function ScanSubmitPage() {
  const router = useRouter()
  const { t } = useT()
  const { toast } = useToast()
  const { currentUser } = useApp()
  const { data: apiPatientResult } = usePatients({ limit: 200 })
  const patients = ((apiPatientResult as any)?.data || []).map((p: any) => ({
    id: p.id,
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    dob: p.date_of_birth || '',
    insurance: p.insurance_name || '',
  }))

  const { mutate: requestUrl } = useRequestUploadUrl()
  const { mutate: createDoc } = useCreateDocument()

  const [step, setStep] = useState<Step>(1)
  const [patientId, setPatientId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [note, setNote] = useState('')
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', dob: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [trackingId] = useState(`SUB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedPatient = patients.find((p: any) => p.id === patientId)
  const filteredPatients = patients.filter((p: any) =>
    !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase())
  )

  function addFiles(incoming: File[]) {
    const newEntries: FileEntry[] = incoming.slice(0, MAX_FILES - files.length).map(f => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      sizeMB: (f.size / 1024 / 1024).toFixed(1) + ' MB',
      status: 'pending' as UploadStatus,
    }))
    setFiles(prev => [...prev, ...newEntries])
  }

  function setFileField(id: string, patch: Partial<FileEntry>) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function guessTypeFromFilename(name: string): string {
    const n = name.toLowerCase()
    if (n.includes('superbill')) return 'Superbill'
    if (n.includes('note') || n.includes('soap') || n.includes('visit')) return 'Clinical Note'
    if (n.includes('referral')) return 'Referral'
    if (n.includes('insurance') || n.includes('ins_card')) return 'Insurance Card'
    if (n.includes('license') || n.includes('licence')) return 'License'
    if (n.includes('eob')) return 'EOB'
    if (n.includes('denial')) return 'Denial Letter'
    return 'Other'
  }

  async function uploadAndClassifyAll() {
    if (files.length === 0) return
    setStep(3)

    for (const entry of files) {
      const id = entry.id
      try {
        setFileField(id, { status: 'uploading' })

        const urlResult = await requestUrl({
          file_name: entry.name,
          content_type: entry.file.type || 'application/octet-stream',
          folder: 'scan-submit',
        })

        if (!urlResult?.upload_url || !urlResult?.s3_key) throw new Error('Could not get upload URL')

        const s3Upload = await fetch(urlResult.upload_url, {
          method: 'PUT',
          body: entry.file,
          headers: {
            'Content-Type': entry.file.type || 'application/octet-stream',
          },
        })
        if (!s3Upload.ok) throw new Error(`Upload failed (${s3Upload.status})`)

        const docResult = await createDoc({
          doc_type: 'Other',
          document_type: 'Other',
          file_name: entry.name,
          s3_key: urlResult.s3_key,
          s3_bucket: urlResult.s3_bucket,
          content_type: entry.file.type || 'application/octet-stream',
          file_size: entry.file.size,
          source: 'Portal Upload',
          patient_id: patientId !== 'NEW' ? patientId : undefined,
        })

        const documentId = (docResult as any)?.id
        setFileField(id, { status: 'classifying', documentId })

        let aiType = guessTypeFromFilename(entry.name)
        let aiConfidence = 0

        if (documentId) {
          try {
            const classResult = await api.post<{ classification: string; confidence: number }>(
              `/documents/${documentId}/classify`, {}
            )
            aiType = classResult.classification || aiType
            aiConfidence = Math.round((classResult.confidence || 0) * 100)
          } catch {
            // AI classification unavailable — use filename guess
          }
        }

        setFileField(id, { status: 'done', documentId, aiType, aiConfidence, approvedType: aiType })

        // Extract text from PDF/image for AI coding (fire & forget — don't block upload)
        if (documentId) {
          (async () => {
            try {
              const dlResult = await api.get<{ download_url: string }>(`/documents/${documentId}/download`, { mode: 'inline' } as any)
              if (!dlResult.download_url) return
              const extractResult = await fetch('/api/extract-text', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presigned_url: dlResult.download_url, document_id: documentId }),
              }).then(r => r.json())
              if (extractResult.raw_text && extractResult.text_length > 10) {
                await api.patch(`/documents/${documentId}`, {
                  textract_result: JSON.stringify({
                    fields: {
                      patient_name: { value: extractResult.fields?.patient_name || 'Unknown', confidence: 0.85 },
                      date_of_service: { value: extractResult.fields?.date_of_service || '', confidence: 0.85 },
                      cpt_codes: { value: (extractResult.fields?.cpt_codes || []).join(' '), parsed: extractResult.fields?.cpt_codes || [], confidence: 0.85 },
                      diagnoses: { value: (extractResult.fields?.icd_codes || []).join(' '), parsed: extractResult.fields?.icd_codes || [], confidence: 0.85 },
                      billed_amount: { value: String(extractResult.fields?.total_charges || 0), confidence: 0.85 },
                    },
                    raw_text: extractResult.raw_text,
                    mode: 'vercel_extraction',
                  }),
                  textract_status: 'completed',
                } as any)
              }
            } catch (e) { console.warn('[scan-submit] Text extraction failed:', e) }
          })()
        }

      } catch (err) {
        setFileField(id, {
          status: 'error',
          error: 'Upload failed — please try again or contact support',
        })
      }
    }
  }

  async function handleFinalSubmit() {
    setSubmitting(true)
    try {
      const results = await Promise.allSettled(
        files
          .filter(f => f.status === 'done' && f.documentId)
          .map(f =>
            api.patch(`/documents/${f.documentId}`, {
              doc_type: f.approvedType || f.aiType || 'Other',
              document_type: f.approvedType || f.aiType || 'Other',
              patient_id: patientId !== 'NEW' ? patientId : undefined,
              notes: note || undefined,
            })
          )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) toast.warning(`${failed} document(s) could not be updated — billing team will reconcile`)

      // Create coding queue items for superbill/clinical docs → routes to coder
      const codableDocs = files.filter(f => f.status === 'done' && f.documentId && ['Superbill', 'Clinical Note'].includes(f.approvedType || f.aiType || ''))
      if (codableDocs.length > 0) {
        await Promise.allSettled(
          codableDocs.map(f =>
            api.post('/coding', {
              document_id: f.documentId,
              patient_id: patientId !== 'NEW' ? patientId : undefined,
              priority: 'medium',
              status: 'pending',
              notes: `Scan & Submit: ${f.approvedType || f.aiType} — ${f.file.name}`,
            })
          )
        )
        toast.success(`${codableDocs.length} document(s) sent to coding queue`)
      }

      setSubmitted(true)
      setTimeout(() => router.push("/portal/watch-track"), 2000)
    } catch {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setStep(1); setPatientId(''); setFiles([])
    setNote(''); setSubmitted(false); setPatientSearch('')
    setShowNewPatient(false); setDragging(false)
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const uploadingCount = files.filter(f => f.status === 'uploading' || f.status === 'classifying').length
  const successCount = files.filter(f => f.status === 'done').length
  const anyError = files.some(f => f.status === 'error')

  if (submitted) return (
    <ModuleShell title={t("scan","title")} subtitle="Upload documents to Cosentus for processing">
      <div className="max-w-lg mx-auto">
        <div className="card p-10 text-center mb-6">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-brand-dark" />
          </div>
          <h2 className="text-xl font-bold text-brand-dark dark:text-brand-dark mb-2">Submitted Successfully!</h2>
          <p className="text-sm text-content-secondary mb-1">Tracking ID: <span className="font-mono font-bold text-content-primary">{trackingId}</span></p>
          <p className="text-sm text-content-secondary mt-2">
            <span className="font-medium text-content-primary">{successCount} document{successCount !== 1 ? 's' : ''}</span> uploaded and linked to{' '}
            <span className="font-medium text-content-primary">{(selectedPatient as any)?.name || 'New Patient'}</span>
          </p>
          <p className="text-xs text-content-tertiary mt-1">Your billing team will process them shortly.</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-content-secondary">
            <Loader2 size={14} className="animate-spin text-brand" />
            Taking you to Watch &amp; Track…
          </div>
          <div className="mt-3">
            <button onClick={handleReset} className="text-xs text-content-tertiary hover:text-content-secondary underline transition-colors">Submit another batch instead</button>
          </div>
        </div>
      </div>
    </ModuleShell>
  )

  return (
    <ModuleShell title={t("scan","title")} subtitle="Upload documents to Cosentus for processing">
      <div className="mb-4 bg-brand-pale0/10 border border-brand-light/30 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-brand-deep dark:text-brand-deep">
        <span className="text-lg shrink-0">📄</span>
        Scan & Submit connected — live document upload
      </div>
      <div className="max-w-2xl mx-auto">

        {/* Step indicator */}
        <div className="flex items-center gap-1 sm:gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {([1, 2, 3] as Step[]).map(s => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                ${step === s ? 'bg-brand text-white' : step > s ? 'bg-brand/10 text-brand-dark dark:text-brand-dark' : 'bg-surface-elevated text-content-tertiary'}`}>
                {step > s ? <CheckCircle2 size={12} /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{s}</span>}
                {s === 1 ? 'Select Patient' : s === 2 ? 'Upload Files' : 'Review & Confirm'}
              </div>
              {s < 3 && <div className="flex-1 h-px bg-separator" />}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6 mb-5">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">Who is this visit for?</h3>
              {!showNewPatient ? (
                <>
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Search patient by name…"
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-secondary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
                  {patientSearch && (
                    <div className="border border-separator rounded-lg overflow-hidden">
                      {(filteredPatients as any[]).slice(0, 6).map((p: any) => (
                        <button key={p.id} onClick={() => { setPatientId(p.id); setPatientSearch('') }}
                          className={`w-full text-left px-3 py-2.5 border-b border-separator last:border-0 hover:bg-surface-elevated text-sm transition-colors ${patientId === p.id ? 'bg-brand/5' : ''}`}>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-content-secondary ml-2 text-xs">{p.dob}</span>
                        </button>
                      ))}
                      {(filteredPatients as any[]).length === 0 && <div className="px-3 py-2 text-sm text-content-secondary">No patients found</div>}
                    </div>
                  )}
                  {selectedPatient && (
                    <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{(selectedPatient as any).name}</p>
                        <p className="text-[10px] text-content-secondary">{(selectedPatient as any).dob}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-brand/10 text-brand-dark dark:text-brand-dark px-2 py-0.5 rounded-full">✓ Selected</span>
                        <button onClick={() => setPatientId('')} className="text-content-tertiary hover:text-red-500"><X size={14} /></button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2"><div className="flex-1 h-px bg-separator" /><span className="text-xs text-content-tertiary">or</span><div className="flex-1 h-px bg-separator" /></div>
                  <button onClick={() => setShowNewPatient(true)} className="w-full border border-dashed border-separator text-content-secondary hover:text-content-primary text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <Plus size={14} /> New Patient (Walk-in)
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-content-secondary block mb-1">First Name *</label><input value={newPatient.firstName} onChange={e => setNewPatient(p => ({ ...p, firstName: e.target.value }))} placeholder="John" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary" /></div>
                    <div><label className="text-xs text-content-secondary block mb-1">Last Name *</label><input value={newPatient.lastName} onChange={e => setNewPatient(p => ({ ...p, lastName: e.target.value }))} placeholder="Smith" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary" /></div>
                    <div><label className="text-xs text-content-secondary block mb-1">Date of Birth</label><input type="date" value={newPatient.dob} onChange={e => setNewPatient(p => ({ ...p, dob: e.target.value }))} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary" /></div>
                    <div><label className="text-xs text-content-secondary block mb-1">Phone</label><input value={newPatient.phone} onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} placeholder="(949) 555-0100" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setPatientId('NEW'); setShowNewPatient(false) }} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-deep transition-colors">Use New Patient</button>
                    <button onClick={() => setShowNewPatient(false)} className="px-4 py-2 border border-separator text-content-secondary rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}
              <button onClick={() => setStep(2)} disabled={!patientId}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-content-primary">Drop everything for {(selectedPatient as any)?.name || 'New Patient'}</h3>
                <p className="text-xs text-content-tertiary mt-0.5">Superbills, visit notes, insurance cards, referrals, licenses — dump them all at once. AI will tag each one.</p>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl py-12 text-center cursor-pointer transition-all
                  ${dragging ? 'border-brand bg-brand/10' : files.length ? 'border-brand/40 bg-brand/5' : 'border-separator hover:border-brand/30 hover:bg-surface-elevated'}`}>
                <Upload size={36} className={`mx-auto mb-3 ${dragging || files.length ? 'text-brand' : 'text-content-tertiary'}`} />
                <p className="text-sm font-semibold text-content-primary">{dragging ? 'Drop files here' : 'Drag & drop all documents here'}</p>
                <p className="text-xs text-content-secondary mt-1">Superbills · Visit Notes · Insurance Cards · Referrals · Licenses</p>
                <p className="text-[11px] text-content-tertiary mt-1">PDF, JPG, PNG, HEIC · Up to {MAX_FILES} files · Max 25MB each</p>
                <p className="text-[10px] text-brand mt-2">Or click to browse files</p>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.heic" className="hidden"
                  onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = '' } }} />
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-content-secondary">{files.length} file{files.length !== 1 ? 's' : ''} ready</p>
                    <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-600">Clear all</button>
                  </div>
                  {files.map(f => (
                    <div key={f.id} className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2.5">
                      <FileText size={15} className="text-brand shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{f.name}</p>
                        <p className="text-[10px] text-content-tertiary">{f.sizeMB}</p>
                      </div>
                      <button onClick={() => setFiles(p => p.filter(x => x.id !== f.id))} className="text-content-tertiary hover:text-red-500"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-separator text-content-secondary rounded-lg text-sm hover:text-content-secondary transition-colors">← Back</button>
                <button onClick={uploadAndClassifyAll} disabled={files.length === 0}
                  className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                  <Upload size={14} /> Upload & AI Tag ({files.length} file{files.length !== 1 ? 's' : ''}) →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-content-primary">AI is reading your documents</h3>
                  <p className="text-xs text-content-tertiary mt-0.5">Review each tag — correct if needed — then confirm.</p>
                </div>
                {uploadingCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-brand">
                    <Loader2 size={13} className="animate-spin" /> {uploadingCount} processing…
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {files.map(f => (
                  <FileReviewRow key={f.id} entry={f}
                    onTypeChange={type => setFileField(f.id, { approvedType: type })} />
                ))}
              </div>

              {anyError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-red-500">
                  <AlertCircle size={13} /> Some files failed. Successful ones will still be submitted.
                </div>
              )}

              {allDone && (
                <>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder="Optional notes for the billing team…"
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary placeholder:text-content-tertiary resize-none outline-none focus:border-brand/40" />

                  <div className="bg-surface-elevated rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-content-secondary">Patient</span><span className="font-medium">{(selectedPatient as any)?.name || 'New Walk-in'}</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">Uploaded</span><span className="font-medium">{successCount} of {files.length} documents</span></div>
                    <div className="flex justify-between"><span className="text-content-secondary">Date</span><span className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                  </div>

                  <button onClick={handleFinalSubmit} disabled={submitting || successCount === 0}
                    className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                    {submitting
                      ? <><Loader2 size={14} className="animate-spin" /> Confirming…</>
                      : <><CheckCircle2 size={14} /> Confirm & Submit to Cosentus</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}

function FileReviewRow({ entry, onTypeChange }: { entry: FileEntry; onTypeChange: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const currentType = entry.approvedType || entry.aiType || 'Other'
  const meta = DOC_TYPE_META[currentType] || DOC_TYPE_META['Other']
  const btnRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.closest('.doc-type-dropdown')?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={`rounded-lg border transition-all ${entry.status === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-separator bg-surface-elevated'}`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <FileText size={15} className={entry.status === 'error' ? 'text-red-400' : 'text-brand'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.status === 'uploading' && <span className="flex items-center gap-1 text-[10px] text-blue-500"><Loader2 size={10} className="animate-spin" />Uploading…</span>}
            {entry.status === 'classifying' && <span className="flex items-center gap-1 text-[10px] text-brand"><Loader2 size={10} className="animate-spin" />AI reading…</span>}
            {entry.status === 'done' && (
              <span className={`text-[10px] font-medium ${(entry.aiConfidence || 0) >= 80 ? 'text-brand-dark' : (entry.aiConfidence || 0) >= 50 ? 'text-brand-deep' : 'text-red-400'}`}>
                {(entry.aiConfidence || 0) > 0 ? `AI: ${entry.aiConfidence}% confident` : '⚠ Review needed'}
              </span>
            )}
            {entry.status === 'error' && <span className="text-[10px] text-red-500">{entry.error || 'Upload failed'}</span>}
            <span className="text-[10px] text-content-tertiary">{entry.sizeMB}</span>
          </div>
        </div>

        {entry.status === 'done' && (
          <div className="doc-type-dropdown relative shrink-0">
            <button
              ref={btnRef}
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 bg-brand text-white rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-brand-deep transition-colors shadow-sm"
            >
              <span>{meta.icon}</span>
              <span className="max-w-[80px] truncate">{currentType}</span>
              <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[rgba(0,0,0,0.09)] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] py-1.5 min-w-[170px] overflow-hidden">
                {Object.entries(DOC_TYPE_META).map(([type, m]) => (
                  <button
                    key={type}
                    onClick={() => { onTypeChange(type); setOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-colors
                      ${currentType === type
                        ? 'bg-brand/20 text-brand font-semibold'
                        : 'text-content-primary hover:bg-surface-elevated'
                      }`}
                  >
                    <span className="text-sm">{m.icon}</span>
                    <span className="flex-1">{type}</span>
                    {currentType === type && <span className="text-brand text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(entry.status === 'uploading' || entry.status === 'classifying' || entry.status === 'pending') && (
          <div className="w-24 h-6 rounded-full bg-separator/50 animate-pulse shrink-0" />
        )}
      </div>
    </div>
  )
}
