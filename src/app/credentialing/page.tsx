'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { BadgeCheck, AlertTriangle, X, Upload, FileCheck, Loader2 } from 'lucide-react'
import { useCredentialing, useUpdateCredentialing, useCreateCredentialing, useCredentialingExpiring, useRecredential, useCredentialingRiskScores, useVerifyAll, useVerifyDEA, useRequestUploadUrl, useExtractDocument, ApiCredentialing } from '@/lib/hooks'
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
  const [selected, setSelected] = useState(null as CredRow | null)
  const { data: apiCredResult } = useCredentialing({ limit: 100 })
  const { data: expiringResult } = useCredentialingExpiring(90)
  const { data: riskData } = useCredentialingRiskScores()
  const { mutate: updateCred } = useUpdateCredentialing(selected?.id || '')
  const { mutate: recredential } = useRecredential(selected?.id || '')
  const { mutate: createCred } = useCreateCredentialing()
  const { mutate: verifyAll, loading: verifyingAll } = useVerifyAll(selected?.id || '')
  const { mutate: verifyDEA, loading: verifyingDEA } = useVerifyDEA(selected?.id || '')
  const { mutate: requestUrl } = useRequestUploadUrl()
  const { mutate: extractDoc, loading: extracting } = useExtractDocument(selected?.id || '')
  const [verifyResult, setVerifyResult] = useState(null as any)
  const [uploadFile, setUploadFile] = useState(null as File | null)
  const [uploading, setUploading] = useState(false)
  const [extractResult, setExtractResult] = useState(null as any)
  const fileInputRef = useRef(null as HTMLInputElement | null)

  const apiRows: CredRow[] = (apiCredResult?.data || []).map((p) => ({
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
  const consumedOpenId = useRef(null as string | null)
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

  const expiringItems = (expiringResult?.data || []).map((c) => {
    const malpDays = daysUntil(c.malpractice_expiry)
    const licDays = daysUntil(c.license_expiry)
    const caqhDays = daysUntil(c.caqh_next_attestation)
    const expDays = daysUntil(c.expiry_date || c.license_expiry)
    let itemName = 'Credential Expiry'
    if (malpDays !== null && malpDays <= 90) itemName = 'Malpractice Insurance'
    else if (licDays !== null && licDays <= 90) itemName = 'Medical License'
    else if (caqhDays !== null && caqhDays <= 90) itemName = 'CAQH Attestation'
    return { name: c.provider_name || 'Unknown', item: itemName, date: formatDate(c.expiry_date || c.license_expiry), days: expDays ?? 999 }
  }).sort((a, b) => a.days - b.days).slice(0, 5)

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
                  try { await recredential({ notes: 'Re-credentialing initiated from dashboard' }); toast.success('Re-credentialing initiated') }
                  catch { toast.error('Failed to initiate re-credentialing') }
                }} className="bg-brand/10 text-brand rounded-lg py-2 text-[13px] font-medium hover:bg-brand/20 transition-colors">Initiate Re-credentialing</button>
                <button onClick={() => { window.open('https://proview.caqh.org/PR', '_blank'); toast.success('CAQH ProView opened') }}
                  className="bg-surface-elevated border border-separator rounded-lg py-2 text-[13px] font-medium">Update CAQH</button>
                <button onClick={async () => {
                  try { await createCred({ provider_id: selected?.raw?.provider_id || selected?.id } as any); toast.success('Enrollment started') }
                  catch { toast.error('Failed to start enrollment') }
                }} className="bg-surface-elevated border border-separator rounded-lg py-2 text-[13px] font-medium col-span-2">Add Payer Enrollment</button>
              </div>

              {/* Document Upload + AI Extract */}
              <div className="border-t border-separator pt-3 mt-2">
                <h4 className="text-[11px] font-semibold text-content-secondary tracking-wider mb-2">Upload Credential Document</h4>
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]) }} />
                {!uploadFile ? (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-separator rounded-lg py-4 flex flex-col items-center gap-1 hover:border-brand/40 hover:bg-brand/5 transition-colors">
                    <Upload size={18} className="text-content-tertiary" />
                    <span className="text-[12px] text-content-secondary">Upload license, malpractice, or DEA certificate</span>
                    <span className="text-[10px] text-content-tertiary">PDF, JPG, or PNG</span>
                  </button>
                ) : (
                  <div className="bg-surface-elevated rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-brand" />
                        <span className="text-[12px] font-medium truncate max-w-[200px]">{uploadFile.name}</span>
                        <span className="text-[10px] text-content-tertiary">{(uploadFile.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button onClick={() => { setUploadFile(null); setExtractResult(null) }} className="text-content-tertiary hover:text-content-primary">
                        <X size={14} />
                      </button>
                    </div>
                    <button onClick={async () => {
                      if (!uploadFile || !selected) return;
                      setUploading(true); setExtractResult(null);
                      try {
                        const urlResult = await requestUrl({ file_name: uploadFile.name, content_type: uploadFile.type || 'application/pdf', folder: 'credentialing' });
                        if (!urlResult?.upload_url || !urlResult?.s3_key) throw new Error('Could not get upload URL');
                        const s3Res = await fetch(urlResult.upload_url, { method: 'PUT', body: uploadFile, headers: { 'Content-Type': uploadFile.type || 'application/pdf' } });
                        if (!s3Res.ok) throw new Error('S3 upload failed');
                        toast.success('Document uploaded, extracting data...');
                        const result = await extractDoc({ s3_key: urlResult.s3_key, document_type: uploadFile.name.toLowerCase().includes('license') ? 'medical_license' : uploadFile.name.toLowerCase().includes('malp') ? 'malpractice_certificate' : uploadFile.name.toLowerCase().includes('dea') ? 'dea_certificate' : 'unknown' });
                        setExtractResult(result);
                        if (result && result.fields_updated && result.fields_updated.length > 0) {
                          toast.success('Credentials auto-populated: ' + result.fields_updated.join(', '));
                        } else {
                          toast.success('Document processed');
                        }
                      } catch (err) {
                        toast.error('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                      } finally { setUploading(false); }
                    }} disabled={uploading || extracting}
                      className="w-full bg-brand text-white rounded-lg py-2 text-[13px] font-medium hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {uploading || extracting ? <><Loader2 size={14} className="animate-spin" /> Extracting credentials...</> : <><Upload size={14} /> Upload and Extract with Ai</>}
                    </button>
                  </div>
                )}
                {extractResult?.extracted && (
                  <div className="mt-2 bg-surface-elevated rounded-lg p-3 text-[11px] space-y-1">
                    <div className="text-[11px] font-semibold text-brand mb-1">Ai Extracted Data {extractResult.ai_confidence ? `(${Math.round(extractResult.ai_confidence * 100)}% confidence)` : ''}</div>
                    {extractResult.extracted.document_type && <div className="flex justify-between"><span className="text-content-tertiary">Type:</span><span>{extractResult.extracted.document_type}</span></div>}
                    {extractResult.extracted.license_number && <div className="flex justify-between"><span className="text-content-tertiary">License:</span><span>{extractResult.extracted.license_state} {extractResult.extracted.license_number}</span></div>}
                    {extractResult.extracted.license_expiry && <div className="flex justify-between"><span className="text-content-tertiary">License Exp:</span><span>{extractResult.extracted.license_expiry}</span></div>}
                    {extractResult.extracted.malpractice_carrier && <div className="flex justify-between"><span className="text-content-tertiary">Carrier:</span><span>{extractResult.extracted.malpractice_carrier}</span></div>}
                    {extractResult.extracted.malpractice_expiry && <div className="flex justify-between"><span className="text-content-tertiary">Malp Exp:</span><span>{extractResult.extracted.malpractice_expiry}</span></div>}
                    {extractResult.extracted.dea_number && <div className="flex justify-between"><span className="text-content-tertiary">DEA:</span><span>{extractResult.extracted.dea_number}</span></div>}
                    {extractResult.extracted.dea_expiry && <div className="flex justify-between"><span className="text-content-tertiary">DEA Exp:</span><span>{extractResult.extracted.dea_expiry}</span></div>}
                    {extractResult.fields_updated?.length > 0 && <div className="mt-1 text-brand font-medium">Auto-updated: {extractResult.fields_updated.join(', ')}</div>}
                  </div>
                )}
              </div>

              {/* AI Verification Section */}
              <div className="border-t border-separator pt-3 mt-2">
                <h4 className="text-[11px] font-semibold text-content-secondary tracking-wider mb-2">AI Verification</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={async () => {
                    try {
                      const result = await verifyAll({});
                      setVerifyResult(result);
                      toast.success('Verification complete');
                    } catch { toast.error('Verification failed'); }
                  }} disabled={verifyingAll} className="bg-brand/10 text-brand rounded-lg py-2 text-[13px] font-medium hover:bg-brand/20 transition-colors col-span-2 disabled:opacity-50">
                    {verifyingAll ? 'Verifying...' : 'Run Full Verification'}
                  </button>
                  <button onClick={async () => {
                    try {
                      const result = await verifyDEA({});
                      setVerifyResult({ dea: result });
                      toast.success(result?.valid ? 'DEA checksum valid' : 'DEA checksum failed');
                    } catch { toast.error('DEA check failed'); }
                  }} disabled={verifyingDEA} className="bg-surface-elevated border border-separator rounded-lg py-2 text-[11px] font-medium disabled:opacity-50">
                    {verifyingDEA ? '...' : 'Verify DEA'}
                  </button>
                  <button onClick={() => { window.open('https://exclusions.oig.hhs.gov/', '_blank'); toast.success('OIG LEIE opened'); }}
                    className="bg-surface-elevated border border-separator rounded-lg py-2 text-[11px] font-medium">
                    Check OIG LEIE
                  </button>
                </div>
                {verifyResult && (
                  <div className="mt-2 bg-surface-elevated rounded-lg p-3 text-[11px] space-y-1">
                    {verifyResult.dea && (
                      <div className="flex justify-between"><span>DEA:</span><span className={verifyResult.dea.valid ? 'text-brand' : 'text-brand-deep font-medium'}>{verifyResult.dea.valid ? '✓ Valid' : '✗ Invalid'} {verifyResult.dea.reason?.slice(0, 30)}</span></div>
                    )}
                    {verifyResult.npi && (
                      <div className="flex justify-between"><span>NPI:</span><span className={verifyResult.npi.verified ? 'text-brand' : 'text-content-tertiary'}>{verifyResult.npi.verified ? `✓ ${verifyResult.npi.name}` : verifyResult.npi.error ? 'Manual check needed' : '✗ Not found'}</span></div>
                    )}
                    {verifyResult.exclusions && (
                      <div className="flex justify-between"><span>Exclusions:</span><span className={verifyResult.exclusions.excluded ? 'text-brand-deep font-bold' : 'text-brand'}>{verifyResult.exclusions.excluded === false ? '✓ Clear' : verifyResult.exclusions.excluded ? '⚠ EXCLUDED' : 'Manual check needed'}</span></div>
                    )}
                  </div>
                )}
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
          {expiringItems.map((e, idx)=>(
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

      {/* ── AI Credential Risk Scores ── */}
      {riskData?.data && riskData.data.length > 0 && (
        <div className="card p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Ai Credential Risk Scores</h3>
            <div className="flex gap-2 text-[11px]">
              {riskData.summary?.critical > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{riskData.summary.critical} Critical</span>}
              {riskData.summary?.high > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{riskData.summary.high} High</span>}
              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">Avg: {riskData.summary?.avg_score}/100</span>
            </div>
          </div>
          <div className="space-y-2">
            {riskData.data.slice(0, 8).map((p, idx) => (
              <div key={`risk-${idx}`} className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] ${p.risk_level === 'critical' ? 'bg-red-500' : p.risk_level === 'high' ? 'bg-orange-500' : p.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-brand'}`}>
                  {p.risk_score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.provider_name}</div>
                  <div className="text-[11px] text-content-tertiary truncate">{p.flags.slice(0, 2).join(' · ')}</div>
                </div>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${p.risk_level === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : p.risk_level === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' : p.risk_level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-brand/10 text-brand border-brand/20'}`}>
                  {p.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
