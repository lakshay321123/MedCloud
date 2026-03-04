'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { demoContracts } from '@/lib/demo-data'
import type { DemoContract } from '@/lib/demo-data'
import { useFeeSchedules, usePayerConfigs, usePayers, useUnderpaymentCheck, useExtractContractRates, useCreateFeeSchedule, useUpdateFeeSchedule } from '@/lib/hooks'
import { useApp } from '@/lib/context'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import { Scale, Search, AlertTriangle, Edit2, Plus } from 'lucide-react'

const statusStyles: Record<DemoContract['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  expired: { label: 'Expired', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  negotiating: { label: 'Negotiating', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
}

const payerColors: Record<string, string> = {
  UHC: 'bg-blue-500',
  AETNA: 'bg-purple-500',
  MEDICARE: 'bg-teal-500',
  DAMAN: 'bg-emerald-600',
  NAS: 'bg-amber-500',
  BCBS: 'bg-blue-700',
}

function ContractStatusBadge({ status }: { status: DemoContract['status'] }) {
  const s = statusStyles[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${s.className}`}>
      {s.label}
      {status === 'expiring_soon' && <span className="ml-1">· 45 days</span>}
    </span>
  )
}

export default function ContractsPage() {
  const { selectedClient, country } = useApp()
  const { toast } = useToast()
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DemoContract | null>(demoContracts[0] ?? null)
  const [tab, setTab] = useState<'fee' | 'underpayments' | 'terms' | 'extract'>('fee')
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [addingCpt, setAddingCpt] = useState(false)
  const [newCpt, setNewCpt] = useState({ cpt: '', description: '', contractedRate: '' })

  const { data: apiFeeResult } = useFeeSchedules({ limit: 200 })
  const { data: apiPayerCfgResult } = usePayerConfigs()
  const { data: apiPayerResult } = usePayers()

  // Map API data to DemoContract format
  const apiContracts: DemoContract[] = (() => {
    const payers = apiPayerResult?.data || []
    const fees = apiFeeResult?.data || []
    const configs = apiPayerCfgResult?.data || []
    if (!payers.length) return []
    return payers.map((p: any) => {
      const payerFees = fees.filter((f: any) => f.payer_id === p.id)
      const cfg = configs.find((c: any) => c.payer_id === p.id)
      return {
        id: p.id, payer: p.name, payerId: p.name?.replace(/\s/g, '').toUpperCase().slice(0, 6) || '',
        client: (p as any).client_name || '—', clientId: p.id, status: 'active' as const,
        effective: cfg?.created_at?.slice(0, 10) || '2025-01-01',
        expiry: null, paymentTerms: `${cfg?.clean_claim_days || 30} days clean claim`,
        timelyFiling: cfg?.timely_filing_days_initial || 365,
        appealDeadline: cfg?.timely_filing_days_appeal || 60,
        feeScheduleFrequency: 'Annual',
        feeSchedule: payerFees.map((f: any) => ({
          cpt: f.cpt_code, description: f.description || '', contractedRate: Number(f.contracted_rate || 0),
          medicarePercent: f.medicare_rate ? Math.round((Number(f.contracted_rate) / Number(f.medicare_rate)) * 100) : 100,
          effectiveDate: f.effective_date || '2025-01-01',
        })),
        underpayments: [],
      }
    })
  })()

  const allContracts = (apiContracts.length ? apiContracts : demoContracts).filter(c => {
    if (selectedClient) return c.clientId === selectedClient.id
    if (country === 'uae') return UAE_ORG_IDS.includes(c.clientId)
    if (country === 'usa') return US_ORG_IDS.includes(c.clientId)
    return true
  })
  const filtered = allContracts.filter(c =>
    !search || c.payer.toLowerCase().includes(search.toLowerCase()) || c.client.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = allContracts.filter(c => c.status === 'active').length
  const expiringSoon = allContracts.filter(c => c.status === 'expiring_soon').length
  const totalUnderpayments = allContracts.reduce((s, c) => s + c.underpayments.length, 0)

  const TABS = [
    { id: 'fee', label: 'Fee Schedule' },
    { id: 'underpayments', label: 'Underpayment Report' },
    { id: 'terms', label: 'Contract Terms' },
    { id: 'extract', label: 'AI Rate Extract' },
  ] as const

  return (
    <ModuleShell title="Contract Manager" subtitle="Payer contracts, fee schedules, and underpayment detection">
      {!apiContracts.length && <div className='mx-4 mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-400'><AlertTriangle size={13} className='shrink-0'/>Connecting to live contract data…</div>}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KPICard label={t('contracts','activeContracts')} value={activeCount} icon={<Scale size={20}/>} />
        <KPICard label={t('contracts','expiring90')} value={expiringSoon} trend="down" />
        <KPICard label={t('contracts','underpayAlerts')} value={totalUnderpayments} />
        <KPICard label={t('contracts','totalPayers')} value={allContracts.length} />
      </div>

      {expiringSoon > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-[12px] text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14} /> {expiringSoon} contract(s) expiring within 90 days — review and renegotiate
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-340px)]">
        {/* Left panel — contract list */}
        <div className="w-[40%] flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payer or client…"
              className="w-full bg-surface-elevated rounded-btn pl-8 pr-3 py-2 text-[12px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-brand/30 border border-separator" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selected?.id === c.id ? 'bg-brand/5 border-brand/20' : 'bg-surface-secondary border-separator hover:bg-surface-elevated'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${payerColors[c.payerId] || 'bg-gray-500'} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                    {c.payer.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-content-primary truncate">{c.payer}</p>
                      <ContractStatusBadge status={c.status} />
                    </div>
                    <p className="text-[12px] text-content-secondary truncate">{c.client}</p>
                    <p className="text-[11px] text-content-tertiary mt-0.5">
                      {c.effective} → {c.expiry || 'No expiry'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-separator shrink-0">
                <div className={`w-10 h-10 rounded-full ${payerColors[selected.payerId] || 'bg-gray-500'} flex items-center justify-center text-white text-[12px] font-bold`}>
                  {selected.payer.slice(0, 2)}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-content-primary">{selected.payer}</p>
                  <p className="text-[12px] text-content-secondary">{selected.client}</p>
                </div>
                <ContractStatusBadge status={selected.status} />
              </div>
              {/* Tabs */}
              <div className="flex border-b border-separator px-4 shrink-0">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-4 py-2.5 text-[12px] font-medium transition-colors ${tab === t.id ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">
                {tab === 'fee' && (
                  <div>
                    <table className="w-full text-[12px]">
                      <thead><tr className="border-b border-separator text-[11px] text-content-tertiary uppercase tracking-wider">
                        {['CPT Code', 'Description', 'Contracted Rate', 'Medicare %', 'Effective Date', ''].map(h => (
                          <th key={h} className="text-left py-2 pr-3">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {selected.feeSchedule.map(row => (
                          <tr key={row.cpt} className="border-b border-separator last:border-0 group hover:bg-surface-elevated">
                            <td className="py-2.5 pr-3 font-mono font-medium text-content-primary">{row.cpt}</td>
                            <td className="py-2.5 pr-3 text-content-secondary">{row.description}</td>
                            <td className="py-2.5 pr-3">
                              {editingRow === row.cpt ? (
                                <input defaultValue={row.contractedRate} autoFocus onBlur={() => setEditingRow(null)}
                                  className="w-20 bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-primary focus:outline-none" />
                              ) : (
                                <span className="text-content-primary font-medium">${row.contractedRate}</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-content-secondary">{row.medicarePercent}%</td>
                            <td className="py-2.5 pr-3 font-mono text-content-tertiary">{row.effectiveDate}</td>
                            <td className="py-2.5">
                              <button onClick={() => setEditingRow(row.cpt)} className="opacity-0 group-hover:opacity-100 text-content-tertiary hover:text-brand transition-opacity">
                                <Edit2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {addingCpt && (
                          <tr className="border-b border-separator bg-brand/5">
                            <td className="py-2 pr-3"><input value={newCpt.cpt} onChange={e=>setNewCpt(p=>({...p,cpt:e.target.value}))} placeholder="99213" className="w-20 bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-primary focus:outline-none font-mono"/></td>
                            <td className="py-2 pr-3"><input value={newCpt.description} onChange={e=>setNewCpt(p=>({...p,description:e.target.value}))} placeholder="Description" className="w-full bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-primary focus:outline-none"/></td>
                            <td className="py-2 pr-3"><input value={newCpt.contractedRate} onChange={e=>setNewCpt(p=>({...p,contractedRate:e.target.value}))} placeholder="0.00" className="w-20 bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-primary focus:outline-none"/></td>
                            <td colSpan={3} className="py-2 pr-3">
                              <div className="flex gap-2">
                                <button onClick={()=>{toast.success(`CPT ${newCpt.cpt||'code'} added to fee schedule`);setAddingCpt(false);setNewCpt({cpt:'',description:'',contractedRate:''})}} className="text-[11px] bg-brand text-white px-2.5 py-1 rounded">Save</button>
                                <button onClick={()=>{setAddingCpt(false);setNewCpt({cpt:'',description:'',contractedRate:''})}} className="text-[11px] border border-separator px-2.5 py-1 rounded text-content-secondary">Cancel</button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <button onClick={() => setAddingCpt(true)}
                      className="mt-4 flex items-center gap-1.5 text-[12px] text-brand hover:underline">
                      <Plus size={13} /> Add CPT
                    </button>
                  </div>
                )}

                {tab === 'underpayments' && (
                  <div>
                    {selected.underpayments.length > 0 && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4 text-[12px] text-amber-400">
                        {selected.underpayments.length} underpayment{selected.underpayments.length !== 1 ? 's' : ''} this month
                        &nbsp;—&nbsp;${selected.underpayments.reduce((s, u) => s + Math.abs(u.variance), 0)} total at risk
                      </div>
                    )}
                    {selected.underpayments.length === 0 ? (
                      <p className="text-[13px] text-content-tertiary text-center py-12">No underpayments detected for this contract</p>
                    ) : (
                      <table className="w-full text-[12px]">
                        <thead><tr className="border-b border-separator text-[11px] text-content-tertiary uppercase tracking-wider">
                          {['Claim ID','Patient','DOS','CPT','Contracted','Paid','Variance','Action'].map(h => (
                            <th key={h} className="text-left py-2 pr-3">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {selected.underpayments.map(u => (
                            <tr key={u.claimId} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                              <td className="py-2.5 pr-3 font-mono text-content-primary">{u.claimId}</td>
                              <td className="py-2.5 pr-3 text-content-secondary">{u.patientName}</td>
                              <td className="py-2.5 pr-3 font-mono text-content-tertiary">{u.dos}</td>
                              <td className="py-2.5 pr-3 font-mono">{u.cpt}</td>
                              <td className="py-2.5 pr-3 text-content-primary">${u.contracted}</td>
                              <td className="py-2.5 pr-3 text-content-primary">${u.paid}</td>
                              <td className="py-2.5 pr-3 text-red-400 font-medium">−${Math.abs(u.variance)}</td>
                              <td className="py-2.5">
                                <button onClick={() => toast.success(`Task created — dispute with ${selected.payer}`)}
                                  className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors">
                                  Dispute
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {tab === 'terms' && (
                  <div className="space-y-3">
                    {[
                      { label: 'Payment Terms', value: selected.paymentTerms },
                      { label: 'Timely Filing Limit', value: `${selected.timelyFiling} days` },
                      { label: 'Appeal Deadline', value: `${selected.appealDeadline} days` },
                      { label: 'Fee Schedule Update Frequency', value: selected.feeScheduleFrequency },
                      { label: 'Effective Date', value: selected.effective },
                      { label: 'Expiry Date', value: selected.expiry || 'No expiry' },
                      { label: 'Status', value: statusStyles[selected.status as DemoContract['status']]?.label ?? selected.status },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between py-2.5 border-b border-separator last:border-0">
                        <span className="text-[13px] text-content-secondary">{row.label}</span>
                        <span className="text-[13px] text-content-primary font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'extract' && (
                  <div className="space-y-4">
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-purple-500 mb-2">AI Contract Rate Extraction</h4>
                      <p className="text-[11px] text-content-secondary mb-3">Upload a payer contract PDF to automatically extract fee schedule rates, payment terms, and key clauses using AI.</p>
                      <div className="flex gap-2">
                        <button onClick={() => toast.info('Upload contract PDF for rate extraction')} className="bg-purple-500 text-white rounded-lg px-4 py-2 text-xs hover:bg-purple-600 transition-colors">Upload Contract PDF</button>
                        <button onClick={() => toast.info('Re-extracting rates from current contract...')} className="bg-purple-500/10 text-purple-500 rounded-lg px-4 py-2 text-xs hover:bg-purple-500/20 transition-colors">Re-Extract Current</button>
                      </div>
                    </div>
                    <table className="w-full text-[12px]">
                      <thead><tr className="border-b border-separator text-content-secondary"><th className="text-left py-2">CPT</th><th className="text-left py-2">Description</th><th className="text-left py-2">Contract Rate</th><th className="text-left py-2">Medicare Rate</th><th className="text-left py-2">% of Medicare</th></tr></thead>
                      <tbody>
                        {[{cpt:'99213',desc:'Office Visit (Est, Low)',rate:85,medicare:76},{cpt:'99214',desc:'Office Visit (Est, Mod)',rate:125,medicare:110},
                          {cpt:'99215',desc:'Office Visit (Est, High)',rate:175,medicare:158},{cpt:'99203',desc:'Office Visit (New, Low)',rate:110,medicare:98}
                        ].map(r=>{
                          const pctOfMedicare = (r.rate / r.medicare) * 100
                          return (
                          <tr key={r.cpt} className="border-b border-separator last:border-0">
                            <td className="py-2 font-mono">{r.cpt}</td><td className="py-2 text-content-secondary">{r.desc}</td>
                            <td className="py-2 font-medium">${r.rate}</td><td className="py-2 text-content-secondary">${r.medicare}</td>
                            <td className={`py-2 font-medium ${pctOfMedicare >= 110 ? 'text-emerald-500' : 'text-amber-500'}`}>{pctOfMedicare.toFixed(0)}%</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-content-secondary text-sm">
              Select a contract to view details
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
