'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import { useClaims } from '@/lib/hooks'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { FileText, DollarSign, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '@/lib/context'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'

export default function WatchTrackPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const { t } = useT()
  const [expanded, setExpanded] = useState<string | null>(null)
  const { currentUser, selectedClient, country } = useApp()
  const { data: apiResult } = useClaims({ limit: 200 })
  const apiClaims = (apiResult?.data || []).map((c: any) => ({
    id: c.claim_number || c.id, patientName: c.patient_name || '', payer: c.payer_name || '',
    billed: Number(c.total_charges || 0), paid: Number(c.paid_amount || 0), status: c.status || '',
    dos: c.dos_from || '', age: c.dos_from ? Math.ceil((Date.now() - new Date(c.dos_from).getTime()) / 86400000) : 0,
    cptCodes: [], icdCodes: [], clientId: c.client_id || '',
  }))

  const allClaims = apiClaims
  const myClaims = allClaims.filter(c => {
    if (selectedClient) return c.clientId === selectedClient.id
    if (currentUser.role === 'client' || currentUser.role === 'provider')
      return c.clientId === currentUser.organization_id
    if (country === 'uae') return UAE_ORG_IDS.includes(c.clientId)
    if (country === 'usa') return US_ORG_IDS.includes(c.clientId)
    return true
  })
  const filtered = myClaims.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search) { const s = search.toLowerCase(); return c.patientName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || c.payer.toLowerCase().includes(s) }
    return true
  })

  const totalCharges = myClaims.reduce((s,c) => s + c.billed, 0)
  const totalPaid = myClaims.reduce((s,c) => s + c.paid, 0)

  return (
    <ModuleShell title="Watch & Track" subtitle="Track your claims and revenue">
      {!apiClaims.length && <div className='mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 text-xs text-amber-400'>API connecting…</div>}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label={t('watch','totalClaims')} value={myClaims.length} icon={<FileText size={20}/>}/>
        <KPICard label={t('watch','totalCharges')} value={`$${totalCharges.toLocaleString()}`} icon={<DollarSign size={20}/>}/>
        <KPICard label={t('watch','collected')} value={`$${totalPaid.toLocaleString()}`} sub={`${((totalPaid/totalCharges)*100).toFixed(1)}% rate`} trend="up"/>
        <KPICard label={t('watch','avgDaysToPay')} value="22" icon={<Clock size={20}/>}/>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("watch","searchClaims")} className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary max-w-xs"/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Statuses</option>
          {['submitted','in_process','paid','partial_pay','denied','appealed'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="w-8"></th>
            <th className="text-left px-4 py-3">Claim #</th><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Payer</th>
            <th className="text-left px-4 py-3">DOS</th><th className="text-right px-4 py-3">Charges</th><th className="text-right px-4 py-3">Paid</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Age</th>
          </tr></thead>
          <tbody>{filtered.map(c=>(
            <React.Fragment key={c.id}>
              <tr onClick={()=>setExpanded(expanded===c.id?null:c.id)} className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
                <td className="pl-3 text-content-tertiary">{expanded===c.id?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3">{c.patientName}</td>
                <td className="px-4 py-3 text-content-secondary text-xs">{c.payer}</td>
                <td className="px-4 py-3 text-content-secondary text-xs">{c.dos}</td>
                <td className="px-4 py-3 text-right">${c.billed.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{c.paid > 0 ? `$${c.paid.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} small/></td>
                <td className="px-4 py-3 text-right text-xs text-content-secondary">{c.age}d</td>
              </tr>
              {expanded===c.id&&(
                <tr className="border-b border-separator bg-surface-elevated">
                  <td colSpan={9} className="px-8 py-4">
                    <div className="grid grid-cols-3 gap-6 text-xs">
                      <div>
                        <p className="text-content-tertiary uppercase tracking-wider mb-2 font-semibold">Claim Detail</p>
                        <div className="space-y-1">
                          <p><span className="text-content-secondary">CPT Codes:</span> <span className="font-mono">{(c.cptCodes??[]).join(', ')||'—'}</span></p>
                          <p><span className="text-content-secondary">ICD Codes:</span> <span className="font-mono">{(c.icdCodes??[]).join(', ')||'—'}</span></p>
                          <p><span className="text-content-secondary">Billed:</span> <span className="font-mono">${c.billed.toLocaleString()}</span></p>
                          <p><span className="text-content-secondary">Paid:</span> <span className="font-mono text-emerald-600 dark:text-emerald-400">{c.paid>0?`$${c.paid.toLocaleString()}`:'—'}</span></p>
                        </div>
                      </div>
                      <div>
                        <p className="text-content-tertiary uppercase tracking-wider mb-2 font-semibold">Payer Info</p>
                        <div className="space-y-1">
                          <p><span className="text-content-secondary">Payer:</span> {c.payer}</p>
                          <p><span className="text-content-secondary">Age:</span> {c.age} days</p>
                          <p><span className="text-content-secondary">DOS:</span> {c.dos}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-content-tertiary uppercase tracking-wider mb-2 font-semibold">Status</p>
                        <div className="space-y-2">
                          <StatusBadge status={c.status} small/>
                          {c.status==='denied'&&<p className="text-red-600 dark:text-red-400 flex items-center gap-1"><AlertTriangle size={12}/>Denial — contact billing team</p>}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}</tbody>
        </table>
      </div>

      {/* ── Claim Timeline ── */}
      <div className="card p-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">Claim Lifecycle Timeline</h3>
        <div className="space-y-3">
          {[
            {step:'Charge Captured',date:'Mar 1',status:'done',detail:'Office visit E/M 99214 — Dr. Smith'},
            {step:'Coded & Scrubbed',date:'Mar 1',status:'done',detail:'ICD-10: M54.5, CPT: 99214 — Clean claim'},
            {step:'Submitted to Payer',date:'Mar 2',status:'done',detail:'837P sent via Availity to Aetna'},
            {step:'Acknowledged (277CA)',date:'Mar 2',status:'done',detail:'Claim accepted for adjudication'},
            {step:'In Adjudication',date:'Mar 3',status:'current',detail:'Estimated completion: Mar 15–20'},
            {step:'Payment / Denial',date:'—',status:'pending',detail:'Expected: 14–21 days from submission'},
            {step:'Posted & Reconciled',date:'—',status:'pending',detail:'Auto-posting enabled for this payer'},
          ].map((s,i)=>(
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border-2 ${s.status==='done'?'bg-emerald-500 border-emerald-500':s.status==='current'?'bg-brand border-brand animate-pulse':'border-separator bg-surface-elevated'}`}/>
                {i<6&&<div className={`w-0.5 h-8 ${s.status==='done'?'bg-emerald-500/30':'bg-separator'}`}/>}
              </div>
              <div className="flex-1 -mt-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${s.status==='pending'?'text-content-tertiary':'text-content-primary'}`}>{s.step}</span>
                  <span className="text-[10px] text-content-tertiary">{s.date}</span>
                </div>
                <p className="text-[10px] text-content-secondary">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  )
}
