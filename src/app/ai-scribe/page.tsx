'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { demoVisits, DemoVisit } from '@/lib/demo-data'
import { Mic, Square, Pause, Check, ChevronLeft, BrainCircuit, Clock, FileText, Activity } from 'lucide-react'

function Waveform() {
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {[0.4,0.7,1.0,0.8,0.5,0.9,0.6,1.0,0.75,0.45,0.85,0.65].map((h, i) => (
        <div key={i} className="w-1.5 bg-brand rounded-full"
          style={{ height:`${h*100}%`, animation:`wave ${0.8+i*0.1}s ease-in-out infinite alternate`, animationDelay:`${i*0.08}s` }} />
      ))}
      <style>{`@keyframes wave{0%{transform:scaleY(0.3)}100%{transform:scaleY(1)}}`}</style>
    </div>
  )
}

function RecordingTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => { const id = setInterval(()=>setSeconds(s=>s+1),1000); return ()=>clearInterval(id) }, [])
  const m = Math.floor(seconds/60), s = seconds%60
  return <span className="font-mono text-3xl font-bold text-content-primary tracking-widest">{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
}

type UIState = 'queue' | 'recording' | 'processing' | 'note'

function ProviderView() {
  const { toast } = useToast()
  const [uiState, setUiState] = useState<UIState>('queue')
  const [selectedVisit, setSelectedVisit] = useState<DemoVisit | null>(null)
  const [selectedPatient, setSelectedPatient] = useState('P-001')
  const [soap, setSoap] = useState({ s:'', o:'', a:'', p:'' })
  const [codes, setCodes] = useState(demoVisits[0].suggestedCodes)

  const pending = demoVisits.filter(v => v.status==='pending_signoff')
  const completed = demoVisits.filter(v => v.status==='signed')

  function openVisit(v: DemoVisit) {
    setSelectedVisit(v); setSoap({...v.soap}); setCodes(v.suggestedCodes); setUiState('note')
  }

  function handleStop() {
    setUiState('processing')
    setTimeout(()=>{
      const v = demoVisits.find(x=>x.patientId===selectedPatient)??demoVisits[0]
      setSelectedVisit(v); setSoap({...v.soap}); setCodes(v.suggestedCodes); setUiState('note')
    }, 3000)
  }

  if (uiState === 'recording') return (
    <div className="max-w-lg mx-auto mt-12 space-y-6 text-center">
      <div>
        <p className="text-sm text-content-secondary mb-2">Recording for</p>
        <select value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-4 py-2 text-sm text-content-primary">
          {demoVisits.map(v=><option key={v.patientId} value={v.patientId}>{v.patientName}</option>)}
        </select>
      </div>
      <div className="card p-8 space-y-5">
        <Waveform />
        <RecordingTimer />
        <p className="text-xs text-content-secondary">Recording in progress — speak naturally</p>
        <div className="flex justify-center gap-4">
          <button onClick={()=>setUiState('queue')} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-separator text-content-secondary hover:text-content-primary text-sm transition-colors">
            <Pause size={16}/> Pause
          </button>
          <button onClick={handleStop} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition-colors">
            <Square size={16}/> Stop
          </button>
        </div>
      </div>
    </div>
  )

  if (uiState === 'processing') return (
    <div className="max-w-lg mx-auto mt-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto animate-pulse">
        <BrainCircuit size={32} className="text-brand"/>
      </div>
      <p className="text-base font-semibold text-content-primary">AI Processing...</p>
      <p className="text-sm text-content-secondary">Generating SOAP note and code suggestions</p>
    </div>
  )

  if (uiState === 'note' && selectedVisit) return (
    <div className="grid grid-cols-5 gap-5 h-[calc(100vh-340px)]">
      <div className="col-span-2 card flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-separator flex items-center justify-between">
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Transcript</h3>
          <button onClick={()=>setUiState('queue')} className="text-[10px] text-content-secondary hover:text-content-primary flex items-center gap-1">
            <ChevronLeft size={12}/> Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-xs text-content-primary font-mono leading-relaxed whitespace-pre-wrap">
          {selectedVisit.transcript}
        </div>
      </div>
      <div className="col-span-3 card flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-separator">
          <h3 className="text-sm font-semibold">{selectedVisit.patientName}</h3>
          <p className="text-[10px] text-content-secondary">{selectedVisit.provider} · {selectedVisit.dos} · {selectedVisit.encounterType}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(['s','o','a','p'] as const).map(k=>(
            <div key={k}>
              <label className="text-[10px] font-bold text-content-secondary uppercase tracking-wider block mb-1">
                {k==='s'?'S — Subjective':k==='o'?'O — Objective':k==='a'?'A — Assessment':'P — Plan'}
              </label>
              <textarea value={soap[k]} onChange={e=>setSoap(p=>({...p,[k]:e.target.value}))} rows={3}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-primary resize-none outline-none focus:border-brand/40 leading-relaxed"/>
            </div>
          ))}
          <div className="border-t border-separator pt-3">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={14} className="text-brand"/>
              <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">AI Code Suggestions</h4>
            </div>
            {codes.map((code,i)=>(
              <div key={i} className={`card p-3 mb-2 ${code.kept===false?'opacity-50':''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[11px] font-bold ${code.cpt?'text-brand':'text-cyan-500'}`}>
                        {code.cpt?`CPT ${code.cpt}`:`ICD ${code.icd}`}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        code.confidence>=90?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':
                        code.confidence>=80?'bg-amber-500/10 text-amber-600':'bg-gray-500/10 text-gray-400'
                      }`}>{code.confidence}% conf</span>
                      {code.modifiers?.map(m=><span key={m} className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded">-{m}</span>)}
                    </div>
                    <p className="text-xs text-content-primary">{code.description}</p>
                    {code.reasoning&&<p className="text-[10px] text-content-tertiary mt-0.5">↳ {code.reasoning}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={()=>setCodes(p=>p.map((c,j)=>j===i?{...c,kept:true}:c))}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${code.kept!==false?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20':'border-separator text-content-secondary'}`}>Keep</button>
                    <button onClick={()=>setCodes(p=>p.map((c,j)=>j===i?{...c,kept:false}:c))}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${code.kept===false?'bg-red-500/10 text-red-500 border-red-500/20':'border-separator text-content-secondary'}`}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {selectedVisit.status==='pending_signoff'&&(
          <div className="p-3 border-t border-separator flex gap-2">
            <button onClick={()=>{toast.success('Note signed. Sent to coding queue as COD-0847');setUiState('queue')}}
              className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep flex items-center justify-center gap-2 transition-colors">
              <Check size={16}/> Sign & Send to Billing
            </button>
            <button onClick={()=>toast.info('Draft saved')}
              className="px-4 py-2.5 rounded-lg border border-separator text-content-secondary hover:text-content-primary text-sm transition-colors">
              Save Draft
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4 mb-2">
        <KPICard label="Notes Today" value={8} icon={<FileText size={20}/>}/>
        <KPICard label="Pending Sign-off" value={pending.length} icon={<Clock size={20}/>}/>
        <KPICard label="Avg AI Confidence" value="91%" icon={<BrainCircuit size={20}/>}/>
        <KPICard label="Codes Suggested" value={24} icon={<Activity size={20}/>}/>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 space-y-3">
          <button onClick={()=>setUiState('recording')}
            className="w-full bg-emerald-500 text-white rounded-lg py-3 text-sm font-semibold hover:bg-emerald-600 flex items-center justify-center gap-2 transition-colors">
            <Mic size={16}/> Start New Recording
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Pending Sign-off</h3>
              {pending.length>0&&<span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full">{pending.length}</span>}
            </div>
            {pending.map(v=>(
              <button key={v.id} onClick={()=>openVisit(v)}
                className="w-full text-left card p-3 mb-2 hover:border-brand/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{v.patientName}</span>
                  <StatusBadge status="pending_signoff" small/>
                </div>
                <p className="text-[10px] text-content-secondary">{v.dos} · {v.encounterType}</p>
                <p className="text-[10px] text-content-tertiary">{v.provider}</p>
              </button>
            ))}
          </div>
          {completed.length>0&&(
            <div>
              <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">Completed Today</h3>
              {completed.map(v=>(
                <button key={v.id} onClick={()=>openVisit(v)} className="w-full text-left card p-3 mb-2 hover:border-brand/30 transition-all opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{v.patientName}</span>
                    <StatusBadge status="completed" small/>
                  </div>
                  <p className="text-[10px] text-content-secondary">{v.dos} · {v.encounterType}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-2 card flex items-center justify-center text-center p-12">
          <div className="max-w-xs">
            <Mic size={48} className="text-content-tertiary mx-auto mb-4 opacity-30"/>
            <p className="text-sm font-medium text-content-secondary">Select a visit to review or start new recording</p>
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
        <div className="px-3 py-2 border-b border-separator text-xs font-semibold text-content-secondary uppercase tracking-wider">
          Signed Notes — Read Only
        </div>
        {demoVisits.map(v=>(
          <button key={v.id} onClick={()=>setSelectedVisit(v)}
            className={`w-full text-left px-3 py-3 border-b border-separator last:border-0 table-row ${selectedVisit.id===v.id?'bg-brand/5':''}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{v.patientName}</span>
              <StatusBadge status={v.status==='signed'?'completed':v.status==='pending_signoff'?'in_progress':'draft'} small/>
            </div>
            <div className="text-[10px] text-content-secondary">{v.provider} · {v.dos}</div>
          </button>
        ))}
      </div>
      <div className="col-span-2 card flex flex-col overflow-hidden">
        {selectedVisit.status==='signed'&&(
          <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Check size={13}/> Signed by {selectedVisit.provider} on {selectedVisit.dos} at 9:47 AM
          </div>
        )}
        <div className="px-4 py-3 border-b border-separator">
          <h3 className="text-sm font-semibold">{selectedVisit.patientName}</h3>
          <p className="text-[10px] text-content-secondary">{selectedVisit.provider} · {selectedVisit.dos} · {selectedVisit.encounterType}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(['s','o','a','p'] as const).map(k=>(
            <div key={k}>
              <div className="text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-1">
                {k==='s'?'S — Subjective':k==='o'?'O — Objective':k==='a'?'A — Assessment':'P — Plan'}
              </div>
              <div className="text-sm text-content-primary bg-surface-elevated rounded-lg p-3 leading-relaxed">{selectedVisit.soap[k]}</div>
            </div>
          ))}
          <div className="border-t border-separator pt-3">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={14} className="text-brand"/>
              <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">AI Suggested Codes</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedVisit.suggestedCodes.map((c,i)=>(
                <span key={i} className={`text-xs px-2.5 py-1 rounded-full border ${c.cpt?'bg-brand/10 text-brand border-brand/20':'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'}`}>
                  {c.cpt?`CPT ${c.cpt}`:`ICD ${c.icd}`} · {c.confidence}%
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-separator">
          <button onClick={()=>router.push('/coding')} className="text-sm text-brand hover:underline flex items-center gap-1">
            <ChevronLeft size={14}/> Back to Coding Queue
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AIScribePage() {
  const { currentUser } = useApp()
  const isProvider = currentUser.role === 'provider'
  return (
    <ModuleShell title="AI Scribe" subtitle={isProvider?'Dictate and review clinical notes':'Review AI-generated clinical notes'}>
      {isProvider ? <ProviderView/> : <CoderView/>}
    </ModuleShell>
  )
}
