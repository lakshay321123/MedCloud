'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoClaims } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ShieldAlert, FileText, AlertTriangle, Send } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

const demoDenials = [
  (() => {
    const base = demoClaims.find(c => c.id === 'CLM-4504')
    if (!base) throw new Error('Demo data missing CLM-4504 — check demo-data.ts')
    return { ...base, source: 'claim_rejection' as const, appealLevel: 'L1' as const, denialCategory: 'Authorization' }
  })(),
  (() => {
    const base = demoClaims.find(c => c.id === 'CLM-4507')
    if (!base) throw new Error('Demo data missing CLM-4507 — check demo-data.ts')
    return { ...base, source: 'payment_posting' as const, appealLevel: null, denialCategory: 'Eligibility' }
  })(),
  { id: 'CLM-4511', patientId: 'P-009', patientName: 'David Park', clientId: 'org-102', clientName: 'Irvine Family Practice', payer: 'UnitedHealthcare', dos: '2026-02-26', cptCodes: ['99215'], icdCodes: ['M54.5'], charges: 380, paid: 0, status: 'denied' as const, age: 4, denialReason: 'Prior auth required — not obtained', source: 'payment_posting' as const, appealLevel: null, denialCategory: 'Authorization' },
  { id: 'CLM-4515', patientId: 'P-008', patientName: 'Emily Williams', clientId: 'org-103', clientName: 'Patel Cardiology', payer: 'Medicare', dos: '2026-02-18', cptCodes: ['99214'], icdCodes: ['I50.9'], charges: 250, paid: 0, status: 'denied' as const, age: 12, denialReason: 'Expenses not covered — inactive coverage', source: 'payment_posting' as const, appealLevel: null, denialCategory: 'Eligibility' },
]

export default function DenialsPage() {
  const { selectedClient } = useApp()
  const { toast } = useToast()
  const denials = demoDenials.filter(c => !selectedClient || c.clientId === selectedClient.id)
  const [selected, setSelected] = useState(denials[0]?.id || '')
  const [appealLevel, setAppealLevel] = useState<'L1' | 'L2' | 'L3'>('L1')
  const [appealTexts, setAppealTexts] = useState<Record<string, string>>({})
  const getAppealText = (d: typeof denials[0]) =>
    appealTexts[d.id] ?? `Dear ${d.payer} Appeals Department,\n\nWe are writing to appeal claim ${d.id} for ${d.patientName}...`

  return (
    <ModuleShell title="Denials & Appeals" subtitle="Manage denied claims and appeal workflows">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Open Denials" value={denials.filter(d => d.status === 'denied').length} icon={<ShieldAlert size={20} />} />
        <KPICard label="In Appeal" value={denials.filter(d => d.status === 'appealed').length} />
        <KPICard label="Appeal Success Rate" value="68%" trend="up" sub="+4%" />
        <KPICard label="Avg Resolution" value="18 days" />
      </div>
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-380px)]">
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-separator text-xs text-content-secondary sticky top-0 bg-surface-secondary"><th className="text-left px-4 py-3">Claim</th><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Reason</th><th className="text-left px-4 py-3">Source</th><th className="text-left px-4 py-3">Appeal</th><th className="text-left px-4 py-3">Status</th></tr></thead>
            <tbody>{denials.map(d => (
              <tr key={d.id} onClick={() => setSelected(d.id)} className={`border-b border-separator table-row cursor-pointer ${selected === d.id ? 'bg-brand/5' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs">{d.id}</td><td className="px-4 py-3">{d.patientName}</td><td className="px-4 py-3 text-xs text-content-secondary">{d.payer}</td><td className="px-4 py-3 text-xs text-red-600 dark:text-red-400">{d.denialReason}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-pill ${d.source === 'payment_posting' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : d.source === 'claim_rejection' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>{d.source === 'payment_posting' ? 'Payment Posting' : d.source === 'claim_rejection' ? 'Claim Rejection' : 'Payer Audit'}</span></td>
                <td className={`px-4 py-3 text-xs font-semibold ${d.appealLevel === 'L1' ? 'text-brand' : d.appealLevel === 'L2' ? 'text-amber-600 dark:text-amber-400' : d.appealLevel === 'L3' ? 'text-red-600 dark:text-red-400' : 'text-content-tertiary'}`}>{d.appealLevel || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} small /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card p-4 flex flex-col">
          {selected ? (() => {
            const d = denials.find(x => x.id === selected)
            if (!d) return null
            return <>
              <h3 className="text-sm font-semibold mb-1">{d.id} — {d.patientName}</h3>
              <p className="text-xs text-content-secondary mb-3">{d.clientName} · {d.payer} · DOS: {d.dos}</p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 mb-2 text-xs text-red-600 dark:text-red-400">Denial: {d.denialReason}</div>
              <div className="bg-surface-elevated border border-separator rounded-lg p-2 mb-3 text-xs text-content-secondary inline-flex items-center gap-1"><AlertTriangle size={12} />Source: Routed from {d.source}</div>
              {d.source === 'payment_posting' && <div className="text-xs text-content-secondary mb-3">EOB Reference: ERA-001, Line EOB-004</div>}
              <div className="mb-3"><span className="text-xs text-content-secondary block mb-1">Related Documents</span><div className="flex gap-2">{['Original Claim', 'Clinical Note', 'Denial Letter'].map(doc => <div key={doc} className="bg-surface-elevated border border-separator rounded px-2 py-1 text-[10px] text-content-secondary flex items-center gap-1"><FileText size={10} />{doc}</div>)}</div></div>
              <div className="mb-2">
                <span className="text-xs text-content-secondary block mb-1">Appeal Level</span>
                <div className="flex gap-1">
                  {(['L1','L2','L3'] as const).map(lvl=>(
                    <button key={lvl} onClick={()=>setAppealLevel(lvl)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${appealLevel===lvl?'bg-brand text-white border-brand':'border-separator text-content-secondary hover:border-brand/40 hover:text-brand'}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="w-full flex-1 min-h-[130px] bg-surface-elevated border border-separator rounded-lg p-2 text-xs"
                value={getAppealText(d)}
                onChange={e => setAppealTexts(prev => ({ ...prev, [d.id]: e.target.value }))}
              />
              <button
                onClick={() => {
                  const text = getAppealText(d)
                  if (text.trim().length < 50) {
                    toast.error('Appeal letter is too short')
                    return
                  }
                  toast.success(`${appealLevel} appeal submitted for ${d.id}`)
                }}
                className="mt-3 bg-brand text-white rounded-btn py-2 text-sm font-medium flex items-center justify-center gap-2"><Send size={14}/>Submit Appeal ({appealLevel})</button>
            </>
          })() : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-content-secondary">
              <ShieldAlert size={40} className="opacity-20" />
              <p className="text-sm">Select a denial to review</p>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
