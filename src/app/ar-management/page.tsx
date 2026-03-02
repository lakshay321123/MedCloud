'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { TrendingUp, X, Phone } from 'lucide-react'

const buckets = [{ l: '0-30', v: 145000, c: 'bg-emerald-500' }, { l: '31-60', v: 98000, c: 'bg-cyan-500' }, { l: '61-90', v: 52000, c: 'bg-amber-500' }, { l: '91-120', v: 28000, c: 'bg-orange-500' }, { l: '120+', v: 12000, c: 'bg-red-500' }]
const max = Math.max(...buckets.map(b => b.v))

const accounts = [
  { id: 'AR-001', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', original: 1200, balance: 488, age: 95, lastAction: 'Voice AI call — "In process"', nextFollowup: '2026-03-04', priority: 'urgent' as const, source: 'denied_claim' as const },
  { id: 'AR-002', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', original: 320, balance: 320, age: 46, lastAction: 'Initial submission', nextFollowup: '2026-03-03', priority: 'high' as const, source: 'underpayment' as const },
  { id: 'AR-003', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', original: 350, balance: 126, age: 12, lastAction: 'Partial payment posted', nextFollowup: '2026-03-10', priority: 'medium' as const, source: 'patient_balance' as const },
  { id: 'AR-004', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UHC', original: 250, balance: 0, age: 5, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const, source: 'denied_claim' as const },
  { id: 'AR-005', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', original: 480, balance: 0, age: 31, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const, source: 'denied_claim' as const },
  { id: 'AR-006', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', original: 890, balance: 890, age: 120, lastAction: 'Appeal L1 submitted', nextFollowup: '2026-03-02', priority: 'urgent' as const, source: 'timely_filing_risk' as const },
]

const sourceInfo: Record<string, { color: string; label: string }> = {
  denied_claim: { color: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Denied Claim' },
  underpayment: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Underpayment' },
  patient_balance: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Patient Balance' },
  timely_filing_risk: { color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'Timely Filing Risk' },
}

export default function ARManagementPage() {
  const { selectedClient } = useApp()
  const { toast } = useToast()
  const [selected, setSelected] = useState<typeof accounts[0] | null>(null)
  const filtered = accounts.filter(a => !selectedClient || a.client.includes(selectedClient.name.split(' ')[0]))

  return (
    <ModuleShell title="A/R Management" subtitle="Accounts receivable follow-up and collections">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Total A/R" value="$335K" icon={<TrendingUp size={20} />} />
        <KPICard label="Worked Today" value="28" sub="+6" trend="up" />
        <KPICard label="Follow-ups Due" value="42" />
        <KPICard label="Avg Days Outstanding" value="34.2" />
      </div>
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-semibold text-content-secondary mb-2">AGING BUCKETS</h3>
        <div className="flex items-end gap-4 h-28 px-4">{buckets.map(b => (
          <div key={b.l} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-content-secondary">${(b.v / 1000).toFixed(0)}K</span>
            <div className={`w-full ${b.c} rounded-t transition-all`} style={{ height: `${(b.v / max) * 90}px` }} />
            <span className="text-[10px] text-content-secondary">{b.l} days</span>
          </div>
        ))}</div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Patient</th>
            <th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Payer</th>
            <th className="text-left px-4 py-3">Source</th>
            <th className="text-right px-4 py-3">Balance</th>
            <th className="text-right px-4 py-3">Age</th>
            <th className="text-left px-4 py-3">Last Action</th>
            <th className="text-left px-4 py-3">Next F/U</th>
            <th className="text-left px-4 py-3">Priority</th>
          </tr></thead>
          <tbody>{filtered.map(a => (
            <tr key={a.id}
              onClick={() => setSelected(a)}
              className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3 font-medium">{a.patient}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{a.client}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{a.payer}</td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sourceInfo[a.source]?.color || 'bg-surface-elevated text-content-secondary'}`}>
                  {sourceInfo[a.source]?.label || a.source}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">{a.balance > 0 ? `$${a.balance}` : <span className="text-emerald-600 dark:text-emerald-400">Paid</span>}</td>
              <td className="px-4 py-3 text-right text-xs">{a.age}d</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{a.lastAction}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{a.nextFollowup}</td>
              <td className="px-4 py-3"><StatusBadge status={a.priority} small /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-separator">
              <div>
                <h3 className="font-semibold text-content-primary">{selected.patient}</h3>
                <p className="text-xs text-content-secondary">{selected.client} · {selected.payer}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface-elevated rounded-btn">
                <X size={16} className="text-content-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-content-primary">${selected.original}</div>
                  <div className="text-[10px] text-content-secondary">Original</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className={`text-lg font-bold ${selected.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>${selected.balance}</div>
                  <div className="text-[10px] text-content-secondary">Balance</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-content-primary">{selected.age}d</div>
                  <div className="text-[10px] text-content-secondary">Age</div>
                </div>
              </div>

              <div className="bg-surface-elevated rounded-lg p-3 text-xs">
                <div className="text-content-secondary mb-1">Last Action</div>
                <div className="text-content-primary">{selected.lastAction}</div>
              </div>

              <div>
                <label className="text-xs text-content-secondary block mb-1">Next Follow-up Date</label>
                <input type="date" defaultValue={selected.nextFollowup !== '-' ? selected.nextFollowup : ''}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs text-content-secondary block mb-1">Add Note</label>
                <textarea rows={3} placeholder="Log follow-up notes..."
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { toast.success('Voice AI call queued'); setSelected(null) }}
                  className="bg-brand/10 text-brand rounded-lg py-2.5 text-xs font-medium hover:bg-brand/20 transition-colors flex items-center justify-center gap-2">
                  <Phone size={13} /> Queue AI Call
                </button>
                <button onClick={() => { toast.success('Follow-up saved'); setSelected(null) }}
                  className="bg-surface-elevated border border-separator rounded-lg py-2.5 text-xs font-medium hover:text-content-primary transition-colors">
                  Save Follow-up
                </button>
                <button onClick={() => { toast.success('Routed to appeals'); setSelected(null) }}
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg py-2.5 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                  Route to Appeals
                </button>
                <button onClick={() => { toast.warning('Write-off requires supervisor approval') }}
                  className="bg-red-500/10 text-red-500 rounded-lg py-2.5 text-xs font-medium hover:bg-red-500/20 transition-colors">
                  Write-off
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ModuleShell>
  )
}
