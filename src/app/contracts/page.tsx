'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { useFeeSchedules, usePayerConfigs, useUnderpaymentCheck, useExtractContractRates, useCreateFeeSchedule, useUpdateFeeSchedule } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/context'
import { UAE_ORG_IDS, US_ORG_IDS, filterPayersByCountry } from '@/lib/utils/region'
import { Scale, Search, AlertTriangle, Edit2, Plus } from 'lucide-react'

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-brand/10 text-brand-dark border border-brand/20' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-brand-pale0/10 text-brand-deep border border-brand-light/20' },
  expired: { label: 'Expired', className: 'bg-[#065E76]/10 text-[#065E76] border border-[#065E76]/20' },
  negotiating: { label: 'Negotiating', className: 'bg-brand/10 text-brand-dark border border-purple-500/20' },
}

const payerColors: Record<string, string> = {
  UHC: 'bg-blue-500',
  AETNA: 'bg-brand',
  MEDICARE: 'bg-teal-500',
  DAMAN: 'bg-brand',
  NAS: 'bg-brand-pale',
  BCBS: 'bg-blue-700',
}

function StatusBadgeContract({ status }: { status: string }) {
  const statusStyles = STATUS_BADGES
  const s = statusStyles[status] || { label: status, className: 'bg-surface-elevated text-content-secondary' }
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
  const [tab, setTab] = useState<'fee' | 'underpayments' | 'terms' | 'extract'>('fee')
  const [apiUnderpayments, setApiUnderpayments] = useState<any[]>([])
  React.useEffect(() => {
    api.get<{ data: any[] }>('/underpayments').then(r => setApiUnderpayments(r.data || [])).catch(() => toast.error('Failed to load underpayments'))
  }, [])
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [addingCpt, setAddingCpt] = useState(false)
  const [newCpt, setNewCpt] = useState({ cpt: '', description: '', contractedRate: '' })
  const [savingCpt, setSavingCpt] = useState(false)
  const { mutate: createFeeSchedule } = useCreateFeeSchedule()

  const { data: apiFeeResult } = useFeeSchedules({ limit: 200 })
  const { data: apiPayerCfgResult } = usePayerConfigs()

  // Source of truth: payer_config (seeded with 20 US payers), joined with fee-schedules
  const apiContracts = (() => {
    const configs = apiPayerCfgResult?.data || []
    const fees = apiFeeResult?.data || []
    if (!configs.length) return []
    return configs.map((cfg: any) => {
      const payerKey = cfg.availity_payer_id || cfg.payer_id || ''
      const payerFees = fees.filter((f: any) => f.payer_id === cfg.payer_id || f.payer_id === cfg.id)
      return {
        id: cfg.id || cfg.payer_id,
        payer: cfg.payer_name || payerKey,
        payerId: payerKey.replace(/\s/g, '').toUpperCase().slice(0, 8),
        client: '—', clientId: '',  // payer configs are org-level, not per client
        status: 'active' as const,
        effective: cfg.created_at?.slice(0, 10) || '2025-01-01',
        expiry: null,
        paymentTerms: `${cfg.timely_filing_days || 365} day timely filing`,
        timelyFiling: cfg.timely_filing_days || 365,
        appealDeadline: 60,
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

  const allContracts = filterPayersByCountry(
    apiContracts.filter(c => {
      if (!c.clientId) return true
      if (selectedClient) return c.clientId === selectedClient.id
      // Region filtering handled by backend via useClientParams
      return true
    }),
    country
  )
  const filtered = allContracts.filter(c =>
    !search || c.payer.toLowerCase().includes(search.toLowerCase()) || c.client.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = allContracts.filter(c => c.status === 'active').length
  const expiringSoon = allContracts.filter(c => (c.status as string) === 'expiring_soon').length
  const totalUnderpayments = apiUnderpayments.length

  const TABS = [
    { id: 'fee', label: 'Fee Schedule' },
    { id: 'underpayments', label: 'Underpayment Report' },
    { id: 'terms', label: 'Contract Terms' },
    { id: 'extract', label: 'AI Rate Extract' },
  ] as const

  const [selected, setSelected] = useState<typeof allContracts[0] | null>(null)

  const ContractStatusBadge = ({ status }: { status: string }) => <StatusBadgeContract status={status} />

  return (
    <ModuleShell title="Contract Manager" subtitle="Payer contracts, fee schedules, and underpayment detection">
      {!apiContracts.length && <div className='mx-4 mb-4 px-4 py-2.5 bg-brand-pale0/10 border border-brand-light/30 rounded-lg flex items-center gap-2 text-xs text-brand-deep'><AlertTriangle size={13} className='shrink-0'/>Connecting to live contract data…</div>}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KPICard label={t('contracts','activeContracts')} value={activeCount} icon={<Scale size={20}/>} />
        <KPICard label={t('contracts','expiring90')} value={expiringSoon} trend="down" />
        <KPICard label={t('contracts','underpayAlerts')} value={totalUnderpayments} />
        <KPICard label={t('contracts','totalPayers')} value={allContracts.length} />
      </div>

      {expiringSoon > 0 && (
        <div className="bg-brand-pale0/10 border border-brand-light/20 rounded-lg p-3 mb-4 text-[12px] text-brand-deep flex items-center gap-2">
          <AlertTriangle size={14} /> {expiringSoon} contract(s) expiring within 90 days — review and renegotiate
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-340px)]">
        {/* Left panel — contract list */}
        <div className="w-[40%] flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payer or client…"
              className="w-full bg-surface-elevated rounded-btn pl-8 pr-3 py-2 text-[12px] text-content-secondary placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-brand/30 border border-separator" />
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
              <div className="flex gap-2 items-center gap-3 px-5 py-4 border-b border-separator pb-1 shrink-0">
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
              <div className="flex gap-2 border-b border-separator pb-1 px-4 shrink-0">
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
                      <thead><tr className="border-b border-separator text-[11px] text-content-tertiary tracking-wider">
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
                                  className="w-20 bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-secondary focus:outline-none" />
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
                            <td className="py-2 pr-3"><input value={newCpt.cpt} onChange={e=>setNewCpt(p=>({...p,cpt:e.target.value}))} placeholder="99213" className="w-20 bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-secondary focus:outline-none font-mono"/></td>
                            <td className="py-2 pr-3"><input value={newCpt.description} onChange={e=>setNewCpt(p=>({...p,description:e.target.value}))} placeholder="Description" className="w-full bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-secondary focus:outline-none"/></td>
                            <td className="py-2 pr-3"><input value={newCpt.contractedRate} onChange={e=>setNewCpt(p=>({...p,contractedRate:e.target.value}))} placeholder="0.00" className="w-20 bg-surface-elevated border border-brand/40 rounded px-1.5 py-0.5 text-[12px] text-content-secondary focus:outline-none"/></td>
                            <td colSpan={3} className="py-2 pr-3">
                              <div className="flex gap-2">
                                <button
                                  disabled={savingCpt || !newCpt.cpt}
                                  onClick={async () => {
                                    if (!newCpt.cpt) { toast.warning('CPT code is required'); return }
                                    setSavingCpt(true)
                                    try {
                                      await createFeeSchedule({
                                        payer_id: selected?.id,
                                        cpt_code: newCpt.cpt,
                                        description: newCpt.description || undefined,
                                        contracted_rate: parseFloat(newCpt.contractedRate) || 0,
                                        effective_date: new Date().toISOString().split('T')[0],
                                      } as any)
                                      toast.success(`CPT ${newCpt.cpt} saved to fee schedule`)
                                      setAddingCpt(false)
                                      setNewCpt({ cpt: '', description: '', contractedRate: '' })
                                    } catch {
                                      toast.error('Failed to save CPT — please try again')
                                    } finally {
                                      setSavingCpt(false)
                                    }
                                  }}
                                  className="text-[11px] bg-brand text-white px-2.5 py-1 rounded disabled:opacity-50"
                                >{savingCpt ? 'Saving…' : 'Save'}</button>
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
                    {apiUnderpayments.length > 0 && (
                      <div className="bg-brand-pale0/5 border border-brand-light/20 rounded-lg p-3 mb-4 text-[12px] text-brand-deep">
                        {apiUnderpayments.length} underpayment{apiUnderpayments.length !== 1 ? 's' : ''} detected
                        &nbsp;—&nbsp;${apiUnderpayments.reduce((s: number, u: any) => s + Math.abs(Number(u.variance) || 0), 0).toFixed(2)} total at risk
                      </div>
                    )}
                    {apiUnderpayments.length === 0 ? (
                      <p className="text-[13px] text-content-tertiary text-center py-12">No underpayments detected — auto-posting compares paid vs contracted rates</p>
                    ) : (
                      <table className="w-full text-[12px]">
                        <thead><tr className="border-b border-separator text-[11px] text-content-tertiary tracking-wider">
                          {['Claim','Patient','CPT','Expected','Paid','Variance','Status','Action'].map(h => (
                            <th key={h} className="text-left py-2 pr-3">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {apiUnderpayments.map((u: any) => (
                            <tr key={u.id} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                              <td className="py-2.5 pr-3 font-mono text-content-primary">{u.claim_number || u.claim_id?.slice(0,8)}</td>
                              <td className="py-2.5 pr-3 text-content-secondary">{u.patient_name || '—'}</td>
                              <td className="py-2.5 pr-3 font-mono">{u.cpt_code}</td>
                              <td className="py-2.5 pr-3 text-content-primary">${Number(u.expected_amount || 0).toFixed(2)}</td>
                              <td className="py-2.5 pr-3 text-content-primary">${Number(u.paid_amount || 0).toFixed(2)}</td>
                              <td className="py-2.5 pr-3 text-[#065E76] font-medium">−${Math.abs(Number(u.variance) || 0).toFixed(2)}</td>
                              <td className="py-2.5 pr-3">
                                <span className={`text-[11px] px-1.5 py-0.5 rounded ${u.status === 'resolved' ? 'bg-brand/10 text-brand-dark' : 'bg-brand-pale0/10 text-brand-deep'}`}>{u.status || 'open'}</span>
                              </td>
                              <td className="py-2.5">
                                {u.status !== 'resolved' && (
                                  <button onClick={async () => {
                                    try {
                                      await api.patch(`/underpayments/${u.id}`, { status: 'disputed', notes: 'Dispute initiated' })
                                      toast.success('Dispute initiated')
                                      setApiUnderpayments(prev => prev.map(x => x.id === u.id ? {...x, status: 'disputed'} : x))
                                    } catch { toast.error('Failed to dispute') }
                                  }}
                                    className="text-[11px] bg-brand-pale0/10 text-brand-deep border border-brand-light/20 px-2 py-0.5 rounded hover:bg-brand-pale0/20 transition-colors">
                                    Dispute
                                  </button>
                                )}
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
                    ].map(row => (
                      <div key={row.label} className="flex gap-2 justify-between py-2.5 border-b border-separator pb-1 last:border-0">
                        <span className="text-[13px] text-content-secondary">{row.label}</span>
                        <span className="text-[13px] text-content-primary font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'extract' && (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-brand-dark mb-2">AI Contract Rate Extraction</h4>
                      <p className="text-[11px] text-content-secondary mb-3">Upload a payer contract PDF to automatically extract fee schedule rates, payment terms, and key clauses using AI.</p>
                      <div className="flex gap-2">
                        <label className="bg-brand text-white rounded-lg px-4 py-2 text-xs hover:bg-brand-mid transition-colors cursor-pointer">
                          Upload Contract PDF
                          <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            toast.info(`Uploading ${file.name}...`)
                            try {
                              const { api } = await import('@/lib/api-client')
                              const { url, key } = await api.post<{ url: string; key: string }>('/documents/upload-url', {
                                file_name: file.name, content_type: 'application/pdf', document_type: 'contract',
                              })
                              await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/pdf' } })
                              const doc = await api.post<{ id: string }>('/documents', {
                                file_name: file.name, s3_key: key, document_type: 'contract', doc_type: 'contract',
                                content_type: 'application/pdf', file_size: file.size,
                              })
                              toast.success(`${file.name} uploaded — triggering AI extraction...`)
                              await api.post(`/documents/${doc.id}/textract`, {})
                              toast.success('Textract processing started — rates will appear shortly')
                            } catch (err) {
                              toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                            }
                            e.target.value = ''
                          }} />
                        </label>
                        <button onClick={async () => {
                          toast.info('Re-extracting rates from current contract...')
                          try {
                            const { api } = await import('@/lib/api-client')
                            const docs = await api.get<{ data: any[] }>('/documents', { document_type: 'contract', limit: 1, sort: '-created_at' })
                            const contractDoc = docs?.data?.[0]
                            if (!contractDoc) { toast.error('No contract document found — upload one first'); return }
                            await api.post(`/documents/${contractDoc.id}/extract-rates`, { payer_id: selected?.payerId })
                            toast.success('Rate extraction complete')
                          } catch (err) { toast.error(`Re-extraction failed: ${err instanceof Error ? err.message : 'Ensure a contract PDF is uploaded'}`) }
                        }} className="bg-brand/10 text-brand-dark rounded-lg px-4 py-2 text-xs hover:bg-brand/10 transition-colors">Re-Extract Current</button>
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
                            <td className={`py-2 font-medium ${pctOfMedicare >= 110 ? 'text-brand-dark' : 'text-brand-deep'}`}>{pctOfMedicare.toFixed(0)}%</td>
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
