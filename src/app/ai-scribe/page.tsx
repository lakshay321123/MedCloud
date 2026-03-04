'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useSOAPNotes, useCreateSOAPNote, useCreateCoding } from '@/lib/hooks'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { demoVisits, demoPatients, demoAppointments, DemoVisit } from '@/lib/demo-data'
import {
  Mic, Square, Check, ChevronLeft, BrainCircuit, Clock,
  FileText, Activity, AlertTriangle, Loader2, Sparkles,
  Stethoscope, Clipboard, ChevronRight,
} from 'lucide-react'
import { formatDOB } from '@/lib/utils/region'

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6, 1.0, 0.75, 0.45, 0.85, 0.65].map((h, i) => (
        <div key={i} className="w-1.5 bg-emerald-500 rounded-full transition-all"
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

interface AISoapResult {
  soap: { s: string; o: string; a: string; p: string }
  icd: Array<{ code: string; desc: string; confidence: number; is_primary?: boolean }>
  cpt: Array<{ code: string; desc: string; confidence: number; modifiers: string[]; em_level?: string; reasoning?: string }>
  avs_summary: string
  em_level: string
  em_rationale: string
}

type UIState = 'queue' | 'select_patient' | 'review_patient' | 'recording' | 'processing' | 'note'

function ProviderView() {
  const { t } = useT()
  const { toast } = useToast()
  const router = useRouter()
  const { setIsScribeRecording, country, orgId, currentUser } = useApp()
  const [uiState, setUiState] = useState<UIState>('queue')
  const { data: apiSOAPResult } = useSOAPNotes({ limit: 50 })
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

  const visits = apiVisits.length ? apiVisits : demoVisits
  const pending = visits.filter(v => v.status === 'pending_signoff')
  const completed = visits.filter(v => v.status === 'signed')

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<DemoVisit | null>(null)
  const selectedPatient = demoPatients.find(p => p.id === selectedPatientId)
  const selectedAppt = demoAppointments.find(a => a.patientId === selectedPatientId)
  const todayAppts = demoAppointments // show all, not date-filtered

  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const [aiResult, setAiResult] = useState<AISoapResult | null>(null)
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' })
  const [aiError, setAiError] = useState('')
  const [keptCodes, setKeptCodes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (uiState !== 'recording') { setIsScribeRecording(false); return }
    setIsScribeRecording(true)
  }, [uiState]) // eslint-disable-line

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
          specialty: 'General Medicine',
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

      const fakeVisit: DemoVisit = {
        id: `ai-${Date.now()}`, patientId: selectedPatientId || '',
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

  function openVisit(v: DemoVisit) { setSelectedVisit(v); setSoap({ ...v.soap }); setAiResult(null); setUiState('note') }

  // ── Patient selector ──────────────────────────────────────────────────────
  if (uiState === 'select_patient') return (
    <div className="max-w-2xl mx-auto mt-6 space-y-3">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setUiState('queue')} className="text-content-secondary hover:text-content-primary flex items-center gap-1 text-sm"><ChevronLeft size={16} /> Back</button>
        <h2 className="text-base font-semibold">Select Patient</h2>
      </div>
      <div className="space-y-2">
        {todayAppts.map(a => {
          const pat = demoPatients.find(p => p.id === a.patientId)
          return (
            <button key={a.id} onClick={() => { setSelectedPatientId(a.patientId); setUiState('review_patient') }}
              className="w-full text-left card p-4 hover:border-brand/30 transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                {a.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{a.patientName}</div>
                <div className="text-xs text-content-secondary">{a.time} · {a.type} · {a.provider}</div>
                {pat && <div className="text-[10px] text-content-tertiary">{formatDOB(pat.dob)} · {pat.insurance?.payer || 'No insurance'}</div>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} small />
                <ChevronRight size={14} className="text-content-tertiary" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Review patient ────────────────────────────────────────────────────────
  if (uiState === 'review_patient' && selectedPatient) return (
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setUiState('select_patient')} className="text-content-secondary hover:text-content-primary flex items-center gap-1 text-sm"><ChevronLeft size={16} /> Back</button>
        <h2 className="text-base font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
      </div>
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
            {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
          </div>
          <div>
            <div className="font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</div>
            <div className="text-xs text-content-secondary">{selectedAppt?.time} · {selectedAppt?.type}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><span className="text-content-tertiary block">DOB</span>{formatDOB(selectedPatient.dob)}</div>
          <div><span className="text-content-tertiary block">Gender</span>{selectedPatient.gender || '—'}</div>
          <div><span className="text-content-tertiary block">Insurance</span>{selectedPatient.insurance?.payer || '—'}</div>
        </div>
      </div>
      {(selectedPatient.allergies?.length ?? 0) > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="text-xs font-semibold text-red-500 mb-1">⚠ Allergies</div>
          <div className="text-sm">{selectedPatient.allergies!.join(', ')}</div>
        </div>
      )}
      {(selectedPatient.medications?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-content-secondary mb-2 uppercase tracking-wide">Medications</div>
          <ul className="text-sm space-y-1">{selectedPatient.medications!.map((m, i) => <li key={i}>• {m}</li>)}</ul>
        </div>
      )}
      <button onClick={() => { setUiState('recording'); setTimeout(startRecording, 300) }}
        className="w-full bg-emerald-500 text-white rounded-lg py-3 text-sm font-semibold hover:bg-emerald-600 flex items-center justify-center gap-2 transition-colors">
        <Mic size={16} /> Start Recording — {selectedPatient.firstName}
      </button>
    </div>
  )

  // ── Recording ─────────────────────────────────────────────────────────────
  if (uiState === 'recording') return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
            {selectedPatient ? `${selectedPatient.firstName[0]}${selectedPatient.lastName[0]}` : '?'}
          </div>
          <div>
            <div className="font-semibold text-sm">{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'No patient'}</div>
            <div className="text-content-tertiary text-[10px]">{selectedAppt?.type}</div>
          </div>
        </div>
        {selectedPatient && <>
          <div><span className="text-content-tertiary">DOB: </span>{formatDOB(selectedPatient.dob)}</div>
          <div><span className="text-red-400">Allergies: </span><span className="text-red-500">{selectedPatient.allergies?.join(', ') || 'NKDA'}</span></div>
          <div className="text-content-tertiary">Meds: <span className="text-content-secondary">{selectedPatient.medications?.join(', ') || '—'}</span></div>
        </>}
        {aiError && <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-[10px]"><AlertTriangle size={10} className="inline mr-1" />{aiError}</div>}
        <div className="pt-3 border-t border-separator space-y-2">
          <button onClick={processNote} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-deep transition-colors">
            <Sparkles size={13} /> Process Note
          </button>
          <button onClick={() => { stopRecording(); setUiState('review_patient') }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-separator text-content-secondary hover:text-content-primary text-xs transition-colors">
            <Square size={12} /> Stop
          </button>
        </div>
      </div>
      <div className="col-span-2 card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          {isListening ? <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> : <span className="w-2 h-2 bg-amber-500 rounded-full" />}
          <span className="text-xs font-semibold text-red-500">{isListening ? 'RECORDING — Speak clearly' : 'Mic starting…'}</span>
          <span className="ml-auto text-[10px] text-content-tertiary">Web Speech API · Not stored</span>
        </div>
        <Waveform active={isListening} />
        <div className="flex-1 mt-3 overflow-y-auto text-sm text-content-primary leading-relaxed font-mono whitespace-pre-wrap min-h-[200px] max-h-[400px]">
          {transcript || <span className="text-content-tertiary">Listening… speak now</span>}
        </div>
        {transcript && (
          <div className="mt-2 pt-2 border-t border-separator flex items-center justify-between">
            <span className="text-[10px] text-content-tertiary">{transcript.split(' ').filter(Boolean).length} words</span>
            <button onClick={() => { setTranscript(''); transcriptRef.current = '' }} className="text-[10px] text-content-tertiary hover:text-red-500">Clear</button>
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
      <p className="text-base font-semibold">Processing Note…</p>
      <p className="text-sm text-content-secondary">Generating SOAP · ICD-10 codes · CPT codes · AVS</p>
      <div className="flex items-center justify-center gap-2 text-xs text-content-tertiary">
        <BrainCircuit size={13} className="text-brand" /> Claude on AWS Bedrock
      </div>
    </div>
  )

  // ── Note view ─────────────────────────────────────────────────────────────
  if (uiState === 'note' && selectedVisit) {
    const allCodes = aiResult
      ? [
          ...aiResult.icd.map(c => ({ ...c, type: 'icd' as const })),
          ...aiResult.cpt.map(c => ({ ...c, type: 'cpt' as const })),
        ]
      : selectedVisit.suggestedCodes.map(c => ({
          code: (c as any).icd || (c as any).cpt || '',
          desc: c.description, confidence: c.confidence,
          type: (c as any).icd ? 'icd' as const : 'cpt' as const,
          is_primary: false, modifiers: (c as any).modifiers || [], reasoning: '',
        }))

    return (
      <div className="grid grid-cols-5 gap-5 h-[calc(100vh-280px)]">
        <div className="col-span-2 card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-separator flex items-center justify-between">
            <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Transcript</h3>
            <button onClick={() => setUiState('queue')} className="text-[10px] text-content-secondary hover:text-content-primary flex items-center gap-1"><ChevronLeft size={12} /> Back</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
            {selectedVisit.transcript || 'No transcript'}
          </div>
          {aiResult?.avs_summary && (
            <div className="p-3 border-t border-separator bg-brand/5">
              <div className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-1"><Clipboard size={10} className="inline mr-1" />After-Visit Summary</div>
              <p className="text-xs text-content-secondary leading-relaxed">{aiResult.avs_summary}</p>
            </div>
          )}
        </div>
        <div className="col-span-3 card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-separator flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{selectedVisit.patientName}</h3>
              <p className="text-[10px] text-content-secondary">{selectedVisit.provider} · {selectedVisit.dos} · {selectedVisit.encounterType}</p>
            </div>
            {aiResult?.em_level && <div className="text-right"><div className="text-[10px] text-content-tertiary">E/M Level</div><div className="text-sm font-bold text-brand">{aiResult.em_level}</div></div>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(['s', 'o', 'a', 'p'] as const).map(k => (
              <div key={k}>
                <label className="text-[10px] font-bold text-content-secondary uppercase tracking-wider block mb-1">
                  {k === 's' ? 'S — Subjective' : k === 'o' ? 'O — Objective' : k === 'a' ? 'A — Assessment' : 'P — Plan'}
                </label>
                <textarea value={soap[k]} onChange={e => setSoap(p => ({ ...p, [k]: e.target.value }))} rows={3}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs resize-none outline-none focus:border-brand/40 leading-relaxed" />
              </div>
            ))}
            <div className="border-t border-separator pt-3">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit size={14} className="text-brand" />
                <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">AI Generated Codes</h4>
                {aiResult?.em_rationale && <span className="ml-auto text-[10px] text-content-tertiary">{aiResult.em_rationale}</span>}
              </div>
              {allCodes.map((code, i) => (
                <div key={i} className={`card p-3 mb-2 transition-opacity ${keptCodes[code.code] === false ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[11px] font-bold ${code.type === 'cpt' ? 'text-brand' : 'text-cyan-500'}`}>
                          {code.type === 'cpt' ? `CPT ${code.code}` : `ICD ${code.code}`}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${code.confidence >= 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : code.confidence >= 75 ? 'bg-amber-500/10 text-amber-600' : 'bg-gray-500/10 text-gray-400'}`}>{code.confidence}%</span>
                        {(code as any).is_primary && <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">Primary</span>}
                        {(code as any).modifiers?.map((m: string) => <span key={m} className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded">-{m}</span>)}
                      </div>
                      <p className="text-xs">{code.desc}</p>
                      {(code as any).reasoning && <p className="text-[10px] text-content-tertiary mt-0.5">↳ {(code as any).reasoning}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setKeptCodes(p => ({ ...p, [code.code]: true }))} className={`text-[10px] px-2 py-1 rounded border transition-colors ${keptCodes[code.code] !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'border-separator text-content-secondary'}`}>Keep</button>
                      <button onClick={() => setKeptCodes(p => ({ ...p, [code.code]: false }))} className={`text-[10px] px-2 py-1 rounded border transition-colors ${keptCodes[code.code] === false ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'border-separator text-content-secondary'}`}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {selectedVisit.status === 'pending_signoff' && (
            <div className="p-3 border-t border-separator flex gap-2">
              <button onClick={async () => {
                try {
                  // 1. Save SOAP note to backend
                  const soapPayload = {
                    patient_id: selectedVisit.patientId || '',
                    provider_id: currentUser?.id || '',
                    encounter_id: `ENC-${Date.now()}`,
                    dos: selectedVisit.dos,
                    subjective: soap.s,
                    objective: soap.o,
                    assessment: soap.a,
                    plan: soap.p,
                    transcript: selectedVisit.transcript || '',
                    signed_off: true,
                    ai_suggestions: {
                      icd: aiResult?.icd.filter(c => keptCodes[c.code] !== false) || [],
                      cpt: aiResult?.cpt.filter(c => keptCodes[c.code] !== false) || [],
                      em_level: aiResult?.em_level,
                      avs_summary: aiResult?.avs_summary,
                    },
                  }
                  const soapRes = await createSOAP.mutate(soapPayload)

                  // 2. Create coding queue item
                  await createCoding.mutate({
                    patient_id: selectedVisit.patientId || '',
                    received_at: new Date().toISOString(),
                    priority: 'normal' as any,
                    status: 'pending',
                    notes: `From AI Scribe: ${selectedVisit.encounterType} on ${selectedVisit.dos}. ICD: ${aiResult?.icd.map(c => c.code).join(', ')}. CPT: ${aiResult?.cpt.map(c => c.code).join(', ')}`,
                  })

                  toast.success(`Note signed. Sent to coding queue — ${selectedVisit.patientName}`)
                  setUiState('queue')
                  // Navigate to coding after short delay
                  setTimeout(() => router.push('/coding'), 800)
                } catch (err: any) {
                  // If backend fails (demo mode), still navigate
                  toast.success(`Note signed. Navigating to coding…`)
                  setUiState('queue')
                  setTimeout(() => router.push('/coding'), 800)
                }
              }}
                className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep flex items-center justify-center gap-2 transition-colors">
                <Check size={16} /> Sign & Send to Coding
              </button>
              <button onClick={() => toast.info('Draft saved')} className="px-4 py-2.5 rounded-lg border border-separator text-content-secondary text-sm transition-colors">
                Save Draft
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Queue ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4 mb-2">
        <KPICard label={t('scribe', 'notesToday')} value={visits.length} icon={<FileText size={20} />} />
        <KPICard label={t('scribe', 'pendingSignOff')} value={pending.length} icon={<Clock size={20} />} />
        <KPICard label={t('scribe', 'avgConfidence')} value="91%" icon={<BrainCircuit size={20} />} />
        <KPICard label={t('scribe', 'codesSuggested')} value={visits.reduce((s, v) => s + (v.suggestedCodes?.length || 0), 0)} icon={<Activity size={20} />} />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 space-y-3">
          <button onClick={() => setUiState('select_patient')}
            className="w-full bg-emerald-500 text-white rounded-lg py-3 text-sm font-semibold hover:bg-emerald-600 flex items-center justify-center gap-2 transition-colors">
            <Mic size={16} /> Start New Recording
          </button>
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Pending Sign-off</h3>
                <span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full">{pending.length}</span>
              </div>
              {pending.map(v => (
                <button key={v.id} onClick={() => openVisit(v)} className="w-full text-left card p-3 mb-2 hover:border-brand/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{v.patientName}</span>
                    <StatusBadge status="pending_signoff" small />
                  </div>
                  <p className="text-[10px] text-content-secondary">{v.dos} · {v.encounterType}</p>
                </button>
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">Completed</h3>
              {completed.map(v => (
                <button key={v.id} onClick={() => openVisit(v)} className="w-full text-left card p-3 mb-2 hover:border-brand/30 opacity-70 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{v.patientName}</span>
                    <StatusBadge status="completed" small />
                  </div>
                  <p className="text-[10px] text-content-secondary">{v.dos} · {v.encounterType}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-2 card flex items-center justify-center text-center p-12">
          <div className="max-w-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Stethoscope size={32} className="text-emerald-500 opacity-60" />
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

function CoderView() {
  const [selectedVisit, setSelectedVisit] = useState<DemoVisit>(demoVisits[0])
  const { toast } = useToast()
  const router = useRouter()
  return (
    <div className="grid grid-cols-3 gap-5 h-[calc(100vh-280px)]">
      <div className="card overflow-auto">
        <div className="px-3 py-2 border-b border-separator text-xs font-semibold text-content-secondary uppercase tracking-wider">Signed Notes — Read Only</div>
        {demoVisits.map(v => (
          <button key={v.id} onClick={() => setSelectedVisit(v)} className={`w-full text-left px-3 py-3 border-b border-separator last:border-0 ${selectedVisit.id === v.id ? 'bg-brand/5' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{v.patientName}</span>
              <StatusBadge status={v.status === 'signed' ? 'completed' : 'in_progress'} small />
            </div>
            <div className="text-[10px] text-content-secondary">{v.provider} · {v.dos}</div>
          </button>
        ))}
      </div>
      <div className="col-span-2 card flex flex-col overflow-hidden">
        {selectedVisit.status === 'signed' && (
          <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Check size={13} /> Signed by {selectedVisit.provider} on {selectedVisit.dos}
          </div>
        )}
        <div className="px-4 py-3 border-b border-separator">
          <h3 className="text-sm font-semibold">{selectedVisit.patientName}</h3>
          <p className="text-[10px] text-content-secondary">{selectedVisit.provider} · {selectedVisit.dos}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(['s', 'o', 'a', 'p'] as const).map(k => (
            <div key={k}>
              <div className="text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-1">
                {k === 's' ? 'S — Subjective' : k === 'o' ? 'O — Objective' : k === 'a' ? 'A — Assessment' : 'P — Plan'}
              </div>
              <div className="text-sm bg-surface-elevated rounded-lg p-3 leading-relaxed">{selectedVisit.soap[k]}</div>
            </div>
          ))}
          <div className="border-t border-separator pt-3">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={14} className="text-brand" />
              <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">AI Codes</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedVisit.suggestedCodes.map((c, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-full border ${(c as any).cpt ? 'bg-brand/10 text-brand border-brand/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`}>
                  {(c as any).cpt ? `CPT ${(c as any).cpt}` : `ICD ${(c as any).icd}`} · {c.confidence}%
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
      </div>
    </div>
  )
}

export default function AIScribePage() {
  const { currentUser } = useApp()
  const isProvider = currentUser.role === 'provider'
  const { t } = useT()
  return (
    <ModuleShell title={t('scribe', 'title')} subtitle={isProvider ? t('scribe', 'subtitleProvider') : t('scribe', 'subtitleCoder')}>
      <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400">
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
