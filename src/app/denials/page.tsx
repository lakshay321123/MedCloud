'use client'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
// removed - no longer using demoClaims
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ShieldAlert, FileText, AlertTriangle, Send, X, Plus, Edit2, Trash2, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import { useDenials, useSubmitAppeal, useCheckAppealDeadlines } from '@/lib/hooks'
import { filterByRegion } from '@/lib/utils/region'
import { ErrorBanner } from '@/components/shared/ApiStates'
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

type AppealTemplate = { id: string; name: string; payer: string; cat: string; winRate: number; used: number; level?: string; body?: string }

type DenialRow = {
  id: string; apiId?: string; patientName: string; payer: string; denialReason?: string; clientId: string; clientName: string;
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
    apiId: d.id,
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

  const denials: DenialRow[] = filterByRegion(
    apiDenials,
    currentUser.organization_id,
    currentUser.role,
    selectedClient?.id,
    country
  )

  const [selected, setSelected] = useState(denials[0]?.id || '')
  const [appealLevel, setAppealLevel] = useState<'L1' | 'L2' | 'L3'>('L1')
  const [appealTexts, setAppealTexts] = useState<Record<string, string>>({})
  const [aiGenerating, setAiGenerating] = useState(false)
  const selectedDenialApiId = denials.find(d => d.id === selected)?.apiId || ''
  const { mutate: submitAppeal, loading: submittingAppeal } = useSubmitAppeal(selectedDenialApiId)
  const { mutate: checkDeadlines } = useCheckAppealDeadlines()
  const [appealDeadlines, setAppealDeadlines] = useState<Array<{ denial_id: string; claim_number: string; days_remaining: number; urgency: string }>>([])

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<AppealTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({ name: '', payer: 'All Payers', category: 'Auth', body: '', level: 'L1' })
  const [templateFilter, setTemplateFilter] = useState('All Payers')
  const [localTemplates, setLocalTemplates] = useState<AppealTemplate[]>([
    { id: '1', name: 'Medical Necessity', payer: 'All Payers', cat: 'Auth', winRate: 72, used: 145, level: 'L1', body: 'Dear [PAYER] Appeals Department,\n\nRE: Medical Necessity Appeal — Claim [CLAIM_NUMBER]\nPatient: [PATIENT_NAME]\n\nWe are appealing the denial of [SERVICE] on the grounds that the service was medically necessary per the patient\'s clinical documentation. [CLINICAL_JUSTIFICATION]\n\nSupporting documentation attached.\n\nSincerely,\n[PROVIDER_NAME]' },
    { id: '2', name: 'Timely Filing Override', payer: 'All Payers', cat: 'Timely', winRate: 34, used: 89, level: 'L1', body: 'Dear [PAYER] Appeals Department,\n\nThis claim was submitted timely. Enclosed is proof of original submission dated [ORIGINAL_SUBMIT_DATE]. The delay was due to [REASON]. Please reconsider per your timely filing exception policy.' },
    { id: '3', name: 'Coding Error Correction', payer: 'All Payers', cat: 'Coding', winRate: 81, used: 67, level: 'L1', body: 'Dear [PAYER] Appeals Department,\n\nWe are submitting a corrected claim. The original claim contained a coding error: CPT [OLD_CPT] should be [NEW_CPT] based on [DOCUMENTATION]. Please reprocess with the correct code.' },
    { id: '4', name: 'Duplicate Claim Resubmit', payer: 'All Payers', cat: 'Duplicate', winRate: 65, used: 42, level: 'L1', body: 'Dear [PAYER],\n\nThis claim was denied as a duplicate, however our records show this is NOT a duplicate. The original claim [ORIGINAL_CLAIM_ID] was [STATUS]. Please process this as a new claim.' },
    { id: '5', name: 'Coordination of Benefits', payer: 'All Payers', cat: 'COB', winRate: 58, used: 38, level: 'L2', body: 'Dear [PAYER] Appeals Department,\n\nThis appeal concerns coordination of benefits for patient [PATIENT_NAME]. Primary payer: [PRIMARY_PAYER]. Per the Birthday Rule, [PAYER] is the [PRIMARY/SECONDARY] payer. EOB from primary payer attached.' },
    { id: '6', name: 'Eligibility Retroactive', payer: 'All Payers', cat: 'Eligibility', winRate: 46, used: 51, level: 'L1', body: 'Dear [PAYER],\n\nThe denial based on eligibility is incorrect. Patient [PATIENT_NAME] had active coverage on [DOS]. Attached is verification of coverage effective [EFFECTIVE_DATE]. Please reprocess.' },
  ])

  const US_PAYERS = ['All Payers', 'UnitedHealthcare', 'Aetna', 'Cigna', 'Blue Cross', 'Humana', 'Medicare', 'Medicaid', 'Anthem', 'BCBS']
  const TEMPLATE_CATS = ['Auth', 'Timely', 'Coding', 'Duplicate', 'COB', 'Eligibility', 'Medical Necessity', 'Other']
  const filteredTemplates = templateFilter === 'All Payers' ? localTemplates : localTemplates.filter(t => t.payer === templateFilter || t.payer === 'All Payers')

  function openNewTemplate() {
    setEditingTemplate(null)
    setTemplateForm({ name: '', payer: 'All Payers', category: 'Auth', body: '', level: 'L1' })
    setShowTemplateModal(true)
  }

  function openEditTemplate(t: AppealTemplate) {
    setEditingTemplate(t)
    setTemplateForm({ name: t.name, payer: t.payer, category: t.cat, body: t.body || '', level: t.level || 'L1' })
    setShowTemplateModal(true)
  }

  function saveTemplate() {
    if (!templateForm.name.trim()) { toast.error('Template name required'); return }
    if (!templateForm.body.trim()) { toast.error('Template body required'); return }
    if (editingTemplate) {
      setLocalTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm, cat: templateForm.category } : t))
      toast.success('Template updated')
    } else {
      const newT: AppealTemplate = { id: String(Date.now()), name: templateForm.name, payer: templateForm.payer, cat: templateForm.category, winRate: 0, used: 0, level: templateForm.level, body: templateForm.body }
      setLocalTemplates(prev => [...prev, newT])
      toast.success('Template created')
    }
    setShowTemplateModal(false)
  }

  function deleteTemplate(id: string) {
    setLocalTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  function applyTemplate(t: AppealTemplate) {
    if (t.body) {
      const denial = denials.find(d => d.id === selected)
      if (denial) {
        const filled = t.body
          .replace(/\[PAYER\]/g, denial.payer)
          .replace(/\[CLAIM_NUMBER\]/g, denial.id)
          .replace(/\[PATIENT_NAME\]/g, denial.patientName)
          .replace(/\[DOS\]/g, denial.dos || '')
        const key = `${denial.id}-${appealLevel}`
        setAppealTexts(prev => ({ ...prev, [key]: filled }))
        toast.success(`Template "${t.name}" applied to appeal`)
      }
    }
    setLocalTemplates(prev => prev.map(x => x.id === t.id ? { ...x, used: x.used + 1 } : x))
  }

  // Check appeal deadlines on mount
  useEffect(() => {
    checkDeadlines({} as Record<string, never>).then(result => {
      if (result?.alerts) setAppealDeadlines(result.alerts)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        <KPICard label={t('denials','openDenials')} value={denials.filter(d => ['open', 'denied', 'new', 'pending'].includes(d.status)).length} icon={<ShieldAlert size={20} />} />
        <KPICard label={t('denials','inAppeal')} value={denials.filter(d => ['in_appeal', 'appealed', 'appeal_pending'].includes(d.status)).length} />
        <KPICard label={t('denials','appealSuccessRate')} value={(() => {
          const won = denials.filter(d => d.status === 'appeal_won').length
          const total = denials.filter(d => ['appeal_won', 'in_appeal', 'appealed', 'appeal_pending'].includes(d.status)).length
          return total > 0 ? `${Math.round((won / total) * 100)}%` : '—'
        })()} trend="up" sub="+4%" />
        <KPICard label={t('denials','avgResolution')} value="—" />
      </div>
      {appealDeadlines.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-red-600">Appeal Deadlines Approaching</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {appealDeadlines.slice(0, 5).map(a => (
                <span key={a.denial_id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.urgency === 'critical' ? 'bg-red-500/20 text-red-600' : a.urgency === 'high' ? 'bg-brand-pale0/20 text-brand-deep' : 'bg-brand-pale0/20 text-brand-deep'}`}>
                  {a.claim_number || a.denial_id.slice(0,8)} · {a.days_remaining}d left
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
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
                <td className="px-4 py-3 font-mono text-xs">
                  <button onClick={e => { e.stopPropagation(); router.push(`/claims?id=${d.id}`) }}
                    className="text-brand hover:underline">{d.id}</button>
                </td>
                <td className="px-4 py-3">{d.patientName}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{d.payer}</td>
                <td className="px-4 py-3 text-xs text-content-primary">{d.denialReason}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-pill ${
                    d.source === 'payment_posting' ? 'bg-brand/10 text-brand-dark dark:text-brand' :
                    d.source === 'claim_rejection' ? 'bg-brand-pale0/10 text-brand-deep dark:text-brand-deep' :
                    'bg-brand-pale0/10 text-brand-deep'
                  }`}>
                    {d.source === 'payment_posting' ? 'Payment Posting' : d.source === 'claim_rejection' ? 'Claim Rejection' : 'Payer Audit'}
                  </span>
                </td>
                <td className={`px-4 py-3 text-xs font-semibold ${
                  d.appealLevel === 'L1' ? 'text-brand' :
                  d.appealLevel === 'L2' ? 'text-brand-deep dark:text-brand-deep' :
                  d.appealLevel === 'L3' ? 'text-brand-deep dark:text-brand-deep' : 'text-content-tertiary'
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
              <p className="text-xs text-content-secondary mb-1">{selectedDenial.clientName} · {selectedDenial.payer} · DOS: {selectedDenial.dos}</p>
              <button onClick={() => router.push(`/claims?id=${selectedDenial.id}`)}
                className="text-[11px] text-brand hover:underline mb-3 block">View Originating Claim →</button>
              <div className="bg-brand/5 border border-brand/20 rounded-lg p-2 mb-2 text-xs text-content-primary">Denial: {selectedDenial.denialReason}</div>
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
                      className="bg-brand/5 border border-brand/20 rounded-btn px-2.5 py-1 text-[10px] font-medium text-brand-dark flex items-center gap-1 hover:bg-brand/10 hover:border-brand/40 transition-colors cursor-pointer"
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
                  className="flex-1 bg-brand text-white rounded-btn py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-brand-mid disabled:opacity-50 transition-colors">
                  {aiGenerating ? (
                    <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"/><span>Generating...</span></>
                  ) : (
                    <><span>✦</span><span>Generate with AI</span></>
                  )}
                </button>
              <button
                onClick={async () => {
                  const text = getAppealText(selectedDenial)
                  if (text.trim().length < 50) {
                    toast.error('Appeal letter is too short')
                    return
                  }
                  if (selectedDenialApiId) {
                    try {
                      const result = await submitAppeal({ appeal_level: appealLevel, appeal_reason: selectedDenial.denialReason || 'Denial dispute', appeal_letter: text })
                      toast.success(`${appealLevel} appeal submitted for ${selectedDenial.id}`)
                      // Navigate to Documents with appealId filter so user can find the letter
                      if (result?.id) {
                        setTimeout(() => router.push(`/documents?appealId=${result.id}`), 1500)
                      }
                      refetch()
                    } catch { toast.error('Failed to submit appeal — try again') }
                  } else {
                    toast.success(`${appealLevel} appeal submitted for ${selectedDenial.id}`)
                  }
                }}
                disabled={submittingAppeal}
                className="flex-1 bg-brand text-white rounded-btn py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={14}/>{submittingAppeal ? 'Submitting…' : `Submit Appeal (${appealLevel})`}
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
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Appeal Templates</h3>
          <div className="flex items-center gap-2">
            {/* Payer filter */}
            <select value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}
              className="bg-surface-elevated border border-separator rounded-lg px-2 py-1 text-xs text-content-secondary outline-none focus:border-brand/40">
              {US_PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={openNewTemplate}
              className="flex items-center gap-1 text-xs bg-brand/10 text-brand-dark px-3 py-1.5 rounded-lg hover:bg-brand/10 transition-colors font-medium">
              <Plus size={12} /> New Template
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {filteredTemplates.map(t => (
            <div key={t.id} className="bg-surface-elevated rounded-lg p-3 hover:border-brand/30 border border-transparent transition-colors group">
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs font-medium leading-tight flex-1 cursor-pointer" onClick={() => applyTemplate(t)}>{t.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                  <button onClick={() => openEditTemplate(t)} className="p-0.5 rounded hover:bg-surface text-content-tertiary hover:text-brand transition-colors"><Edit2 size={11} /></button>
                  <button onClick={() => deleteTemplate(t.id)} className="p-0.5 rounded hover:bg-surface text-content-tertiary hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-content-tertiary">{t.cat}</span>
                {t.payer !== 'All Payers' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">{t.payer}</span>}
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-content-tertiary">{t.level || 'L1'}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1">
                  <div className="w-full bg-surface rounded-full h-1.5"><div className="bg-brand h-1.5 rounded-full" style={{ width: `${t.winRate}%` }} /></div>
                </div>
                <span className="text-[10px] text-brand-dark font-medium">{t.winRate}% win</span>
                <span className="text-[10px] text-content-tertiary">{t.used}×</span>
              </div>
              <button onClick={() => applyTemplate(t)}
                className="mt-2 w-full text-[10px] py-1 rounded bg-brand/10 text-brand hover:bg-brand/20 transition-colors font-medium">
                Apply to Current Appeal
              </button>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-3 text-center py-6 text-xs text-content-tertiary">
              No templates for {templateFilter}. <button onClick={openNewTemplate} className="text-brand hover:underline">Create one?</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Template Editor Modal ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="card w-[580px] max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-content-primary">{editingTemplate ? 'Edit Template' : 'New Appeal Template'}</h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 rounded-lg hover:bg-surface-elevated text-content-secondary"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-content-secondary mb-1">Template Name *</label>
                  <input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Medical Necessity — UHC"
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary outline-none focus:border-brand/40" />
                </div>
                <div>
                  <label className="block text-xs text-content-secondary mb-1">Payer</label>
                  <select value={templateForm.payer} onChange={e => setTemplateForm(f => ({ ...f, payer: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary outline-none focus:border-brand/40">
                    {US_PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-content-secondary mb-1">Category</label>
                  <select value={templateForm.category} onChange={e => setTemplateForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary outline-none focus:border-brand/40">
                    {TEMPLATE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-content-secondary mb-1">Default Appeal Level</label>
                  <select value={templateForm.level} onChange={e => setTemplateForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary outline-none focus:border-brand/40">
                    <option>L1</option><option>L2</option><option>L3</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-content-secondary mb-1">Template Body *</label>
                <p className="text-[10px] text-content-tertiary mb-1">Variables: [PAYER] [CLAIM_NUMBER] [PATIENT_NAME] [DOS] [PROVIDER_NAME] [SERVICE]</p>
                <textarea value={templateForm.body} onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Dear [PAYER] Appeals Department,&#10;&#10;RE: Appeal — Claim [CLAIM_NUMBER]&#10;Patient: [PATIENT_NAME]&#10;..."
                  rows={10}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary outline-none focus:border-brand/40 font-mono resize-y" />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">Cancel</button>
                <button onClick={saveTemplate} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-deep transition-colors">
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Appeal Deadline Tracker ── */}
      <div className="card p-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">⏰ Upcoming Appeal Deadlines</h3>
        {appealDeadlines.length > 0 ? (
          <div className="space-y-2">
            {appealDeadlines.slice().sort((a, b) => a.days_remaining - b.days_remaining).slice(0, 8).map(d => (
              <div key={d.denial_id} className={`flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2 ${d.days_remaining <= 3 ? 'border border-red-500/30' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono">{d.claim_number || d.denial_id.slice(0, 8)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand`}>{d.urgency}</span>
                </div>
                <span className={`text-xs font-medium ${d.days_remaining <= 3 ? 'text-red-500' : d.days_remaining <= 7 ? 'text-brand-deep' : 'text-content-secondary'}`}>{d.days_remaining}d left</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
              <AlertTriangle size={16} className="text-content-tertiary opacity-40" />
            </div>
            <p className="text-[13px] font-medium text-content-primary mb-1">No urgent deadlines</p>
            <p className="text-xs text-content-secondary">Deadlines will appear here when appeal windows are approaching. Set appeal deadlines on individual denials to track them.</p>
          </div>
        )}
      </div>
    </ModuleShell>
  )
}
