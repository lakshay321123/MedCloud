'use client'
import React, { useMemo, useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { demoClients, demoPatients } from '@/lib/demo-data'
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEligibilityChecks } from '@/lib/hooks'

const demoChecks = [
  { id: 'ELG-001', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UnitedHealthcare', status: 'active', network: 'In-Network', copay: '$30', deductible: '$450 remaining', priorAuth: 'No', dos: '2026-03-02' },
  { id: 'ELG-002', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', status: 'active', network: 'In-Network', copay: '$25', deductible: '$200 remaining', priorAuth: 'No', dos: '2026-03-02' },
  { id: 'ELG-003', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', status: 'active', network: 'In-Network', copay: '0%', deductible: 'N/A', priorAuth: 'No', dos: '2026-03-02' },
  { id: 'ELG-004', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', status: 'active', network: 'In-Network', copay: '20%', deductible: '$0 remaining', priorAuth: 'Yes — Radiology', dos: '2026-03-02' },
  { id: 'ELG-005', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', status: 'inactive', network: '-', copay: '-', deductible: '-', priorAuth: 'N/A', dos: '2026-03-02' },
  { id: 'ELG-006', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', status: 'active', network: 'In-Network', copay: '20%', deductible: 'AED 500 remaining', priorAuth: 'No', dos: '2026-03-02' },
]

export default function EligibilityPage() {
  const { country } = useApp()
  const { toast } = useToast()
  const { data: apiEligResult } = useEligibilityChecks({ limit: 20 })
  const [tab, setTab] = useState<'single' | 'batch'>('single')
  const [selectedClientId, setSelectedClientId] = useState(demoClients[0].id)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [payer, setPayer] = useState('')
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10))
  const [batchDate, setBatchDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const patients = useMemo(() => demoPatients.filter(p => p.clientId === selectedClientId), [selectedClientId])
  const selectedPatient = patients.find(p => p.id === selectedPatientId)
  const isUAEPatient = (selectedPatient ? demoClients.find(c => c.id === selectedPatient.clientId)?.region : country) === 'uae'

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
    : demoChecks.map(c => ({
        id: c.id,
        patientName: c.patient,
        status: c.status,
        priorAuthRequired: c.priorAuth.startsWith('Yes'),
      }))

  const eligStats = {
    total: apiEligResult?.meta?.total ?? demoChecks.length,
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
                {demoClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <tbody>{demoChecks.map(c => (
                <React.Fragment key={c.id}>
                  <tr
                    onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                    className="table-row border-b border-separator cursor-pointer hover:bg-surface-elevated transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{c.patient}</td><td className="px-4 py-3">{c.payer}</td><td className="px-4 py-3">{c.status === 'active' ? <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 size={12} />Active</span> : <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} />Inactive</span>}</td><td className="px-4 py-3">{c.network}</td><td className="px-4 py-3">{c.copay}</td><td className="px-4 py-3">{c.deductible}</td><td className={`px-4 py-3 ${c.priorAuth.startsWith('Yes') ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-content-secondary'}`}>{c.priorAuth}</td>
                  </tr>
                  {expandedRow === c.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-surface-elevated border-b border-separator">
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div><span className="text-content-secondary block">DOS</span>{c.dos}</div>
                          <div><span className="text-content-secondary block">Network</span>{c.network}</div>
                          <div><span className="text-content-secondary block">Prior Auth</span>
                            <span className={c.priorAuth.startsWith('Yes') ? 'text-amber-500 font-medium' : ''}>{c.priorAuth}</span>
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
