'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
// removed - no longer using demoClaims
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ShieldAlert, FileText, AlertTriangle, Send } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import { useDenials, useGenerateAppeal, useDenialCategories, useAppealsList, useBatchGenerateAppeals, useUpdateDenial, useCreateDenial, useSubmitAppeal, useAppealDetail, useUpdateAppealStatus, useAppealTemplates, useCreateAppealTemplate, useCheckAppealDeadlines } from '@/lib/hooks'
import { filterByRegion } from '@/lib/utils/region'
import { demoDenialsData } from '@/lib/demo-data'
import { ErrorBanner } from '@/components/shared/ApiStates'
import { useRouter } from 'next/navigation'
import { sanitizeForPrompt } from '@/lib/ai-utils'

// ─── Dynamic appeal template ──────────────────────────────────────────────
function buildAppealLetter(denial: DenialRow, level: 'L1' | 'L2' | 'L3'): string {
  const levelLabel = level === 'L1' ? 'First Level' : level === 'L2' ? 'Second Level' : 'External Review / Third Level'
  const category = denial.denialCategory || 'General'

  let categoryParagraph = ''
  if (category === 'Authorization') {
    categoryParagraph = `This claim was denied due to lack of prior authorization. We respectfully submit that the services provided were medically necessary and meet all clinical criteria. Enclosed please find clinical documentation supporting the medical necessity of these services, along with our ${level === 'L3' ? 'external review request' : 'formal appeal requesting retroactive authorization'}.`
  } else if (category === 'Eligibility') {
    categoryParagraph = `This claim was denied on the basis of eligibility. We have verified that the patient held active coverage on the date of service (${denial.dos}). Enclosed please find the eligibility verification report confirming active coverage, and we respectfully request that the claim be reprocessed for payment.`
  } else if (category === 'Coding') {
    categoryParagraph = `This claim was denied based on a coding-related reason. We have reviewed the medical record and confirm that the CPT code(s) billed accurately reflect the level of service provided. Enclosed is the clinical documentation supporting medical necessity and the appropriateness of the codes submitted.`
  } else {
    categoryParagraph = `We believe this denial was made in error. Enclosed please find supporting clinical documentation and request a thorough review of the claim in accordance with your appeals process.`
  }

  return `Dear ${denial.payer} Appeals Department,

RE: ${levelLabel} Appeal — Claim ${denial.id}
Patient: ${denial.patientName}
Date of Service: ${denial.dos}
Payer: ${denial.payer}
Provider: ${denial.clientName}
Denial Reason: ${denial.denialReason}

We are writing to formally submit a ${levelLabel} appeal for the above-referenced claim, which was denied for the following reason: "${denial.denialReason}".

${categoryParagraph}

We respectfully request that your organization reconsider this claim and process it for payment. Should you require any additional documentation or have any questions, please contact our office.

Sincerely,
Revenue Cycle Management Department
${denial.clientName}`
}

type DenialRow = {
  id: string; patientName: string; payer: string; denialReason?: string; clientId: string; clientName: string;
  dos: string; source?: string; appealLevel?: string | null; status: string;
  carc_description?: string; rarc_description?: string; denialCategory?: string;
}

export default function DenialsPage() {
  const { selectedClient, country, currentUser } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const router = useRouter()

  const { data: apiResult, error: apiError, refetch } = useDenials({ limit: 50 })

  const apiDenials: DenialRow[] = apiResult?.data?.map(d => ({
    id: d.claim_number || d.id,
    patientName: d.patient_name || '',
    payer: d.payer_name || '',
    denialReason: d.carc_description || d.denial_reason || d.denial_code || '',
    clientId: d.client_id,
    clientName: d.client_name || '',
    dos: d.dos_from || '',
    source: 'payment_posting',
    appealLevel: d.appeal_level || null,
    status: d.status || 'denied',
    carc_description: d.carc_description,
    rarc_description: d.rarc_description,
  })) || []

  const demoDenials: DenialRow[] = demoDenialsData.map(d => ({
    id: d.id, patientName: d.patientName, payer: d.payer,
    denialReason: d.denialReason, clientId: d.clientId, clientName: d.clientName,
    dos: d.dos, source: 'demo', appealLevel: d.appealLevel, status: d.status,
  }))

  const denials: DenialRow[] = filterByRegion(
    apiDenials.length ? apiDenials : demoDenials,
    currentUser.organization_id,
    currentUser.role,
    selectedClient?.id,
    country
  )

  const [selected, setSelected] = useState(denials[0]?.id || '')
  const [appealLevel, setAppealLevel] = useState<'L1' | 'L2' | 'L3'>('L1')
  const [appealTexts, setAppealTexts] = useState<Record<string, string>>({})
  const [aiGenerating, setAiGenerating] = useState(false)

  async function generateAppealWithAI(denial: DenialRow) {
    const key = `${denial.id}-${appealLevel}`
    setAiGenerating(true)
    try {
      const levelLabel = appealLevel === 'L1' ? 'First Level' : appealLevel === 'L2' ? 'Second Level' : 'External Review'
      // Sanitize all user-controlled fields before prompt interpolation (prompt injection defence)
      const safePatient = sanitizeForPrompt(denial.patientName, 100)
      const safePayer   = sanitizeForPrompt(denial.payer, 100)
      const safeClient  = sanitizeForPrompt(denial.clientName, 100)
      const safeDenial  = sanitizeForPrompt(denial.denialReason, 300)
      const safeCarc    = sanitizeForPrompt(denial.carc_description, 200)
      const safeRarc    = sanitizeForPrompt(denial.rarc_description, 200)

      const prompt = [
        `You are an expert medical billing appeals specialist. Write a professional ${levelLabel} appeal letter.`,
        `Claim ID: ${denial.id}`,
        `Patient: ${safePatient}`,
        `Payer: ${safePayer}`,
        `Provider: ${safeClient}`,
        `Date of Service: ${denial.dos}`,
        `Denial Reason: ${safeDenial}`,
        `CARC: ${safeCarc || 'N/A'}`,
        `RARC: ${safeRarc || 'N/A'}`,
        `Appeal Level: ${appealLevel}`,
        '',
        'Write a compelling professional appeal letter addressing the denial. Cite medical necessity. Format as a business letter. Output the letter text only.',
      ].join('\n')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'appeal',
          level: appealLevel,
          claimId: denial.id,
          patient: safePatient,
          payer: safePayer,
          provider: safeClient,
          dos: denial.dos,
          denialReason: safeDenial,
          carc: safeCarc,
          rarc: safeRarc,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAppealTexts(prev => ({ ...prev, [key]: data.text || buildAppealLetter(denial, appealLevel) }))
      toast.success('AI appeal letter generated')
    } catch (err) {
      console.error('[appeal generator] AI failed:', err)
      toast.error('AI generation failed — using template')
      setAppealTexts(prev => ({ ...prev, [key]: buildAppealLetter(denial, appealLevel) }))
    } finally {
      setAiGenerating(false)
    }
  }

  useEffect(() => {
    if (!selected && denials.length > 0) setSelected(denials[0].id)
  }, [denials]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDenial = denials.find(x => x.id === selected)

  const getAppealText = (d: DenialRow) => {
    const key = `${d.id}-${appealLevel}`
    return appealTexts[key] ?? buildAppealLetter(d, appealLevel)
  }

  return (
    <ModuleShell title={t("denials","title")} subtitle={t("denials","subtitle")}>
      {apiError && <ErrorBanner error={apiError} onRetry={refetch} />}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label={t('denials','openDenials')} value={denials.filter(d => ['denied','open','pending','new'].includes(d.status)).length} icon={<ShieldAlert size={20} />} />
        <KPICard label={t('denials','inAppeal')} value={denials.filter(d => ['appealed','appeal_pending','in_appeal'].includes(d.status)).length} />
        <KPICard label={t('denials','appealSuccessRate')} value={(() => {
          const paid = denials.filter(d => d.status === 'paid').length
          const appealed = denials.filter(d => ['appealed','appeal_pending','in_appeal'].includes(d.status)).length
          return paid > 0 ? `${Math.round((paid / Math.max(1, appealed)) * 100)}%` : '—'
        })()} trend="up" sub="+4%" />
        <KPICard label={t('denials','avgResolution')} value="18 days" />
      </div>
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-380px)]">
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-separator text-xs text-content-secondary sticky top-0 bg-surface-secondary">
                <th className="text-left px-4 py-3">Claim</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Payer</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Appeal</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {denials.length === 0 && (
                <tr><td colSpan={7}>
                  <div className='flex flex-col items-center justify-center py-16 text-center'>
                    <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                      <ShieldAlert size={20} className='text-content-tertiary' />
                    </div>
                    <p className='text-sm font-medium text-content-primary mb-1'>No denials yet</p>
                    <p className='text-xs text-content-secondary'>Denials will appear here once they&apos;re added to the system.</p>
                  </div>
                </td></tr>
              )}
              {denials.map(d => (
              <tr key={d.id} onClick={() => { setSelected(d.id); setAppealLevel('L1') }}
                className={`border-b border-separator table-row cursor-pointer ${selected === d.id ? 'bg-brand/5' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs">{d.id}</td>
                <td className="px-4 py-3">{d.patientName}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{d.payer}</td>
                <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400">{d.denialReason}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-pill ${
                    d.source === 'payment_posting' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    d.source === 'claim_rejection' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {d.source === 'payment_posting' ? 'Payment Posting' : d.source === 'claim_rejection' ? 'Claim Rejection' : 'Payer Audit'}
                  </span>
                </td>
                <td className={`px-4 py-3 text-xs font-semibold ${
                  d.appealLevel === 'L1' ? 'text-brand' :
                  d.appealLevel === 'L2' ? 'text-amber-600 dark:text-amber-400' :
                  d.appealLevel === 'L3' ? 'text-red-600 dark:text-red-400' : 'text-content-tertiary'
                }`}>{d.appealLevel || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} small /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card p-4 flex flex-col overflow-y-auto">
          {selected && selectedDenial ? (
            <>
              <h3 className="text-sm font-semibold mb-1">{selectedDenial.id} — {selectedDenial.patientName}</h3>
              <p className="text-xs text-content-secondary mb-3">{selectedDenial.clientName} · {selectedDenial.payer} · DOS: {selectedDenial.dos}</p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 mb-2 text-xs text-red-600 dark:text-red-400">Denial: {selectedDenial.denialReason}</div>
              <div className="bg-surface-elevated border border-separator rounded-lg p-2 mb-3 text-xs text-content-secondary inline-flex items-center gap-1">
                <AlertTriangle size={12} />Source: Routed from {selectedDenial.source}
              </div>
              {selectedDenial.source === 'payment_posting' && <div className="text-xs text-content-secondary mb-3">EOB Reference: ERA-001, Line EOB-004</div>}
              <div className="mb-3">
                <span className="text-xs text-content-secondary block mb-1">Related Documents</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Original Claim', path: '/claims' },
                    ...(selectedDenial.source === 'payment_posting' ? [{ label: 'ERA/EOB', path: '/payment-posting' }] : []),
                    { label: 'Clinical Note', path: '/documents' },
                    { label: 'Denial Letter', path: '/documents' },
                  ].map(doc => (
                    <button
                      key={doc.label}
                      onClick={() => router.push(doc.path)}
                      className="bg-surface-elevated border border-separator rounded px-2 py-1 text-[10px] text-content-secondary flex items-center gap-1 hover:border-brand/30 hover:text-brand transition-colors cursor-pointer"
                    >
                      <FileText size={10} />{doc.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <span className="text-xs text-content-secondary block mb-1">Appeal Level</span>
                <div className="flex gap-1">
                  {(['L1','L2','L3'] as const).map(lvl=>(
                    <button key={lvl} onClick={() => setAppealLevel(lvl)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${appealLevel===lvl?'bg-brand text-white border-brand':'border-separator text-content-secondary hover:border-brand/40 hover:text-brand'}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="w-full flex-1 min-h-[320px] bg-surface-elevated border border-separator rounded-lg p-3 text-xs leading-relaxed resize-y font-mono"
                style={{ resize: 'vertical' }}
                value={getAppealText(selectedDenial)}
                onChange={e => {
                  const key = `${selectedDenial.id}-${appealLevel}`
                  setAppealTexts(prev => ({ ...prev, [key]: e.target.value }))
                }}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => generateAppealWithAI(selectedDenial)}
                  disabled={aiGenerating}
                  className="flex-1 bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-btn py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-purple-600/20 disabled:opacity-50 transition-colors">
                  {aiGenerating ? (
                    <><span className="animate-spin inline-block w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full"/><span>Generating...</span></>
                  ) : (
                    <><span>✦</span><span>Generate with AI</span></>
                  )}
                </button>
              <button
                onClick={() => {
                  const text = getAppealText(selectedDenial)
                  if (text.trim().length < 50) {
                    toast.error('Appeal letter is too short')
                    return
                  }
                  toast.success(`${appealLevel} appeal submitted for ${selectedDenial.id}`)
                }}
                className="flex-1 bg-brand text-white rounded-btn py-2 text-sm font-medium flex items-center justify-center gap-2">
                <Send size={14}/>Submit Appeal ({appealLevel})
              </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-content-secondary">
              <ShieldAlert size={40} className="opacity-20" />
              <p className="text-sm">Select a denial to review</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Appeal Templates Library ── */}
      <div className="card p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Appeal Templates</h3>
          <button onClick={() => toast.info('New template editor opened')} className="text-xs bg-purple-500/10 text-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-colors">+ New Template</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{name:'Medical Necessity',cat:'Auth',winRate:72,used:145},{name:'Timely Filing Override',cat:'Timely',winRate:34,used:89},{name:'Coding Error Correction',cat:'Coding',winRate:81,used:67},
            {name:'Duplicate Claim Resubmit',cat:'Duplicate',winRate:65,used:42},{name:'Coordination of Benefits',cat:'COB',winRate:58,used:38},{name:'Eligibility Retroactive',cat:'Eligibility',winRate:46,used:51}
          ].map(t=>(
            <div key={t.name} className="bg-surface-elevated rounded-lg p-3 hover:border-brand/30 border border-transparent transition-colors cursor-pointer" onClick={() => toast.info(`Template: ${t.name}`)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{t.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-content-tertiary">{t.cat}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1">
                  <div className="w-full bg-surface rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width:`${t.winRate}%`}}/></div>
                </div>
                <span className="text-[10px] text-emerald-500 font-medium">{t.winRate}% win</span>
                <span className="text-[10px] text-content-tertiary">{t.used}×</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Appeal Deadline Tracker ── */}
      <div className="card p-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">⏰ Upcoming Appeal Deadlines</h3>
        <div className="space-y-2">
          {[{claim:'CLM-4511',payer:'Aetna',deadline:'2026-03-07',days:3,level:'L1'},
            {claim:'CLM-4498',payer:'Blue Cross',deadline:'2026-03-10',days:6,level:'L2'},
            {claim:'CLM-4523',payer:'United',deadline:'2026-03-15',days:11,level:'L1'},
            {claim:'CLM-4489',payer:'Cigna',deadline:'2026-03-05',days:1,level:'L3'}
          ].sort((a,b)=>a.days-b.days).map(d=>(
            <div key={d.claim} className={`flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2 ${d.days<=3?'border border-red-500/30':''}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono">{d.claim}</span>
                <span className="text-xs text-content-secondary">{d.payer}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">{d.level}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${d.days<=3?'text-red-500':d.days<=7?'text-amber-500':'text-content-secondary'}`}>{d.days}d left</span>
                <span className="text-[10px] text-content-tertiary">{d.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  )
}
