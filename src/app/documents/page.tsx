'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { FolderOpen, Search, Upload, AlertTriangle } from 'lucide-react'

const docs = [
  { id: 'DOC-001', name: 'superbill_smith_20260302.pdf', type: 'Superbill', client: 'Irvine Family Practice', patient: 'John Smith', date: '2026-03-02', source: 'Portal', linked: true },
  { id: 'DOC-002', name: 'clinical_note_mansouri.pdf', type: 'Clinical Note', client: 'Gulf Medical Center', patient: 'Ahmed Al Mansouri', date: '2026-03-01', source: 'AI Scribe', linked: true },
  { id: 'DOC-003', name: 'era_uhc_20260301.835', type: 'ERA', client: 'Irvine Family Practice', patient: '-', date: '2026-03-01', source: 'EDI', linked: true },
  { id: 'DOC-004', name: 'denial_aetna_clm4504.pdf', type: 'Denial Letter', client: 'Irvine Family Practice', patient: 'Sarah Johnson', date: '2026-02-28', source: 'Payer Portal', linked: true },
  { id: 'DOC-005', name: 'insurance_card_garcia.jpg', type: 'Insurance Card', client: 'Irvine Family Practice', patient: 'Maria Garcia', date: '2026-02-28', source: 'Portal', linked: true },
  { id: 'DOC-006', name: 'fax_inbound_20260301.pdf', type: 'Clinical Note', client: '?', patient: '?', date: '2026-03-01', source: 'Fax', linked: false },
  { id: 'DOC-007', name: 'email_attachment_20260228.pdf', type: 'Superbill', client: '?', patient: '?', date: '2026-02-28', source: 'Email', linked: false },
  { id: 'DOC-008', name: 'echo_report_chen.pdf', type: 'Clinical Note', client: 'Patel Cardiology', patient: 'Robert Chen', date: '2026-02-10', source: 'Portal', linked: true },
]

export default function DocumentsPage() {
  const [tab, setTab] = useState<'all'|'unlinked'|'fax'>('all')
  const [search, setSearch] = useState('')
  const filtered = docs.filter(d => {
    if (tab === 'unlinked') return !d.linked
    if (tab === 'fax') return d.source === 'Fax'
    if (search) return d.name.toLowerCase().includes(search.toLowerCase()) || d.patient?.toLowerCase().includes(search.toLowerCase())
    return true
  })
  const unlinkedCount = docs.filter(d => !d.linked).length

  return (
    <ModuleShell title="Documents" subtitle="Document vault, fax center, and unlinked queue"
      actions={<button className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Upload size={16}/> Bulk Upload</button>}>
      <div className="flex gap-2 mb-4">
        {(['all','unlinked','fax'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium ${tab === t ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-content-secondary border border-separator'}`}>
            {t === 'all' ? 'All Documents' : t === 'unlinked' ? `Unlinked (${unlinkedCount})` : 'Fax Center'}
          </button>
        ))}
        <div className="relative ml-auto max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..."
            className="w-full bg-surface-elevated border border-separator rounded-lg pl-8 pr-3 py-1.5 text-xs text-content-primary"/>
        </div>
      </div>
      {unlinkedCount > 0 && tab === 'all' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-600 text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14}/> {unlinkedCount} document(s) not linked to any patient — review in Unlinked tab
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Document</th><th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Source</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{filtered.map(d=>(
            <tr key={d.id} className="border-b border-separator last:border-0 table-row cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs">{d.name}</td>
              <td className="px-4 py-3 text-xs">{d.type}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{d.client}</td>
              <td className="px-4 py-3 text-xs">{d.patient}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{d.date}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{d.source}</td>
              <td className="px-4 py-3">{d.linked ? <StatusBadge status="active" small/> : <button className="text-[10px] text-brand hover:underline">Link to Patient</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
