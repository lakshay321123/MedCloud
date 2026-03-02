'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { ShieldCheck, AlertTriangle, CheckCircle2, Bot, Search } from 'lucide-react'

const demoChecks = [
  { id: 'ELG-001', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UnitedHealthcare', status: 'active', network: 'In-Network', copay: '$30', deductible: '$450 remaining', dos: '2026-03-02' },
  { id: 'ELG-002', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', status: 'active', network: 'In-Network', copay: '$25', deductible: '$200 remaining', dos: '2026-03-02' },
  { id: 'ELG-003', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', status: 'active', network: 'In-Network', copay: '0%', deductible: 'N/A', dos: '2026-03-02' },
  { id: 'ELG-004', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', status: 'active', network: 'In-Network', copay: '20%', deductible: '$0 remaining', dos: '2026-03-02' },
  { id: 'ELG-005', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', status: 'inactive', network: '-', copay: '-', deductible: '-', dos: '2026-03-02' },
  { id: 'ELG-006', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', status: 'active', network: 'In-Network', copay: '20%', deductible: 'AED 500 remaining', dos: '2026-03-02' },
]

const usPayers = ['UnitedHealthcare', 'Aetna', 'Blue Cross Blue Shield', 'Medicare', 'Medicaid', 'Cigna', 'Humana', 'Molina']
const uaePayers = ['Daman', 'NAS', 'ADNIC', 'MetLife', 'GIG Gulf', 'AXA', 'Nextcare', 'Oman Insurance']

export default function EligibilityPage() {
  const { country } = useApp()
  const [tab, setTab] = useState<'single' | 'batch'>('single')
  const [hasSearched, setHasSearched] = useState(false)

  const isUAE = country === 'uae'
  const payers = isUAE ? uaePayers : usPayers
  const idLabel = isUAE ? 'Emirates ID' : 'Member ID'
  const groupLabel = isUAE ? 'TPA Reference #' : 'Group #'

  return (
    <ModuleShell title="Eligibility Verification" subtitle="Check insurance coverage and benefits">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Checks Today" value="34" icon={<ShieldCheck size={20} />} />
        <KPICard label="Active" value="31" sub="91%" trend="up" />
        <KPICard label="Inactive/Issues" value="3" trend="down" />
        <KPICard label="Prior Auth Required" value="5" />
      </div>

      {/* RPA callout */}
      <div className="flex items-start gap-3 bg-brand/5 border border-brand/20 rounded-lg px-4 py-3 mb-4">
        <Bot size={16} className="text-brand mt-0.5 shrink-0" />
        <div className="text-xs text-content-secondary">
          <span className="font-semibold text-brand">Connected to eligibility verification engine</span>
          {' · '}
          {isUAE
            ? 'UAE: RPA bot → TPA portal real-time check'
            : 'US: EDI 270/271 via clearinghouse (Availity / Change Healthcare)'
          }
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-4">
        {(['single', 'batch'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30'}`}>
            {t === 'single' ? 'Single Check' : 'Batch Overnight'}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Single Check form */}
          <div className="col-span-1 card p-4 space-y-3">
            <h3 className="text-[12px] font-semibold text-content-secondary mb-1">Run Eligibility Check</h3>

            <div>
              <label className="text-xs text-content-secondary block mb-1">Client / Facility</label>
              <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors">
                <option value="">Select client...</option>
                <option>Irvine Family Practice</option>
                <option>Patel Cardiology</option>
                <option>Gulf Medical Center</option>
                <option>Dubai Wellness Clinic</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-content-secondary block mb-1">Patient Name</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
                <input className="w-full bg-surface-elevated border border-separator rounded-lg pl-8 pr-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" placeholder="Search patient..." />
              </div>
            </div>

            <div>
              <label className="text-xs text-content-secondary block mb-1">Payer</label>
              <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors">
                <option value="">Select payer...</option>
                {payers.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-content-secondary block mb-1">Date of Service</label>
              <input type="date" defaultValue="2026-03-02" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-content-secondary block mb-1">{idLabel}</label>
                <input className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" placeholder={isUAE ? '784-XXXX-...' : 'MEM123456'} />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">{groupLabel}</label>
                <input className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" placeholder={isUAE ? 'TPA-REF' : 'GRP-001'} />
              </div>
            </div>

            <button
              onClick={() => setHasSearched(true)}
              className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-mid transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={14} /> Run Eligibility Check
            </button>
          </div>

          {/* Results */}
          <div className="col-span-2 card overflow-hidden">
            {hasSearched ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-separator text-xs text-content-secondary">
                  <th className="text-left px-4 py-3">Patient</th>
                  <th className="text-left px-4 py-3">Payer</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Network</th>
                  <th className="text-left px-4 py-3">Copay</th>
                  <th className="text-left px-4 py-3">Deductible</th>
                </tr></thead>
                <tbody>{demoChecks.map(c => (
                  <tr key={c.id} className="border-b border-separator last:border-0 table-row">
                    <td className="px-4 py-3 font-medium">{c.patient}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{c.payer}</td>
                    <td className="px-4 py-3">
                      {c.status === 'active'
                        ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs"><CheckCircle2 size={12} /> Active</span>
                        : <span className="text-red-600 dark:text-red-400 flex items-center gap-1 text-xs"><AlertTriangle size={12} /> Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">{c.network}</td>
                    <td className="px-4 py-3 text-xs">{c.copay}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{c.deductible}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-content-tertiary text-sm p-12">
                <div className="text-center">
                  <ShieldCheck size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Fill out the form and click Run Eligibility Check</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'batch' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-content-secondary">Batch Overnight Eligibility Check</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-content-secondary block mb-1">From Date</label>
              <input type="date" defaultValue="2026-03-02" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">To Date</label>
              <input type="date" defaultValue="2026-03-09" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Client</label>
              <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors">
                <option>All Clients</option>
                <option>Irvine Family Practice</option>
                <option>Patel Cardiology</option>
                <option>Gulf Medical Center</option>
                <option>Dubai Wellness Clinic</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-surface-elevated border border-separator rounded-lg px-4 py-2 text-sm text-content-secondary hover:bg-surface-primary transition-colors">
              Upload Patient List (.xlsx)
            </button>
            <button className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-mid transition-colors flex items-center gap-2">
              <ShieldCheck size={14} /> Run Batch Check
            </button>
          </div>
          <p className="text-xs text-content-tertiary">Batch checks run overnight and results are available by 6 AM the following day.</p>
        </div>
      )}
    </ModuleShell>
  )
}
