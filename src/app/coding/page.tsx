'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { demoCodingQueue, getClientName } from '@/lib/demo-data'
import { BrainCircuit, CheckCircle2, Activity, Clock, Check, MessageCircle, Mic, FileUp, ChevronDown, ChevronUp, Play, FileText, AlertTriangle } from 'lucide-react'

const priorityColor: Record<'urgent' | 'high' | 'medium' | 'low', string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-brand',
  low: 'bg-gray-400',
}

export default function CodingPage() {
  const { selectedClient, currentUser } = useApp()
  const [reassignTarget, setReassignTarget] = useState<string | null>(null)
  const { toast } = useToast()

  const coders = [
    { id: 'demo-002', name: 'Sarah Kim' },
    { id: 'demo-003', name: 'Amy Chen' },
    { id: 'demo-004', name: 'James Wilson' },
  ]

  const queue = (() => {
    const base = demoCodingQueue
    if (currentUser.role === 'coder') return base.filter((_q, i) => i % 2 === 0)
    if (currentUser.role === 'supervisor') return base
    return base.filter(item => !selectedClient || item.clientId === selectedClient.id)
  })()
  const [selected, setSelected] = useState(queue[0]?.id || '')
  const [tab, setTab] = useState<'note' | 'superbill'>('note')
  const [selectedCodes, setSelectedCodes] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const item = queue.find(q => q.id === selected)

  const aiCptCodes = item?.aiSuggestedCpt.map(c => c.code) ?? []
  const superbillOnly = item?.superbillCpt?.filter(c => !aiCptCodes.includes(c)) ?? []
  const aiOnly = aiCptCodes.filter(c => !(item?.superbillCpt ?? []).includes(c))
  const allMatch = aiOnly.length === 0 && superbillOnly.length === 0

  const toggleCode = (key: string) => setSelectedCodes(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <ModuleShell title="AI Coding" subtitle="Review and approve AI-suggested codes">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="My Queue" value={queue.length} icon={<BrainCircuit size={20} />} />
        <KPICard label="Coded Today" value="47" icon={<CheckCircle2 size={20} />} />
        <KPICard label="AI Acceptance" value="89%" icon={<Activity size={20} />} />
        <KPICard label="Avg Time/Chart" value="6.2m" icon={<Clock size={20} />} />
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
        <div className="col-span-2">
          <div className="card p-3 h-full flex flex-col">
            <h3 className="text-[11px] font-semibold uppercase text-content-tertiary tracking-wider mb-2">Coding Queue ({queue.length})</h3>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1">
              {queue.map(q => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelected(q.id)
                    setTab('note')
                    setSelectedCodes({})
                    setExpanded({})
                  }}
                  className={`w-full text-left p-2 rounded-btn border transition-colors ${selected === q.id ? 'bg-brand/10 border-brand/20' : 'border-transparent hover:bg-surface-elevated'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-semibold text-content-primary leading-tight">{q.patientName}</p>
                    <span className={`w-2 h-2 rounded-full mt-1 ${priorityColor[q.priority]}`} />
                  </div>
                  <p className="text-[12px] text-content-secondary truncate">{getClientName(q.clientId)} · {q.provider} · {q.dos}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] ${q.source === 'ai_scribe' ? 'bg-brand/10 text-brand' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                      {q.source === 'ai_scribe' ? <Mic size={12} /> : <FileUp size={12} />}
                      {q.source === 'ai_scribe' ? 'Scribe' : 'Upload'}
                    </span>
                    {currentUser.role === 'supervisor' && (
                      <button onClick={e=>{e.stopPropagation();setReassignTarget(reassignTarget===q.id?null:q.id)}}
                        className="text-[9px] text-content-tertiary hover:text-brand transition-colors">Reassign</button>
                    )}
                  </div>
                  {currentUser.role === 'supervisor' && reassignTarget === q.id && (
                    <div className="mt-1 space-y-1" onClick={e=>e.stopPropagation()}>
                      {coders.map(c=>(
                        <button key={c.id} onClick={()=>{toast.success(`Reassigned to ${c.name}`);setReassignTarget(null)}}
                          className="block w-full text-left text-[10px] px-2 py-1 rounded bg-surface-elevated hover:bg-brand/10 hover:text-brand text-content-secondary transition-colors">
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-5">
          <div className="card h-full flex flex-col overflow-hidden">
            {item ? (
              <>
                <div className="p-4 border-b border-separator">
                  <h3 className="text-[15px] font-semibold text-content-primary">{item.patientName}</h3>
                  <p className="text-[12px] text-content-secondary">{item.provider} · {item.providerSpecialty} · DOS: {item.dos}</p>
                </div>
                <div className="px-4 border-b border-separator flex gap-2">
                  <button onClick={() => setTab('note')} className={`px-3 py-2 text-[12px] font-medium ${tab === 'note' ? 'text-brand border-b-2 border-brand' : 'text-content-secondary'}`}>Visit Note</button>
                  {item.hasSuperbill && <button onClick={() => setTab('superbill')} className={`px-3 py-2 text-[12px] font-medium ${tab === 'superbill' ? 'text-brand border-b-2 border-brand' : 'text-content-secondary'}`}>Superbill</button>}
                </div>
                <div className="p-4 overflow-y-auto">
                  {tab === 'note' && (
                    <div className="space-y-3">
                      {item.source === 'ai_scribe' && <button onClick={() => toast.info('Audio playback — recording from AI Scribe session')} className="inline-flex items-center gap-2 text-[12px] rounded-btn px-3 py-1.5 bg-brand/10 text-brand"><Play size={13} /> <Mic size={13} /> Play Recording</button>}
                      {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
                        <div key={section} className="pb-2 border-b border-separator last:border-0">
                          <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-1">{section}</p>
                          <p className="text-[13px] text-content-secondary whitespace-pre-line">{item.visitNote[section]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {tab === 'superbill' && item.hasSuperbill && (
                    <div className="space-y-3">
                      <div className="bg-surface-elevated border border-separator rounded-card p-6 text-center text-content-secondary text-[13px]">📄 PDF Viewer — {item.patientName} superbill</div>
                      <p className="text-[13px] text-content-secondary">Superbill codes ticked: <span className="font-mono text-content-primary">{item.superbillCpt?.join(', ')}</span></p>
                    </div>
                  )}
                </div>
              </>
            ) : <div className="h-full flex items-center justify-center text-[14px] text-content-tertiary">Select a chart from the queue</div>}
          </div>
        </div>

        <div className="col-span-5">
          <div className="card h-full p-4 overflow-y-auto">
            {item ? (
              <>
                <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Diagnosis Codes (ICD-10)</h4>
                <div className="space-y-2 mb-4">
                  {item.aiSuggestedIcd.map(code => {
                    const key = `icd-${code.code}`
                    return <div key={key} className="bg-surface-elevated rounded-btn p-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!selectedCodes[key]} onChange={() => toggleCode(key)} />
                        <span className="font-mono text-[14px] text-content-primary">{code.code}</span>
                        <span className="text-[13px] text-content-secondary flex-1">{code.desc}</span>
                        <span className={`text-[12px] font-semibold ${code.confidence >= 90 ? 'text-emerald-600 dark:text-emerald-400' : code.confidence >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{code.confidence}%</span>
                        {code.reasoning && <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="text-content-tertiary">{expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
                      </div>
                      {expanded[key] && code.reasoning && <p className="mt-1 text-[12px] italic text-content-secondary">{code.reasoning}</p>}
                    </div>
                  })}
                </div>

                <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-2">Procedure Codes (CPT)</h4>
                <div className="space-y-2 mb-4">
                  {item.aiSuggestedCpt.map(code => {
                    const key = `cpt-${code.code}`
                    return <div key={key} className="bg-surface-elevated rounded-btn p-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!selectedCodes[key]} onChange={() => toggleCode(key)} />
                        <span className="font-mono text-[14px] text-content-primary">{code.code}</span>
                        {code.modifiers?.map(mod => <span key={mod} className="text-[11px] px-1.5 py-0.5 rounded-pill bg-brand/10 text-brand">Mod {mod}</span>)}
                        <span className="text-[13px] text-content-secondary flex-1">{code.desc}</span>
                        <span className={`text-[12px] font-semibold ${code.confidence >= 90 ? 'text-emerald-600 dark:text-emerald-400' : code.confidence >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{code.confidence}%</span>
                        {code.reasoning && <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} className="text-content-tertiary">{expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
                      </div>
                      {expanded[key] && code.reasoning && <p className="mt-1 text-[12px] italic text-content-secondary">{code.reasoning}</p>}
                    </div>
                  })}
                </div>

                {item.hasSuperbill && (
                  <div className="bg-surface-elevated rounded-card p-3 mb-4 border border-separator">
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-content-tertiary mb-1">Superbill Comparison</h4>
                    <p className="text-[12px] text-content-secondary">Superbill codes: <span className="font-mono">{item.superbillCpt?.join(', ')}</span></p>
                    {allMatch ? (
                      <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-1"><Check size={12} className="inline" /> All codes match</p>
                    ) : (
                      <div className="text-[12px] text-amber-600 dark:text-amber-400 mt-1 space-y-0.5">
                        {aiOnly.map(code => <p key={`ai-${code}`}><AlertTriangle size={12} className="inline" /> AI suggests {code} not on superbill</p>)}
                        {superbillOnly.map(code => <p key={`sb-${code}`}><AlertTriangle size={12} className="inline" /> Superbill has {code} not suggested by AI</p>)}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => {
                    if (!item) return
                    toast.success(`Chart approved. Sent to billing queue as CLM-${Math.floor(Math.random() * 9000 + 1000)}`)
                    setSelected(queue[0]?.id || '')
                    setSelectedCodes({})
                    setExpanded({})
                  }} className="flex-1 bg-brand text-white rounded-btn px-3 py-2 text-[13px] font-medium inline-flex items-center justify-center gap-2"><CheckCircle2 size={14} />Approve & Send to Billing</button>
                  <button onClick={() => toast.info('Message thread opened with Dr. Martinez')} className="flex-1 border border-separator rounded-btn px-3 py-2 text-[13px] text-content-secondary inline-flex items-center justify-center gap-2"><MessageCircle size={14} />Query Doctor</button>
                </div>
              </>
            ) : <div className="h-full flex items-center justify-center text-content-tertiary text-[14px]"><FileText size={16} className="mr-2" />Select a chart from the queue</div>}
          </div>
        </div>
      </div>
    </ModuleShell>
  )
}
