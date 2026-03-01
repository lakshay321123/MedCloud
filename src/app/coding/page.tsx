'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useApp } from '@/lib/context'
import { demoCodingQueue, getClientName } from '@/lib/demo-data'
import { BrainCircuit, CheckCircle2, Activity, Clock, Check, MessageCircle, Mic, FileUp } from 'lucide-react'

export default function CodingPage() {
  const { selectedClient } = useApp()
  const queue = demoCodingQueue.filter(c => !selectedClient || c.clientId === selectedClient.id)
  const [selected, setSelected] = useState(queue[0]?.id || '')
  const item = queue.find(q => q.id === selected)

  return (
    <ModuleShell title="AI Coding" subtitle="Review and approve AI-suggested codes">
      <div className="grid grid-cols-4 gap-5 mb-8">
        <KPICard label="My Queue" value={queue.length} icon={<BrainCircuit size={20}/>} />
        <KPICard label="Coded Today" value="47" sub="+12" trend="up" icon={<CheckCircle2 size={20}/>} />
        <KPICard label="AI Acceptance" value="89%" icon={<Activity size={20}/>} />
        <KPICard label="Avg Time/Chart" value="6.2m" icon={<Clock size={20}/>} />
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left — Queue */}
        <div className="col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="text-[13px] font-semibold text-content-secondary mb-3">Coding Queue ({queue.length})</h3>
            <div className="space-y-1">{queue.map(q => (
              <button key={q.id} onClick={() => setSelected(q.id)}
                className={`w-full text-left px-3 py-3 rounded-btn transition-all ${selected === q.id ? 'bg-brand/10 border border-brand/20' : 'hover:bg-surface-elevated border border-transparent'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[14px] font-semibold text-content-primary">{q.patientName}</div>
                    <div className="text-[12px] text-content-secondary">{getClientName(q.clientId)} · {q.provider} · {q.dos}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-pill ${q.source === 'ai_scribe' ? 'bg-brand/10 text-brand' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                    {q.source === 'ai_scribe' ? <><Mic size={10}/> Scribe</> : <><FileUp size={10}/> Upload</>}
                  </span>
                </div>
              </button>
            ))}</div>
          </div>

          {item && (
            <div className="card p-4">
              <h3 className="text-[13px] font-semibold text-content-secondary mb-3">Source Document</h3>
              {item.source === 'ai_scribe' ? (
                <div className="space-y-3">
                  <button className="flex items-center gap-2 text-brand text-[13px] font-medium"><Mic size={14}/> Play visit recording</button>
                  {['Subjective','Objective','Assessment','Plan'].map(s => (
                    <div key={s}><div className="text-[11px] font-semibold text-content-tertiary uppercase mb-1">{s}</div>
                    <p className="text-[13px] text-content-secondary leading-relaxed">{s === 'Subjective' ? 'Patient reports increasing fatigue and mild dyspnea on exertion.' : s === 'Objective' ? 'BP 138/86, HR 78, SpO2 96%.' : s === 'Assessment' ? 'Hypertension, Type 2 diabetes, well controlled.' : 'Continue current medications. Follow-up 3 months.'}</p></div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-elevated rounded-btn p-4 text-center text-content-tertiary text-[13px]">📄 PDF Viewer — {item.patientName} superbill<br/><span className="text-[11px]">Superbill ticked: 99214, 93000</span></div>
              )}
            </div>
          )}
        </div>

        {/* Right — Coding Workspace */}
        {item ? (
          <div className="col-span-3 card p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-[18px] font-bold text-content-primary">{item.patientName}</h2>
                <p className="text-[13px] text-content-secondary">{getClientName(item.clientId)} · {item.provider} · DOS: {item.dos}</p>
              </div>
              <StatusBadge status={item.priority} />
            </div>

            <div className="mb-6">
              <h3 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-3">Diagnosis Codes (ICD-10)</h3>
              <div className="space-y-2">{item.aiSuggestedIcd.map(c => (
                <div key={c.code} className="flex items-center justify-between py-2.5 px-3 rounded-btn bg-surface-elevated">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[14px] text-content-primary">{c.code}</span>
                    <span className="text-[13px] text-content-secondary">{c.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-semibold ${c.confidence >= 90 ? 'text-emerald-600 dark:text-emerald-400' : c.confidence >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{c.confidence}%</span>
                    <button className="p-1 rounded-full hover:bg-brand/10 text-content-tertiary hover:text-brand transition-colors"><Check size={16}/></button>
                  </div>
                </div>
              ))}</div>
            </div>

            <div className="mb-6">
              <h3 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-3">Procedure Codes (CPT)</h3>
              <div className="space-y-2">{item.aiSuggestedCpt.map(c => (
                <div key={c.code} className="flex items-center justify-between py-2.5 px-3 rounded-btn bg-surface-elevated">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[14px] text-content-primary">{c.code}</span>
                    <span className="text-[13px] text-content-secondary">{c.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-semibold ${c.confidence >= 90 ? 'text-emerald-600 dark:text-emerald-400' : c.confidence >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{c.confidence}%</span>
                    <button className="p-1 rounded-full hover:bg-brand/10 text-content-tertiary hover:text-brand transition-colors"><Check size={16}/></button>
                  </div>
                </div>
              ))}</div>
            </div>

            {item.superbillCpt && (
              <p className="text-[12px] text-content-secondary mb-6 px-1">Superbill codes: {item.superbillCpt.join(', ')} — <span className="text-emerald-600 dark:text-emerald-400">✓ Matches AI</span></p>
            )}

            <div className="flex gap-3">
              <button className="flex-1 bg-brand hover:bg-brand-dark text-white py-3 rounded-btn text-[14px] font-semibold transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 size={16}/> Approve & Send to Billing
              </button>
              <button className="px-5 py-3 rounded-btn border border-separator text-content-secondary hover:bg-surface-elevated text-[14px] font-medium transition-colors flex items-center gap-2">
                <MessageCircle size={16}/> Query Doctor
              </button>
            </div>
          </div>
        ) : (
          <div className="col-span-3 card p-12 flex items-center justify-center text-content-tertiary text-[15px]">Select a chart from the queue</div>
        )}
      </div>
    </ModuleShell>
  )
}
