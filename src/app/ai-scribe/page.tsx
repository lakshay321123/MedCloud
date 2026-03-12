'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useSOAPNotes, useCreateSOAPNote, useCreateCoding, useAppointments } from '@/lib/hooks'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
// Visit type (was DemoVisit from demo-data, now local)
interface DemoVisit {
  id: string; patientId: string; patientName: string; dos: string
  provider: string; encounterType: string; status: string
  soap: { s: string; o: string; a: string; p: string }
  suggestedCodes: Array<{ cpt?: string; icd?: string; confidence: number; description?: string; modifiers?: string[] }>
  transcript?: string
  apiId?: string
}
import {
  Mic, Square, Check, ChevronLeft, BrainCircuit, Clock,
  FileText, Activity, AlertTriangle, Loader2, Sparkles,
  Stethoscope, Clipboard, ChevronRight, Zap, History,
  Send, X, RefreshCw, BookOpen, Plus, Pencil,
} from 'lucide-react'
import { formatDOB } from '@/lib/utils/region'

// ── Voice Macros ────────────────────────────────────────────────────────────
const VOICE_MACROS: { label: string; text: string; category: string }[] = [
  { category: 'Vitals', label: 'Vitals Normal', text: 'Vital signs: BP 120/80, HR 72, RR 16, Temp 98.6F, SpO2 98% on room air.' },
  { category: 'Vitals', label: 'Vitals Stable', text: 'Vital signs stable and within normal limits for age.' },
  { category: 'Review of Systems', label: 'ROS Negative', text: 'Review of systems negative for fever, chills, nausea, vomiting, chest pain, shortness of breath, or neurological symptoms.' },
  { category: 'Review of Systems', label: 'ROS Positive', text: 'Review of systems positive for the presenting complaint. Otherwise negative for associated symptoms.' },
  { category: 'Exam', label: 'General Exam Normal', text: 'General: Alert and oriented x3, in no acute distress. HEENT normal. Lungs clear to auscultation bilaterally. Heart regular rate and rhythm. Abdomen soft, non-tender.' },
  { category: 'Exam', label: 'Neuro Normal', text: 'Neurological: Cranial nerves II-XII intact. Motor strength 5/5 throughout. Sensation intact. Reflexes 2+ symmetric. Gait normal.' },
  { category: 'Plan', label: 'Follow Up 2 Weeks', text: 'Follow up in 2 weeks or sooner if symptoms worsen.' },
  { category: 'Plan', label: 'Labs Ordered', text: 'Laboratory studies ordered. Patient instructed to follow up once results are available.' },
  { category: 'Plan', label: 'Imaging Ordered', text: 'Imaging studies ordered. Patient instructed to call if symptoms worsen prior to imaging appointment.' },
  { category: 'Consent', label: 'Consent Obtained', text: 'Informed consent obtained. Risks, benefits, and alternatives discussed with patient who verbalized understanding.' },
]

// ── Waveform ────────────────────────────────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6, 1.0, 0.75, 0.45, 0.85, 0.65].map((h, i) => (
        <div key={i} className="w-1.5 bg-brand rounded-full transition-all"
          style={{
            height: active ? `${h * 100}%` : '15%',
            animation: active ? `wave ${0.8 + i * 0.1}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.08}s`,
          }} />
      ))}
      <style>{`@keyframes wave{0%{transform:scaleY(0.3)}100%{transform:scaleY(1)}}`}</style>
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────────────
interface AISoapResult {
  soap: { s: string; o: string; a: string; p: string }
  icd: Array<{ code: string; desc: string; confidence: number; is_primary?: boolean }>
  cpt: Array<{ code: string; desc: string; confidence: number; modifiers: string[]; em_level?: string; reasoning?: string }>
  avs_summary: string
  em_level: string
  em_rationale: string
}

type UIState = 'queue' | 'select_patient' | 'review_patient' | 'recording' | 'processing' | 'note'

const SPECIALISTS = [
  'Cardiologist', 'Neurologist', 'Orthopedic Surgeon', 'Pulmonologist',
  'Gastroenterologist', 'Endocrinologist', 'Rheumatologist', 'Urologist',
  'Dermatologist', 'Oncologist', 'Physical Therapist', 'Psychiatrist',
  'Ophthalmologist', 'ENT Specialist', 'Hematologist', 'Infectious Disease Specialist',
  'Nephrologist', 'Allergist/Immunologist', 'Pain Management Specialist',
  'Vascular Surgeon', 'Cardiothoracic Surgeon', 'Neurosurgeon', 'Plastic Surgeon',
  'Colorectal Surgeon', 'Oral & Maxillofacial Surgeon', 'Podiatrist',
  'Sleep Medicine Specialist', 'Palliative Care Specialist', 'Sports Medicine Specialist',
  'Reproductive Endocrinologist', 'Maternal-Fetal Medicine Specialist',
  'Neonatologist', 'Pediatric Surgeon', 'Geneticist',
]

const SPECIALTIES = [
  // Primary Care
  'General Medicine', 'Family Medicine', 'Internal Medicine', 'Pediatrics',
  'Geriatric Medicine', 'Adolescent Medicine', 'Preventive Medicine',
  // Medical Subspecialties
  'Cardiology', 'Interventional Cardiology', 'Electrophysiology', 'Heart Failure & Transplant',
  'Neurology', 'Epilepsy', 'Movement Disorders', 'Neuromuscular Medicine', 'Neuro-Oncology',
  'Stroke / Vascular Neurology', 'Headache Medicine', 'Sleep Neurology',
  'Pulmonology', 'Critical Care Medicine', 'Pulmonary/Critical Care',
  'Gastroenterology', 'Hepatology', 'Advanced Endoscopy', 'Motility / Neurogastroenterology',
  'Endocrinology', 'Diabetes & Metabolism', 'Thyroid Disorders', 'Reproductive Endocrinology',
  'Rheumatology', 'Autoimmune Diseases',
  'Nephrology', 'Dialysis / Transplant Nephrology',
  'Hematology', 'Hematology/Oncology', 'Benign Hematology', 'Coagulation Disorders',
  'Oncology', 'Medical Oncology', 'Radiation Oncology', 'Surgical Oncology',
  'Gynecologic Oncology', 'Neuro-Oncology', 'Pediatric Oncology',
  'Infectious Disease', 'HIV/AIDS Medicine', 'Travel Medicine', 'Tropical Medicine',
  'Allergy & Immunology', 'Clinical Immunology',
  'Dermatology', 'Dermatopathology', 'Mohs Surgery', 'Cosmetic Dermatology', 'Pediatric Dermatology',
  'Psychiatry', 'Child & Adolescent Psychiatry', 'Addiction Psychiatry', 'Geriatric Psychiatry',
  'Forensic Psychiatry', 'Consultation-Liaison Psychiatry', 'Neuropsychiatry',
  'Physical Medicine & Rehab', 'Spinal Cord Injury Medicine', 'Brain Injury Medicine',
  'Pain Medicine', 'Interventional Pain Management', 'Chronic Pain',
  // Surgery
  'General Surgery', 'Trauma Surgery', 'Acute Care Surgery', 'Bariatric Surgery',
  'Breast Surgery', 'Surgical Critical Care', 'Burn Surgery',
  'Orthopedics', 'Orthopedic Sports Medicine', 'Joint Replacement / Arthroplasty',
  'Spine Surgery', 'Hand Surgery', 'Foot & Ankle Surgery', 'Pediatric Orthopedics',
  'Orthopedic Trauma', 'Shoulder & Elbow Surgery', 'Orthopedic Oncology',
  'Neurosurgery', 'Spine Neurosurgery', 'Pediatric Neurosurgery', 'Functional Neurosurgery',
  'Cerebrovascular / Endovascular Neurosurgery', 'Skull Base Surgery',
  'Cardiothoracic Surgery', 'Cardiac Surgery', 'Thoracic Surgery',
  'Vascular Surgery', 'Endovascular Surgery',
  'Urology', 'Urologic Oncology', 'Female Pelvic / Urogynecology',
  'Male Infertility', 'Pediatric Urology', 'Endourology', 'Neurourology',
  'Plastic & Reconstructive Surgery', 'Hand & Microsurgery', 'Craniofacial Surgery',
  'Cosmetic Surgery', 'Burn Reconstruction',
  'Colorectal Surgery',
  'Transplant Surgery', 'Liver Transplant', 'Kidney Transplant', 'Heart Transplant',
  'Otolaryngology (ENT)', 'Otology / Neurotology', 'Rhinology / Sinus',
  'Laryngology / Voice', 'Head & Neck Oncology', 'Facial Plastic Surgery', 'Pediatric ENT',
  'Ophthalmology', 'Retina / Vitreous', 'Glaucoma', 'Cornea & External Disease',
  'Oculoplastics', 'Pediatric Ophthalmology', 'Neuro-Ophthalmology', 'Cataract & Refractive',
  'Oral & Maxillofacial Surgery',
  'Podiatric Medicine', 'Podiatric Surgery',
  // OB/GYN
  'OB/GYN', 'Maternal-Fetal Medicine', 'Reproductive Endocrinology & Infertility',
  'Gynecologic Oncology', 'Female Pelvic Medicine', 'Minimally Invasive GYN Surgery',
  'Menopause / Midlife Health',
  // Pediatric Subspecialties
  'Pediatric Cardiology', 'Pediatric Pulmonology', 'Pediatric Gastroenterology',
  'Pediatric Endocrinology', 'Pediatric Nephrology', 'Pediatric Neurology',
  'Pediatric Rheumatology', 'Pediatric Infectious Disease', 'Pediatric Hematology/Oncology',
  'Pediatric Critical Care', 'Pediatric Emergency Medicine', 'Neonatology',
  'Developmental-Behavioral Pediatrics', 'Pediatric Allergy & Immunology',
  'Pediatric Hospital Medicine',
  // Emergency & Critical Care
  'Emergency Medicine', 'Pediatric Emergency Medicine', 'Medical Toxicology',
  'Critical Care Medicine', 'Surgical Critical Care', 'Neurocritical Care',
  // Radiology & Pathology
  'Radiology', 'Diagnostic Radiology', 'Interventional Radiology',
  'Neuroradiology', 'Musculoskeletal Radiology', 'Breast Imaging',
  'Nuclear Medicine', 'Nuclear Radiology', 'PET/CT Imaging',
  'Pathology', 'Anatomic Pathology', 'Clinical Pathology', 'Cytopathology',
  'Dermatopathology', 'Hematopathology', 'Neuropathology', 'Molecular Pathology',
  'Forensic Pathology',
  // Anesthesiology
  'Anesthesiology', 'Cardiac Anesthesiology', 'Obstetric Anesthesiology',
  'Pediatric Anesthesiology', 'Regional Anesthesia', 'Neuroanesthesiology',
  // Other Specialties
  'Sports Medicine', 'Occupational Medicine', 'Aerospace Medicine',
  'Undersea & Hyperbaric Medicine', 'Addiction Medicine', 'Hospice & Palliative Medicine',
  'Sleep Medicine', 'Genetics / Genomics', 'Clinical Informatics',
  'Integrative Medicine', 'Lifestyle Medicine', 'Obesity Medicine',
  'Wound Care', 'Concierge / Direct Primary Care',
  // Dental (for integrated facilities)
  'General Dentistry', 'Oral Surgery', 'Periodontics', 'Endodontics',
  'Orthodontics', 'Prosthodontics', 'Pediatric Dentistry',
  // Behavioral Health
  'Psychology', 'Clinical Psychology', 'Neuropsychology',
  'Social Work (Clinical)', 'Licensed Counseling', 'Marriage & Family Therapy',
  'Applied Behavior Analysis (ABA)',
  // Allied Health (for multi-disciplinary practices)
  'Physical Therapy', 'Occupational Therapy', 'Speech-Language Pathology',
  'Audiology', 'Optometry', 'Chiropractic', 'Nutrition / Dietetics',
  'Certified Nurse Midwifery', 'Nurse Practitioner — Primary Care',
  'Nurse Practitioner — Acute Care', 'Physician Assistant',
]

// ── Provider View ───────────────────────────────────────────────────────────
function ProviderView() {
  const { t } = useT()
  const { toast } = useToast()
  const router = useRouter()
  const { setIsScribeRecording, country, orgId, currentUser, selectedClient } = useApp()
  const [uiState, setUiState] = useState<UIState>('queue')
  const { data: apiSOAPResult } = useSOAPNotes({ limit: 50 })
  const { data: apptResult } = useAppointments({ limit: 100 })
  const createSOAP = useCreateSOAPNote()
  const createCoding = useCreateCoding()

  const apiVisits: DemoVisit[] = (apiSOAPResult?.data || []).map((s: any) => ({
    id: s.id, patientId: s.patient_id || '',
    patient: s.patient_name || 'Unknown', patientName: s.patient_name || 'Unknown',
    provider: s.provider_name || '', dos: s.created_at?.slice(0, 10) || '',
    date: s.created_at?.slice(0, 10) || '',
    visitType: 'office_visit' as const, encounterType: 'Office Visit',
    status: s.status === 'completed' ? 'signed' as const : 'pending_signoff' as const,
    soap: { s: s.subjective || '', o: s.objective || '', a: s.assessment || '', p: s.plan || '' },
    suggestedCodes: [], duration: '0:00', transcript: '',
  }))

  const visits = apiVisits.length ? apiVisits : []
  const pending = visits.filter(v => v.status === 'pending_signoff')
  const completed = visits.filter(v => v.status === 'signed')

  // Pull today's appointments for the Select Patient screen
  const todayStr = new Date().toISOString().slice(0, 10)
  const apiAppts = (apptResult?.data || [])
  type ScribeAppt = { id: string; patientId: string; patientName: string; time: string; type: string; provider: string; status: string; insurance?: string }
  const todayAppts: ScribeAppt[] = apiAppts.length
    ? apiAppts.map((a: any) => ({
        id: a.id,
        patientId: a.patient_id || '',
        patientName: a.patient_name || a.chief_complaint || 'Patient',
        time: a.appointment_date ? new Date(a.appointment_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—',
        type: a.visit_type || 'Office Visit',
        provider: a.provider_name || '',
        status: a.status || 'scheduled',
      }))
    : [
        { id: 'demo-1', patientId: 'p-1', patientName: 'Robert Johnson', time: '9:00 AM', type: 'Follow-up', provider: 'Dr. Martinez', status: 'scheduled' },
        { id: 'demo-2', patientId: 'p-2', patientName: 'Maria Garcia', time: '10:30 AM', type: 'New Patient', provider: 'Dr. Martinez', status: 'scheduled' },
        { id: 'demo-3', patientId: 'p-3', patientName: 'James Wilson', time: '2:00 PM', type: 'Annual Exam', provider: 'Dr. Martinez', status: 'scheduled' },
        { id: 'demo-4', patientId: 'p-4', patientName: 'Sara Johnson', time: '3:15 PM', type: 'Procedure', provider: 'Dr. Martinez', status: 'in_room' },
        { id: 'demo-5', patientId: 'p-5', patientName: 'David Lee', time: '4:30 PM', type: 'Follow-up', provider: 'Dr. Martinez', status: 'scheduled' },
      ]

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<DemoVisit | null>(null)
  // Derive patient info from selected visit OR from the appointment list when a patient is picked
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedApptData = selectedPatientId ? todayAppts.find(a => a.patientId === selectedPatientId || a.id === selectedPatientId) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedPatient: Record<string, any> | null = selectedVisit
    ? { id: selectedVisit.patientId, name: selectedVisit.patientName, firstName: (selectedVisit.patientName || '').split(' ')[0], lastName: (selectedVisit.patientName || '').split(' ').slice(1).join(' '), dob: '', gender: '', insurance: '', allergies: [], medications: [] }
    : selectedApptData
    ? { id: selectedApptData.patientId || selectedApptData.id, name: selectedApptData.patientName, firstName: (selectedApptData.patientName || '').split(' ')[0], lastName: (selectedApptData.patientName || '').split(' ').slice(1).join(' '), dob: '', gender: '', insurance: selectedApptData.insurance || '', allergies: [], medications: [] }
    : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedAppt: Record<string, any> | null = null

  // Recording state
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const [aiResult, setAiResult] = useState<AISoapResult | null>(null)
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' })
  const [aiError, setAiError] = useState('')
  const [keptCodes, setKeptCodes] = useState<Record<string, boolean>>({})
  const [selectedSpecialty, setSelectedSpecialty] = useState('General Medicine')
  const [isSigning, setIsSigning] = useState(false)
  const [isTranscriptEditable, setIsTranscriptEditable] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [manualCodeType, setManualCodeType] = useState<'icd' | 'cpt'>('icd')
  const [manualCodes, setManualCodes] = useState<Array<{ code: string; desc: string; type: 'icd' | 'cpt'; confidence: number; is_primary: boolean; modifiers: string[]; reasoning: string }>>([])

  // Voice macros panel
  const [showMacros, setShowMacros] = useState(false)
  const macroCategories = Array.from(new Set(VOICE_MACROS.map(m => m.category)))

  // AI section editor
  const [refiningSections, setRefiningSections] = useState<Record<string, boolean>>({})

  // Referral letter
  const [showReferral, setShowReferral] = useState(false)
  const [selectedSpecialist, setSelectedSpecialist] = useState(SPECIALISTS[0])
  const [referralReason, setReferralReason] = useState('')
  const [referralLetter, setReferralLetter] = useState('')
  const [generatingReferral, setGeneratingReferral] = useState(false)

  // Note left panel tab: 'transcript' | 'prior_visits'
  const [noteLeftTab, setNoteLeftTab] = useState<'transcript' | 'prior_visits'>('transcript')

  useEffect(() => {
    setIsScribeRecording(uiState === 'recording')
  }, [uiState, setIsScribeRecording])

  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported. Use Chrome.')
      return
    }
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    let finalText = ''

    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '
        else interim = t
      }
      const full = finalText + interim
      transcriptRef.current = full
      setTranscript(full)
    }
    rec.onerror = (e: any) => { if (e.error !== 'aborted') toast.error(`Mic: ${e.error}`) }
    rec.onend = () => {
      if (recognitionRef.current === rec) try { rec.start() } catch { /* ignore */ }
    }
    recognitionRef.current = rec
    setIsListening(true)
    setTranscript('')
    transcriptRef.current = ''
    finalText = ''
    try { rec.start() } catch { /* ignore */ }
  }, [toast])

  const stopRecording = useCallback(() => {
    setIsListening(false)
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [])

  function insertMacro(text: string) {
    const newText = (transcriptRef.current ? transcriptRef.current.trimEnd() + ' ' : '') + text + ' '
    transcriptRef.current = newText
    setTranscript(newText)
    setShowMacros(false)
    toast.success('Macro inserted')
  }

  // ── Process Note ─────────────────────────────────────────────────────────
  async function processNote() {
    const finalTranscript = transcriptRef.current || transcript
    if (!finalTranscript.trim()) { toast.error('No speech captured yet.'); return }
    stopRecording()
    setUiState('processing')
    setAiError('')
    try {
      const codeSystem = country === 'uae' ? 'ICD-10-AM/ACHI' : 'ICD-10-CM/CPT'
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'soap_note',
          transcript: finalTranscript,
          patient: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown',
          dob: selectedPatient?.dob || '',
          gender: selectedPatient?.gender || '',
          insurance: selectedPatient?.insurance?.payer || '',
          allergies: selectedPatient?.allergies?.join(', ') || 'NKDA',
          medications: selectedPatient?.medications?.join(', ') || 'None',
          visitType: selectedAppt?.type || 'Office Visit',
          specialty: selectedSpecialty,
          codeSystem,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      let result: AISoapResult
      try {
        result = JSON.parse(data.text.replace(/```json|```/g, '').trim())
      } catch { throw new Error('AI returned invalid JSON') }

      setAiResult(result)
      setSoap(result.soap)
      const kept: Record<string, boolean> = {}
      result.icd.forEach(c => { kept[c.code] = true })
      result.cpt.forEach(c => { kept[c.code] = true })
      setKeptCodes(kept)
      setManualCodes([])
      setNoteLeftTab('transcript')

      const fakeVisit: DemoVisit = {
        id: `ai-${crypto.randomUUID()}`, patientId: selectedPatientId || '',
        patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Patient',
        provider: selectedAppt?.provider || 'Provider',
        dos: new Date().toISOString().slice(0, 10),
        encounterType: selectedAppt?.type || 'Office Visit',
        status: 'pending_signoff', soap: result.soap,
        suggestedCodes: [
          ...result.icd.map(c => ({ icd: c.code, description: c.desc, confidence: c.confidence, kept: true })),
          ...result.cpt.map(c => ({ cpt: c.code, description: c.desc, confidence: c.confidence, kept: true, modifiers: c.modifiers })),
        ],
        transcript: finalTranscript,
      }
      setSelectedVisit(fakeVisit)
      setUiState('note')
    } catch (err: any) {
      setAiError(err.message)
      setUiState('recording')
      toast.error(`AI failed: ${err.message}`)
    }
  }

  // ── AI Section Refine ────────────────────────────────────────────────────
  async function refineSection(section: 's' | 'o' | 'a' | 'p') {
    if (!soap[section].trim()) { toast.error('Section is empty'); return }
    setRefiningSections(p => ({ ...p, [section]: true }))
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scribe_refine_section',
          section,
          text: soap[section],
          patient: selectedVisit?.patientName || 'Unknown',
          visitType: selectedVisit?.encounterType || 'Office Visit',
          assessment: soap.a,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setSoap(p => ({ ...p, [section]: data.text.trim() }))
      toast.success('Section refined')
    } catch (err: any) {
      toast.error(`Refine failed: ${err.message}`)
    } finally {
      setRefiningSections(p => ({ ...p, [section]: false }))
    }
  }

  // ── Referral Letter ──────────────────────────────────────────────────────
  async function generateReferral() {
    if (!referralReason.trim()) { toast.error('Enter reason for referral'); return }
    setGeneratingReferral(true)
    setReferralLetter('')
    try {
      const soapText = `S: ${soap.s}\nO: ${soap.o}\nA: ${soap.a}\nP: ${soap.p}`
      const primaryIcd = aiResult?.icd[0] ? `${aiResult.icd[0].code} — ${aiResult.icd[0].desc}` : soap.a.slice(0, 120)
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scribe_referral',
          patient: selectedVisit?.patientName || 'Unknown',
          dob: selectedPatient?.dob || '',
          insurance: selectedPatient?.insurance?.payer || '',
          soap: soapText,
          icd: primaryIcd,
          specialist: selectedSpecialist,
          reason: referralReason,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setReferralLetter(data.text.trim())
    } catch (err: any) {
      toast.error(`Referral failed: ${err.message}`)
    } finally {
      setGeneratingReferral(false)
    }
  }

  function openVisit(v: DemoVisit) { setSelectedVisit(v); setSoap({ ...v.soap }); setAiResult(null); setNoteLeftTab('transcript'); setUiState('note') }

  // ── Patient Selector ──────────────────────────────────────────────────────
  if (uiState === 'select_patient') return (
    <div className="max-w-2xl mx-auto mt-6 space-y-3">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setUiState('queue')} className="text-content-secondary hover:text-content-primary flex items-center gap-1 text-sm"><ChevronLeft size={16} /> Back</button>
        <h2 className="text-base font-semibold">Select Patient</h2>
        <span className="text-xs text-content-tertiary ml-auto">{todayAppts.length} patient{todayAppts.length !== 1 ? 's' : ''} scheduled</span>
      </div>
      <div className="space-y-2">
        {todayAppts.map(a => (
          <button key={a.id} onClick={() => { setSelectedPatientId(a.patientId); setUiState('review_patient') }}
            className="w-full text-left card p-4 hover:border-brand/30 transition-all flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm shrink-0">
              {a.patientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{a.patientName}</div>
              <div className="text-xs text-content-secondary">{a.time} · {a.type}{a.provider ? ` · ${a.provider}` : ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status} small />
              <ChevronRight size={14} className="text-content-tertiary" />
            </div>
          </button>
        ))}
        {todayAppts.length === 0 && (
          <div className="card p-8 text-center text-content-tertiary">
            <p className="text-sm">No appointments scheduled for today.</p>
            <p className="text-xs mt-1">You can still start a new note — go back and tap "New Note".</p>
          </div>
        )}
      </div>
    </div>
  )

  // ── Review Patient ────────────────────────────────────────────────────────
  if (uiState === 'review_patient' && selectedPatient) return (
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setUiState('select_patient')} className="text-content-secondary hover:text-content-primary flex items-center gap-1 text-sm"><ChevronLeft size={16} /> Back</button>
        <h2 className="text-base font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
      </div>
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
            {(selectedPatient.firstName?.[0] ?? '') + (selectedPatient.lastName?.[0] ?? '') || '?'}
          </div>
          <div>
            <div className="font-semibold">{[selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ') || 'Patient'}</div>
            <div className="text-xs text-content-secondary">{(selectedAppt as any)?.time} · {(selectedAppt as any)?.type}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-content-tertiary block">DOB</span>{formatDOB(selectedPatient.dob)}</div>
          <div><span className="text-content-tertiary block">Gender</span>{selectedPatient.gender || '—'}</div>
          <div><span className="text-content-tertiary block">Insurance</span>{selectedPatient.insurance?.payer || '—'}</div>
        </div>
      </div>
      {(selectedPatient.allergies?.length ?? 0) > 0 && (
        <div className="bg-[#065E76]/5 border border-[#065E76]/20 rounded-lg p-3">
          <div className="text-xs font-semibold text-[#065E76] mb-1">⚠ Allergies</div>
          <div className="text-sm">{selectedPatient.allergies!.join(', ')}</div>
        </div>
      )}
      {(selectedPatient.medications?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-content-secondary mb-2 tracking-wide">Medications</div>
          <ul className="text-sm space-y-1">{selectedPatient.medications!.map((m: string, i: number) => <li key={i}>• {m}</li>)}</ul>
        </div>
      )}
      {/* Prior visits preview */}
      {(() => {
        const priorVisits = visits.filter(v => v.patientId === selectedPatientId)
        return priorVisits.length > 0 ? (
          <div className="card p-4">
            <div className="text-xs font-semibold text-content-secondary mb-2 tracking-wide flex items-center gap-2"><History size={12} /> Prior Visits ({priorVisits.length})</div>
            {priorVisits.slice(0, 2).map(v => (
              <div key={v.id} className="py-1.5 border-b border-separator last:border-0">
                <div className="text-xs font-medium">{v.dos} · {v.encounterType}</div>
                <div className="text-[11px] text-content-tertiary line-clamp-1">{v.soap.a || 'No assessment'}</div>
              </div>
            ))}
          </div>
        ) : null
      })()}
      <div className="card p-4">
        <label className="text-xs font-semibold text-content-secondary tracking-wider block mb-2">Specialty</label>
        <select value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)}
          className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm outline-none focus:border-brand/40">
          {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <button onClick={() => { setUiState('recording'); setTimeout(startRecording, 300) }}
        className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand flex items-center justify-center gap-2 transition-colors">
        <Mic size={16} /> Start Recording — {selectedPatient.firstName}
      </button>
    </div>
  )

  // ── Recording ─────────────────────────────────────────────────────────────
  if (uiState === 'recording') return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Left: patient context + macros */}
      <div className="card p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
            {selectedPatient ? ((selectedPatient.firstName?.[0] ?? '') + (selectedPatient.lastName?.[0] ?? '') || '?') : '?'}
          </div>
          <div>
            <div className="font-semibold text-sm">{selectedPatient ? [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ') || 'Patient' : 'No patient'}</div>
            <div className="text-content-tertiary text-[11px]">{(selectedAppt as any)?.type}</div>
          </div>
        </div>
        {selectedPatient && <>
          <div><span className="text-content-tertiary">DOB: </span>{formatDOB(selectedPatient.dob)}</div>
          <div><span className="text-[#065E76]">Allergies: </span><span className="text-[#065E76]">{selectedPatient.allergies?.join(', ') || 'NKDA'}</span></div>
          <div className="text-content-tertiary">Meds: <span className="text-content-secondary">{selectedPatient.medications?.join(', ') || '—'}</span></div>
        </>}
        {aiError && <div className="mt-2 p-2 bg-[#065E76]/10 border border-[#065E76]/20 rounded text-[#065E76] text-[11px]"><AlertTriangle size={10} className="inline mr-1" />{aiError}</div>}

        {/* Voice macros toggle */}
        <div className="pt-2 border-t border-separator">
          <button onClick={() => setShowMacros(!showMacros)}
            className="w-full flex items-center justify-between text-[11px] text-content-secondary hover:text-content-primary py-1">
            <span className="flex items-center gap-1.5"><Zap size={11} className="text-brand-deep" /> Voice Macros</span>
            <span className="text-[11px] text-content-tertiary">{showMacros ? '▲' : '▼'}</span>
          </button>
          {showMacros && (
            <div className="mt-1.5 space-y-2">
              {macroCategories.map(cat => (
                <div key={cat}>
                  <div className="text-[11px] text-content-tertiary tracking-wider mb-1">{cat}</div>
                  {VOICE_MACROS.filter(m => m.category === cat).map(m => (
                    <button key={m.label} onClick={() => insertMacro(m.text)}
                      className="w-full text-left text-[11px] bg-surface-elevated hover:bg-brand/5 border border-separator hover:border-brand/20 rounded px-2 py-1.5 mb-1 transition-colors">
                      {m.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-separator space-y-2">
          <button onClick={processNote} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-deep transition-colors">
            <Sparkles size={13} /> Process Note
          </button>
          <button onClick={() => { stopRecording(); setUiState('review_patient') }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-separator text-content-secondary hover:text-content-secondary text-xs transition-colors">
            <Square size={12} /> Stop
          </button>
        </div>
      </div>

      {/* Right: live transcript */}
      <div className="col-span-2 card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          {isListening ? <span className="w-2 h-2 bg-[#065E76] rounded-full animate-pulse" /> : <span className="w-2 h-2 bg-brand-pale rounded-full" />}
          <span className="text-xs font-semibold text-[#065E76]">{isListening ? 'RECORDING — Speak clearly' : 'Mic starting…'}</span>
          <span className="ml-auto flex items-center gap-2 text-[11px] text-content-tertiary">
            <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded">{selectedSpecialty}</span>
            <button onClick={() => setIsTranscriptEditable(p => !p)} className="hover:text-content-primary flex items-center gap-0.5">
              <Pencil size={9} /> {isTranscriptEditable ? 'Lock' : 'Edit'}
            </button>
          </span>
        </div>
        <Waveform active={isListening} />
        <div className="flex-1 mt-3 overflow-y-auto min-h-[200px] max-h-[400px]">
          {isTranscriptEditable ? (
            <textarea value={transcript}
              onChange={e => { setTranscript(e.target.value); transcriptRef.current = e.target.value }}
              className="w-full h-full min-h-[200px] bg-transparent text-sm font-mono leading-relaxed resize-none outline-none text-content-primary"
              placeholder="Transcript will appear here. You can edit it before processing." />
          ) : (
            <div className="text-sm text-content-primary leading-relaxed font-mono whitespace-pre-wrap">
              {transcript || <span className="text-content-tertiary">Listening… speak now</span>}
            </div>
          )}
        </div>
        {transcript && (
          <div className="mt-2 pt-2 border-t border-separator flex items-center justify-between">
            <span className="text-[11px] text-content-tertiary">{transcript.split(' ').filter(Boolean).length} words</span>
            <button onClick={() => { setTranscript(''); transcriptRef.current = '' }} className="text-[11px] text-content-tertiary hover:text-[#065E76]">Clear</button>
          </div>
        )}
      </div>
    </div>
  )

  // ── Processing ────────────────────────────────────────────────────────────
  if (uiState === 'processing') return (
    <div className="max-w-lg mx-auto mt-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
        <Loader2 size={32} className="text-brand animate-spin" />
      </div>
      <p className="text-base font-semibold flex items-center gap-2"><span className="ai-dot" /> Processing Note…</p>
      <p className="text-sm text-content-secondary">Generating SOAP · ICD-10 codes · CPT codes · AVS</p>
      <div className="flex items-center justify-center gap-2 text-xs text-content-tertiary">
        <BrainCircuit size={13} className="text-brand" /> Claude on AWS Bedrock
      </div>
    </div>
  )

  // ── Note View ─────────────────────────────────────────────────────────────
  if (uiState === 'note' && selectedVisit) {
    const allCodes = [
      ...(aiResult
        ? [
            ...aiResult.icd.map(c => ({
              code: c.code, desc: c.desc, confidence: c.confidence,
              type: 'icd' as const, is_primary: c.is_primary ?? false,
              modifiers: [] as string[], reasoning: '',
            })),
            ...aiResult.cpt.map(c => ({
              code: c.code, desc: c.desc, confidence: c.confidence,
              type: 'cpt' as const, is_primary: false,
              modifiers: c.modifiers, reasoning: c.reasoning ?? '',
            })),
          ]
        : selectedVisit.suggestedCodes.map(c => ({
            code: c.icd || c.cpt || '',
            desc: c.description, confidence: c.confidence,
            type: c.icd ? 'icd' as const : 'cpt' as const,
            is_primary: false, modifiers: c.modifiers || [], reasoning: '',
          }))),
      ...manualCodes,
    ]

    const priorVisits = visits.filter(v => v.patientId === selectedVisit.patientId && v.id !== selectedVisit.id)

    return (
      <>
        <div className="flex flex-col md:grid md:grid-cols-5 md:gap-5 md:h-[calc(100vh-300px)] gap-4">
          {/* Left panel — transcript OR prior visits */}
          <div className="col-span-2 card flex flex-col overflow-hidden min-h-[300px] md:min-h-0">
            {/* Tab switcher */}
            <div className="flex gap-2 border-b border-separator pb-1">
              <button onClick={() => setNoteLeftTab('transcript')}
                className={`flex-1 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${noteLeftTab === 'transcript' ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
                <FileText size={11} /> Transcript
              </button>
              <button onClick={() => setNoteLeftTab('prior_visits')}
                className={`flex-1 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${noteLeftTab === 'prior_visits' ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
                <History size={11} /> Prior Visits
                {priorVisits.length > 0 && <span className="text-[9px] bg-brand/15 text-brand px-1.5 py-0.5 rounded-full">{priorVisits.length}</span>}
              </button>
            </div>

            {noteLeftTab === 'transcript' ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.transcript || 'No transcript available'}
                </div>
                {aiResult?.avs_summary && (
                  <div className="p-3 border-t border-separator bg-brand/5">
                    <div className="text-[11px] font-semibold text-brand tracking-wider mb-1"><Clipboard size={10} className="inline mr-1" />After-Visit Summary</div>
                    <p className="text-xs text-content-secondary leading-relaxed">{aiResult.avs_summary}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {priorVisits.length === 0 ? (
                  <div className="p-6 text-center text-xs text-content-tertiary">
                    <History size={24} className="mx-auto mb-2 opacity-30" />
                    No prior visits found for this patient
                  </div>
                ) : priorVisits.map(v => (
                  <div key={v.id} className="p-3 border-b border-separator">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold">{v.dos}</span>
                      <StatusBadge status={v.status === 'signed' ? 'completed' : 'in_progress'} small />
                    </div>
                    <div className="text-[11px] text-content-tertiary mb-2">{v.encounterType} · {v.provider}</div>
                    {v.soap.a && (
                      <div className="bg-surface-elevated rounded p-2 mb-1.5">
                        <div className="text-[9px] font-bold text-content-secondary tracking-wider mb-0.5">Assessment</div>
                        <div className="text-[11px] leading-relaxed">{v.soap.a}</div>
                      </div>
                    )}
                    {v.soap.p && (
                      <div className="bg-surface-elevated rounded p-2">
                        <div className="text-[9px] font-bold text-content-secondary tracking-wider mb-0.5">Plan</div>
                        <div className="text-[11px] leading-relaxed line-clamp-3">{v.soap.p}</div>
                      </div>
                    )}
                    {v.suggestedCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.suggestedCodes.slice(0, 4).map((c, i) => (
                          <span key={i} className={`text-[11px] px-1.5 py-0.5 rounded border ${c.cpt ? 'bg-brand/5 text-brand border-brand/15' : 'bg-cyan-500/5 text-cyan-500 border-cyan-500/15'}`}>
                            {c.cpt ? `CPT ${c.cpt}` : `ICD ${c.icd}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — SOAP + codes */}
          <div className="col-span-3 card flex flex-col overflow-hidden min-h-[400px] md:min-h-0">
            <div className="px-4 py-3 border-b border-separator flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{selectedVisit.patientName}</h3>
                <p className="text-[11px] text-content-secondary">{selectedVisit.provider} · {selectedVisit.dos} · {selectedVisit.encounterType}</p>
              </div>
              <div className="flex items-center gap-3">
                {aiResult?.em_level && (
                  <div className="text-right">
                    <div className="text-[11px] text-content-tertiary">E/M Level</div>
                    <div className="text-sm font-bold text-brand">{aiResult.em_level}</div>
                  </div>
                )}
                {/* Referral button */}
                {aiResult && (
                  <button onClick={() => { setShowReferral(true); setReferralLetter('') }}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-separator hover:border-brand/30 hover:text-brand text-content-secondary transition-colors">
                    <Send size={11} /> Referral
                  </button>
                )}
                <button onClick={() => setUiState('queue')} className="text-[11px] text-content-secondary hover:text-content-primary flex items-center gap-1"><ChevronLeft size={12} /> Back</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* SOAP sections with AI refine */}
              {(['s', 'o', 'a', 'p'] as const).map(k => (
                <div key={k}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-content-secondary tracking-wider">
                      {k === 's' ? 'S — Subjective' : k === 'o' ? 'O — Objective' : k === 'a' ? 'A — Assessment' : 'P — Plan'}
                    </label>
                    <button onClick={() => refineSection(k)} disabled={refiningSections[k]}
                      className="flex items-center gap-1 text-[11px] text-content-tertiary hover:text-brand disabled:opacity-50 transition-colors">
                      {refiningSections[k]
                        ? <><RefreshCw size={10} className="animate-spin" /> Refining…</>
                        : <><Sparkles size={10} /> Refine</>}
                    </button>
                  </div>
                  <textarea value={soap[k]} onChange={e => setSoap(p => ({ ...p, [k]: e.target.value }))} rows={3}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs resize-none outline-none focus:border-brand/40 leading-relaxed" />
                </div>
              ))}

              {/* AI Codes */}
              <div className="border-t border-separator pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit size={14} className="text-brand" />
                  <h4 className="text-[11px] font-semibold text-content-secondary tracking-wider">AI Generated Codes</h4>
                  {aiResult?.em_rationale && <span className="ml-auto text-[11px] text-content-tertiary">{aiResult.em_rationale}</span>}
                </div>
                {allCodes.map((code, i) => (
                  <div key={`${code.code}-${i}`} className={`card p-3 mb-2 transition-opacity ${keptCodes[code.code] === false ? 'opacity-40' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`text-[11px] font-bold ${code.type === 'cpt' ? 'text-brand' : 'text-cyan-500'}`}>
                            {code.type === 'cpt' ? `CPT ${code.code}` : `ICD ${code.code}`}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${code.confidence >= 90 ? 'bg-brand/10 text-brand-dark dark:text-brand-dark' : code.confidence >= 75 ? 'bg-brand-pale0/10 text-brand-deep' : 'bg-gray-500/10 text-gray-400'}`}>{code.confidence}%</span>
                          {code.is_primary && <span className="text-[11px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">Primary</span>}
                          {manualCodes.some(m => m.code === code.code) && <span className="text-[11px] bg-brand/10 text-brand-dark px-1.5 py-0.5 rounded-full">Manual</span>}
                          {code.modifiers?.map((m: string) => <span key={m} className="text-[11px] bg-brand/10 text-brand-dark px-1.5 py-0.5 rounded">-{m}</span>)}
                        </div>
                        <p className="text-xs">{code.desc}</p>
                        {code.reasoning && <p className="text-[11px] text-content-tertiary mt-0.5">↳ {code.reasoning}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setKeptCodes(p => ({ ...p, [code.code]: true }))} className={`text-[11px] px-2 py-1 rounded border transition-colors ${keptCodes[code.code] !== false ? 'bg-brand/10 text-brand-dark dark:text-brand-dark border-brand/20' : 'border-separator text-content-secondary'}`}>Keep</button>
                        <button onClick={() => setKeptCodes(p => ({ ...p, [code.code]: false }))} className={`text-[11px] px-2 py-1 rounded border transition-colors ${keptCodes[code.code] === false ? 'bg-[#065E76]/10 text-[#065E76] border-[#065E76]/20' : 'border-separator text-content-secondary'}`}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Manual code add */}
                <div className="mt-2 flex gap-2 items-center">
                  <select value={manualCodeType} onChange={e => setManualCodeType(e.target.value as 'icd' | 'cpt')}
                    className="bg-surface-elevated border border-separator rounded px-2 py-1.5 text-[11px] outline-none focus:border-brand/40 w-16">
                    <option value="icd">ICD</option>
                    <option value="cpt">CPT</option>
                  </select>
                  <input value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())}
                    placeholder="e.g. M54.5 or 99213" maxLength={10}
                    className="flex-1 bg-surface-elevated border border-separator rounded px-2 py-1.5 text-[11px] outline-none focus:border-brand/40 font-mono"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && manualCode.trim()) {
                        const code = manualCode.trim()
                        if (allCodes.some(c => c.code === code)) { setManualCode(''); return }
                        setManualCodes(p => [...p, { code, desc: 'Manually added', type: manualCodeType, confidence: 100, is_primary: false, modifiers: [], reasoning: '' }])
                        setKeptCodes(p => ({ ...p, [code]: true }))
                        setManualCode('')
                      }
                    }} />
                  <button onClick={() => {
                    const code = manualCode.trim()
                    if (!code) return
                    if (allCodes.some(c => c.code === code)) { setManualCode(''); return }
                    setManualCodes(p => [...p, { code, desc: 'Manually added', type: manualCodeType, confidence: 100, is_primary: false, modifiers: [], reasoning: '' }])
                    setKeptCodes(p => ({ ...p, [code]: true }))
                    setManualCode('')
                  }} className="flex items-center gap-1 text-[11px] bg-brand text-white border border-brand/20 rounded px-2 py-1.5 hover:bg-brand/20 transition-colors">
                    <Plus size={10} /> Add
                  </button>
                </div>
              </div>
            </div>

            {selectedVisit.status === 'pending_signoff' && (
              <div className="p-3 border-t border-separator flex gap-2">
                <button disabled={isSigning} onClick={async () => {
                  setIsSigning(true)
                  try {
                    const keptIcd = aiResult?.icd.filter(c => keptCodes[c.code] !== false) || []
                    const keptCpt = aiResult?.cpt.filter(c => keptCodes[c.code] !== false) || []
                    const manualKept = manualCodes.filter(c => keptCodes[c.code] !== false)

                    // Step 1: Save SOAP note — get back the ID
                    const soapResult = await createSOAP.mutate({
                      patient_id: selectedVisit.patientId || '',
                      provider_id: currentUser?.id || '',
                      encounter_id: crypto.randomUUID(),
                      dos: selectedVisit.dos,
                      subjective: soap.s, objective: soap.o, assessment: soap.a, plan: soap.p,
                      transcript: selectedVisit.transcript || '',
                      signed_off: true,
                      ai_suggestions: {
                        icd: keptIcd, cpt: keptCpt,
                        em_level: aiResult?.em_level, avs_summary: aiResult?.avs_summary,
                        manual_codes: manualKept,
                      },
                    })
                    if (!soapResult?.id) throw new Error('SOAP note save failed — no ID returned')

                    // Step 2: Create coding queue item — linked to SOAP note via soap_note_id
                    await createCoding.mutate({
                      patient_id: selectedVisit.patientId || '',
                      client_id: selectedClient?.id || undefined,
                      soap_note_id: soapResult.id,
                      received_at: new Date().toISOString(),
                      priority: 'medium', status: 'pending',
                      notes: `AI Scribe: ${selectedVisit.encounterType} · ${selectedVisit.dos} | ICD: ${[...keptIcd.map(c => c.code), ...manualKept.filter(c => c.type === 'icd').map(c => c.code)].join(', ')} | CPT: ${[...keptCpt.map(c => c.code), ...manualKept.filter(c => c.type === 'cpt').map(c => c.code)].join(', ')}`,
                    })

                    toast.success('✓ Note signed & saved — routing to Coding Queue')
                    router.push('/coding')
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error'
                    toast.error(`Sign failed: ${msg}. Please try again.`)
                  } finally {
                    setIsSigning(false)
                  }
                }} className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSigning ? <><Loader2 size={15} className="animate-spin" /> Signing…</> : <><Check size={16} /> Sign & Send to Coding</>}
                </button>
                <button onClick={async () => {
                  try {
                    await createSOAP.mutate({
                      patient_id: selectedVisit.patientId || '',
                      provider_id: currentUser?.id || '',
                      encounter_id: crypto.randomUUID(),
                      dos: selectedVisit.dos,
                      subjective: soap.s, objective: soap.o, assessment: soap.a, plan: soap.p,
                      transcript: selectedVisit.transcript || '',
                      signed_off: false,
                      ai_suggestions: aiResult ? (aiResult as unknown as Record<string, unknown>) : {},
                    })
                    toast.success('Draft saved ✓')
                  } catch {
                    toast.warning('Draft saved locally')
                  }
                }} className="px-4 py-2.5 rounded-lg border border-separator text-content-secondary text-sm transition-colors hover:border-brand/30 hover:text-content-secondary">Save Draft</button>
              </div>
            )}
          </div>
        </div>

        {/* Referral Letter Modal */}
        {showReferral && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-default border border-separator rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
              <div className="flex gap-2 items-center justify-between px-5 py-4 border-b border-separator pb-1">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-brand" />
                  <h3 className="text-sm font-semibold">Generate Referral Letter</h3>
                </div>
                <button onClick={() => setShowReferral(false)} className="text-content-secondary hover:text-content-primary"><X size={16} /></button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div>
                  <label className="text-xs font-semibold text-content-secondary tracking-wider block mb-1.5">Specialist Type</label>
                  <select value={selectedSpecialist} onChange={e => setSelectedSpecialist(e.target.value)}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm outline-none focus:border-brand/40">
                    {SPECIALISTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-content-secondary tracking-wider block mb-1.5">Reason for Referral</label>
                  <textarea value={referralReason} onChange={e => setReferralReason(e.target.value)} rows={3} placeholder="e.g. Persistent back pain with radiculopathy, recommend MRI and specialist evaluation"
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-brand/40" />
                </div>
                {!referralLetter && (
                  <button onClick={generateReferral} disabled={generatingReferral || !referralReason.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-50 transition-colors">
                    {generatingReferral ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate Letter</>}
                  </button>
                )}
                {referralLetter && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-content-secondary tracking-wider">Referral Letter</label>
                      <button onClick={generateReferral} disabled={generatingReferral}
                        className="text-[11px] text-brand hover:underline flex items-center gap-1 disabled:opacity-50">
                        <RefreshCw size={10} /> Regenerate
                      </button>
                    </div>
                    <textarea value={referralLetter} onChange={e => setReferralLetter(e.target.value)} rows={14}
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs font-mono resize-none outline-none focus:border-brand/40 leading-relaxed" />
                    <button onClick={() => { navigator.clipboard.writeText(referralLetter); toast.success('Copied to clipboard') }}
                      className="mt-2 w-full border border-separator rounded-lg py-2 text-xs text-content-secondary hover:text-content-secondary transition-colors">
                      Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Queue ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        <KPICard label={t('scribe', 'notesToday')} value={visits.length} icon={<FileText size={20} />} />
        <KPICard label={t('scribe', 'pendingSignOff')} value={pending.length} icon={<Clock size={20} />} />
        <KPICard label={t('scribe', 'avgConfidence')} value="—" icon={<BrainCircuit size={20} />} />
        <KPICard label={t('scribe', 'codesSuggested')} value={visits.reduce((s, v) => s + (v.suggestedCodes?.length || 0), 0)} icon={<Activity size={20} />} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <div className="col-span-1 space-y-3">
          <button onClick={() => setUiState('select_patient')}
            className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand flex items-center justify-center gap-2 transition-colors">
            <Mic size={16} /> Start New Recording
          </button>
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-content-secondary tracking-wider">Pending Sign-off</h3>
                <span className="text-[11px] bg-brand-pale0/15 text-brand-deep px-2 py-0.5 rounded-full">{pending.length}</span>
              </div>
              {pending.map(v => (
                <button key={v.id} onClick={() => openVisit(v)} className="w-full text-left card p-3 mb-2 hover:border-brand/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{v.patientName}</span>
                    <StatusBadge status="pending_signoff" small />
                  </div>
                  <p className="text-[11px] text-content-secondary">{v.dos} · {v.encounterType}</p>
                </button>
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-content-secondary tracking-wider mb-2">Completed</h3>
              {completed.map(v => (
                <button key={v.id} onClick={() => openVisit(v)} className="w-full text-left card p-3 mb-2 hover:border-brand/30 opacity-70 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{v.patientName}</span>
                    <StatusBadge status="completed" small />
                  </div>
                  <p className="text-[11px] text-content-secondary">{v.dos} · {v.encounterType}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-2 card flex items-center justify-center text-center p-12">
          <div className="max-w-xs">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <Stethoscope size={32} className="text-brand-dark opacity-60" />
            </div>
            <p className="text-sm font-medium text-content-secondary mb-1">Real ambient AI documentation</p>
            <p className="text-xs text-content-tertiary">Live mic → transcript → Claude generates SOAP + ICD/CPT codes</p>
            <button onClick={() => setUiState('select_patient')} className="mt-4 text-xs text-brand hover:underline flex items-center gap-1 mx-auto">
              Select patient & start <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Coder View ───────────────────────────────────────────────────────────────
function CoderView() {
  const { data: coderSOAPResult } = useSOAPNotes({ limit: 50, status: 'completed' })
  const coderVisits: DemoVisit[] = (coderSOAPResult?.data || []).map((s: any) => ({
    id: s.id, patientId: s.patient_id || '', patient: s.patient_name || 'Unknown',
    patientName: s.patient_name || 'Unknown', provider: s.provider_name || '',
    dos: s.created_at?.slice(0, 10) || '', date: s.created_at?.slice(0, 10) || '',
    visitType: 'office_visit' as const, encounterType: 'Office Visit',
    status: 'signed' as const,
    soap: { s: s.subjective || '', o: s.objective || '', a: s.assessment || '', p: s.plan || '' },
    suggestedCodes: [], duration: '0:00', transcript: '',
  }))
  const [selectedVisit, setSelectedVisit] = useState<DemoVisit | null>(coderVisits[0] ?? null)
  const router = useRouter()
  return (
    <div className="flex flex-col md:grid md:grid-cols-3 md:gap-5 md:h-[calc(100vh-280px)] gap-4">
      <div className="card overflow-auto">
        <div className="px-3 py-2 border-b border-separator text-xs font-semibold text-content-secondary tracking-wider">Signed Notes — Read Only</div>
        {coderVisits.length === 0 && (
          <div className="p-6 text-center text-content-secondary text-sm">No signed notes yet</div>
        )}
        {coderVisits.map(v => (
          <button key={v.id} onClick={() => setSelectedVisit(v as any)} className={`w-full text-left px-3 py-3 border-b border-separator last:border-0 ${selectedVisit?.id === v.id ? 'bg-brand/5' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{v.patientName}</span>
              <StatusBadge status={v.status === 'signed' ? 'completed' : 'in_progress'} small />
            </div>
            <div className="text-[11px] text-content-secondary">{v.provider} · {v.dos}</div>
          </button>
        ))}
      </div>
      <div className="col-span-2 card flex flex-col overflow-hidden min-h-[300px] md:min-h-0">
        {!selectedVisit ? (
          <div className="flex-1 flex items-center justify-center text-content-secondary text-sm">Select a note to view</div>
        ) : (<>
        {selectedVisit.status === 'signed' && (
          <div className="px-4 py-2.5 bg-brand/10 border-b border-brand/20 text-xs text-brand-dark dark:text-brand-dark flex items-center gap-2">
            <Check size={13} /> Signed by {selectedVisit.provider} on {selectedVisit.dos}
          </div>
        )}
        <div className="px-4 py-3 border-b border-separator">
          <h3 className="text-sm font-semibold">{selectedVisit.patientName}</h3>
          <p className="text-[11px] text-content-secondary">{selectedVisit.provider} · {selectedVisit.dos}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(['s', 'o', 'a', 'p'] as const).map(k => (
            <div key={k}>
              <div className="text-[11px] font-bold text-content-secondary tracking-wider mb-1">
                {k === 's' ? 'S — Subjective' : k === 'o' ? 'O — Objective' : k === 'a' ? 'A — Assessment' : 'P — Plan'}
              </div>
              <div className="text-sm bg-surface-elevated rounded-lg p-3 leading-relaxed">{selectedVisit.soap[k]}</div>
            </div>
          ))}
          <div className="border-t border-separator pt-3">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={14} className="text-brand" />
              <h4 className="text-[11px] font-semibold text-content-secondary tracking-wider">AI Codes</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedVisit.suggestedCodes.map((c, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-full border ${c.cpt ? 'bg-brand/10 text-brand border-brand/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`}>
                  {c.cpt ? `CPT ${c.cpt}` : `ICD ${c.icd}`} · {c.confidence}%
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-separator">
          <button onClick={() => router.push('/coding')} className="text-sm text-brand hover:underline flex items-center gap-1">
            <ChevronLeft size={14} /> Back to Coding Queue
          </button>
        </div>
        </>)}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AIScribePage() {
  const { currentUser } = useApp()
  const isProvider = currentUser.role === 'provider'
  const { t } = useT()
  return (
    <ModuleShell title={t('scribe', 'title')} subtitle={isProvider ? t('scribe', 'subtitleProvider') : t('scribe', 'subtitleCoder')}>
      <div className="mb-4 bg-brand/10 border border-brand/30 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-brand-dark dark:text-brand-dark">
        <Mic size={15} className="shrink-0" />
        <div>
          <span className="font-semibold">Real AI Scribe</span> — Browser mic → live transcript → Claude generates SOAP + ICD/CPT codes instantly.
          {isProvider && <span className="ml-2 text-xs opacity-70">Use Chrome for best mic support.</span>}
        </div>
      </div>
      {isProvider ? <ProviderView /> : <CoderView />}
    </ModuleShell>
  )
}
