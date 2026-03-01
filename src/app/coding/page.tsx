'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoCodingQueue, DemoCodingItem } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ClipboardList, Check, AlertTriangle, Mic, Upload, MessageCircle } from 'lucide-react'

export default function CodingPage() {
  const { selectedClient } = useApp()
  const [selectedItem, setSelectedItem] = useState<DemoCodingItem | null>(demoCodingQueue[0])
  const queue = demoCodingQueue.filter(c => !selectedClient || c.clientId === selectedClient.id)

  return (
    <ModuleShell title="AI Coding" subtitle="Review and approve AI-suggested codes" sprint={2}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="My Queue" value={queue.length} icon={<ClipboardList size={20}/>}/>
        <KPICard label="Coded Today" value="47" sub="+12" trend="up"/>
        <KPICard label="AI Acceptance" value="89%"/>
        <KPICard label="Avg Time/Chart" value="6.2m"/>
      </div>

      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-320px)]">
        {/* Left: Queue + Source Document */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border text-xs text-muted font-semibold">Coding Queue ({queue.length})</div>
          <div className="overflow-y-auto flex-1">
            {queue.map(item => (
              <button key={item.id} onClick={() => setSelectedItem(item)}
                className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-foreground/5 ${selectedItem?.id === item.id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.patientName}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${item.source === 'ai_scribe' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                    {item.source === 'ai_scribe' ? '🎙 Scribe' : '📄 Upload'}
                  </span>
                </div>
                <div className="text-[10px] text-muted">{item.clientName} • {item.provider} • {item.dos}</div>
              </button>
            ))}
          </div>
          {/* Source Document Preview */}
          {selectedItem && (
            <div className="border-t border-border p-3">
              <div className="text-[10px] text-muted mb-1 font-semibold">SOURCE DOCUMENT</div>
              {selectedItem.source === 'ai_scribe' ? (
                <div className="bg-foreground/5 rounded-lg p-2 text-xs space-y-1">
                  <div className="flex items-center gap-1 text-purple-400 text-[10px] mb-1"><Mic size={10}/> AI Scribe — Signed SOAP Note</div>
                  <div><span className="text-muted">S:</span> Patient reports stable blood sugars, no new complaints...</div>
                  <div><span className="text-muted">O:</span> BP 128/82, HR 72, BMI 27.4. A1C 7.1% (prev 7.4%)...</div>
                  <div><span className="text-muted">A:</span> T2DM improved. HTN well-controlled...</div>
                  <div><span className="text-muted">P:</span> Continue metformin. Recheck A1C in 3 months...</div>
                  <button className="text-[10px] text-purple-400 hover:underline mt-1">▶ Play visit recording</button>
                </div>
              ) : (
                <div className="bg-foreground/5 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1 text-cyan-400 text-[10px] mb-1"><Upload size={10}/> Uploaded Superbill</div>
                  <div className="bg-foreground/10 rounded h-24 flex items-center justify-center text-muted text-[10px]">📄 PDF Viewer — {selectedItem.patientName} superbill</div>
                  {selectedItem.superbillCpt && <div className="text-[10px] text-muted mt-1">Superbill ticked: {selectedItem.superbillCpt.join(', ')}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Coding Workspace */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedItem ? (
            <>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{selectedItem.patientName}</h3>
                    <span className="text-[10px] text-muted">{selectedItem.clientName} • {selectedItem.provider} • DOS: {selectedItem.dos}</span>
                  </div>
                  <StatusBadge status={selectedItem.priority} small/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ICD-10 Codes */}
                <div>
                  <h4 className="text-xs font-semibold text-muted mb-2">DIAGNOSIS CODES (ICD-10)</h4>
                  {selectedItem.aiSuggestedIcd.map((code, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                      <span className="font-mono text-xs text-cyan-400 w-16">{code.code}</span>
                      <span className="text-xs flex-1">{code.desc}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${code.confidence >= 90 ? 'bg-emerald-500/10 text-emerald-400' : code.confidence >= 75 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{code.confidence}%</span>
                      <button className="text-emerald-400 hover:text-emerald-300"><Check size={14}/></button>
                    </div>
                  ))}
                </div>

                {/* CPT Codes */}
                <div>
                  <h4 className="text-xs font-semibold text-muted mb-2">PROCEDURE CODES (CPT)</h4>
                  {selectedItem.aiSuggestedCpt.map((code, i) => {
                    const mismatch = selectedItem.superbillCpt && !selectedItem.superbillCpt.includes(code.code)
                    return (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                        <span className="font-mono text-xs text-brand w-16">{code.code}</span>
                        <span className="text-xs flex-1">{code.desc}</span>
                        {mismatch && <span className="text-[9px] text-amber-400 flex items-center gap-0.5"><AlertTriangle size={10}/> Superbill mismatch</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${code.confidence >= 90 ? 'bg-emerald-500/10 text-emerald-400' : code.confidence >= 75 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{code.confidence}%</span>
                        <button className="text-emerald-400 hover:text-emerald-300"><Check size={14}/></button>
                      </div>
                    )
                  })}
                  {selectedItem.superbillCpt && (
                    <div className="mt-2 text-[10px] text-muted bg-foreground/5 rounded p-2">
                      Superbill codes: {selectedItem.superbillCpt.join(', ')} — {selectedItem.superbillCpt.every(c => selectedItem.aiSuggestedCpt.some(a => a.code === c)) ? <span className="text-emerald-400">✓ Matches AI</span> : <span className="text-amber-400">⚠ Review needed</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <button className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg py-2 text-sm hover:bg-emerald-500/20">✓ Approve & Send to Billing</button>
                <button className="bg-foreground/5 border border-border rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground flex items-center gap-1"><MessageCircle size={12}/> Query Doctor</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">Select a chart from the queue</div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
