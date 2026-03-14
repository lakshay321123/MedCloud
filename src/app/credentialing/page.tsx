'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { BadgeCheck, AlertTriangle, X } from 'lucide-react'
import { useCredentialing, useUpdateCredentialing, useCreateCredentialing, useCredentialingExpiring, ApiCredentialing } from '@/lib/hooks'
import { useApp } from '@/lib/context'
import { useSearchParams, useRouter } from 'next/navigation'

function formatDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function daysUntil(d?: string | null) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return Math.ceil((dt.getTime() - Date.now()) / 86400000)
}

type CredRow = {
  id: string; name: string; npi: string; client: string; clientId: string
  license: string; licenseExpiry: string | null
  malpractice: string; malpracticeExpiry: string | null
  dea: string; deaExpiry: string | null
  caqh: string; caqhId: string; caqhStatus: string
  payers: number; status: string; boardCertified: boolean
  raw: ApiCredentialing
}

export default function CredentialingPage() {
  const { toast } = useToast()
  const { t } = useT()
  const { selectedClient } = useApp()
  const router = useRouter()
  const [selected, setSelected] = useState<CredRow | null>(null)
  const { data: apiCredResult } = useCredentialing({ limit: 100 })
  const { data: expiringResult } = useCredentialingExpiring(90)
  const { mutate: updateCred } = useUpdateCredentialing(selected?.id || '')
  const { mutate: createCred } = useCreateCredentialing()

  const apiRows: CredRow[] = (apiCredResult?.data || []).map((p: ApiCredentialing) => ({
    id: p.id,
    name: p.provider_name || '',
    npi: p.npi || '',
    status: p.status || '',
    payers: p.payer_enrollment_count || 0,
    client: p.client_name || '',
    clientId: p.client_id || '',
    license: p.license_number ? `${p.license_state || ''} ${p.license_number}` : '—',
    licenseExpiry: p.license_expiry || null,
    malpractice: p.malpractice_carrier || '—',
    malpracticeExpiry: p.malpractice_expiry || null,
    dea: p.dea_number || '—',
    deaExpiry: p.dea_expiry || null,
    caqh: p.caqh_provider_id || '—',
    caqhId: p.caqh_provider_id || '',
    caqhStatus: p.caqh_status || 'not_started',
    boardCertified: p.board_certified || false,
    raw: p,
  }))

  const filteredProviders = apiRows.filter(p => {
    if (selectedClient) return p.clientId === selectedClient.id
    return true
  })

  const searchParams = useSearchParams()
  const openId = searchParams.get('openId')
  const consumedOpenId = useRef<string | null>(null)
  useEffect(() => {
    if (!openId || openId === consumedOpenId.current) return
    const match = filteredProviders.find(p => p.id === openId) || apiRows.find(p => p.id === openId)
    if (match) { setSelected(match); consumedOpenId.current = openId }
  }, [openId, filteredProviders, apiRows])

  const activeCount = filteredProviders.filter(p => p.status === 'active' || p.status === 'approved').length
  const expiringCount = filteredProviders.filter(p => p.status === 'expiring').length
  const onboardingCount = filteredProviders.filter(p => ['pending', 'submitted', 'in_review', 'onboarding'].includes(p.status)).length
  const totalEnrollments = filteredProviders.reduce((s, p) => s + p.payers, 0)

  const pipelineCounts = {
    submitted: filteredProviders.filter(p => p.status === 'submitted').length,
    inReview: filteredProviders.filter(p => p.status === 'in_review').length,
    approved: filteredProviders.filter(p => ['active', 'approved'].includes(p.status)).length,
    denied: filteredProviders.filter(p => p.status === 'denied').length,
    recredentialing: filteredProviders.filter(p => ['expiring', 'renewal_pending', 'recredentialing'].includes(p.status)).length,
  }

  const expiringItems = (expiringResult?.data || []).map((c: ApiCredentialing) => {
    const malpDays = daysUntil(c.malpractice_expiry)
    const licDays = daysUntil(c.license_expiry)
    const caqhDays = daysUntil(c.caqh_next_attestation)
    const expDays = daysUntil(c.expiry_date || c.license_expiry)
    let itemName = 'Credential Expiry'
    if (malpDays !== null && malpDays <= 90) itemName = 'Malpractice Insurance'
    else if (licDays !== null && licDays <= 90) itemName = 'Medical License'
    else if (caqhDays !== null && caqhDays <= 90) itemName = 'CAQH Attestation'
    return { name: c.provider_name || 'Unknown', item: itemName, date: formatDate(c.expiry_date || c.license_expiry), days: expDays ?? 999 }
  }).sort((a: { days: number }, b: { days: number }) => a.days - b.days).slice(0, 5)

  return (
    <ModuleShell title={t("credentialing","title")} subtitle={t("credentialing","subtitle")}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label={t('credentialing','activeProviders')} value={activeCount} icon={<BadgeCheck size={20}/>}/>
        <KPICard label={t('credentialing','expiring30')} value={expiringCount} trend="down"/>
        <KPICard label={t('credentialing','onboarding')} value={onboardingCount}/>
        <KPICard label={t('credentialing','totalEnrollments')} value={totalEnrollments}/>
      </div>
      {expiringCount > 0 && (
        <div className="bg-brand-pale0/10 border border-brand-light/20 rounded-lg p-3 mb-4 text-xs text-brand-deep dark:text-brand-deep flex items-center gap-2">
          <AlertTriangle size={14}/> {expiringCount} provider(s) have credentials expiring within 30 days
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-[13px] text-content-secondary">
            <th className="text-left px-4 py-3">Provider</th><th className="text-left px-4 py-3">NPI</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">License Exp</th>
            <th className="text-left px-4 py-3">Malpractice Exp</th><th className="text-left px-4 py-3">CAQH</th>
            <th className="text-right px-4 py-3">Payers</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{filteredProviders.map(p=>(
            <tr key={p.id}
              onClick={() => setSelected(p)}
              className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 font-mono text-[13px] text-content-secondary">{p.npi || '—'}</td>
              <td className="px-4 py-3 text-[13px] text-content-secondary">{p.client}</td>
              <td className={`px-4 py-3 text-xs ${p.licenseExpiry && daysUntil(p.licenseExpiry) !== null && daysUntil(p.licenseExpiry)! < 60 ? 'text-brand-deep font-medium' : ''}`}>{formatDate(p.licenseExpiry)}</td>
              <td className={`px-4 py-3 text-xs ${p.malpracticeExpiry && daysUntil(p.malpracticeExpiry) !== null && daysUntil(p.malpracticeExpiry)! < 60 ? 'text-brand-deep font-medium' : ''}`}>{formatDate(p.malpracticeExpiry)}</td>
              <td className="px-4 py-3 text-[13px] text-content-secondary">{p.caqhStatus === 'attested' ? '✓ Attested' : p.caqhStatus === 'attestation_due' ? '⚠ Due' : p.caqh !== '—' ? p.caqh : '—'}</td>
              <td className="px-4 py-3 text-right">{p.payers}</td>
              <td className="px-4 py-3"><span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${p.status==='active'?'bg-brand/10 text-brand-dark dark:text-brand-dark border-brand/20':p.status==='expiring'?'bg-brand-pale0/10 text-brand-deep dark:text-brand-deep border-brand-light/20':p.status==='pending'?'bg-brand/5 text-brand border-brand/15':'bg-brand/10 text-brand-dark border-brand/20'}`}>{p.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => { setSelected(null); if (searchParams.get('openId')) router.replace('/credentialing', { scroll: false }) }} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
            <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1">
              <h3 className="font-semibold text-content-primary">{selected.name}</h3>
              <button onClick={() => { setSelected(null); if (searchParams.get('openId')) router.replace('/credentialing', { scroll: false }) }} className="p-1 hover:bg-surface-elevated rounded-btn">
                <X size={16} className="text-content-secondary" />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
                  {selected.name.split(' ').pop()?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-content-primary">{selected.name}</div>
                  <div className="text-[13px] text-content-secondary">NPI: {selected.npi || '—'} · {selected.client}</div>
                </div>
              </div>
              {[
                { label: 'Medical License', value: selected.license !== '—' ? selected.license : '—', sub: selected.licenseExpiry ? `Exp: ${formatDate(selected.licenseExpiry)}` : null, alert: selected.licenseExpiry && daysUntil(selected.licenseExpiry) !== null && (daysUntil(selected.licenseExpiry) as number) < 60 },
                { label: 'Malpractice', value: selected.malpractice, sub: selected.malpracticeExpiry ? `Exp: ${formatDate(selected.malpracticeExpiry)}` : null, alert: selected.malpracticeExpiry && daysUntil(selected.malpracticeExpiry) !== null && (daysUntil(selected.malpracticeExpiry) as number) < 60 },
                { label: 'DEA', value: selected.dea, sub: selected.deaExpiry ? `Exp: ${formatDate(selected.deaExpiry)}` : null, alert: false },
                { label: 'CAQH', value: selected.caqhId ? `#${selected.caqhId}` : '—', sub: selected.caqhStatus === 'attested' ? 'Attested' : selected.caqhStatus === 'attestation_due' ? 'Attestation Due' : selected.caqhStatus === 'not_started' ? 'Not Started' : selected.caqhStatus, alert: selected.caqhStatus === 'attestation_due' },
                { label: 'Board Certified', value: selected.boardCertified ? 'Yes' : 'No', sub: null, alert: false },
              ].map(item => (
                <div key={item.label} className="flex gap-2 items-center justify-between py-2 border-b border-separator pb-1">
                  <span className="text-[13px] text-content-secondary">{item.label}</span>
                  <div className="text-right">
                    <span className={`text-[13px] font-medium ${item.alert ? 'text-brand-deep' : item.value === '—' || item.value === 'No' ? 'text-content-tertiary' : 'text-content-primary'}`}>{item.value}</span>
                    {item.sub && <div className={`text-[11px] ${item.alert ? 'text-brand-deep font-medium' : 'text-content-tertiary'}`}>{item.sub}</div>}
                  </div>
                </div>
              ))}
              <div className="text-[13px] text-content-secondary mb-2">Active Payer Enrollments: {selected.payers}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={async () => {
                  try { await updateCred({ status: 'recredentialing', credential_type: 'recredentialing' }); toast.success('Re-credentialing initiated') }
                  catch { toast.error('Failed to initiate re-credentialing') }
                }} className="bg-brand/10 text-brand rounded-lg py-2 text-[13px] font-medium hover:bg-brand/20 transition-colors">Initiate Re-credentialing</button>
                <button onClick={() => { window.open('https://proview.caqh.org/PR', '_blank'); toast.success('CAQH ProView opened') }}
                  className="bg-surface-elevated border border-separator rounded-lg py-2 text-[13px] font-medium">Update CAQH</button>
                <button onClick={async () => {
                  try { await createCred({ provider_id: selected?.raw?.provider_id || selected?.id, status: 'pending', credential_type: 'payer_enrollment' }); toast.success('Enrollment started') }
                  catch { toast.error('Failed to start enrollment') }
                }} className="bg-surface-elevated border border-separator rounded-lg py-2 text-[13px] font-medium col-span-2">Add Payer Enrollment</button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card p-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">Payer Enrollment Pipeline</h3>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[{stage:'Submitted',count:pipelineCounts.submitted,color:'bg-brand/60'},{stage:'In Review',count:pipelineCounts.inReview,color:'bg-brand-light'},{stage:'Approved',count:pipelineCounts.approved,color:'bg-brand'},{stage:'Denied',count:pipelineCounts.denied,color:'bg-[#065E76]'},{stage:'Re-credentialing',count:pipelineCounts.recredentialing,color:'bg-brand-dark'}].map(s=>(
            <div key={s.stage} className="text-center">
              <div className={`${s.color} text-white rounded-lg py-3 mb-1`}><span className="text-lg font-bold">{s.count}</span></div>
              <span className="text-[11px] text-content-secondary">{s.stage}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-content-secondary tracking-wider">Upcoming Expirations</h4>
          {expiringItems.length === 0 && <div className="text-[13px] text-content-tertiary py-2">No credentials expiring in the next 90 days</div>}
          {expiringItems.map((e: { name: string; item: string; date: string; days: number }, idx: number)=>(
            <div key={`${e.name}-${idx}`} className={`flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2 ${e.days<=30?'border border-brand-light/30':''}`}>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium">{e.name}</span>
                <span className="text-[11px] text-content-secondary">{e.item}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-medium ${e.days<=30?'text-brand-deep':e.days<=60?'text-blue-500':'text-content-secondary'}`}>{e.days}d</span>
                <span className="text-[11px] text-content-tertiary">{e.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  )
}
