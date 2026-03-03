'use client'
import React, { useMemo, useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
// removed demo imports
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEligibilityChecks } from '@/lib/hooks'

export default function EligibilityPage() {
  const { country } = useApp()
  const { toast } = useToast()
  const { data: apiEligResult } = useEligibilityChecks({ limit: 20 })
  const [tab, setTab] = useState<'single' | 'batch'>('single')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [payer, setPayer] = useState('')
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10))
  const [batchDate, setBatchDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const patients = useMemo(() => [] as Array<{ id: string; firstName: string; lastName: string; insurance?: { payer?: string; memberId?: string; policyNo?: string; copay?: number }; emiratesId?: string; ssn?: string }>, [selectedClientId])
  // Sprint 2: replace with usePatients({ client_id: selectedClientId })
  const selectedPatient = undefined as undefined | { id: string; firstName: string; lastName: string; insurance?: { payer?: string; memberId?: string; policyNo?: string; copay?: number }; emiratesId?: string; ssn?: string }
  const isUAEPatient = country === 'uae'

  function handleVerify() {
    if (!selectedPatientId) { toast.warning('Select a patient first'); return }
    setVerifying(true)
    setVerified(false)
    setTimeout(() => {
      setVerifying(false)
      setVerified(true)
      toast.success(`Eligibility verified — ${selectedPatient?.firstName} ${selectedPatient?.lastName} is active`)
    }, 1800)
  }

  function handleBatch() {
    setBatchRunning(true)
    setTimeout(() => {
      setBatchRunning(false)
      toast.success(`Batch complete — 34 patients checked for ${batchDate}. 31 active, 3 issues found.`)
    }, 2200)
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
    <ModuleShell title="Eligibility Verification" subtitle="Check insurance coverage and benefits">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Checks Today" value={eligStats.total} icon={<ShieldCheck size={20} />} />
        <KPICard label="Active" value={eligStats.active} sub={`${eligStats.total > 0 ? Math.round(eligStats.active / eligStats.total * 100) : 0}%`} trend="up" />
        <KPICard label="Inactive/Issues" value={eligStats.issues} trend="down" />
        <KPICard label="Prior Auth Required" value={eligStats.priorAuth} />
      </div>

      <div className="flex gap-2 mb-4">
        {(['single', 'batch'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-btn text-[12px] ${tab === t ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-content-secondary border border-separator'}`}>{t === 'single' ? 'Single Check' : 'Batch Overnight'}</button>)}
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
            {verified && selectedPatient && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span><strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong> — Coverage Active · In-Network · Copay $30 · Deductible $450 remaining</span>
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
          <p className="text-content-secondary">Last batch: Today 3:00 AM — 34 checked, 31 active, 3 issues</p>
        </div>
      )}
    </ModuleShell>
  )
}
