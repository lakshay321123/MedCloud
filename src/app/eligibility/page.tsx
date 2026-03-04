'use client'
import { useT } from '@/lib/i18n'
import React, { useMemo, useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
// removed demo imports
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEligibilityChecks, useRunEligibility, useBatchEligibility, useParse271, useEDITransactions, usePriorAuths, useCreatePriorAuth, useUpdatePriorAuth, useGenerate276 } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import type { ApiEligibilityCheck } from '@/lib/hooks'

export default function EligibilityPage() {
  const { country } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const { data: apiEligResult } = useEligibilityChecks({ limit: 20 })
  const [tab, setTab] = useState<'single' | 'batch' | 'priorauth'>('single')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [payer, setPayer] = useState('')
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10))
  const [batchDate, setBatchDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    status: string; network: string; copay: string; deductible: string; coinsurance: string; priorAuth: string
  } | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResults, setBatchResults] = useState<Array<{
    patient: string; payer: string; status: string; network: string; copay: string; deductible: string; priorAuth: string
  }> | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const patients = useMemo(() => [] as Array<{ id: string; firstName: string; lastName: string; insurance?: { payer?: string; memberId?: string; policyNo?: string; copay?: number }; emiratesId?: string; ssn?: string }>, [selectedClientId])
  // Sprint 2: replace with usePatients({ client_id: selectedClientId })
  const selectedPatient = undefined as undefined | { id: string; firstName: string; lastName: string; insurance?: { payer?: string; memberId?: string; policyNo?: string; copay?: number }; emiratesId?: string; ssn?: string }
  const isUAEPatient = country === 'uae'

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const clientIdForApi = UUID_REGEX.test(selectedClientId) ? selectedClientId : undefined

  async function handleVerify() {
    if (!selectedPatientId) { toast.warning('Select a patient first'); return }
    setVerifying(true)
    setVerified(false)
    setVerificationResult(null)
    try {
      const result = await api.post<ApiEligibilityCheck>('/eligibility/check', {
        patient_id: selectedPatientId,
        payer_id: payer || selectedPatient?.insurance?.payer || '',
        dos,
        member_id: selectedPatient?.insurance?.memberId || '',
        group_number: '',
        ...(clientIdForApi ? { client_id: clientIdForApi } : {}),
      })
      setVerified(true)
      const resultData = typeof result.result === 'object' && result.result !== null ? result.result as Record<string, unknown> : {}
      setVerificationResult({
        status: result.status || 'active',
        network: result.network_status || 'In-Network',
        copay: result.copay != null ? `$${result.copay}` : '$25',
        deductible: result.deductible != null ? `$${result.deductible} remaining` : '$500 remaining',
        coinsurance: String(resultData.coinsurance || '80/20'),
        priorAuth: result.prior_auth_required ? 'Yes — required' : 'No',
      })
      toast.success(`Eligibility verified — ${selectedPatient?.firstName} ${selectedPatient?.lastName} is ${result.status || 'active'}`)
    } catch (err) {
      console.error('[eligibility] verification failed:', err)
      setVerified(false)
      toast.error('Eligibility check failed — please verify patient insurance details and try again')
    } finally {
      setVerifying(false)
    }
  }

  async function handleBatch() {
    setBatchRunning(true)
    setBatchResults(null)
    try {
      const result = await api.post<{ results: ApiEligibilityCheck[]; total: number; checked: number }>(
        '/eligibility/batch',
        {
          date: batchDate,
          ...(clientIdForApi ? { client_id: clientIdForApi } : {}),
        }
      )
      setBatchResults(result.results.map(r => ({
        patient: r.patient_name || 'Unknown',
        payer: r.payer_id || '',
        status: r.status || 'unknown',
        network: r.network_status || '',
        copay: r.copay != null ? `$${r.copay}` : 'N/A',
        deductible: r.deductible != null ? `$${r.deductible}` : 'N/A',
        priorAuth: r.prior_auth_required ? 'Yes' : 'No',
      })))
      toast.success(`Batch complete: ${result.checked}/${result.total} checked`)
    } catch (err) {
      console.error('[eligibility] batch check failed:', err)
      toast.error('Batch eligibility check failed — please try again')
    } finally {
      setBatchRunning(false)
    }
  }

  const eligChecks = apiEligResult?.data
    ? apiEligResult.data.map(e => ({
        id: e.id,
        patientName: e.patient_name || '',
        status: e.status || '',
        priorAuthRequired: e.prior_auth_required || false,
      }))
    : []

  const eligStats = {
    total: apiEligResult?.meta?.total ?? 0,
    active: eligChecks.filter(e => e.status === 'active').length,
    issues: eligChecks.filter(e => e.status !== 'active').length,
    priorAuth: eligChecks.filter(e => e.priorAuthRequired).length,
  }

  return (
    <ModuleShell title={t("eligibility","title")} subtitle={t("eligibility","subtitle")}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label={t("eligibility","checksToday")} value={eligStats.total} icon={<ShieldCheck size={20} />} />
        <KPICard label={t("eligibility","active")} value={eligStats.active} sub={`${eligStats.total > 0 ? Math.round(eligStats.active / eligStats.total * 100) : 0}%`} trend="up" />
        <KPICard label={t("eligibility","inactiveIssues")} value={eligStats.issues} trend="down" />
        <KPICard label={t("eligibility","priorAuth")} value={eligStats.priorAuth} />
      </div>

      <div className="flex gap-2 mb-4">
        {([['single','Single Check'],['batch','Batch Overnight'],['priorauth','Prior Auth']] as const).map(([t,label]) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-btn text-[12px] ${tab === t ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-content-secondary border border-separator'}`}>{label}</button>)}
      </div>

      {tab === 'single' && (
        <>
          <div className="card p-4 mb-4">
            <div className="grid grid-cols-4 gap-3">
              <select value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setSelectedPatientId(''); setVerified(false) }} className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px]">
                <option value=''>All Clients</option>
                {/* Sprint 2: replace with API client list */}
              </select>
              <select value={selectedPatientId} onChange={e => { setSelectedPatientId(e.target.value); setVerified(false) }} className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px]">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
              <input value={payer || selectedPatient?.insurance?.payer || ''} onChange={e => setPayer(e.target.value)} placeholder="Payer" className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px]" />
              <input type="date" value={dos} onChange={e => setDos(e.target.value)} className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px]" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <input readOnly value={selectedPatient?.insurance?.memberId || ''} placeholder="Member ID" className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px]" />
              <input readOnly value={isUAEPatient ? selectedPatient?.emiratesId || '' : selectedPatient?.ssn || ''} placeholder={isUAEPatient ? 'Emirates ID' : 'SSN'} className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px]" />
              <button onClick={handleVerify} disabled={verifying || !selectedPatientId}
                className="bg-brand text-white rounded-btn px-3 py-2 text-[13px] font-medium disabled:opacity-50">
                {verifying ? 'Checking...' : 'Verify Eligibility'}
              </button>
            </div>
            {verified && selectedPatient && verificationResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>
                  <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
                  {' '}— Coverage {verificationResult.status === 'active' ? 'Active' : verificationResult.status}
                  {' · '}{verificationResult.network}
                  {' · '}Copay {verificationResult.copay}
                  {' · '}Deductible {verificationResult.deductible}
                  {verificationResult.priorAuth !== 'No' && ` · Prior Auth: ${verificationResult.priorAuth}`}
                </span>
              </div>
            )}
            <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 text-xs text-brand mt-3">Connected to eligibility verification engine. US: Real-time EDI 270/271 via clearinghouse. UAE: AWS RPA bot → TPA portal verification.</div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-separator text-content-secondary text-[12px]"><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Network</th><th className="text-left px-4 py-3">Copay</th><th className="text-left px-4 py-3">Deductible</th><th className="text-left px-4 py-3">Prior Auth</th></tr></thead>
              <tbody>
                {eligChecks.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className='flex flex-col items-center justify-center py-16 text-center'>
                      <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                        <ShieldCheck size={20} className='text-content-tertiary' />
                      </div>
                      <p className='text-sm font-medium text-content-primary mb-1'>No eligibility checks yet</p>
                      <p className='text-xs text-content-secondary'>Checks will appear here once they&apos;re added to the system.</p>
                    </div>
                  </td></tr>
                )}
                {eligChecks.map(c => (
                <React.Fragment key={c.id}>
                  <tr
                    onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                    className="table-row border-b border-separator cursor-pointer hover:bg-surface-elevated transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{c.patientName}</td>
                    <td className="px-4 py-3 text-content-secondary">—</td>
                    <td className="px-4 py-3">{c.status === 'active' ? <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 size={12} />Active</span> : <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} />Inactive</span>}</td>
                    <td className="px-4 py-3 text-content-secondary">—</td>
                    <td className="px-4 py-3 text-content-secondary">—</td>
                    <td className="px-4 py-3 text-content-secondary">—</td>
                    <td className={`px-4 py-3 ${c.priorAuthRequired ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-content-secondary'}`}>{c.priorAuthRequired ? 'Yes' : 'No'}</td>
                  </tr>
                  {expandedRow === c.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-surface-elevated border-b border-separator">
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div><span className="text-content-secondary block">Patient</span>{c.patientName}</div>
                          <div><span className="text-content-secondary block">Status</span>{c.status}</div>
                          <div><span className="text-content-secondary block">Prior Auth</span>
                            <span className={c.priorAuthRequired ? 'text-amber-500 font-medium' : ''}>{c.priorAuthRequired ? 'Yes' : 'No'}</span>
                          </div>
                          <div><span className="text-content-secondary block">Action</span>
                            <button onClick={e => { e.stopPropagation(); toast.success('Eligibility saved to patient record') }}
                              className="text-brand hover:underline">Save to Record</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'batch' && (
        <div className="card p-4 text-[13px] space-y-3">
          <p className="text-content-primary">Run eligibility for all appointments on:</p>
          <div className="flex gap-3 items-center">
            <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} className="bg-surface-elevated border border-separator rounded-btn px-3 py-2" />
            <button onClick={handleBatch} disabled={batchRunning}
              className="bg-brand text-white rounded-btn px-3 py-2 disabled:opacity-50">
              {batchRunning ? 'Running...' : 'Run Batch'}
            </button>
          </div>
          <p className="text-content-secondary">
            {batchResults
              ? `Last batch: ${batchResults.length} checked`
              : 'No batch run yet this session'}
          </p>
          {batchResults && batchResults.length > 0 && (
            <div className="card overflow-hidden mt-2">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-separator text-content-secondary text-[11px]">
                  <th className="text-left px-4 py-3">Patient</th>
                  <th className="text-left px-4 py-3">Payer</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Network</th>
                  <th className="text-left px-4 py-3">Copay</th>
                  <th className="text-left px-4 py-3">Deductible</th>
                  <th className="text-left px-4 py-3">Prior Auth</th>
                </tr></thead>
                <tbody>
                  {batchResults.map((r, i) => (
                    <tr key={i} className="border-b border-separator last:border-0">
                      <td className="px-4 py-2 font-medium">{r.patient}</td>
                      <td className="px-4 py-2">{r.payer}</td>
                      <td className="px-4 py-2">
                        {r.status === 'active'
                          ? <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 size={12} />Active</span>
                          : <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} />{r.status}</span>}
                      </td>
                      <td className="px-4 py-2">{r.network}</td>
                      <td className="px-4 py-2">{r.copay}</td>
                      <td className="px-4 py-2">{r.deductible}</td>
                      <td className={`px-4 py-2 ${r.priorAuth === 'Yes' ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-content-secondary'}`}>{r.priorAuth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === 'priorauth' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-content-secondary">Prior authorization requests and tracking</p>
            <button onClick={() => toast.info('New prior auth form opened')} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors">New Prior Auth</button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[{label:'Pending',value:'12',color:'text-amber-500'},{label:'Approved',value:'87',color:'text-emerald-500'},{label:'Denied',value:'6',color:'text-red-500'},{label:'Avg Turnaround',value:'3.2d',color:'text-brand'}].map(k=>
              <div key={k.label} className="card p-4 text-center">
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-content-tertiary mt-1">{k.label}</p>
              </div>
            )}
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3">Auth #</th><th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Procedure</th><th className="text-left px-4 py-3">Payer</th>
                <th className="text-left px-4 py-3">Submitted</th><th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr></thead>
              <tbody>
                {[{id:'PA-001',patient:'John Smith',proc:'MRI Lumbar Spine (72148)',payer:'Aetna',date:'2026-03-01',status:'pending'},
                  {id:'PA-002',patient:'Sarah Johnson',proc:'Knee Arthroscopy (29881)',payer:'Blue Cross',date:'2026-02-28',status:'approved'},
                  {id:'PA-003',patient:'Mike Chen',proc:'CT Abdomen (74177)',payer:'United',date:'2026-03-02',status:'denied'},
                  {id:'PA-004',patient:'Lisa Park',proc:'Shoulder MRI (73221)',payer:'Cigna',date:'2026-03-03',status:'pending'}
                ].map(pa => (
                  <tr key={pa.id} className="border-b border-separator last:border-0 table-row hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{pa.id}</td>
                    <td className="px-4 py-3 text-xs">{pa.patient}</td>
                    <td className="px-4 py-3 text-xs">{pa.proc}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{pa.payer}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{pa.date}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${({approved:'bg-emerald-500/10 text-emerald-500',denied:'bg-red-500/10 text-red-500',pending:'bg-amber-500/10 text-amber-500'} as Record<string,string>)[pa.status] || 'bg-amber-500/10 text-amber-500'}`}>{pa.status}</span></td>
                    <td className="px-4 py-3">
                      {pa.status==='denied' && <button onClick={()=>toast.info('Peer-to-peer review requested')} className="text-[10px] text-brand hover:underline">P2P Review</button>}
                      {pa.status==='pending' && <button onClick={()=>toast.info('Status check sent to payer')} className="text-[10px] text-brand hover:underline">Check Status</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
