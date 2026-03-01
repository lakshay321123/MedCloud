'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoClaims } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ShieldAlert, FileText } from 'lucide-react'

export default function DenialsPage() {
  const { selectedClient } = useApp()
  const denials = demoClaims.filter(c => ['denied','appealed'].includes(c.status)).filter(c => !selectedClient || c.clientId === selectedClient.id)
  const [selected, setSelected] = useState(denials[0]?.id || '')

  return (
    <ModuleShell title="Denials & Appeals" subtitle="Manage denied claims and appeal workflows" sprint={3}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Open Denials" value={denials.filter(d=>d.status==='denied').length} icon={<ShieldAlert size={20}/>}/>
        <KPICard label="In Appeal" value={denials.filter(d=>d.status==='appealed').length}/>
        <KPICard label="Appeal Success Rate" value="68%" trend="up" sub="+4%"/>
        <KPICard label="Avg Resolution" value="18 days"/>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-400">
        ⚠ Pattern detected: 3 claims denied by Aetna for &quot;Prior auth required&quot; this month — review prior auth workflow
      </div>
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-380px)]">
        {/* Denial List */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted sticky top-0 bg-bg-secondary">
              <th className="text-left px-4 py-3">Claim</th><th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Reason</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr></thead>
            <tbody>{denials.map(d=>(
              <tr key={d.id} onClick={()=>setSelected(d.id)} className={`border-b border-border last:border-0 cursor-pointer hover:bg-white/5 ${selected===d.id?'bg-brand/5':''}`}>
                <td className="px-4 py-3 font-mono text-xs">{d.id}</td>
                <td className="px-4 py-3">{d.patientName}</td>
                <td className="px-4 py-3 text-xs text-muted">{d.payer}</td>
                <td className="px-4 py-3 text-xs text-red-400">{d.denialReason}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} small/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {/* Appeal Builder */}
        <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-col">
          {selected ? (() => {
            const d = denials.find(x => x.id === selected)
            if (!d) return null
            return (<>
              <h3 className="text-sm font-semibold mb-1">{d.id} — {d.patientName}</h3>
              <p className="text-xs text-muted mb-3">{d.clientName} • {d.payer} • DOS: {d.dos}</p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 mb-3 text-xs text-red-400">Denial: {d.denialReason}</div>
              <div className="mb-3"><span className="text-xs text-muted block mb-1">Related Documents</span>
                <div className="flex gap-2">{['Original Claim','Clinical Note','Denial Letter'].map(doc=>(
                  <div key={doc} className="bg-white/5 border border-border rounded px-2 py-1 text-[10px] text-muted flex items-center gap-1"><FileText size={10}/>{doc}</div>
                ))}</div>
              </div>
              <div className="flex-1">
                <span className="text-xs text-muted block mb-1">AI-Generated Appeal Letter</span>
                <textarea className="w-full h-full min-h-[120px] bg-white/5 border border-border rounded-lg p-2 text-xs text-white resize-none" defaultValue={`Dear ${d.payer} Appeals Department,\n\nWe are writing to appeal the denial of claim ${d.id} for patient ${d.patientName}, date of service ${d.dos}.\n\nThe denial reason cited was "${d.denialReason}". We respectfully disagree with this determination and have attached supporting documentation demonstrating medical necessity...\n\n[AI-drafted content — review before sending]`}/>
              </div>
              <button className="mt-3 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-dark">Submit Appeal (L1)</button>
            </>)
          })() : <div className="flex-1 flex items-center justify-center text-muted text-sm">Select a denial to review</div>}
        </div>
      </div>
    </ModuleShell>
  )
}
