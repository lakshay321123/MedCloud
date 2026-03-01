'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Mic, MicOff, Play, Check, Clock } from 'lucide-react'

const notes = [
  { id: 'SCR-001', patient: 'Robert Chen', provider: 'Dr. Patel', date: '2026-03-01', status: 'pending_signoff', soap: { s: 'Patient reports increasing fatigue and mild dyspnea on exertion over past 2 weeks.', o: 'BP 138/86, HR 78, SpO2 96%. Bilateral LE edema 1+. JVD observed.', a: 'Heart failure with reduced EF, worsening. Current NYHA Class II-III.', p: 'Increase furosemide to 40mg daily. Schedule echocardiogram. Return 2 weeks.' }, cpt: [{ code: '99214', confidence: 92 }], icd: [{ code: 'I50.9', confidence: 95 }, { code: 'R53.83', confidence: 78 }] },
  { id: 'SCR-002', patient: 'Ahmed Al Mansouri', provider: 'Dr. Al Zaabi', date: '2026-03-01', status: 'pending_signoff', soap: { s: 'Follow-up for coronary artery disease. No chest pain. Tolerating medications well.', o: 'BP 122/78, HR 68. Heart S1S2 regular. No murmur. Lungs clear.', a: 'ASHD stable on current regimen.', p: 'Continue aspirin, statin, beta-blocker. Annual stress test due next month.' }, cpt: [{ code: '99213', confidence: 88 }], icd: [{ code: 'I25.10', confidence: 95 }] },
  { id: 'SCR-003', patient: 'John Smith', provider: 'Dr. Martinez', date: '2026-03-02', status: 'signed', soap: { s: 'Diabetes follow-up. Blood sugars improved with medication adjustment. No hypoglycemic episodes.', o: 'BP 128/82, Weight 185lb. Feet exam normal. Monofilament intact.', a: 'T2DM improving. A1C down from 7.4 to 7.1.', p: 'Continue metformin 1000mg BID. Recheck A1C in 3 months. Annual eye exam ordered.' }, cpt: [{ code: '99214', confidence: 94 }], icd: [{ code: 'E11.9', confidence: 97 }, { code: 'I10', confidence: 92 }] },
]

export default function AIScribePage() {
  const { currentUser } = useApp()
  const isProvider = currentUser.role === 'provider'
  const [selectedNote, setSelectedNote] = useState(notes[0])
  const [recording, setRecording] = useState(false)

  return (
    <ModuleShell title="AI Scribe" subtitle={isProvider ? 'Dictate and review clinical notes' : 'Review AI-generated clinical notes'} sprint={4}>
      {isProvider && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Start New Visit</h3>
            <p className="text-xs text-muted">Select a patient and begin recording</p>
          </div>
          <button onClick={() => setRecording(!recording)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${recording ? 'bg-red-500 text-white' : 'bg-brand text-white hover:bg-brand-dark'}`}>
            {recording ? <><MicOff size={16}/> Stop Recording</> : <><Mic size={16}/> Start Recording</>}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-320px)]">
        {/* Note List */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-auto">
          <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted">
            {isProvider ? 'My Notes' : 'Signed Notes (Read-Only)'}
          </div>
          {notes.map(n => (
            <button key={n.id} onClick={() => setSelectedNote(n)}
              className={`w-full text-left px-3 py-3 border-b border-border hover:bg-white/5 ${selectedNote.id === n.id ? 'bg-brand/5' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{n.patient}</span>
                <StatusBadge status={n.status === 'signed' ? 'completed' : 'in_progress'} small/>
              </div>
              <div className="text-[10px] text-muted">{n.provider} • {n.date}</div>
            </button>
          ))}
        </div>

        {/* SOAP Note */}
        <div className="col-span-2 bg-bg-secondary border border-border rounded-xl overflow-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{selectedNote.patient}</h3>
              <span className="text-[10px] text-muted">{selectedNote.provider} • {selectedNote.date}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted"><Play size={12}/> Play recording</div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {Object.entries(selectedNote.soap).map(([key, val]) => (
              <div key={key}>
                <div className="text-xs font-semibold text-muted mb-1">{key === 's' ? 'SUBJECTIVE' : key === 'o' ? 'OBJECTIVE' : key === 'a' ? 'ASSESSMENT' : 'PLAN'}</div>
                <div className="text-sm bg-white/5 rounded-lg p-2">{val}</div>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <div className="text-xs font-semibold text-muted mb-2">AI-SUGGESTED CODES</div>
              <div className="flex flex-wrap gap-2">
                {selectedNote.cpt.map(c => <span key={c.code} className="bg-brand/10 text-brand text-xs px-2 py-0.5 rounded border border-brand/20">{c.code} ({c.confidence}%)</span>)}
                {selectedNote.icd.map(c => <span key={c.code} className="bg-cyan-500/10 text-cyan-400 text-xs px-2 py-0.5 rounded border border-cyan-500/20">{c.code} ({c.confidence}%)</span>)}
              </div>
            </div>
          </div>
          {isProvider && selectedNote.status === 'pending_signoff' && (
            <div className="p-3 border-t border-border">
              <button className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg py-2 text-sm font-medium hover:bg-emerald-500/20 flex items-center justify-center gap-2">
                <Check size={16}/> Sign & Send to Billing
              </button>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
