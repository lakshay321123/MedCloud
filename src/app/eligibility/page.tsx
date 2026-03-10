'use client'
import { useT } from '@/lib/i18n'
import React, { useMemo, useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import {
  useEligibilityChecks, useBatchEligibility, usePriorAuths, useCreatePriorAuth,
  useUpdatePriorAuth, usePatients, usePayers, useCreateTask,
} from '@/lib/hooks'
import { api } from '@/lib/api-client'
import type { ApiEligibilityCheck, ApiPriorAuth, ApiPatient } from '@/lib/hooks'
import { ErrorBanner } from '@/components/shared/ApiStates'
import { filterByRegion } from '@/lib/utils/region'
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, Search, X, Plus,
  RefreshCw, ChevronDown, ChevronUp, FileText, Phone, Calendar,
  User, Building2, CreditCard, Activity, Eye, Save,
} from 'lucide-react'

/* ── status helpers ──────────────────────────────────────────────────────── */

const ELIG_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:   { label: 'Active',   color: 'text-brand-dark dark:text-brand-dark', icon: <CheckCircle2 size={12} /> },
  inactive: { label: 'Inactive', color: 'text-red-600 dark:text-red-400',         icon: <AlertTriangle size={12} /> },
  pending:  { label: 'Pending',  color: 'text-brand-deep dark:text-brand-deep',     icon: <Clock size={12} /> },
  unknown:  { label: 'Unknown',  color: 'text-content-secondary',                 icon: <Clock size={12} /> },
}

const PA_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-brand-pale0/10 text-brand-deep' },
  submitted: { label: 'Submitted', cls: 'bg-brand/10 text-brand' },
  approved:  { label: 'Approved',  cls: 'bg-brand/10 text-brand-dark' },
  denied:    { label: 'Denied',    cls: 'bg-red-500/10 text-red-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-500/10 text-content-tertiary' },
}

type TabKey = 'single' | 'batch' | 'history' | 'priorauth'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main Page                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function EligibilityPage() {
  const { t } = useT()
  return (
    <ModuleShell title={t('eligibility', 'title')} subtitle={t('eligibility', 'subtitle')}>
      <EligibilityContent />
    </ModuleShell>
  )
}

function EligibilityContent() {
  const { t } = useT()
  const { toast } = useToast()

  const [tab, setTab] = useState<TabKey>('single')

  /* data hooks */
  const { data: eligResult, loading: eligLoading, error: eligError, refetch: refetchElig } = useEligibilityChecks({ limit: 200 })
  const { data: paResult, loading: paLoading, error: paError, refetch: refetchPA } = usePriorAuths({ limit: 200 })

  const { selectedClient, country, currentUser } = useApp()

  const eligChecksRaw = eligResult?.data || []
  const priorAuthsRaw = paResult?.data || []

  // Apply region filter — prevents US+UAE data mixing when "All Clients" is selected
  const eligChecks = filterByRegion(eligChecksRaw, currentUser?.organization_id || '', currentUser?.role || '', selectedClient?.id, country)
  const priorAuths = filterByRegion(priorAuthsRaw, currentUser?.organization_id || '', currentUser?.role || '', selectedClient?.id, country)

  /* KPIs */
  const kpis = useMemo(() => {
    const total = eligChecks.length
    const active = eligChecks.filter(e => e.status === 'active').length
    const issues = eligChecks.filter(e => e.status !== 'active' && e.status !== 'pending').length
    const authReq = eligChecks.filter(e => e.prior_auth_required).length
    const paPending = priorAuths.filter(pa => pa.status === 'pending' || pa.status === 'submitted').length
    const paApproved = priorAuths.filter(pa => pa.status === 'approved').length
    const paDenied = priorAuths.filter(pa => pa.status === 'denied').length
    return { total, active, issues, authReq, paPending, paApproved, paDenied, paTotal: priorAuths.length }
  }, [eligChecks, priorAuths])

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'single', label: 'Verify Eligibility' },
    { key: 'batch', label: 'Batch Check' },
    { key: 'history', label: 'Check History', count: kpis.total },
    { key: 'priorauth', label: 'Prior Auth', count: kpis.paTotal },
  ]

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <KPICard label="Checks Run" value={kpis.total} icon={<ShieldCheck size={18} />} />
        <KPICard label="Active" value={kpis.active} sub={kpis.total > 0 ? `${Math.round((kpis.active / kpis.total) * 100)}%` : '—'} trend="up" />
        <KPICard label="Issues" value={kpis.issues} trend={kpis.issues > 0 ? 'down' : undefined} />
        <KPICard label="Auth Required" value={kpis.authReq} />
        <KPICard label="PA Pending" value={kpis.paPending} />
        <KPICard label="PA Approved" value={kpis.paApproved} />
        <KPICard label="PA Denied" value={kpis.paDenied} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
              tab === tb.key
                ? 'bg-brand text-white shadow-sm'
                : 'text-content-tertiary border border-transparent hover:text-content-primary hover:bg-surface-elevated'
            }`}>
            {tb.label}
            {tb.count != null && <span className="ml-1 opacity-60">({tb.count})</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { refetchElig(); refetchPA() }}
            className="p-1.5 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {eligError && <ErrorBanner error={eligError} onRetry={refetchElig} />}

      {tab === 'single' && <SingleCheckTab />}
      {tab === 'batch' && <BatchCheckTab />}
      {tab === 'history' && <CheckHistoryTab checks={eligChecks} loading={eligLoading} />}
      {tab === 'priorauth' && <PriorAuthTab auths={priorAuths} loading={paLoading} onRefresh={refetchPA} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Tab 1 — Single Eligibility Check                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SingleCheckTab() {
  const { toast } = useToast()
  const { selectedClient, clients, country } = useApp()

  const [clientId, setClientId] = useState(selectedClient?.id || '')
  const [patientId, setPatientId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10))
  const [memberId, setMemberId] = useState('')
  const [groupNumber, setGroupNumber] = useState('')

  const { data: patientsResult } = usePatients({ client_id: clientId || undefined, limit: 500 })
  const { data: payersResult } = usePayers({ limit: 200 })
  const patients = patientsResult?.data || []
  const payers = payersResult?.data || []

  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ApiEligibilityCheck | null>(null)

  const selectedPatient = patients.find(p => p.id === patientId)

  // auto-fill member ID / payer when patient changes
  React.useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.insurance_member_id) setMemberId(selectedPatient.insurance_member_id)
      if (selectedPatient.insurance_payer) {
        const match = payers.find(p => p.name?.toLowerCase() === selectedPatient.insurance_payer?.toLowerCase())
        if (match) setPayerId(match.id)
      }
    }
  }, [selectedPatient, payers])

  async function handleVerify() {
    if (!patientId) { toast.warning('Select a patient first'); return }
    if (!payerId) { toast.warning('Select a payer first'); return }
    setChecking(true); setResult(null)
    try {
      const res = await api.post<ApiEligibilityCheck>('/eligibility/check', {
        patient_id: patientId, payer_id: payerId, dos,
        member_id: memberId, group_number: groupNumber,
        ...(clientId ? { client_id: clientId } : {}),
      })
      setResult(res)
      if (res.status === 'active') toast.success(`Eligibility verified — ${selectedPatient?.first_name} ${selectedPatient?.last_name} is active`)
      else toast.warning(`Eligibility status: ${res.status || 'unknown'}`)
    } catch {
      toast.error('Eligibility check failed — verify patient insurance details')
    } finally { setChecking(false) }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand" /> Real-Time Eligibility Verification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <LabeledSelect label="Client" value={clientId}
            onChange={v => { setClientId(v); setPatientId(''); setResult(null) }}
            options={[{ value: '', label: 'All clients' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />

          <div>
            <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Patient *</label>
            <select value={patientId} onChange={e => { setPatientId(e.target.value); setResult(null) }}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary">
              <option value="">Select patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}{p.insurance_payer ? ` — ${p.insurance_payer}` : ''}
                </option>
              ))}
            </select>
          </div>

          <LabeledSelect label="Payer" value={payerId} onChange={setPayerId}
            options={[{ value: '', label: 'Select payer' }, ...payers.map(p => ({ value: p.id, label: p.name || p.payer_code || p.id.slice(0, 8) }))]} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Date of Service</label>
            <input type="date" value={dos} onChange={e => setDos(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Member ID</label>
            <input value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Auto-filled from patient"
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary placeholder:text-content-tertiary" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Group Number</label>
            <input value={groupNumber} onChange={e => setGroupNumber(e.target.value)} placeholder="Optional"
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary placeholder:text-content-tertiary" />
          </div>
          <div className="flex items-end">
            <button onClick={handleVerify} disabled={checking || !patientId || !payerId}
              className="w-full bg-brand text-white rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50 hover:bg-brand-deep transition-colors flex items-center justify-center gap-2">
              {checking ? <><RefreshCw size={12} className="animate-spin" /> Checking…</> : <><ShieldCheck size={14} /> Verify</>}
            </button>
          </div>
        </div>

        <div className="bg-brand/5 border border-brand/20 rounded-lg px-3 py-2 text-[11px] text-brand flex items-start gap-2">
          <Activity size={14} className="mt-0.5 shrink-0" />
          <span>{country === 'uae'
            ? 'UAE: AWS RPA bot verifies through TPA portal. Fallback: manual TPA portal access.'
            : 'US: Real-time EDI 270/271 via Availity clearinghouse. Results in seconds.'}</span>
        </div>
      </div>

      {result && <EligibilityResultCard result={result} patient={selectedPatient} />}
    </div>
  )
}

/* ── Eligibility Result Card ─────────────────────────────────────────────── */

function EligibilityResultCard({ result, patient }: { result: ApiEligibilityCheck; patient?: ApiPatient }) {
  const isActive = result.status === 'active'
  const rd = typeof result.result === 'object' && result.result !== null ? result.result as Record<string, unknown> : {}
  return (
    <div className={`card p-5 border-l-4 ${isActive ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
      <div className="flex items-center gap-3 mb-4">
        {isActive
          ? <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center"><CheckCircle2 size={20} className="text-brand-dark" /></div>
          : <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={20} className="text-red-500" /></div>}
        <div>
          <p className="text-sm font-semibold text-content-primary">
            {patient ? `${patient.first_name} ${patient.last_name}` : result.patient_name || 'Patient'}
          </p>
          <p className={`text-xs font-medium ${isActive ? 'text-brand-dark dark:text-brand-dark' : 'text-red-600 dark:text-red-400'}`}>
            Coverage {result.status === 'active' ? 'Active' : result.status || 'Unknown'}
            {result.network_status && ` · ${result.network_status}`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BenefitField label="Copay" value={result.copay != null ? `$${result.copay}` : 'N/A'} icon={<CreditCard size={12} />} />
        <BenefitField label="Deductible Remaining" value={result.deductible != null ? `$${result.deductible}` : 'N/A'} icon={<CreditCard size={12} />} />
        <BenefitField label="Coinsurance" value={String(rd.coinsurance || rd.coinsurance_pct || 'N/A')} icon={<Activity size={12} />} />
        <BenefitField label="Prior Auth Required" value={result.prior_auth_required ? 'Yes' : 'No'}
          icon={result.prior_auth_required ? <AlertTriangle size={12} className="text-brand-deep" /> : <CheckCircle2 size={12} className="text-brand-dark" />} />
      </div>
      {(Boolean(rd.out_of_pocket_max) || Boolean(rd.plan_name)) && (
        <div className="mt-3 pt-3 border-t border-separator grid grid-cols-2 md:grid-cols-4 gap-4">
          {Boolean(rd.out_of_pocket_max) && <BenefitField label="OOP Max" value={`$${rd.out_of_pocket_max}`} icon={<CreditCard size={12} />} />}
          {Boolean(rd.plan_name) && <BenefitField label="Plan" value={String(rd.plan_name)} icon={<Building2 size={12} />} />}
          {Boolean(rd.group_number) && <BenefitField label="Group" value={String(rd.group_number)} icon={<FileText size={12} />} />}
          {result.dos && <BenefitField label="DOS" value={result.dos} icon={<Calendar size={12} />} />}
        </div>
      )}
    </div>
  )
}

function BenefitField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm font-medium text-content-primary">{value}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Tab 2 — Batch Check                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function BatchCheckTab() {
  const { toast } = useToast()
  const { selectedClient } = useApp()

  const [batchDate, setBatchDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ApiEligibilityCheck[] | null>(null)

  async function handleBatch() {
    setRunning(true); setResults(null)
    try {
      const res = await api.post<{ results: ApiEligibilityCheck[]; total: number; checked: number }>(
        '/eligibility/batch', { date: batchDate, ...(selectedClient ? { client_id: selectedClient.id } : {}) })
      setResults(res.results)
      toast.success(`Batch complete: ${res.checked}/${res.total} patients checked`)
    } catch { toast.error('Batch eligibility check failed') }
    finally { setRunning(false) }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-brand" /> Batch Eligibility — All Appointments for Date
        </h3>
        <p className="text-[13px] text-content-secondary mb-4">
          Automatically verify eligibility for every patient with an appointment on the selected date. Results saved to each patient record.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Appointment Date</label>
            <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)}
              className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary" />
          </div>
          <button onClick={handleBatch} disabled={running}
            className="bg-brand text-white rounded-lg px-5 py-2 text-[13px] font-medium disabled:opacity-50 hover:bg-brand-deep transition-colors flex items-center gap-2">
            {running ? <><RefreshCw size={12} className="animate-spin" /> Running…</> : <><Activity size={14} /> Run Batch</>}
          </button>
        </div>
      </div>

      {results && results.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-separator flex items-center justify-between">
            <p className="text-xs font-medium text-content-primary">{results.length} patients checked</p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-brand-dark">{results.filter(r => r.status === 'active').length} active</span>
              <span className="text-red-500">{results.filter(r => r.status !== 'active').length} issues</span>
              <span className="text-brand-deep">{results.filter(r => r.prior_auth_required).length} need auth</span>
              <button
                onClick={() => {
                  const win = window.open('', '_blank')
                  if (!win) { toast.error('Pop-up blocked — allow pop-ups to export PDF'); return }
                  const rows = results.map(r => `
                    <tr>
                      <td>${r.patient_name || 'Unknown'}</td>
                      <td>${r.status || '—'}</td>
                      <td>${r.network_status || '—'}</td>
                      <td>${r.copay != null ? '$' + r.copay : '—'}</td>
                      <td>${r.deductible != null ? '$' + r.deductible : '—'}</td>
                      <td>${r.prior_auth_required ? 'Required' : 'No'}</td>
                    </tr>`).join('')
                  win.document.write(`<!DOCTYPE html><html><head>
                    <title>Batch Eligibility Report — ${batchDate}</title>
                    <style>
                      body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1a1a1a; }
                      h1 { font-size: 16px; margin-bottom: 4px; }
                      p { color: #666; margin-bottom: 16px; }
                      table { width: 100%; border-collapse: collapse; }
                      th { background: #f5f5f7; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #ddd; }
                      td { padding: 7px 8px; border-bottom: 1px solid #eee; }
                      .active { color: #16a34a; font-weight: 600; }
                      .inactive { color: #dc2626; font-weight: 600; }
                      .auth { color: #d97706; font-weight: 600; }
                    </style>
                  </head><body>
                    <h1>Batch Eligibility Report</h1>
                    <p>Date: ${batchDate} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${results.length}</p>
                    <table>
                      <thead><tr><th>Patient</th><th>Status</th><th>Network</th><th>Copay</th><th>Deductible</th><th>Prior Auth</th></tr></thead>
                      <tbody>${rows}</tbody>
                    </table>
                  </body></html>`)
                  win.document.close()
                  win.focus()
                  setTimeout(() => { win.print(); win.close() }, 400)
                }}
                className="flex items-center gap-1 border border-separator text-content-secondary hover:text-content-secondary rounded px-2.5 py-1 transition-colors">
                <FileText size={11} /> Export PDF
              </button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-separator text-[10px] text-content-secondary uppercase tracking-wider">
              <th className="text-left px-4 py-2">Patient</th><th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Network</th><th className="text-left px-4 py-2">Copay</th>
              <th className="text-left px-4 py-2">Deductible</th><th className="text-left px-4 py-2">Prior Auth</th>
            </tr></thead>
            <tbody>{results.map(r => (
              <tr key={r.id} className="border-b border-separator/50 hover:bg-surface-elevated/50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-content-primary">{r.patient_name || 'Unknown'}</td>
                <td className="px-4 py-2.5"><EligStatusBadge status={r.status || 'unknown'} /></td>
                <td className="px-4 py-2.5 text-content-secondary">{r.network_status || '—'}</td>
                <td className="px-4 py-2.5">{r.copay != null ? `$${r.copay}` : '—'}</td>
                <td className="px-4 py-2.5">{r.deductible != null ? `$${r.deductible}` : '—'}</td>
                <td className={`px-4 py-2.5 ${r.prior_auth_required ? 'text-brand-deep dark:text-brand-deep font-medium' : 'text-content-secondary'}`}>
                  {r.prior_auth_required ? 'Required' : 'No'}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      {results && results.length === 0 && (
        <div className="card p-8 text-center text-content-tertiary text-sm">
          No appointments found for {batchDate}. Check that appointments are scheduled for this date.
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Tab 3 — Check History                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CheckHistoryTab({ checks, loading }: { checks: ApiEligibilityCheck[]; loading: boolean }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => checks.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(c.patient_name || '').toLowerCase().includes(q) && !(c.id || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [checks, search, statusFilter])

  if (loading) return <div className="card p-8 text-center text-sm text-content-secondary">Loading eligibility history…</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name…"
            className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-3 py-2 text-[13px] text-content-secondary placeholder:text-content-tertiary focus:outline-none focus:border-brand/40" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <span className="text-[11px] text-content-tertiary">{filtered.length} checks</span>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={20} />} title="No eligibility checks" subtitle="Run a single or batch check to see history here." />
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-separator text-[10px] text-content-secondary uppercase tracking-wider">
              <th className="text-left px-4 py-2.5">Patient</th><th className="text-left px-4 py-2.5">DOS</th>
              <th className="text-left px-4 py-2.5">Status</th><th className="text-left px-4 py-2.5">Network</th>
              <th className="text-left px-4 py-2.5">Copay</th><th className="text-left px-4 py-2.5">Deductible</th>
              <th className="text-left px-4 py-2.5">Auth</th><th className="text-left px-4 py-2.5">Checked</th><th className="w-8"></th>
            </tr></thead>
            <tbody>{filtered.slice(0, 100).map(c => {
              const expanded = expandedId === c.id
              return (
                <React.Fragment key={c.id}>
                  <tr onClick={() => setExpandedId(expanded ? null : c.id)}
                    className="border-b border-separator/50 hover:bg-surface-elevated/50 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 font-medium text-content-primary">{c.patient_name || '—'}</td>
                    <td className="px-4 py-2.5 text-content-secondary">{c.dos || '—'}</td>
                    <td className="px-4 py-2.5"><EligStatusBadge status={c.status || 'unknown'} /></td>
                    <td className="px-4 py-2.5 text-content-secondary">{c.network_status || '—'}</td>
                    <td className="px-4 py-2.5">{c.copay != null ? `$${c.copay}` : '—'}</td>
                    <td className="px-4 py-2.5">{c.deductible != null ? `$${c.deductible}` : '—'}</td>
                    <td className={`px-4 py-2.5 ${c.prior_auth_required ? 'text-brand-deep font-medium' : 'text-content-secondary'}`}>
                      {c.prior_auth_required ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2.5 text-content-tertiary">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-2.5">{expanded ? <ChevronUp size={12} className="text-content-tertiary" /> : <ChevronDown size={12} className="text-content-tertiary" />}</td>
                  </tr>
                  {expanded && (
                    <tr><td colSpan={9} className="px-4 py-3 bg-surface-elevated/50 border-b border-separator">
                      <EligibilityDetailRow check={c} />
                    </td></tr>
                  )}
                </React.Fragment>
              )
            })}</tbody>
          </table>
        )}
        {filtered.length > 100 && (
          <div className="px-4 py-2 text-[11px] text-content-tertiary border-t border-separator">Showing 100 of {filtered.length} checks</div>
        )}
      </div>
    </div>
  )
}

function EligibilityDetailRow({ check }: { check: ApiEligibilityCheck }) {
  const rd = typeof check.result === 'object' && check.result !== null ? check.result as Record<string, unknown> : {}
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
      <div><span className="text-content-tertiary block text-[10px]">Patient ID</span><span className="font-mono text-content-secondary">{check.patient_id?.slice(0, 8) || '—'}…</span></div>
      <div><span className="text-content-tertiary block text-[10px]">Payer ID</span><span className="font-mono text-content-secondary">{check.payer_id?.slice(0, 8) || '—'}…</span></div>
      {Boolean(rd.plan_name) && <div><span className="text-content-tertiary block text-[10px]">Plan Name</span><span className="text-content-primary">{String(rd.plan_name)}</span></div>}
      {Boolean(rd.group_number) && <div><span className="text-content-tertiary block text-[10px]">Group Number</span><span className="text-content-primary">{String(rd.group_number)}</span></div>}
      {Boolean(rd.coinsurance_pct) && <div><span className="text-content-tertiary block text-[10px]">Coinsurance</span><span className="text-content-primary">{String(rd.coinsurance_pct)}%</span></div>}
      {Boolean(rd.out_of_pocket_max) && <div><span className="text-content-tertiary block text-[10px]">OOP Maximum</span><span className="text-content-primary">${String(rd.out_of_pocket_max)}</span></div>}
      <div><span className="text-content-tertiary block text-[10px]">Check ID</span><span className="font-mono text-content-secondary">{check.id.slice(0, 12)}…</span></div>
      <div><span className="text-content-tertiary block text-[10px]">Checked At</span><span className="text-content-secondary">{check.created_at ? new Date(check.created_at).toLocaleString() : '—'}</span></div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Tab 4 — Prior Authorization                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PriorAuthTab({ auths, loading, onRefresh }: { auths: ApiPriorAuth[]; loading: boolean; onRefresh: () => void }) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPA, setSelectedPA] = useState<ApiPriorAuth | null>(null)

  const filtered = useMemo(() => auths.filter(pa => {
    if (statusFilter && pa.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(pa.auth_number || '').toLowerCase().includes(q) &&
          !(pa.patient_name || '').toLowerCase().includes(q) &&
          !(pa.payer_name || '').toLowerCase().includes(q) &&
          !pa.cpt_codes?.some(c => c.toLowerCase().includes(q))) return false
    }
    return true
  }), [auths, search, statusFilter])

  const kpis = useMemo(() => ({
    pending: auths.filter(pa => pa.status === 'pending' || pa.status === 'submitted').length,
    approved: auths.filter(pa => pa.status === 'approved').length,
    denied: auths.filter(pa => pa.status === 'denied').length,
    avgDays: (() => {
      const approved = auths.filter(pa => pa.status === 'approved' && pa.created_at)
      if (approved.length === 0) return '—'
      const total = approved.reduce((s, pa) => s + Math.ceil((Date.now() - new Date(pa.created_at).getTime()) / 86400000), 0)
      return (total / approved.length).toFixed(1)
    })(),
  }), [auths])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: kpis.pending, color: 'text-brand-deep' },
          { label: 'Approved', value: kpis.approved, color: 'text-brand-dark' },
          { label: 'Denied', value: kpis.denied, color: 'text-red-500' },
          { label: 'Avg Age of Approved', value: `${kpis.avgDays}d`, color: 'text-brand' },
        ].map(k => (
          <div key={k.label} className="card p-4 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-content-tertiary mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search auth #, patient, payer, CPT…"
            className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-3 py-2 text-[13px] text-content-secondary placeholder:text-content-tertiary focus:outline-none focus:border-brand/40" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary">
          <option value="">All statuses</option>
          <option value="pending">Pending</option><option value="submitted">Submitted</option>
          <option value="approved">Approved</option><option value="denied">Denied</option>
        </select>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-brand text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-brand-deep transition-colors">
          <Plus size={14} /> New Prior Auth
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-content-secondary">Loading prior authorizations…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<FileText size={20} />} title="No prior authorizations" subtitle="Create a new prior auth request to get started." />
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-separator text-[10px] text-content-secondary uppercase tracking-wider">
              <th className="text-left px-4 py-2.5">Auth #</th><th className="text-left px-4 py-2.5">Patient</th>
              <th className="text-left px-4 py-2.5">Payer</th><th className="text-left px-4 py-2.5">CPT Codes</th>
              <th className="text-left px-4 py-2.5">Urgency</th><th className="text-left px-4 py-2.5">DOS</th>
              <th className="text-left px-4 py-2.5">Status</th><th className="text-left px-4 py-2.5">Created</th><th className="w-8"></th>
            </tr></thead>
            <tbody>{filtered.slice(0, 100).map(pa => {
              const st = PA_STATUS[pa.status] || { label: pa.status, cls: 'bg-gray-500/10 text-content-tertiary' }
              return (
                <tr key={pa.id} onClick={() => setSelectedPA(pa)}
                  className="border-b border-separator/50 hover:bg-surface-elevated/50 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-mono font-medium text-content-primary">{pa.auth_number || pa.id.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-content-primary">{pa.patient_name || '—'}</td>
                  <td className="px-4 py-2.5 text-content-secondary">{pa.payer_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(pa.cpt_codes || []).slice(0, 3).map(c => (
                        <span key={c} className="bg-brand/10 text-brand-dark dark:text-brand px-1.5 py-0.5 rounded text-[10px] font-mono">{c}</span>
                      ))}
                      {(pa.cpt_codes || []).length > 3 && <span className="text-[10px] text-content-tertiary">+{pa.cpt_codes!.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pa.urgency === 'urgent' ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-content-secondary'}`}>
                      {pa.urgency || 'routine'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-content-secondary text-[11px]">{pa.dos_from || '—'}{pa.dos_to ? ` → ${pa.dos_to}` : ''}</td>
                  <td className="px-4 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-2.5 text-content-tertiary text-[11px]">
                    {pa.created_at ? new Date(pa.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                  <td className="px-4 py-2.5"><Eye size={12} className="text-content-tertiary" /></td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </div>

      {showCreate && <CreatePriorAuthModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); onRefresh() }} />}
      {selectedPA && <PriorAuthDrawer pa={selectedPA} onClose={() => setSelectedPA(null)} onUpdate={onRefresh} />}
    </div>
  )
}

/* ── Create Prior Auth Modal ─────────────────────────────────────────────── */

function CreatePriorAuthModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast()
  const { selectedClient, clients } = useApp()

  const [clientId, setClientId] = useState(selectedClient?.id || '')
  const [patientId, setPatientId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [cptInput, setCptInput] = useState('')
  const [icdInput, setIcdInput] = useState('')
  const [urgency, setUrgency] = useState('routine')
  const [rationale, setRationale] = useState('')
  const [dosFrom, setDosFrom] = useState('')
  const [dosTo, setDosTo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: patientsResult } = usePatients({ client_id: clientId || undefined, limit: 500 })
  const { data: payersResult } = usePayers({ limit: 200 })
  const patients = patientsResult?.data || []
  const payers = payersResult?.data || []

  async function handleSubmit() {
    if (!patientId || !payerId) { toast.warning('Patient and Payer are required'); return }
    setSubmitting(true)
    try {
      await api.post('/prior-auth', {
        patient_id: patientId, payer_id: payerId,
        cpt_codes: cptInput.split(',').map(s => s.trim()).filter(Boolean),
        icd_codes: icdInput.split(',').map(s => s.trim()).filter(Boolean),
        urgency, clinical_rationale: rationale,
        dos_from: dosFrom || undefined, dos_to: dosTo || undefined,
        ...(clientId ? { client_id: clientId } : {}),
      })
      toast.success('Prior authorization request created')
      onCreated()
    } catch { toast.error('Failed to create prior auth request') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-separator rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2"><Plus size={16} className="text-brand" /> New Prior Authorization</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-elevated text-content-secondary"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <LabeledSelect label="Client" value={clientId} onChange={v => { setClientId(v); setPatientId('') }}
              options={[{ value: '', label: 'All' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Patient *</label>
              <select value={patientId} onChange={e => setPatientId(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LabeledSelect label="Payer *" value={payerId} onChange={setPayerId}
              options={[{ value: '', label: 'Select payer' }, ...payers.map(p => ({ value: p.id, label: p.name || p.payer_code || p.id.slice(0, 8) }))]} />
            <LabeledSelect label="Urgency" value={urgency} onChange={setUrgency}
              options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'emergent', label: 'Emergent' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="CPT Codes (comma-separated)" value={cptInput} onChange={setCptInput} placeholder="99213, 72148" mono />
            <LabeledInput label="ICD Codes (comma-separated)" value={icdInput} onChange={setIcdInput} placeholder="M54.5, G89.4" mono />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">DOS From</label>
              <input type="date" value={dosFrom} onChange={e => setDosFrom(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">DOS To</label>
              <input type="date" value={dosTo} onChange={e => setDosTo(e.target.value)}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">Clinical Rationale</label>
            <textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={3}
              placeholder="Clinical justification for authorization request…"
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs placeholder:text-content-tertiary resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-separator">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-content-secondary hover:bg-surface-elevated transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !patientId || !payerId}
            className="bg-brand text-white rounded-lg px-5 py-2 text-[13px] font-medium disabled:opacity-50 hover:bg-brand-deep transition-colors flex items-center gap-2">
            {submitting ? <><RefreshCw size={12} className="animate-spin" /> Creating…</> : <><Save size={14} /> Create Request</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Prior Auth Detail Drawer ────────────────────────────────────────────── */

function PriorAuthDrawer({ pa, onClose, onUpdate }: { pa: ApiPriorAuth; onClose: () => void; onUpdate: () => void }) {
  const { toast } = useToast()
  const { mutate: createTask } = useCreateTask()
  const st = PA_STATUS[pa.status] || { label: pa.status, cls: 'bg-gray-500/10 text-content-tertiary' }

  async function handleStatusUpdate(newStatus: string) {
    try {
      await api.put(`/prior-auth/${pa.id}`, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      onUpdate(); onClose()
    } catch { toast.error('Failed to update status') }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border-l border-separator shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-separator px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-content-primary">{pa.auth_number || pa.id.slice(0, 12)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-[11px] text-content-tertiary mt-0.5">Prior Authorization Request</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-btn hover:bg-surface-elevated text-content-secondary"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="Patient" value={pa.patient_name || '—'} icon={<User size={12} />} />
            <DrawerField label="Payer" value={pa.payer_name || '—'} icon={<Building2 size={12} />} />
            <DrawerField label="Provider" value={pa.provider_name || '—'} icon={<User size={12} />} />
            <DrawerField label="Urgency" value={pa.urgency || 'routine'}
              icon={pa.urgency === 'urgent' ? <AlertTriangle size={12} className="text-red-500" /> : <Clock size={12} />} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Procedure Codes</p>
            <div className="flex flex-wrap gap-1.5">
              {(pa.cpt_codes || []).map(c => <span key={c} className="bg-brand/10 text-brand-dark dark:text-brand px-2 py-1 rounded text-[11px] font-mono">{c}</span>)}
              {(!pa.cpt_codes || pa.cpt_codes.length === 0) && <span className="text-xs text-content-tertiary">No CPT codes</span>}
            </div>
          </div>
          {pa.icd_codes && pa.icd_codes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Diagnosis Codes</p>
              <div className="flex flex-wrap gap-1.5">
                {pa.icd_codes.map(c => <span key={c} className="bg-brand/10 text-brand-dark dark:text-brand-dark px-2 py-1 rounded text-[11px] font-mono">{c}</span>)}
              </div>
            </div>
          )}
          {(pa.dos_from || pa.dos_to) && (
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="DOS From" value={pa.dos_from || '—'} icon={<Calendar size={12} />} />
              <DrawerField label="DOS To" value={pa.dos_to || '—'} icon={<Calendar size={12} />} />
            </div>
          )}
          {pa.approved_units && <DrawerField label="Approved Units" value={String(pa.approved_units)} icon={<Activity size={12} />} />}
          {pa.auth_number_payer && (
            <div className="bg-brand/5 border border-brand/20 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1">Payer Auth Number</p>
              <p className="text-sm font-mono font-semibold text-brand-dark dark:text-brand-dark">{pa.auth_number_payer}</p>
            </div>
          )}
          {pa.clinical_rationale && (
            <div className="bg-surface-elevated rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1">Clinical Rationale</p>
              <p className="text-[13px] text-content-primary whitespace-pre-wrap">{pa.clinical_rationale}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Timeline</p>
            <div className="space-y-2">
              {pa.created_at && <TimelineItem label="Created" time={pa.created_at} icon={<Clock size={12} />} />}
            </div>
          </div>
          <div className="pt-3 border-t border-separator">
            <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Actions</p>
            <div className="flex flex-wrap gap-2">
              {(pa.status === 'pending' || pa.status === 'submitted') && (
                <>
                  <button onClick={() => handleStatusUpdate('approved')} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-brand/10 text-brand-dark hover:bg-brand/20 transition-colors">Mark Approved</button>
                  <button onClick={() => handleStatusUpdate('denied')} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors">Mark Denied</button>
                </>
              )}
              {pa.status === 'denied' && (
                <button onClick={async () => {
                  try {
                    await createTask({ title: `P2P Review: ${pa.cpt_codes?.[0] || 'Auth'} — ${pa.patient_name || 'Patient'}`, description: `Peer-to-peer review requested for denied prior auth. Payer: ${pa.payer_name || 'Unknown'}. Auth #: ${pa.auth_number || pa.id}`, task_type: 'prior_auth', priority: 'high', status: 'open', client_id: pa.client_id })
                    toast.success('Peer-to-peer review task created — clinical team notified')
                    onUpdate()
                  } catch { toast.info('Peer-to-peer review requested') }
                }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-brand/10 text-brand hover:bg-brand/20 transition-colors flex items-center gap-1.5">
                  <Phone size={12} /> Request P2P Review
                </button>
              )}
              {pa.status === 'pending' && (
                <button onClick={() => handleStatusUpdate('submitted')} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-brand/10 text-brand-dark hover:bg-brand/20 transition-colors">Mark Submitted</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Shared                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function EligStatusBadge({ status }: { status: string }) {
  const s = ELIG_STATUS[status] || ELIG_STATUS.unknown
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.color}`}>{s.icon} {s.label}</span>
}

function DrawerField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-xs font-medium text-content-primary">{value}</p>
    </div>
  )
}

function TimelineItem({ label, time, icon }: { label: string; time: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-content-secondary">{icon}</div>
      <div><p className="text-[13px] text-content-primary">{label}</p><p className="text-[10px] text-content-tertiary">{new Date(time).toLocaleString()}</p></div>
    </div>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3 text-content-tertiary">{icon}</div>
      <p className="text-sm font-medium text-content-primary mb-1">{title}</p>
      <p className="text-[13px] text-content-secondary">{subtitle}</p>
    </div>
  )
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-secondary">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function LabeledInput({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-content-tertiary mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[13px] text-content-primary placeholder:text-content-tertiary ${mono ? 'font-mono' : ''}`} />
    </div>
  )
}
