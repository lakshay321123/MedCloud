'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoClaims } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { ShieldAlert, FileText, AlertTriangle, Send } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import { useDenials } from '@/lib/hooks'
import { ErrorBanner } from '@/components/shared/ApiStates'

// ─── Demo denials (US) ────────────────────────────────────────────────────
const demoDenialsUS = [
  (() => {
    const base = demoClaims.find(c => c.id === 'CLM-4504')
    if (!base) throw new Error('Demo data missing CLM-4504 — check demo-data.ts')
    return { ...base, source: 'claim_rejection' as const, appealLevel: 'L1' as const, denialCategory: 'Authorization' }
  })(),
  (() => {
    const base = demoClaims.find(c => c.id === 'CLM-4507')
    if (!base) throw new Error('Demo data missing CLM-4507 — check demo-data.ts')
    return { ...base, source: 'payment_posting' as const, appealLevel: null, denialCategory: 'Eligibility' }
  })(),
  {
    id: 'CLM-4515', patientId: 'P-008', patientName: 'Emily Williams', clientId: 'org-103', clientName: 'Patel Cardiology',
    payer: 'Medicare', dos: '2026-02-18', cptCodes: ['99214'], icdCodes: ['I50.9'], charges: 250, paid: 0,
    status: 'denied' as const, age: 12, denialReason: 'Expenses not covered — inactive coverage',
    source: 'payment_posting' as const, appealLevel: null, denialCategory: 'Eligibility',
  },
]

// ─── Demo denials (UAE) ───────────────────────────────────────────────────
const demoDenialsUAE = [
  {
    id: 'CLM-UAE-001', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center',
    payer: 'Daman', dos: '2026-02-24', cptCodes: ['99213'], icdCodes: ['I25.10'], charges: 280, paid: 0,
    status: 'denied' as const, age: 7, denialReason: 'Prior authorization not obtained',
    source: 'payment_posting' as const, appealLevel: null, denialCategory: 'Authorization',
  },
  {
    id: 'CLM-UAE-002', patientId: 'P-007', patientName: 'Khalid Ibrahim', clientId: 'org-104', clientName: 'Dubai Wellness Clinic',
    payer: 'NAS', dos: '2026-01-17', cptCodes: ['99214'], icdCodes: ['M54.5'], charges: 320, paid: 0,
    status: 'denied' as const, age: 45, denialReason: 'Eligibility not confirmed at time of service',
    source: 'claim_rejection' as const, appealLevel: 'L1' as const, denialCategory: 'Eligibility',
  },
]

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
  const { selectedClient, country } = useApp()
  const { toast } = useToast()

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

  // Build demo denials based on region filter
  const getDemoDenials = (): DenialRow[] => {
    let rows: DenialRow[] = []

    if (selectedClient) {
      // If a specific client is selected, show only their denials
      const usRows = demoDenialsUS.map(d => ({
        id: d.id, patientName: d.patientName, payer: d.payer, denialReason: d.denialReason,
        clientId: d.clientId, clientName: d.clientName, dos: d.dos, source: d.source,
        appealLevel: d.appealLevel, status: d.status, denialCategory: d.denialCategory,
      }))
      const uaeRows = demoDenialsUAE.map(d => ({
        id: d.id, patientName: d.patientName, payer: d.payer, denialReason: d.denialReason,
        clientId: d.clientId, clientName: d.clientName, dos: d.dos, source: d.source,
        appealLevel: d.appealLevel, status: d.status, denialCategory: d.denialCategory,
      }))
      return [...usRows, ...uaeRows].filter(d => d.clientId === selectedClient.id)
    }

    if (country === 'uae') {
      rows = demoDenialsUAE.map(d => ({
        id: d.id, patientName: d.patientName, payer: d.payer, denialReason: d.denialReason,
        clientId: d.clientId, clientName: d.clientName, dos: d.dos, source: d.source,
        appealLevel: d.appealLevel, status: d.status, denialCategory: d.denialCategory,
      }))
    } else if (country === 'usa') {
      rows = demoDenialsUS.map(d => ({
        id: d.id, patientName: d.patientName, payer: d.payer, denialReason: d.denialReason,
        clientId: d.clientId, clientName: d.clientName, dos: d.dos, source: d.source,
        appealLevel: d.appealLevel, status: d.status, denialCategory: d.denialCategory,
      }))
    } else {
      // No region filter — show all
      const usRows = demoDenialsUS.map(d => ({
        id: d.id, patientName: d.patientName, payer: d.payer, denialReason: d.denialReason,
        clientId: d.clientId, clientName: d.clientName, dos: d.dos, source: d.source,
        appealLevel: d.appealLevel, status: d.status, denialCategory: d.denialCategory,
      }))
      const uaeRows = demoDenialsUAE.map(d => ({
        id: d.id, patientName: d.patientName, payer: d.payer, denialReason: d.denialReason,
        clientId: d.clientId, clientName: d.clientName, dos: d.dos, source: d.source,
        appealLevel: d.appealLevel, status: d.status, denialCategory: d.denialCategory,
      }))
      rows = [...usRows, ...uaeRows]
    }
    return rows
  }

  const denials: DenialRow[] = apiDenials.length > 0 ? apiDenials : getDemoDenials()

  const [selected, setSelected] = useState(denials[0]?.id || '')
  const [appealLevel, setAppealLevel] = useState<'L1' | 'L2' | 'L3'>('L1')
  const [appealTexts, setAppealTexts] = useState<Record<string, string>>({})

  const selectedDenial = denials.find(x => x.id === selected)

  const getAppealText = (d: DenialRow) => {
    const key = `${d.id}-${appealLevel}`
    return appealTexts[key] ?? buildAppealLetter(d, appealLevel)
  }

  return (
    <ModuleShell title="Denials &amp; Appeals" subtitle="Manage denied claims and appeal workflows">
      {apiError && <ErrorBanner error={apiError} onRetry={refetch} />}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Open Denials" value={denials.filter(d => d.status === 'denied').length} icon={<ShieldAlert size={20} />} />
        <KPICard label="In Appeal" value={denials.filter(d => d.status === 'appealed').length} />
        <KPICard label="Appeal Success Rate" value="68%" trend="up" sub="+4%" />
        <KPICard label="Avg Resolution" value="18 days" />
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
            <tbody>{denials.map(d => (
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

        <div className="card p-4 flex flex-col">
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
                <div className="flex gap-2">
                  {['Original Claim', 'Clinical Note', 'Denial Letter'].map(doc => (
                    <div key={doc} className="bg-surface-elevated border border-separator rounded px-2 py-1 text-[10px] text-content-secondary flex items-center gap-1">
                      <FileText size={10} />{doc}
                    </div>
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
                className="w-full flex-1 min-h-[130px] bg-surface-elevated border border-separator rounded-lg p-2 text-xs resize-none"
                value={getAppealText(selectedDenial)}
                onChange={e => {
                  const key = `${selectedDenial.id}-${appealLevel}`
                  setAppealTexts(prev => ({ ...prev, [key]: e.target.value }))
                }}
              />
              <button
                onClick={() => {
                  const text = getAppealText(selectedDenial)
                  if (text.trim().length < 50) {
                    toast.error('Appeal letter is too short')
                    return
                  }
                  toast.success(`${appealLevel} appeal submitted for ${selectedDenial.id}`)
                }}
                className="mt-3 bg-brand text-white rounded-btn py-2 text-sm font-medium flex items-center justify-center gap-2">
                <Send size={14}/>Submit Appeal ({appealLevel})
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-content-secondary">
              <ShieldAlert size={40} className="opacity-20" />
              <p className="text-sm">Select a denial to review</p>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
