'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { getSLAStatus } from '@/lib/utils/time'
import { useCodingQueue, useUsers } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import { sanitizeForPrompt } from '@/lib/ai-utils'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import {
  BrainCircuit, CheckCircle2, Activity, Clock, MessageCircle, Mic, FileUp,
  ChevronDown, ChevronUp, Play, FileText, AlertTriangle, Plus, PauseCircle,
  X, Receipt
} from 'lucide-react'

// ── Demo code lookup tables ─────────────────────────────────────────────────
// Manual fallback code lookup — used when AI Coding is unavailable (BM4 requirement)
// AI down → type-ahead search from these tables + manual entry, flagged 'manually coded'
const ICD_FALLBACK_LOOKUP = [
  // Endocrine
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia' },
  { code: 'E11.21', description: 'Type 2 DM with diabetic nephropathy' },
  { code: 'E11.40', description: 'Type 2 DM with diabetic neuropathy, unspecified' },
  { code: 'E11.22', description: 'Type 2 DM with diabetic chronic kidney disease' },
  { code: 'E11.319', description: 'Type 2 DM with unspecified diabetic retinopathy' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
  { code: 'E78.0', description: 'Pure hypercholesterolemia, unspecified' },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
  { code: 'E66.01', description: 'Morbid obesity due to excess calories' },
  { code: 'E66.9', description: 'Obesity, unspecified' },
  // Cardiovascular
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'I50.22', description: 'Chronic systolic (congestive) heart failure' },
  { code: 'I48.91', description: 'Unspecified atrial fibrillation' },
  { code: 'I48.0', description: 'Paroxysmal atrial fibrillation' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
  { code: 'I73.9', description: 'Peripheral vascular disease, unspecified' },
  // Musculoskeletal
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'M54.2', description: 'Cervicalgia (neck pain)' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'M17.11', description: 'Primary osteoarthritis, right knee' },
  { code: 'M17.12', description: 'Primary osteoarthritis, left knee' },
  { code: 'M16.11', description: 'Primary osteoarthritis, right hip' },
  { code: 'M25.511', description: 'Pain in right shoulder' },
  { code: 'M25.561', description: 'Pain in right knee' },
  { code: 'M25.562', description: 'Pain in left knee' },
  { code: 'M19.011', description: 'Primary osteoarthritis, right shoulder' },
  { code: 'M47.812', description: 'Spondylosis without myelopathy, cervical' },
  // Respiratory
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'J44.1', description: 'COPD with acute exacerbation' },
  { code: 'J44.0', description: 'COPD with acute lower respiratory infection' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'J45.20', description: 'Mild intermittent asthma, uncomplicated' },
  { code: 'J45.40', description: 'Moderate persistent asthma, uncomplicated' },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified' },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified' },
  // GI
  { code: 'K21.0', description: 'GERD with esophagitis' },
  { code: 'K21.9', description: 'GERD without esophagitis' },
  { code: 'K58.9', description: 'Irritable bowel syndrome without diarrhea' },
  { code: 'K76.0', description: 'Fatty change of liver, not elsewhere classified' },
  // GU
  { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  { code: 'N18.3', description: 'Chronic kidney disease, stage 3' },
  { code: 'N18.4', description: 'Chronic kidney disease, stage 4' },
  { code: 'N40.0', description: 'Benign prostatic hyperplasia without LUTS' },
  // Mental health
  { code: 'F32.1', description: 'Major depressive disorder, single episode, moderate' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
  { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified' },
  { code: 'F17.210', description: 'Nicotine dependence, cigarettes, uncomplicated' },
  // Neuro
  { code: 'G43.909', description: 'Migraine, unspecified, not intractable' },
  { code: 'G47.00', description: 'Insomnia, unspecified' },
  { code: 'G89.29', description: 'Other chronic pain' },
  // Skin
  { code: 'L30.9', description: 'Dermatitis, unspecified' },
  { code: 'L70.0', description: 'Acne vulgaris' },
  // Blood
  { code: 'D64.9', description: 'Anemia, unspecified' },
  { code: 'D50.9', description: 'Iron deficiency anemia, unspecified' },
  // Infectious
  { code: 'B34.9', description: 'Viral infection, unspecified' },
  { code: 'B95.61', description: 'MRSA as cause of disease classified elsewhere' },
  // Symptoms
  { code: 'R00.0', description: 'Tachycardia, unspecified' },
  { code: 'R05.9', description: 'Cough, unspecified' },
  { code: 'R10.9', description: 'Unspecified abdominal pain' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'R06.00', description: 'Dyspnea, unspecified' },
  { code: 'R51.9', description: 'Headache, unspecified' },
  { code: 'R42', description: 'Dizziness and giddiness' },
  { code: 'R63.4', description: 'Abnormal weight loss' },
  { code: 'R73.03', description: 'Prediabetes' },
  // Z-codes
  { code: 'Z79.4', description: 'Long-term (current) use of insulin' },
  { code: 'Z79.84', description: 'Long-term use of oral hypoglycemic agents' },
  { code: 'Z79.01', description: 'Long-term use of anticoagulants' },
  { code: 'Z79.899', description: 'Other long-term drug therapy' },
  { code: 'Z00.00', description: 'Encounter for general adult medical examination' },
  { code: 'Z23', description: 'Encounter for immunization' },
  { code: 'Z87.891', description: 'Personal history of nicotine dependence' },
  { code: 'Z68.35', description: 'BMI 35.0-35.9, adult' },
  { code: 'Z96.1', description: 'Presence of intraocular lens' },
]

const CPT_FALLBACK_LOOKUP = [
  { code: '99213', description: 'Office visit, established patient, low complexity' },
  { code: '99214', description: 'Office visit, established patient, moderate complexity' },
  { code: '99215', description: 'Office visit, established patient, high complexity' },
  { code: '99202', description: 'Office visit, new patient, straightforward' },
  { code: '99203', description: 'Office visit, new patient, low complexity' },
  { code: '99204', description: 'Office visit, new patient, moderate complexity' },
  { code: '99205', description: 'Office visit, new patient, high complexity' },
  { code: '99211', description: 'Office visit, established patient, minimal' },
  { code: '99385', description: 'Preventive visit, new patient, 18-39 years' },
  { code: '99395', description: 'Preventive visit, established patient, 18-39 years' },
  { code: '99396', description: 'Preventive visit, established patient, 40-64 years' },
  { code: '93000', description: 'Electrocardiogram, routine ECG with interpretation' },
  { code: '93306', description: 'Echocardiography, transthoracic, real-time' },
  { code: '90837', description: 'Psychotherapy, 60 minutes with patient' },
  { code: '90834', description: 'Psychotherapy, 45 minutes with patient' },
  { code: '99495', description: 'Transitional care management, moderate complexity' },
  { code: '36415', description: 'Venipuncture, routine collection' },
  { code: '71046', description: 'Chest X-ray, 2 views' },
  { code: '80053', description: 'Comprehensive metabolic panel' },
  { code: '85025', description: 'CBC with automated differential' },
  { code: '81001', description: 'Urinalysis, automated, with microscopy' },
  { code: '87880', description: 'Rapid strep test (Group A)' },
  { code: '90471', description: 'Immunization administration, 1st vaccine' },
  { code: '96372', description: 'Therapeutic/diagnostic injection, subcutaneous/IM' },
  { code: '10060', description: 'Incision and drainage of abscess, simple' },
  { code: '17000', description: 'Destruction of premalignant lesion, first lesion' },
  { code: '29125', description: 'Short arm splint, forearm to hand' },
  { code: '99441', description: 'Telephone E/M service, 5-10 minutes' },
  { code: '99421', description: 'Online digital E/M, 5-10 minutes cumulative' },
]

const getDemoIcdMatches = (q: string) => q.length < 2 ? [] :
  ICD_FALLBACK_LOOKUP.filter(r => r.code.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

const getDemoCptMatches = (q: string) => q.length < 2 ? [] :
  CPT_FALLBACK_LOOKUP.filter(r => r.code.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())).slice(0, 6)

// ── NCCI edit pairs ──────────────────────────────────────────────────────────
const NCCI_EDITS: Array<[string, string, string]> = [
  ['99213', '99214', 'Cannot bill two E/M codes on same date for same patient'],
  ['99214', '99215', 'Cannot bill two E/M codes on same date for same patient'],
  ['93000', '93005', '93000 includes 93005 — remove 93005'],
  ['93306', '93320', '93320 is a component of 93306 — remove 93320 if billing 93306'],
]

function validateNCCI(approvedCptCodes: string[]): Array<{ code1: string; code2: string; message: string }> {
  const violations: Array<{ code1: string; code2: string; message: string }> = []
  for (const [code1, code2, message] of NCCI_EDITS) {
    if (approvedCptCodes.includes(code1) && approvedCptCodes.includes(code2)) {
      violations.push({ code1, code2, message })
    }
  }
  return violations
}

// ── Priority dot colors ──────────────────────────────────────────────────────

interface AISuggestedCode {
  code: string
  desc: string
  confidence: number
  modifiers?: string[]
  reasoning?: string
  is_hcc?: boolean
}
const priorityColor: Record<'urgent' | 'high' | 'medium' | 'low', string> = {
  urgent: 'bg-red-500',
  high: 'bg-brand-pale',
  medium: 'bg-brand',
  low: 'bg-gray-400',
}

// ── Types ────────────────────────────────────────────────────────────────────
type CodingTab = 'note' | 'superbill' | 'history' | 'qa' | 'rules'

type CodeOverride = {
  action: 'removed' | 'edited'
  reason: string
  originalCode: string
  newCode?: string
}

interface ManualCode {
  key: string
  code: string
  description: string
  type: 'icd' | 'cpt'
  isManual: true
}

const removeReasons = [
  'Not documented in note',
  'Unbundling — included in another code',
  'Payer will not cover',
  'Incorrect suggestion — wrong laterality',
  'Duplicate code',
  'Other',
]

// ── AddCodeRow sub-component ─────────────────────────────────────────────────
function AddCodeRow({ type, onAdd }: { type: 'ICD' | 'CPT'; onAdd: (code: string, description: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const results = type === 'ICD' ? getDemoIcdMatches(query) : getDemoCptMatches(query)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-1 py-1.5 rounded-lg border border-dashed border-separator text-[12px] text-content-tertiary hover:border-brand/40 hover:text-brand transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={12} /> Add {type} Code
      </button>
    )
  }

  return (
    <div className="mt-1 border border-brand/30 rounded-lg p-2 bg-brand/5">
      <input
        autoFocus
        placeholder={`Search ${type} code or description...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-surface-elevated border border-separator rounded px-2 py-1.5 text-[12px] focus:border-brand/40 outline-none text-content-primary"
      />
      {query.length >= 2 && results.length > 0 && (
        <div className="mt-1 border border-separator rounded-lg overflow-hidden max-h-40 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.code}
              onClick={() => { onAdd(r.code, r.description); setOpen(false); setQuery('') }}
              className="block w-full text-left px-3 py-1.5 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0"
            >
              <span className="font-mono font-semibold text-brand">{r.code}</span>
              <span className="ml-2 text-content-secondary">{r.description}</span>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="text-[12px] text-content-tertiary mt-1 px-2">No results — try a different term</p>
      )}
      <button onClick={() => setOpen(false)} className="mt-1 text-[11px] text-content-tertiary hover:text-content-secondary">Cancel</button>
    </div>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────────
// Inline Document Preview — fetches presigned URL and renders PDF/image
function InlineDocPreview({ patientId, label }: { patientId?: string; label?: string }) {
  const [docs, setDocs] = React.useState<Array<{ id: string; file_name: string; doc_type: string }>>([])
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [fullscreen, setFullscreen] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  // Fetch patient's documents
  React.useEffect(() => {
    if (!patientId) { setLoading(false); return }
    setLoading(true)
    api.get<{ data: Array<{ id: string; file_name: string; doc_type: string; s3_key?: string }> }>(`/documents`, { patient_id: patientId })
      .then(r => {
        const list = r.data || []
        setDocs(list)
        if (list.length > 0) setSelectedDocId(list[0].id)
        setLoading(false)
      })
      .catch(() => { setLoading(false); setError('Failed to load documents') })
  }, [patientId])

  // Fetch presigned URL for selected document
  React.useEffect(() => {
    if (!selectedDocId) return
    setPreviewUrl(null)
    api.get<{ download_url: string }>(`/documents/${selectedDocId}/download`, { mode: 'inline' } as any)
      .then(r => { if (r.download_url) setPreviewUrl(r.download_url) })
      .catch(() => setError('Failed to load preview'))
  }, [selectedDocId])

  if (!patientId) return <p className="text-[11px] text-content-tertiary text-center py-4">No patient linked</p>
  if (loading) return <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (docs.length === 0) return <p className="text-[11px] text-content-tertiary text-center py-4">No documents uploaded for this patient</p>

  const selectedDoc = docs.find(d => d.id === selectedDocId)
  const fileName = selectedDoc?.file_name || ''
  const isPdf = fileName.toLowerCase().endsWith('.pdf')
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName)

  return (
    <>
      {/* Fullscreen overlay — separate from inline to prevent iframe remount */}
      {fullscreen && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={e => { if (e.target === e.currentTarget) setFullscreen(false) }}>
          <div className="flex items-center justify-between p-3 bg-surface-secondary border-b border-separator">
            {label && <p className="text-xs font-bold text-brand uppercase tracking-wider">{label}</p>}
            <span className="text-xs text-content-tertiary ml-2">{docs.find(d => d.id === selectedDocId)?.file_name}</span>
            <button onClick={() => setFullscreen(false)}
              className="ml-auto text-sm px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors font-medium">
              ✕ Exit Fullscreen
            </button>
          </div>
          {isPdf ? (
            <iframe src={previewUrl} className="flex-1 w-full" title="Document Fullscreen" />
          ) : isImage ? (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <img src={previewUrl} alt={fileName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : null}
        </div>
      )}
      {/* Inline preview — always stable, never remounts */}
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          {label && <p className="text-[10px] uppercase tracking-widest text-brand font-bold shrink-0">{label}</p>}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {docs.length > 1 && (
              <select value={selectedDocId || ''} onChange={e => setSelectedDocId(e.target.value)}
                className="bg-surface-elevated border border-separator rounded px-2 py-1 text-[11px] text-content-primary max-w-[180px]">
                {docs.map(d => <option key={d.id} value={d.id}>{d.file_name}</option>)}
              </select>
            )}
            {docs.length === 1 && <span className="text-[10px] text-content-tertiary truncate max-w-[140px]">{docs[0].file_name}</span>}
            <button onClick={() => setFullscreen(true)}
              className="text-[10px] px-2 py-1 rounded border border-separator text-content-secondary hover:text-content-primary hover:border-brand/40 transition-colors whitespace-nowrap">
              ⛶ Fullscreen
            </button>
          </div>
        </div>
      {error && <p className="text-[11px] text-red-500 text-center py-2">{error}</p>}
      {previewUrl ? (
        isPdf ? (
          <iframe src={previewUrl} className="flex-1 w-full rounded-lg border border-separator min-h-[300px]" title="Document Preview" />
        ) : isImage ? (
          <img src={previewUrl} alt={fileName} className="max-w-full rounded-lg border border-separator" />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline">Open {fileName}</a>
          </div>
        )
      ) : (
        <div className="flex-1 flex items-center justify-center"><div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
      )}
    </div>
    </>
  )
}

// (e) Payer-specific coding rules engine panel
function CodingRulesPanel() {
  const [rules, setRules] = React.useState<Array<{ id: string; rule_name: string; payer_name?: string; condition_field: string; condition_operator: string; condition_value: string; action_type: string; action_value: string; is_active: boolean }>>([])
  const [loading, setLoading] = React.useState(true)
  const [showAdd, setShowAdd] = React.useState(false)
  const [form, setForm] = React.useState({ rule_name: '', payer_name: '', condition_field: 'diagnosis', condition_operator: 'contains', condition_value: '', action_type: 'auto_code', action_value: '' })
  const { toast } = useToast()

  React.useEffect(() => {
    api.get<{ data: typeof rules }>('/coding-rules').then(r => { setRules(r.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const addRule = async () => {
    try {
      const r = await api.post<{ id: string }>('/coding-rules', { ...form, is_active: true })
      setRules(prev => [...prev, { ...form, id: r.id, is_active: true }])
      setForm({ rule_name: '', payer_name: '', condition_field: 'diagnosis', condition_operator: 'contains', condition_value: '', action_type: 'auto_code', action_value: '' })
      setShowAdd(false)
      toast.success('Rule added')
    } catch { toast.error('Failed to save rule') }
  }

  const deleteRule = async (id: string) => {
    try {
      await api.delete('/coding-rules/' + id)
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success('Rule deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Payer Coding Rules</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-[10px] px-2 py-1 rounded bg-brand text-white">+ Add Rule</button>
      </div>
      <p className="text-[11px] text-content-tertiary">Rules are automatically applied by AI when generating codes. E.g. &quot;For Aetna, always add modifier 25 to E/M with injection&quot;</p>
      {showAdd && (
        <div className="space-y-2 p-3 bg-surface-elevated rounded-lg border border-separator">
          <input value={form.rule_name} onChange={e => setForm(p => ({...p, rule_name: e.target.value}))} placeholder="Rule name (e.g. Aetna modifier 25)" className="w-full bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary" />
          <input value={form.payer_name} onChange={e => setForm(p => ({...p, payer_name: e.target.value}))} placeholder="Payer (blank = all payers)" className="w-full bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary" />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.condition_field} onChange={e => setForm(p => ({...p, condition_field: e.target.value}))} className="bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary">
              <option value="diagnosis">IF Diagnosis</option>
              <option value="cpt_code">IF CPT Code</option>
              <option value="specialty">IF Specialty</option>
              <option value="visit_type">IF Visit Type</option>
              <option value="age">IF Patient Age</option>
            </select>
            <select value={form.condition_operator} onChange={e => setForm(p => ({...p, condition_operator: e.target.value}))} className="bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary">
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="starts_with">starts with</option>
              <option value="greater_than">&gt;</option>
              <option value="less_than">&lt;</option>
            </select>
            <input value={form.condition_value} onChange={e => setForm(p => ({...p, condition_value: e.target.value}))} placeholder="Value" className="bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.action_type} onChange={e => setForm(p => ({...p, action_type: e.target.value}))} className="bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary">
              <option value="auto_code">→ Auto-code to</option>
              <option value="add_modifier">→ Add modifier</option>
              <option value="replace_code">→ Replace code</option>
              <option value="flag_review">→ Flag for review</option>
              <option value="deny_code">→ Never use code</option>
            </select>
            <input value={form.action_value} onChange={e => setForm(p => ({...p, action_value: e.target.value}))} placeholder="e.g. 99214-25, E11.65" className="bg-surface-default border border-separator rounded px-2 py-1.5 text-xs text-content-primary" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 border border-separator rounded py-1.5 text-xs text-content-secondary">Cancel</button>
            <button onClick={addRule} disabled={!form.rule_name || !form.condition_value || !form.action_value} className="flex-1 bg-brand text-white rounded py-1.5 text-xs disabled:opacity-40">Save Rule</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-xs text-content-tertiary text-center py-4">Loading rules...</p> : rules.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-content-tertiary">No coding rules configured yet.</p>
          <p className="text-[10px] text-content-tertiary mt-1">Add rules to customize AI coding by payer, diagnosis, or specialty.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-surface-elevated rounded-lg border border-separator text-xs">
              <div className="flex-1">
                <span className="font-medium text-content-primary">{r.rule_name}</span>
                {r.payer_name && <span className="text-content-tertiary ml-2">[{r.payer_name}]</span>}
                <p className="text-[10px] text-content-tertiary">IF {r.condition_field} {r.condition_operator} &quot;{r.condition_value}&quot; → {r.action_type}: {r.action_value}</p>
              </div>
              <button onClick={() => deleteRule(r.id)} className="text-[10px] text-red-500 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CodingPage() {
  const router = useRouter()
  const { selectedClient, currentUser, country } = useApp()
  const { t } = useT()
  const [reassignTarget, setReassignTarget] = useState<string | null>(null)
  const { toast } = useToast()
  const { data: apiQueueResult } = useCodingQueue({ status: 'pending', limit: 100 })

  const apiMapped = apiQueueResult?.data?.map(c => ({
    id: c.id,
    patientId: c.patient_id || '',
    patientName: c.patient_name || 'Unknown Patient',
    clientId: c.client_id,
    clientName: c.client_name || '',
    source: 'upload' as 'upload' | 'ai_scribe',
    dos: c.created_at ? c.created_at.split('T')[0] : '',
    provider: c.provider_name || '',
    providerNpi: '',
    providerSpecialty: '',
    status: (c.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'query_sent' | 'audit_hold',
    receivedAt: c.received_at || c.created_at || new Date().toISOString(),
    priority: (c.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    visitNote: {
      subjective: c.subjective || '',
      objective: c.objective || '',
      assessment: c.assessment || '',
      plan: c.soap_plan || '',
    },
    aiSuggestedIcd: ((c as any).ai_icd ? (typeof (c as any).ai_icd === 'string' ? JSON.parse((c as any).ai_icd) : (c as any).ai_icd) : []).map((d: any) => ({ code: d.code, desc: d.description || d.desc || '', confidence: d.confidence || 0, reasoning: d.specificity_note || d.reasoning })) as AISuggestedCode[],
    aiSuggestedCpt: ((c as any).ai_cpt ? (typeof (c as any).ai_cpt === 'string' ? JSON.parse((c as any).ai_cpt) : (c as any).ai_cpt) : []).map((d: any) => ({ code: d.code, desc: d.description || d.desc || '', confidence: d.confidence || 0, modifiers: d.modifier ? [d.modifier] : d.modifiers || [], reasoning: d.modifier_reason || d.reasoning })) as AISuggestedCode[],
    aiAlreadyCoded: !!(c as any).ai_suggestion_id,
    hasSuperbill: false,
    superbillCpt: undefined as string[] | undefined,
    priorAuthStatus: 'not_required' as string,
    priorAuthNumber: undefined as string | undefined,
    patientDob: undefined as string | undefined,
    patientGender: undefined as string | undefined,
    patientPayer: undefined as string | undefined,
    visitType: undefined as string | undefined,
    placeOfService: undefined as string | undefined,
  })) || []

  const { data: usersResult } = useUsers({ limit: 100 })
  // Coders pulled from seeded users (role = coder)
  const coders = (usersResult?.data || [])
    .filter((u: any) => u.role === 'coder' || u.role === 'coding_specialist')
    .map((u: any) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email }))

  // UAE org IDs
  const uaeClientIds = UAE_ORG_IDS

  const queue = (() => {
    const base = apiMapped.length > 0 ? apiMapped : []
    // Filter by region
    const regionFiltered = base.filter(item => {
      const isUAEClient = uaeClientIds.includes(item.clientId)
      return country === 'uae' ? isUAEClient : !isUAEClient
    })
    // All roles see all items for their org/client — no role-based sub-sampling
    return regionFiltered.filter(item => !selectedClient || item.clientId === selectedClient.id)
  })()

  const [selected, setSelected] = useState(queue[0]?.id || '')
  const [tab, setTab] = useState<CodingTab>('note')
  const [selectedCodes, setSelectedCodes] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [codeOverrides, setCodeOverrides] = useState<Record<string, CodeOverride>>({})
  const [removingCode, setRemovingCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editSearch, setEditSearch] = useState('')
  const [forcedReviewCodes, setForcedReviewCodes] = useState<Set<string>>(new Set())
  const [manualCodes, setManualCodes] = useState<ManualCode[]>([])
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [showQueryModal, setShowQueryModal] = useState(false)
  const [queryGenerating, setQueryGenerating] = useState(false)

  // AI Auto-Coding state
  const [aiCoding, setAiCoding] = useState(false)
  const [aiCodeCache, setAiCodeCache] = useState<Record<string, { icd: AISuggestedCode[], cpt: AISuggestedCode[] }>>({})
  const [quickSoap, setQuickSoap] = useState<{ assessment: string; plan: string; specialty: string }>({ assessment: '', plan: '', specialty: '' })
  const [showQuickSoap, setShowQuickSoap] = useState(false)
  const [coderInstructions, setCoderInstructions] = useState('')

  // On-demand document text extraction — ensures AI has superbill data before coding
  async function ensureDocumentExtracted(codingItem: typeof item) {
    if (!codingItem) return
    try {
      // Get patient's documents
      const docsResp = await api.get<{ data: Array<{ id: string; file_name: string; s3_key?: string; textract_result?: any; textract_status?: string }> }>('/documents', { patient_id: codingItem.patientId } as any)
      const docs = docsResp.data || []
      for (const doc of docs) {
        if (!doc.s3_key) continue
        // Check if textract_result is empty or has no extracted codes
        let needsExtraction = !doc.textract_result
        if (doc.textract_result) {
          const tr = typeof doc.textract_result === 'string' ? JSON.parse(doc.textract_result) : doc.textract_result
          const cptParsed = tr?.fields?.cpt_codes?.parsed || []
          const icdParsed = tr?.fields?.diagnoses?.parsed || []
          if (cptParsed.length === 0 && icdParsed.length === 0) needsExtraction = true
        }
        if (needsExtraction) {
          // Get presigned URL, then extract text via Vercel route
          const dl = await api.get<{ download_url: string }>(`/documents/${doc.id}/download`, { mode: 'inline' } as any)
          if (!dl.download_url) continue
          const extractResp = await fetch('/api/extract-text', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ presigned_url: dl.download_url, document_id: doc.id }),
          }).then(r => r.json())
          if (extractResp.raw_text && extractResp.text_length > 20) {
            // Save to document AND link to coding queue item
            await api.patch(`/documents/${doc.id}`, {
              textract_result: JSON.stringify({
                fields: {
                  patient_name: { value: extractResp.fields?.patient_name || 'Unknown', confidence: 0.85 },
                  date_of_service: { value: extractResp.fields?.date_of_service || '', confidence: 0.85 },
                  cpt_codes: { value: (extractResp.fields?.cpt_codes || []).join(' '), parsed: extractResp.fields?.cpt_codes || [], confidence: 0.85 },
                  diagnoses: { value: (extractResp.fields?.icd_codes || []).join(' '), parsed: extractResp.fields?.icd_codes || [], confidence: 0.85 },
                  billed_amount: { value: String(extractResp.fields?.total_charges || 0), confidence: 0.85 },
                },
                raw_text: extractResp.raw_text,
                mode: 'vercel_on_demand',
              }),
              textract_status: 'completed',
            } as any)
            // Link document to coding queue item if not linked
            if (!codingItem.id) continue
            try { await api.patch(`/coding/${codingItem.id}`, { document_id: doc.id } as any) } catch (err) { console.warn('[coding] Failed to link doc:', err) }
            console.log(`[coding] Extracted ${extractResp.fields?.cpt_codes?.length || 0} CPT + ${extractResp.fields?.icd_codes?.length || 0} ICD from ${doc.file_name}`)
            break // Only need first document
          }
        }
      }
    } catch (e) { console.warn('[coding] Doc extraction failed:', e) }
  }



  async function generateAICodes(soapAssessment: string, soapPlan: string, specialty: string, instructions?: string) {
    if (!item) return
    setAiCoding(true)
    try {
      // Extract text from linked documents first (ensures AI has superbill data)
      await ensureDocumentExtracted(item)
      
      // Primary: call Lambda /coding/:id/ai-suggest (persists to ai_coding_suggestions table)
      const result = await api.post<{
        suggested_cpt?: Array<{ code: string; description: string; confidence: number; modifier?: string; modifier_reason?: string; ncci_note?: string }>
        suggested_icd?: Array<{ code: string; description: string; confidence: number; is_primary?: boolean; is_hcc?: boolean; specificity_note?: string }>
        suggested_em?: string; em_confidence?: number; reasoning?: string
        mock?: boolean; suggestion_id?: string; processing_ms?: number; confidence?: number
        documentation_gaps?: string[]; audit_flags?: string[]; hcc_diagnoses?: string[]
      }>(`/coding/${item.id}/ai-suggest`, { instructions: instructions || '' })

      // Map Lambda response format → frontend format
      const icd: AISuggestedCode[] = (result.suggested_icd || []).map(c => ({
        code: c.code, desc: c.description, confidence: c.confidence,
        is_hcc: c.is_hcc,
        reasoning: c.specificity_note || (c.is_hcc ? 'HCC risk adjustment diagnosis' : undefined),
      }))
      const cpt: AISuggestedCode[] = (result.suggested_cpt || []).map(c => ({
        code: c.code, desc: c.description, confidence: c.confidence,
        modifiers: c.modifier ? [c.modifier] : [],
        reasoning: c.modifier_reason || c.ncci_note || undefined,
      }))

      setAiCodeCache(prev => ({ ...prev, [item.id]: { icd, cpt } }))
      // Auto-select all generated codes + E/M conflict detection
      const newSelected: Record<string, boolean> = {}
      icd.forEach(c => { newSelected[`icd-${c.code}`] = true })
      // E/M conflict: only keep the highest-level E/M code
      const emCodes = cpt.filter(c => /^99(2[0-5][0-9]|[3-4])/.test(c.code))
      const nonEmCodes = cpt.filter(c => !/^99(2[0-5][0-9]|[3-4])/.test(c.code))
      if (emCodes.length > 1) {
        const highest = emCodes.sort((a, b) => b.code.localeCompare(a.code))[0]
        nonEmCodes.push(highest)
        nonEmCodes.forEach(c => { newSelected[`cpt-${c.code}`] = true })
      } else {
        cpt.forEach(c => { newSelected[`cpt-${c.code}`] = true })
      }
      setSelectedCodes(prev => ({ ...prev, ...newSelected }))
      setShowQuickSoap(false)

      const mockLabel = result.mock ? ' (mock — Bedrock unavailable)' : ''
      if (result.documentation_gaps?.length) {
        toast.warning(`AI generated ${icd.length} ICD + ${cpt.length} CPT codes${mockLabel}. ${result.documentation_gaps.length} documentation gap(s) flagged.`)
      } else {
        toast.success(`AI generated ${icd.length} ICD + ${cpt.length} CPT codes${mockLabel}`)
      }
    } catch (e) {
      console.error('AI coding error:', e)
      setAiUnavailable(true)
      toast.error('AI coding failed — use manual entry below')
    } finally {
      setAiCoding(false)
    }
  }

  // Auto-trigger moved below 'item' definition
  const autoTriggeredRef = React.useRef<Set<string>>(new Set())

  async function generateCDIQuery() {
    if (!item) return
    setQueryGenerating(true)
    // Sanitize code descriptions — these may come from a prior AI call (second-order injection defence)
    const lowCodes = [
      ...activeCodes.icd.filter(c => (c.confidence ?? 100) < 75).map(c => `ICD ${sanitizeForPrompt(c.code, 20)} (${sanitizeForPrompt(c.desc, 80)})`),
      ...activeCodes.cpt.filter(c => (c.confidence ?? 100) < 75).map(c => `CPT ${sanitizeForPrompt(c.code, 20)} (${sanitizeForPrompt(c.desc, 80)})`),
    ]
    try {
      // Sanitize user-controlled fields (prompt injection defence)
      const safePatient    = sanitizeForPrompt(item.patientName, 100)
      const safeProvider   = sanitizeForPrompt(item.provider, 100)
      const safeAssessment = sanitizeForPrompt(item.visitNote.assessment, 400)
      const safePlan       = sanitizeForPrompt(item.visitNote.plan, 400)

      const parts = [
        'You are a CDI specialist. Write a brief physician query (2-3 sentences) asking for documentation clarification.',
        `Patient: ${safePatient} | Provider: ${safeProvider} | DOS: ${item.dos}`,
        `Assessment: ${safeAssessment}`,
        `Plan: ${safePlan}`,
        lowCodes.length > 0 ? `Codes needing clarification: ${lowCodes.join(', ')}` : 'Request diagnostic specificity.',
        'Be concise and professional. Ask what specific documentation would support more precise coding.',
      ]
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cdi_query',
          patient: safePatient,
          provider: safeProvider,
          dos: item.dos,
          assessment: safeAssessment,
          plan: safePlan,
          lowCodes: sanitizeForPrompt(lowCodes.join(', '), 300),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.text) setQueryText(data.text)
      toast.success('AI query generated')
    } catch (err) {
      console.error('[CDI query] AI generation failed:', err)
      toast.error('AI generation failed')
    } finally {
      setQueryGenerating(false)
    }
  }
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [docOpen, setDocOpen] = useState<'note' | 'superbill' | 'split' | null>(null)
  const [queryText, setQueryText] = useState('')
  const [holdReason, setHoldReason] = useState('')

  const item = queue.find(q => q.id === selected)
  const cachedCodes = item ? aiCodeCache[item.id] : null

  // Auto-trigger AI coding when selecting an item with SOAP content (only if not already coded)
  React.useEffect(() => {
    if (!item || !item.id) return
    if (aiCodeCache[item.id]) return
    if (autoTriggeredRef.current.has(item.id)) return
    if ((item as any).aiAlreadyCoded) return // Already coded by backend — use saved results
    if (!item.visitNote?.assessment) return
    if (aiCoding) return
    autoTriggeredRef.current.add(item.id)
    generateAICodes(item.visitNote.assessment, item.visitNote.plan, item.providerSpecialty || '')
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const activeCodes = cachedCodes ?? { icd: item?.aiSuggestedIcd ?? [], cpt: item?.aiSuggestedCpt ?? [] }
  const hasRealCodes = activeCodes.icd.length > 0 || activeCodes.cpt.length > 0

  // Auto-select saved AI codes from backend when switching items
  const autoSelectedRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    if (!item || autoSelectedRef.current.has(item.id)) return
    if (item.aiSuggestedIcd.length > 0 || item.aiSuggestedCpt.length > 0) {
      autoSelectedRef.current.add(item.id)
      const newSel: Record<string, boolean> = {}
      item.aiSuggestedIcd.forEach(c => { newSel[`icd-${c.code}`] = true })
      item.aiSuggestedCpt.forEach(c => { newSel[`cpt-${c.code}`] = true })
      setSelectedCodes(prev => ({ ...prev, ...newSel }))
    }
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const aiCptCodes = item?.aiSuggestedCpt.map(c => c.code) ?? []
  const superbillOnly = item?.superbillCpt?.filter(c => !aiCptCodes.includes(c)) ?? []
  const aiOnly = aiCptCodes.filter(c => !(item?.superbillCpt ?? []).includes(c))
  const allMatch = aiOnly.length === 0 && superbillOnly.length === 0

  const EM_CODES = new Set(['99211','99212','99213','99214','99215','99202','99203','99204','99205'])
  const toggleCode = (key: string) => {
    setSelectedCodes(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // E/M conflict: if toggling ON an E/M CPT, auto-deselect any other selected E/M
      if (next[key] && key.startsWith('cpt-')) {
        const code = key.replace('cpt-', '')
        if (EM_CODES.has(code)) {
          const otherEms = Object.keys(next).filter(k => k.startsWith('cpt-') && k !== key && next[k] && EM_CODES.has(k.replace('cpt-', '')))
          if (otherEms.length > 0) {
            otherEms.forEach(k => { next[k] = false })
            toast.info(`Replaced ${otherEms.map(k => k.replace('cpt-','')).join(', ')} with ${code} — only 1 E/M per encounter`)
          }
        }
      }
      return next
    })
  }

  const isUAEClient = uaeClientIds.includes(item?.clientId || '')

  const tabClass = (active: boolean) =>
    `px-3 py-2 text-[12px] font-medium ${active ? 'text-brand border-b-2 border-brand' : 'text-content-secondary'}`

  const resetChart = () => {
    setCodeOverrides({})
    setManualCodes([])
    setForcedReviewCodes(new Set())
    setSelectedCodes({})
    setShowQuickSoap(false)
    setQuickSoap({ assessment: '', plan: '', specialty: '' })
  }

  const getApprovedCptCodes = (): string[] => {
    if (!item) return []
    return [
      ...activeCodes.cpt
        .filter(c => selectedCodes[`cpt-${c.code}`] && codeOverrides[`cpt-${c.code}`]?.action !== 'removed')
        .map(c => codeOverrides[`cpt-${c.code}`]?.newCode || c.code),
      ...manualCodes.filter(m => m.type === 'cpt' && selectedCodes[m.key]).map(m => m.code),
    ]
  }

  const getUnreviewedLowConfidenceCodes = () => {
    if (!item) return []
    return [
      ...activeCodes.icd.filter(c =>
        (c.confidence ?? 100) < 70 &&
        !forcedReviewCodes.has(`icd-${c.code}`) &&
        selectedCodes[`icd-${c.code}`]
      ),
      ...activeCodes.cpt.filter(c =>
        (c.confidence ?? 100) < 70 &&
        !forcedReviewCodes.has(`cpt-${c.code}`) &&
        selectedCodes[`cpt-${c.code}`]
      ),
    ]
  }

  const handleApprove = async () => {
    if (!item) return

    const unreviewed = getUnreviewedLowConfidenceCodes()
    if (unreviewed.length > 0) {
      toast.error(`${unreviewed.length} low-confidence code(s) must be confirmed before approving`)
      return
    }

    const ncciViolations = validateNCCI(getApprovedCptCodes())
    if (ncciViolations.length > 0) {
      toast.error(`NCCI Edit Violation: ${ncciViolations[0].message}`)
      return
    }

    const approvedIcd = activeCodes.icd
      .filter(c => selectedCodes[`icd-${c.code}`] && codeOverrides[`icd-${c.code}`]?.action !== 'removed')
      .map(c => ({ code: codeOverrides[`icd-${c.code}`]?.newCode || c.code, description: c.desc }))
    const manualIcd = manualCodes.filter(m => m.type === 'icd' && selectedCodes[m.key]).map(m => ({ code: m.code, description: m.description }))
    const approvedCpt = activeCodes.cpt
      .filter(c => selectedCodes[`cpt-${c.code}`] && codeOverrides[`cpt-${c.code}`]?.action !== 'removed')
      .map(c => ({ code: codeOverrides[`cpt-${c.code}`]?.newCode || c.code, units: 1 }))
    const manualCpt = manualCodes.filter(m => m.type === 'cpt' && selectedCodes[m.key]).map(m => ({ code: m.code, units: 1 }))

    try {
      const result = await api.post<{ claim_id: string; claim_number: string }>(
        `/coding/${item.id}/approve`,
        {
          icd_codes: [...approvedIcd, ...manualIcd],
          cpt_codes: [...approvedCpt, ...manualCpt],
          patient_id: item.patientId,
          client_id: item.clientId,
          dos: item.dos,
          user_id: currentUser?.id,
        }
      )
      toast.success(`Chart approved → Claim ${result.claim_number || result.claim_id} created. Sent to billing queue.`)
    } catch (err) {
      console.error('[coding] chart approval failed:', err)
      toast.error('Failed to approve chart — please try again')
    }

    const nextIdx = queue.findIndex(q => q.id === selected) + 1
    setSelected(queue[nextIdx]?.id || queue[0]?.id || '')
    resetChart()
    setExpanded({})
  }

  return (
    <ModuleShell title={t("coding","title")} subtitle={t("coding","subtitle")}>
      {/* Pre-compute for KPIs — avoid repeated filter passes */}
      {(() => {
        const completedItems = (apiQueueResult?.data ?? []).filter((c: any) => c.status === 'completed')
        const codedTodayCount = completedItems.filter((c: any) =>
          c.completed_at && new Date(c.completed_at).toDateString() === new Date().toDateString()
        ).length
        const aiUsageRate = completedItems.length === 0 ? '—' : (() => {
          const aiUsed = completedItems.filter((c: any) => c.ai_suggested_cpt?.length > 0 || c.ai_suggested_icd?.length > 0).length
          return `${Math.round((aiUsed / completedItems.length) * 100)}%`
        })()
        return (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <KPICard label={t('coding','myQueue')} value={apiQueueResult?.meta?.total ?? queue.length} icon={<BrainCircuit size={20} />} />
            <KPICard label={t('coding','codedToday')} value={codedTodayCount} icon={<CheckCircle2 size={20} />} />
            <KPICard label="AI Usage Rate" value={aiUsageRate} icon={<Activity size={20} />} />
            <KPICard label={t('coding','avgTimeChart')} value="—" icon={<Clock size={20} />} />
          </div>
        )
      })()}

      <div className={`grid gap-4 h-[calc(100vh-280px)] ${docOpen ? 'grid-cols-12' : 'grid-cols-12'}`}>
        {/* ── Queue Panel ── */}
        <div className="col-span-2">
          <div className="card p-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-semibold uppercase text-content-tertiary tracking-wider">Coding Queue ({queue.length})</h3>
            {queue.length > 1 && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Batch accept AI codes for all ${queue.length} charts?\n\nThis will auto-approve each chart using its AI-suggested codes and create claims.`)) return
                  let done = 0; let failed = 0
                  for (const qItem of queue) {
                    try {
                      await api.post(`/coding/${qItem.id}/approve`, {
                        icd_codes: (qItem.aiSuggestedIcd || []).slice(0, 4).map(c => ({ code: c.code, description: c.desc })),
                        cpt_codes: (qItem.aiSuggestedCpt || []).slice(0, 4).map(c => ({ code: c.code, units: 1, charge: 0 })),
                        patient_id: qItem.patientId,
                        provider_id: '',
                        client_id: qItem.clientId,
                        dos: qItem.dos,
                        user_id: currentUser?.id,
                      })
                      done++
                    } catch { failed++ }
                  }
                  if (done > 0) toast.success(`${done} chart${done > 1 ? 's' : ''} accepted → ${done} claim${done > 1 ? 's' : ''} created${failed > 0 ? ` (${failed} failed)` : ''}`)
                  else toast.error('Batch accept failed — no charts approved')
                }}
                className="text-[10px] px-2 py-1 rounded bg-brand/10 text-brand hover:bg-brand/20 font-medium transition-colors"
              >
                Accept All
              </button>
            )}
          </div>
            <div className="overflow-y-auto space-y-1 flex-1">
              {queue.length === 0 && (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                    <BrainCircuit size={20} className='text-content-tertiary' />
                  </div>
                  <p className='text-sm font-medium text-content-primary mb-1'>No charts in queue</p>
                  <p className='text-xs text-content-secondary'>Charts will appear here once they&apos;re added to the system.</p>
                </div>
              )}
              {queue.map(q => {
                const sla = getSLAStatus(q.receivedAt)
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelected(q.id)
                      setTab('note')
                      resetChart()
                      setExpanded({})
                      setDocOpen('note')
                    }}
                    className={`w-full text-left p-2 rounded-btn border transition-colors ${selected === q.id ? 'bg-brand/10 border-brand/20' : 'border-transparent hover:bg-surface-elevated'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={e => { e.stopPropagation(); router.push(`/portal/patients?id=${q.patientId}`) }}
                        className="text-[14px] font-semibold text-content-primary leading-tight hover:text-brand hover:underline text-left">
                        {q.patientName}
                      </button>
                      <span className={`w-2 h-2 rounded-full mt-1 ${priorityColor[q.priority ?? 'medium']}`} />
                    </div>
                    <p className="text-[12px] text-content-secondary truncate">{q.clientName || '—'} · {q.dos}</p>
                    <div className="flex items-center justify-between mt-1 gap-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] ${q.source === 'ai_scribe' ? 'bg-brand/10 text-brand' : 'bg-brand/10 text-brand-dark dark:text-brand-dark'}`}>
                        {q.source === 'ai_scribe' ? <Mic size={12} /> : <FileUp size={12} />}
                        {q.source === 'ai_scribe' ? 'Scribe' : 'Upload'}
                      </span>
                      <span className={`text-[11px] font-mono font-semibold ${sla.color}`}>{sla.label}</span>
                    </div>
                    {q.status !== 'pending' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-pill mt-0.5 inline-block ${
                        q.status === 'on_hold' ? 'bg-brand-pale0/10 text-brand-deep' :
                        q.status === 'query_sent' ? 'bg-brand/10 text-brand-dark' :
                        q.status === 'in_progress' ? 'bg-brand/10 text-brand' : ''
                      }`}>
                        {q.status === 'on_hold' ? 'On Hold' : q.status === 'query_sent' ? 'Query Sent' : q.status === 'in_progress' ? 'In Progress' : ''}
                      </span>
                    )}
                    {currentUser.role === 'supervisor' && (
                      <button onClick={e => { e.stopPropagation(); setReassignTarget(reassignTarget === q.id ? null : q.id) }}
                        className="text-[9px] text-content-tertiary hover:text-brand transition-colors mt-0.5 block">Reassign</button>
                    )}
                    {currentUser.role === 'supervisor' && reassignTarget === q.id && (
                      <div className="mt-1 space-y-1" onClick={e => e.stopPropagation()}>
                        {coders.map(c => (
                          <button key={c.id} onClick={async () => {
                            try {
                              await api.put(`/coding/${q.id}/assign`, { assigned_to: c.id })
                            } catch { /* best-effort */ }
                            toast.success(`Reassigned to ${c.name}`)
                            setReassignTarget(null)
                          }}
                            className="block w-full text-left text-[10px] px-2 py-1 rounded bg-surface-elevated hover:bg-brand/10 hover:text-brand text-content-secondary transition-colors">
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Visit Note Panel ── */}
        <div className="col-span-5 relative">
          <div className="card h-full flex flex-col overflow-hidden">
            {item ? (
              <>
                {/* Patient Info Header */}
                <div className="p-4 border-b border-separator">
                  <div className="flex items-start justify-between">
                    <div>
                      <button onClick={() => router.push(`/portal/patients?id=${item.patientId}`)}
                        className="text-[15px] font-semibold text-content-primary hover:text-brand hover:underline text-left block">
                        {item.patientName}
                      </button>
                      <p className="text-[12px] text-content-secondary">{item.provider} · NPI: {item.providerNpi}</p>
                    </div>
                    {item.priorAuthStatus === 'not_obtained' && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1 text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> AUTH REQUIRED — NOT ON FILE
                      </div>
                    )}
                    {item.priorAuthStatus === 'pending' && (
                      <div className="bg-brand-pale0/10 border border-brand-light/30 rounded-lg px-2 py-1 text-[11px] text-brand-deep font-semibold">
                        Auth Pending — {item.priorAuthNumber}
                      </div>
                    )}
                    {item.priorAuthStatus === 'obtained' && (
                      <div className="bg-brand/10 border border-brand/30 rounded-lg px-2 py-1 text-[11px] text-brand-dark font-semibold">
                        ✓ Auth on File — {item.priorAuthNumber}
                      </div>
                    )}
                  </div>
                  {/* Doc + History Buttons */}
                  <div className="pt-3 pb-2 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setDocOpen(docOpen === 'note' ? null : 'note')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        docOpen === 'note'
                          ? 'bg-brand text-white border-brand'
                          : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                      }`}
                    >
                      <FileText size={12} />
                      {item.source === 'ai_scribe' ? 'AI Scribe Note' : 'Visit Note'}
                    </button>
                    {item.source === 'upload' && (
                      <button
                        onClick={() => setDocOpen(docOpen === 'superbill' ? null : 'superbill')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                          docOpen === 'superbill'
                            ? 'bg-brand text-white border-brand'
                            : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                        }`}
                      >
                        <FileText size={12} /> Superbill
                      </button>
                    )}
                    <button
                      onClick={() => setDocOpen(docOpen === 'split' ? null : 'split')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        docOpen === 'split'
                          ? 'bg-brand text-white border-brand'
                          : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                      }`}
                    >
                      ⬜ Split View
                    </button>
                    <button
                      onClick={() => setTab(tab === 'history' ? 'note' : 'history')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        tab === 'history'
                          ? 'bg-surface-elevated border-separator text-content-primary'
                          : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                      }`}
                    >
                      History
                    </button>
                    <button
                      onClick={() => setTab(tab === 'qa' ? 'note' : 'qa')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border transition-colors ${
                        tab === 'qa'
                          ? 'bg-blue-500/10 border-brand/30 text-brand-dark'
                          : 'border-separator text-content-secondary hover:border-brand/40 hover:text-content-primary'
                      }`}
                    >
                      QA Audit
                    </button>
                    <button
                      onClick={() => router.push('/coding-rules')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-btn font-medium border border-separator text-content-secondary hover:border-brand-light/40 hover:text-brand-deep transition-colors"
                    >
                      ⚙ Coding Rules
                    </button>
                  </div>
                  {/* Only show fields that have values */}
                  {(() => {
                    const fields = [
                      ['DOB', item.patientDob],
                      ['Gender', item.patientGender],
                      ['Payer', item.patientPayer],
                      ['Visit Type', item.visitType],
                      ['DOS', item.dos],
                      ['POS', item.placeOfService],
                      ['Specialty', item.providerSpecialty],
                      ['Source', item.source === 'ai_scribe' ? '🎙 AI Scribe' : '📄 Upload'],
                    ].filter(([, v]) => v && v !== '') as [string, string][]
                    return fields.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {fields.map(([label, value]) => (
                          <div key={label} className="bg-surface-elevated rounded-lg px-2 py-1.5">
                            <span className="text-[10px] text-content-tertiary block">{label}</span>
                            <span className="text-[12px] text-content-primary font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-content-tertiary mt-2 italic">
                        Patient demographics not yet available — attach a visit note to begin
                      </p>
                    )
                  })()}
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  {tab === 'history' && (
                    <div className='flex flex-col items-center justify-center py-10 text-center'>
                      <div className='w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                        <Clock size={16} className='text-content-tertiary opacity-40' />
                      </div>
                      <p className='text-[13px] font-medium text-content-primary mb-1'>Prior Visit History</p>
                      <p className='text-xs text-content-secondary'>Visit history will appear here once the patient&apos;s prior encounters are linked.</p>
                    </div>
                  )}
                  {tab === 'qa' && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">QA Coding Audit</h4>
                      </div>
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
                          <Receipt size={20} className="text-content-tertiary opacity-40" />
                        </div>
                        <p className="text-[13px] font-medium text-content-primary mb-1">QA Auditing — Sprint 4</p>
                        <p className="text-[12px] text-content-secondary">Coding QA audit reports will be available once the audit module is live in Sprint 4.</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* ── Doc Viewer Overlay ── */}
                {docOpen && item && (
                  <div className="absolute inset-0 z-20 bg-surface card flex flex-col overflow-hidden">
                    {/* Header with tabs + close */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-separator shrink-0">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDocOpen('note')}
                          className={`px-3 py-1.5 text-xs rounded-btn font-medium transition-colors ${
                            docOpen === 'note' ? 'bg-brand text-white' : 'text-content-secondary hover:text-content-primary'
                          }`}
                        >
                          Visit Note
                        </button>
                        {item.source === 'upload' && (
                          <button
                            onClick={() => setDocOpen('superbill')}
                            className={`px-3 py-1.5 text-xs rounded-btn font-medium transition-colors ${
                              docOpen === 'superbill' ? 'bg-brand text-white' : 'text-content-secondary hover:text-content-primary'
                            }`}
                          >
                            Superbill
                          </button>
                        )}
                      </div>
                      <button onClick={() => setDocOpen(null)} className="text-content-tertiary hover:text-content-primary p-1 rounded">
                        <X size={15} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {docOpen === 'note' && (
                        <div className="space-y-4">
                          {item.source === 'ai_scribe' && (
                            <button
                              onClick={() => router.push(`/ai-scribe?encounter=${item.id}`)}
                              className="inline-flex items-center gap-2 text-[12px] rounded-btn px-3 py-1.5 bg-brand/10 text-brand"
                            >
                              <Play size={13} /> <Mic size={13} /> Play Recording
                            </button>
                          )}
                          {item.source === 'upload' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-separator rounded-lg">
                              <FileText size={13} className="text-content-tertiary shrink-0" />
                              <span className="text-xs text-content-secondary flex-1">Source chart — {item.patientName}</span>
                              <button onClick={() => setDocOpen('superbill')} className="text-xs text-brand underline shrink-0">
                                View Superbill →
                              </button>
                            </div>
                          )}
                          {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
                            <div key={section} className="pb-3 border-b border-separator last:border-0">
                              <p className="text-[10px] uppercase tracking-widest text-content-tertiary font-bold mb-1.5">{section}</p>
                              <p className="text-[13px] text-content-secondary leading-relaxed whitespace-pre-line">
                                {item.visitNote[section] || <span className="italic text-content-tertiary text-[12px]">No documentation yet — attach a visit note or type above to begin coding</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {docOpen === 'superbill' && (
                        <div className="flex flex-col h-full">
                          <InlineDocPreview patientId={item.patientId} label="Superbill / Uploaded Document" />
                          {item.superbillCpt && item.superbillCpt.length > 0 && (
                            <div className="space-y-2 mt-3 border-t border-separator pt-3">
                              <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold">Codes on Superbill</p>
                              {item.superbillCpt.map(code => (
                                <div key={code} className="flex items-center justify-between px-3 py-2 bg-surface-elevated rounded-lg border border-separator">
                                  <span className="font-mono text-xs text-content-primary">{code}</span>
                                  {aiCptCodes.includes(code)
                                    ? <span className="text-[11px] text-brand-dark font-medium">✓ AI matched</span>
                                    : <span className="text-[11px] text-brand-deep font-medium">⚠ Not in AI suggestion</span>
                                  }
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* (d) Split View — Visit Note + Superbill side by side */}
                      {docOpen === 'split' && (
                        <div className="grid grid-cols-2 gap-3 h-full">
                          {/* Left: Visit Note */}
                          <div className="overflow-y-auto border-r border-separator pr-3 space-y-3">
                            <p className="text-[10px] uppercase tracking-widest text-brand font-bold">Visit Note</p>
                            {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
                              <div key={section} className="pb-2 border-b border-separator last:border-0">
                                <p className="text-[9px] uppercase tracking-widest text-content-tertiary font-bold mb-1">{section}</p>
                                <p className="text-[12px] text-content-secondary leading-relaxed whitespace-pre-line">
                                  {item.visitNote[section] || <span className="italic text-content-tertiary text-[11px]">—</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                          {/* Right: Document Preview */}
                          <div className="overflow-y-auto pl-3 flex flex-col h-full">
                            <InlineDocPreview patientId={item.patientId} label="Document Preview" />
                            {item.superbillCpt && item.superbillCpt.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold">Superbill Codes</p>
                                {item.superbillCpt.map(code => (
                                  <div key={code} className="flex items-center justify-between px-2 py-1.5 bg-surface-elevated rounded border border-separator">
                                    <span className="font-mono text-[11px] text-content-primary">{code}</span>
                                    {aiCptCodes.includes(code)
                                      ? <span className="text-[10px] text-brand-dark">✓ matched</span>
                                      : <span className="text-[10px] text-brand-deep">⚠ missing</span>
                                    }
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-content-tertiary text-center py-3">No superbill codes extracted yet</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-[14px] text-content-tertiary">Select a chart from the queue</div>
            )}
          </div>
        </div>

        {/* ── Code Review Panel ── */}
        <div className="col-span-5">
          <div className="card h-full p-4 overflow-y-auto">
            {item ? (
              <>
                {/* UAE Warning Banner */}
                {isUAEClient && (
                  <div className="bg-brand-pale0/10 border border-brand-light/30 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                    <span className="text-lg">🇦🇪</span>
                    <div>
                      <p className="text-[12px] font-semibold text-brand-deep">UAE Client — ICD-10-AM Required</p>
                      <p className="text-[11px] text-content-secondary">This client uses ICD-10-AM and DHA activity codes. Flag for manual review.</p>
                    </div>
                  </div>
                )}

                {/* AI Unavailable Banner */}
                {aiUnavailable && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-red-500">AI Coding Unavailable</p>
                      <p className="text-[12px] text-content-secondary mt-0.5">Bedrock is temporarily unreachable. Use manual code entry below. This chart will be flagged for QA audit.</p>
                    </div>
                  </div>
                )}

                {/* Dev: Simulate AI Failure */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => setAiUnavailable(p => !p)}
                    className={`text-[10px] px-2 py-0.5 rounded border mb-2 ${aiUnavailable ? 'border-red-500/40 text-red-500 bg-red-500/10' : 'border-separator text-content-tertiary'}`}
                  >
                    {aiUnavailable ? '🔴 AI Unavailable (simulated)' : 'Simulate AI Failure'}
                  </button>
                )}

                {!aiUnavailable && (
                  <>
                    {/* ── AI Generate panel ── */}
                    {!hasRealCodes && !aiCoding && (
                      <div className="mb-4 rounded-xl border border-brand/30 bg-blue-500/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-brand-dark text-base">✦</span>
                          <p className="text-[13px] font-semibold text-content-primary">AI Auto-Coding</p>
                        </div>
                        {!showQuickSoap ? (
                          <>
                            <p className="text-[12px] text-content-secondary mb-3">
                              {item?.visitNote?.assessment
                                ? 'Visit note available — auto-coding will run momentarily.'
                                : 'No visit note attached. Enter assessment & plan to generate codes.'}
                            </p>
                            {item?.visitNote?.assessment ? (
                              <button
                                onClick={() => generateAICodes(item.visitNote.assessment, item.visitNote.plan, item.providerSpecialty || '')}
                                className="w-full bg-brand text-white rounded-lg py-2 text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-brand-mid transition-colors">
                                <span>✦</span> Generate Codes from Visit Note
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowQuickSoap(true)}
                                className="w-full bg-blue-500/10 border border-brand/30 text-brand-dark dark:text-brand-dark rounded-lg py-2 text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-brand/10 transition-colors">
                                <span>✦</span> Enter Clinical Info to Generate Codes
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Specialty</label>
                              <input
                                value={quickSoap.specialty}
                                onChange={e => setQuickSoap(p => ({ ...p, specialty: e.target.value }))}
                                placeholder="e.g. Cardiology, Internal Medicine, Family Practice"
                                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:border-brand/40 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Assessment / Diagnoses</label>
                              <textarea
                                rows={3}
                                value={quickSoap.assessment}
                                onChange={e => setQuickSoap(p => ({ ...p, assessment: e.target.value }))}
                                placeholder="e.g. Type 2 diabetes mellitus with peripheral neuropathy, HTN, hyperlipidemia"
                                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:border-brand/40 outline-none resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Plan / Procedures</label>
                              <textarea
                                rows={2}
                                value={quickSoap.plan}
                                onChange={e => setQuickSoap(p => ({ ...p, plan: e.target.value }))}
                                placeholder="e.g. Follow-up in 3 months, A1C ordered, metformin dose adjustment, gabapentin added"
                                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:border-brand/40 outline-none resize-none"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => setShowQuickSoap(false)} className="flex-1 border border-separator rounded-lg py-2 text-[12px] text-content-secondary">Cancel</button>
                              <button
                                onClick={() => generateAICodes(quickSoap.assessment, quickSoap.plan, quickSoap.specialty)}
                                disabled={!quickSoap.assessment.trim()}
                                className="flex-1 bg-brand text-white rounded-lg py-2 text-[12px] font-medium disabled:opacity-40 hover:bg-brand-mid transition-colors">
                                ✦ Generate Codes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── AI generating spinner ── */}
                    {aiCoding && (
                      <div className="mb-4 rounded-xl border border-brand/20 bg-blue-500/10 p-5 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                        <p className="text-[13px] text-brand-dark dark:text-brand-dark font-medium">Analyzing clinical documentation…</p>
                        <p className="text-[11px] text-content-tertiary">Generating ICD-10 + CPT codes</p>
                      </div>
                    )}

                    {/* Chat-style regenerate with coder instructions */}
                    {hasRealCodes && !aiCoding && (
                      <div className="mb-3 flex gap-1.5">
                        <input
                          value={coderInstructions}
                          onChange={e => setCoderInstructions(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && item) {
                              autoTriggeredRef.current.delete(item.id)
                              generateAICodes(item.visitNote.assessment, item.visitNote.plan, item.providerSpecialty || '', coderInstructions)
                              setCoderInstructions('')
                            }
                          }}
                          placeholder="e.g. add modifier 25, use E11.65 instead, remove 36415..."
                          className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-[11px] text-content-primary placeholder:text-content-tertiary focus:border-brand/40 outline-none"
                        />
                        <button
                          onClick={() => {
                            if (item) {
                              autoTriggeredRef.current.delete(item.id)
                              setAiCodeCache(p => { const n = {...p}; delete n[item.id]; return n })
                              generateAICodes(item.visitNote.assessment, item.visitNote.plan, item.providerSpecialty || '', coderInstructions)
                              setCoderInstructions('')
                            }
                          }}
                          className="text-[10px] px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-mid transition-colors whitespace-nowrap">
                          ✦ {coderInstructions ? 'Re-code' : 'Regenerate'}
                        </button>
                      </div>
                    )}

                    {/* ICD Codes */}
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Diagnosis Codes (ICD-10)</h4>
                    <div className="space-y-2 mb-3">
                      {activeCodes.icd.map(code => {
                        const key = `icd-${code.code}`
                        const isRemoved = codeOverrides[key]?.action === 'removed'
                        const isEdited = codeOverrides[key]?.action === 'edited'
                        const isLowConfidence = (code.confidence ?? 0) < 70
                        const isForcedReview = forcedReviewCodes.has(key)

                        if (isRemoved) return (
                          <div key={key} className="p-2 rounded-lg border border-dashed border-separator opacity-50 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-mono line-through text-content-tertiary">{code.code}</span>
                            <span className="text-[11px] text-content-tertiary flex-1">Removed: {codeOverrides[key].reason}</span>
                            <button onClick={() => setCodeOverrides(p => { const n = { ...p }; delete n[key]; return n })} className="text-[10px] text-brand">Undo</button>
                          </div>
                        )

                        return (
                          <div key={key} className={`p-2 rounded-lg border transition-colors ${
                            isLowConfidence && !isForcedReview ? 'border-brand-light/40 bg-brand-pale0/5' :
                            selectedCodes[key] ? 'border-brand/30 bg-brand/5' : 'border-separator bg-surface-elevated'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={!!selectedCodes[key]} onChange={() => {
                                if (isLowConfidence && !isForcedReview) {
                                  toast.error('Confidence below 70% — confirm or change this code before approving')
                                  return
                                }
                                toggleCode(key)
                              }} />
                              <span className="text-[12px] font-mono font-semibold text-content-primary">
                                {isEdited ? codeOverrides[key].newCode : code.code}
                              </span>
                              {code.is_hcc && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand-dark font-bold uppercase tracking-wider">HCC</span>}
                              <span className="text-[12px] text-content-secondary flex-1">{code.desc}</span>
                              <span className={`text-[12px] font-semibold ${(code.confidence ?? 0) >= 90 ? 'text-brand-dark' : (code.confidence ?? 0) >= 70 ? 'text-brand-deep' : 'text-red-500'}`}>{code.confidence ?? 0}%</span>
                              {code.reasoning && <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="text-content-tertiary">{expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
                              <button onClick={() => { setEditingCode(editingCode === key ? null : key); setEditSearch('') }} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-brand/40 hover:text-brand transition-colors">Edit</button>
                              <button onClick={() => setRemovingCode(removingCode === key ? null : key)} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-red-500/40 hover:text-red-500 transition-colors">Remove</button>
                              {isLowConfidence && !isForcedReview && (
                                <button onClick={() => { setForcedReviewCodes(prev => { const s = new Set(Array.from(prev)); s.add(key); return s }); toast.info('Marked as manually reviewed') }} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-pale0/20 text-brand-deep font-semibold">Confirm</button>
                              )}
                            </div>
                            {expanded[key] && code.reasoning && <p className="mt-1 text-[12px] italic text-content-secondary pl-6">{code.reasoning}</p>}
                            {removingCode === key && (
                              <div className="mt-2 pl-6 space-y-1">
                                <p className="text-[11px] text-content-tertiary font-semibold">Reason for removal:</p>
                                {removeReasons.map(reason => (
                                  <button key={reason} onClick={() => {
                                    setCodeOverrides(p => ({ ...p, [key]: { action: 'removed', reason, originalCode: code.code } }))
                                    setSelectedCodes(p => { const n = { ...p }; delete n[key]; return n })
                                    setRemovingCode(null)
                                    toast.success(`${code.code} removed — ${reason}`)
                                  }} className="block w-full text-left text-[12px] px-2 py-1 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary">
                                    {reason}
                                  </button>
                                ))}
                              </div>
                            )}
                            {editingCode === key && (
                              <div className="mt-2 pl-6">
                                <input autoFocus placeholder="Search ICD-10 code or description..." value={editSearch}
                                  onChange={e => setEditSearch(e.target.value)}
                                  className="w-full bg-surface-elevated border border-separator rounded-lg px-2 py-1.5 text-[12px] text-content-primary focus:border-brand/40 outline-none" />
                                {editSearch.length >= 2 && (
                                  <div className="mt-1 border border-separator rounded-lg overflow-hidden">
                                    {getDemoIcdMatches(editSearch).map(result => (
                                      <button key={result.code} onClick={() => {
                                        setCodeOverrides(p => ({ ...p, [key]: { action: 'edited', reason: 'Coder correction', originalCode: code.code, newCode: result.code } }))
                                        setEditingCode(null)
                                        setEditSearch('')
                                        toast.success(`Code updated to ${result.code}`)
                                      }} className="block w-full text-left px-3 py-1.5 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0">
                                        <span className="font-mono font-semibold text-brand">{result.code}</span>
                                        <span className="ml-2 text-content-secondary">{result.description}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Manual ICD additions rendered inline */}
                    {manualCodes.filter(m => m.type === 'icd').map(mc => (
                      <div key={mc.key} className="p-2 rounded-lg border border-brand/30 bg-brand/5 flex items-center gap-2 mb-1">
                        <input type="checkbox" checked={!!selectedCodes[mc.key]} onChange={() => toggleCode(mc.key)} />
                        <span className="text-[12px] font-mono font-semibold text-brand">{mc.code}</span>
                        <span className="text-[12px] text-content-secondary flex-1">{mc.description}</span>
                        <span className="text-[11px] text-content-tertiary">Manual</span>
                        <button onClick={() => setManualCodes(p => p.filter(m => m.key !== mc.key))} className="text-[10px] text-red-500">Remove</button>
                      </div>
                    ))}

                    {/* CPT Codes */}
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2 mt-3">Procedure Codes (CPT)</h4>
                    <div className="space-y-2 mb-3">
                      {activeCodes.cpt.map(code => {
                        const key = `cpt-${code.code}`
                        const isRemoved = codeOverrides[key]?.action === 'removed'
                        const isEdited = codeOverrides[key]?.action === 'edited'
                        const isLowConfidence = (code.confidence ?? 0) < 70
                        const isForcedReview = forcedReviewCodes.has(key)

                        if (isRemoved) return (
                          <div key={key} className="p-2 rounded-lg border border-dashed border-separator opacity-50 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-mono line-through text-content-tertiary">{code.code}</span>
                            <span className="text-[11px] text-content-tertiary flex-1">Removed: {codeOverrides[key].reason}</span>
                            <button onClick={() => setCodeOverrides(p => { const n = { ...p }; delete n[key]; return n })} className="text-[10px] text-brand">Undo</button>
                          </div>
                        )

                        return (
                          <div key={key} className={`p-2 rounded-lg border transition-colors ${
                            isLowConfidence && !isForcedReview ? 'border-brand-light/40 bg-brand-pale0/5' :
                            selectedCodes[key] ? 'border-brand/30 bg-brand/5' : 'border-separator bg-surface-elevated'
                          }`}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={!!selectedCodes[key]} onChange={() => {
                                if (isLowConfidence && !isForcedReview) {
                                  toast.error('Confidence below 70% — confirm or change this code before approving')
                                  return
                                }
                                toggleCode(key)
                              }} />
                              <span className="text-[12px] font-mono font-semibold text-content-primary">
                                {isEdited ? codeOverrides[key].newCode : code.code}
                              </span>
                              {code.modifiers?.map(mod => <span key={mod} className="text-[11px] px-1.5 py-0.5 rounded-pill bg-brand/10 text-brand">Mod {mod}</span>)}
                              <span className="text-[12px] text-content-secondary flex-1">{code.desc}</span>
                              <span className={`text-[12px] font-semibold ${(code.confidence ?? 0) >= 90 ? 'text-brand-dark' : (code.confidence ?? 0) >= 70 ? 'text-brand-deep' : 'text-red-500'}`}>{code.confidence ?? 0}%</span>
                              {code.reasoning && <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="text-content-tertiary">{expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
                              <button onClick={() => { setEditingCode(editingCode === key ? null : key); setEditSearch('') }} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-brand/40 hover:text-brand transition-colors">Edit</button>
                              <button onClick={() => setRemovingCode(removingCode === key ? null : key)} className="text-[10px] px-1.5 py-0.5 rounded border border-separator text-content-secondary hover:border-red-500/40 hover:text-red-500 transition-colors">Remove</button>
                              {isLowConfidence && !isForcedReview && (
                                <button onClick={() => { setForcedReviewCodes(prev => { const s = new Set(Array.from(prev)); s.add(key); return s }); toast.info('Marked as manually reviewed') }} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-pale0/20 text-brand-deep font-semibold">Confirm</button>
                              )}
                            </div>
                            {expanded[key] && code.reasoning && <p className="mt-1 text-[12px] italic text-content-secondary pl-6">{code.reasoning}</p>}
                            {removingCode === key && (
                              <div className="mt-2 pl-6 space-y-1">
                                <p className="text-[11px] text-content-tertiary font-semibold">Reason for removal:</p>
                                {removeReasons.map(reason => (
                                  <button key={reason} onClick={() => {
                                    setCodeOverrides(p => ({ ...p, [key]: { action: 'removed', reason, originalCode: code.code } }))
                                    setSelectedCodes(p => { const n = { ...p }; delete n[key]; return n })
                                    setRemovingCode(null)
                                    toast.success(`${code.code} removed — ${reason}`)
                                  }} className="block w-full text-left text-[12px] px-2 py-1 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary">
                                    {reason}
                                  </button>
                                ))}
                              </div>
                            )}
                            {editingCode === key && (
                              <div className="mt-2 pl-6">
                                <input autoFocus placeholder="Search CPT code or description..." value={editSearch}
                                  onChange={e => setEditSearch(e.target.value)}
                                  className="w-full bg-surface-elevated border border-separator rounded-lg px-2 py-1.5 text-[12px] text-content-primary focus:border-brand/40 outline-none" />
                                {editSearch.length >= 2 && (
                                  <div className="mt-1 border border-separator rounded-lg overflow-hidden">
                                    {getDemoCptMatches(editSearch).map(result => (
                                      <button key={result.code} onClick={() => {
                                        setCodeOverrides(p => ({ ...p, [key]: { action: 'edited', reason: 'Coder correction', originalCode: code.code, newCode: result.code } }))
                                        setEditingCode(null)
                                        setEditSearch('')
                                        toast.success(`Code updated to ${result.code}`)
                                      }} className="block w-full text-left px-3 py-1.5 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0">
                                        <span className="font-mono font-semibold text-brand">{result.code}</span>
                                        <span className="ml-2 text-content-secondary">{result.description}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Manual CPT additions */}
                    {manualCodes.filter(m => m.type === 'cpt').map(mc => (
                      <div key={mc.key} className="p-2 rounded-lg border border-brand/30 bg-brand/5 flex items-center gap-2 mb-1">
                        <input type="checkbox" checked={!!selectedCodes[mc.key]} onChange={() => toggleCode(mc.key)} />
                        <span className="text-[12px] font-mono font-semibold text-brand">{mc.code}</span>
                        <span className="text-[12px] text-content-secondary flex-1">{mc.description}</span>
                        <span className="text-[11px] text-content-tertiary">Manual</span>
                        <button onClick={() => setManualCodes(p => p.filter(m => m.key !== mc.key))} className="text-[10px] text-red-500">Remove</button>
                      </div>
                    ))}

                    {/* Superbill comparison */}
                    {item.hasSuperbill && (
                      <div className="bg-surface-elevated rounded-card p-3 mb-3 border border-separator">
                        <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-1">Superbill Comparison</h4>
                        <p className="text-[12px] text-content-secondary">Superbill codes: <span className="font-mono">{item.superbillCpt?.join(', ')}</span></p>
                        {allMatch ? (
                          <p className="text-[12px] text-brand-dark dark:text-brand-dark mt-1">✓ All codes match</p>
                        ) : (
                          <div className="text-[12px] text-brand-deep dark:text-brand-deep mt-1 space-y-0.5">
                            {aiOnly.map(code => <p key={`ai-${code}`}><AlertTriangle size={12} className="inline" /> AI suggests {code} not on superbill</p>)}
                            {superbillOnly.map(code => <p key={`sb-${code}`}><AlertTriangle size={12} className="inline" /> Superbill has {code} not suggested by AI</p>)}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Manual Add Sections — always shown */}
                <div className="mt-2">
                  <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold mb-1">
                    {aiUnavailable ? 'Enter ICD-10 codes manually:' : 'Additional ICD-10 codes:'}
                  </p>
                  <AddCodeRow type="ICD" onAdd={(code, description) => {
                    const key = `icd-manual-${code}`
                    setManualCodes(prev => [...prev.filter(m => m.key !== key), { key, code, description, type: 'icd', isManual: true }])
                    setSelectedCodes(p => ({ ...p, [key]: true }))
                    toast.success(`ICD ${code} added manually`)
                  }} />
                </div>

                <div className="mt-3">
                  <p className="text-[11px] text-content-tertiary uppercase tracking-wider font-semibold mb-1">
                    {aiUnavailable ? 'Enter CPT codes manually:' : 'Additional CPT codes:'}
                  </p>
                  <AddCodeRow type="CPT" onAdd={(code, description) => {
                    const key = `cpt-manual-${code}`
                    setManualCodes(prev => [...prev.filter(m => m.key !== key), { key, code, description, type: 'cpt', isManual: true }])
                    setSelectedCodes(p => ({ ...p, [key]: true }))
                    toast.success(`CPT ${code} added manually`)
                  }} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-brand text-white rounded-btn px-3 py-2 text-[13px] font-medium inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Approve & Send to Billing
                  </button>
                  <button
                    onClick={() => setShowQueryModal(true)}
                    className="flex-1 border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary inline-flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} /> Query Doctor
                  </button>
                  <button
                    onClick={() => setShowHoldModal(true)}
                    className="border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary inline-flex items-center justify-center gap-2"
                  >
                    <PauseCircle size={14} /> Hold
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-content-tertiary text-[14px]">
                <FileText size={16} className="mr-2" /> Select a chart from the queue
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Query Doctor Modal */}
      {showQueryModal && item && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQueryModal(false)}>
          <div className="bg-surface-secondary rounded-2xl p-5 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content-primary mb-3">Query Doctor — {item.provider}</h3>
            <p className="text-[12px] text-content-secondary mb-2">Re: {item.patientName} · DOS: {item.dos}</p>
            <button
              onClick={generateCDIQuery}
              disabled={queryGenerating}
              className="w-full mb-2 bg-blue-500/10 border border-brand/30 text-brand-dark dark:text-brand-dark rounded-btn py-1.5 text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-brand/10 disabled:opacity-50 transition-colors">
              {queryGenerating ? (
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-brand border-t-transparent rounded-full"/><span>Generating...</span></>
              ) : (
                <><span>✦</span><span>Generate CDI Query with AI</span></>
              )}
            </button>
            <textarea
              rows={4}
              placeholder="Describe your question about this note's documentation..."
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] resize-none focus:border-brand/40 outline-none text-content-primary"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowQueryModal(false)} className="flex-1 border border-separator rounded-lg py-2 text-[13px] text-content-secondary">Cancel</button>
              <button
                onClick={async () => {
                  if (!queryText.trim()) { toast.error('Please enter a question'); return }
                  try {
                    await api.post(`/coding/${item.id}/query`, {
                      query_text: queryText,
                      user_id: currentUser?.id,
                    })
                  } catch { /* best-effort */ }
                  toast.success(`Query sent to ${item.provider}. Chart marked as 'Query Sent'.`)
                  setShowQueryModal(false)
                  setQueryText('')
                }}
                className="flex-1 bg-brand text-white rounded-lg py-2 text-[13px] font-medium"
              >Send Query</button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && item && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowHoldModal(false)}>
          <div className="bg-surface-secondary rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content-primary mb-3">Hold Chart — {item.patientName}</h3>
            <label className="text-[11px] text-content-tertiary block mb-1">Reason for Hold</label>
            <select
              value={holdReason}
              onChange={e => setHoldReason(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-primary mb-4"
            >
              <option value="">Select reason...</option>
              {['Awaiting additional documentation', 'Awaiting doctor query response', 'Payer policy clarification needed', 'Supervisor review required', 'Duplicate chart — investigating'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowHoldModal(false)} className="flex-1 border border-separator rounded-lg py-2 text-[13px] text-content-secondary">Cancel</button>
              <button
                onClick={async () => {
                  if (!holdReason) { toast.error('Please select a reason'); return }
                  try {
                    await api.put(`/coding/${item.id}/hold`, {
                      reason: holdReason,
                      user_id: currentUser?.id,
                    })
                    toast.success(`Chart placed on hold: ${holdReason}`)
                  } catch {
                    toast.error('Failed to place chart on hold — please try again')
                  }
                  setShowHoldModal(false)
                  setHoldReason('')
                }}
                className="flex-1 bg-brand-pale text-white rounded-lg py-2 text-[13px] font-medium"
              >Confirm Hold</button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
