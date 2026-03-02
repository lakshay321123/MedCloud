'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useApp } from '@/lib/context'
import { demoCodingQueue, getClientName } from '@/lib/demo-data'
import { BrainCircuit, CheckCircle2, Activity, Clock, Check, MessageCircle, Mic, FileUp, Play, XCircle, PauseCircle } from 'lucide-react'

export default function CodingPage() {
  const { selectedClient } = useApp()
  const queue = demoCodingQueue.filter(c => !selectedClient || c.clientId === selectedClient.id)
  const [selected, setSelected] = useState(queue[0]?.id || '')
  const [sourceTab, setSourceTab] = useState<'note' | 'superbill'>('note')
  const item = queue.find(q => q.id === selected)

  // Reset source tab when switching items
  function selectItem(id: string) {
    setSelected(id)
    setSourceTab('note')
  }

  return (
    <ModuleShell title="AI Coding" subtitle="Review and approve AI-suggested codes">
      <div className="grid grid-cols-4 gap-5 mb-5">
        <KPICard label="My Queue" value={queue.length} icon={<BrainCircuit size={20} />} />
        <KPICard label="Coded Today" value="47" sub="+12" trend="up" icon={<CheckCircle2 size={20} />} />
        <KPICard label="AI Acceptance" value="89%" icon={<Activity size={20} />} />
        <KPICard label="Avg Time/Chart" value="6.2m" icon={<Clock size={20} />} />
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-290px)]">

        {/* Col 1 — Queue (col-span-2) */}
        <div className="col-span-2 overflow-y-auto">
          <div className="card p-3">
            <h3 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-2">Queue ({queue.length})</h3>
            <div className="space-y-1">
              {queue.map(q => (
                <button key={q.id} onClick={() => selectItem(q.id)}
                  className={`w-full text-left px-2.5 py-2.5 rounded-btn transition-all ${selected === q.id ? 'bg-brand/10 border border-brand/20' : 'hover:bg-surface-elevated border border-transparent'}`}>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[12px] font-semibold text-content-primary leading-tight">{q.patientName}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-pill shrink-0 ${q.source === 'ai_scribe' ? 'bg-brand/10 text-brand' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                      {q.source === 'ai_scribe' ? <><Mic size={8} /> AI</> : <><FileUp size={8} /> Doc</>}
                    </span>
                  </div>
                  <div className="text-[10px] text-content-tertiary">{q.dos}</div>
                  <div className="text-[10px] text-content-tertiary truncate">{q.provider}</div>
                  <div className="mt-1"><StatusBadge status={q.priority} small /></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2 — Source Documents (col-span-5) */}
        <div className="col-span-5 card flex flex-col overflow-hidden">
          {item ? (
            <>
              {/* Tab bar */}
              <div className="flex border-b border-separator px-4 pt-3 gap-1 shrink-0">
                <button onClick={() => setSourceTab('note')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${sourceTab === 'note' ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>
                  Visit Note
                </button>
                {item.hasSuperbill && (
                  <button onClick={() => setSourceTab('superbill')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${sourceTab === 'superbill' ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>
                    Superbill
                  </button>
                )}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {sourceTab === 'note' && (
                  <div className="space-y-4">
                    {item.source === 'ai_scribe' && (
                      <button className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 text-brand text-[13px] font-medium px-3 py-2 rounded-btn transition-colors">
                        <Play size={14} /> Play visit recording
                      </button>
                    )}
                    {(['Subjective', 'Objective', 'Assessment', 'Plan'] as const).map(section => (
                      <div key={section}>
                        <div className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
                          {section}
                        </div>
                        <p className="text-[13px] text-content-secondary leading-relaxed pl-3 border-l border-separator">
                          {item.visitNote[section.toLowerCase() as keyof typeof item.visitNote]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {sourceTab === 'superbill' && (
                  <div className="space-y-3">
                    <div className="bg-surface-elevated rounded-lg p-4 text-center text-content-tertiary text-[13px]">
                      <div className="text-2xl mb-2">📄</div>
                      <div className="font-medium">{item.patientName} — Superbill</div>
                      <div className="text-[11px] mt-1">DOS: {item.dos} · Provider: {item.provider}</div>
                    </div>
                    {item.superbillCpt && (
                      <div>
                        <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-2">Ticked CPT Codes</div>
                        <div className="flex flex-wrap gap-2">
                          {item.superbillCpt.map(code => (
                            <span key={code} className="font-mono text-xs bg-brand/10 text-brand px-2 py-1 rounded-btn">{code}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-content-tertiary text-[14px]">Select a chart to view source document</div>
          )}
        </div>

        {/* Col 3 — Codes + Actions (col-span-5) */}
        {item ? (
          <div className="col-span-5 card flex flex-col overflow-y-auto p-5">
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-content-primary">{item.patientName}</h2>
                <p className="text-[12px] text-content-secondary">{getClientName(item.clientId)} · {item.provider} · DOS: {item.dos}</p>
              </div>
              <StatusBadge status={item.priority} />
            </div>

            {/* ICD-10 */}
            <div className="mb-4">
              <h3 className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2">Diagnosis Codes (ICD-10)</h3>
              <div className="space-y-1.5">
                {item.aiSuggestedIcd.map(c => (
                  <div key={c.code} className="flex items-center justify-between py-2 px-3 rounded-btn bg-surface-elevated">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-[13px] text-content-primary">{c.code}</span>
                      <span className="text-[12px] text-content-secondary">{c.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${c.confidence >= 90 ? 'text-emerald-600 dark:text-emerald-400' : c.confidence >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{c.confidence}%</span>
                      <button className="p-1 rounded-full hover:bg-brand/10 text-content-tertiary hover:text-brand transition-colors"><Check size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CPT */}
            <div className="mb-4">
              <h3 className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2">Procedure Codes (CPT)</h3>
              <div className="space-y-1.5">
                {item.aiSuggestedCpt.map(c => (
                  <div key={c.code} className="flex items-center justify-between py-2 px-3 rounded-btn bg-surface-elevated">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-[13px] text-content-primary">{c.code}</span>
                      <span className="text-[12px] text-content-secondary">{c.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${c.confidence >= 90 ? 'text-emerald-600 dark:text-emerald-400' : c.confidence >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{c.confidence}%</span>
                      <button className="p-1 rounded-full hover:bg-brand/10 text-content-tertiary hover:text-brand transition-colors"><Check size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Superbill comparison */}
            {item.hasSuperbill && item.superbillCpt && (
              <div className="mb-4 px-3 py-2.5 rounded-btn bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Superbill Comparison</div>
                <p className="text-[12px] text-content-secondary">
                  Superbill ticked: <span className="font-mono font-semibold text-content-primary">{item.superbillCpt.join(', ')}</span>
                  {' · '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {item.superbillCpt.every(c => item.aiSuggestedCpt.map(ai => ai.code).includes(c)) ? '✓ Matches AI suggestion' : '⚠ Partial match — review'}
                  </span>
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
              <button className="col-span-2 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-btn text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 size={15} /> Approve & Send to Billing
              </button>
              <button className="bg-surface-elevated hover:bg-surface-primary border border-separator text-content-secondary py-2.5 rounded-btn text-[13px] font-medium transition-colors flex items-center justify-center gap-2">
                <MessageCircle size={14} /> Query Doctor
              </button>
              <button className="bg-surface-elevated hover:bg-surface-primary border border-separator text-content-secondary py-2.5 rounded-btn text-[13px] font-medium transition-colors flex items-center justify-center gap-2">
                <PauseCircle size={14} /> Hold
              </button>
              <button className="col-span-2 border border-red-500/30 hover:bg-red-500/5 text-red-600 dark:text-red-400 py-2 rounded-btn text-[12px] font-medium transition-colors flex items-center justify-center gap-2">
                <XCircle size={13} /> Reject Chart
              </button>
            </div>
          </div>
        ) : (
          <div className="col-span-5 card p-12 flex items-center justify-center text-content-tertiary text-[15px]">Select a chart from the queue</div>
        )}
      </div>
    </ModuleShell>
  )
}
