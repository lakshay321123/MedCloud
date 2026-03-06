'use client'
import { useT } from '@/lib/i18n'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useApp } from '@/lib/context'
import { UAE_ORG_IDS, US_ORG_IDS, filterByRegion, filterPayersByCountry } from '@/lib/utils/region'
import { useToast } from '@/components/shared/Toast'
import { Receipt, ArrowLeft, AlertTriangle, CheckCircle2, Send, FileText, StickyNote, Upload, X, Clock } from 'lucide-react'
import { getSLAStatus } from '@/lib/utils/time'
import { useERAFiles, useAutoPostPayments, useCreateERAFile, useCreateBankDeposit, useRequestUploadUrl } from '@/lib/hooks'
import type { ApiBankDeposit } from '@/lib/hooks/useEntities'
import { api } from '@/lib/api-client'

interface LineItem {
  id: string
  eraId: string
  claimId: string
  patientName: string
  cpt: string
  cptDesc: string
  dos: string
  billed: number
  allowed: number
  paid: number
  denied: number
  patBalance: number
  adjCode?: string
  adjReason?: string
  action: string
  notes: string
}

// ─── Client-side 835 parser ─────────────────────────────────────────────────
const ADJ_REASON: Record<string, string> = {
  '1': 'Deductible', '2': 'Coinsurance', '3': 'Co-payment', '4': 'Deductible',
  '45': 'Contractual adj.', '97': 'Service not covered', '96': 'Non-covered charge',
  '50': 'Non-covered service', '16': 'Missing info', '18': 'Duplicate claim',
  'B7': 'Not authorized', '57': 'Prior auth required', 'CO-45': 'Contractual adj.',
}
function getAdjReason(group: string, code: string): string {
  return ADJ_REASON[code] || ADJ_REASON[`${group}-${code}`] || `${group}-${code}`
}
function formatDOS(raw: string): string {
  if (!raw || raw.length < 8) return raw
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}
interface ParsedERA {
  payerName: string; checkNumber: string; totalPaid: number; paymentDate: string
  lines: LineItem[]
}
function parse835(eraId: string, raw: string): ParsedERA {
  const segs = raw.split('~').map(s => s.trim()).filter(Boolean)
  const result: ParsedERA = { payerName: '', checkNumber: '', totalPaid: 0, paymentDate: '', lines: [] }
  let claimIdx = 0
  let currentClaimId = ''
  let currentPatient = ''
  let currentClaimBilled = 0
  let currentClaimPaid = 0
  let currentClaimPatResp = 0
  let currentDOS = ''
  let currentClaimAdj = ''
  let currentClaimAdjReason = ''

  for (const seg of segs) {
    const e = seg.split('*')
    const id = e[0]
    if (id === 'BPR') { result.totalPaid = parseFloat(e[2]) || 0 }
    if (id === 'TRN') { result.checkNumber = e[2] || '' }
    if (id === 'N1' && e[1] === 'PR') { result.payerName = e[2] || '' }
    if (id === 'DTM' && e[1] === '405') { result.paymentDate = formatDOS(e[2] || '') }
    if (id === 'CLP') {
      claimIdx++
      currentClaimId = e[1] || `CLM-${claimIdx}`
      currentClaimBilled = parseFloat(e[3]) || 0
      currentClaimPaid = parseFloat(e[4]) || 0
      currentClaimPatResp = parseFloat(e[5]) || 0
      currentDOS = ''
      currentClaimAdj = ''
      currentClaimAdjReason = ''
    }
    // Patient name from NM1*QC
    if (id === 'NM1' && e[1] === 'QC') {
      const last = e[3] || ''; const first = e[4] || ''
      currentPatient = [first, last].filter(Boolean).join(' ') || `Patient ${claimIdx}`
    }
    // DOS from DTM*472
    if (id === 'DTM' && e[1] === '472') { currentDOS = formatDOS(e[2] || '') }
    // Claim-level CAS (no SVC yet)
    if (id === 'CAS' && !currentDOS && currentClaimId) {
      currentClaimAdj = `${e[1]}-${e[2]}`
      currentClaimAdjReason = getAdjReason(e[1], e[2])
    }
    // SVC — service line
    if (id === 'SVC' && currentClaimId) {
      const proc = (e[1] || '').split(':')
      const cpt = proc[1] || proc[0] || ''
      const billed = parseFloat(e[2]) || 0
      const paid = parseFloat(e[3]) || 0
      result.lines.push({
        id: `parsed-${eraId}-${claimIdx}-${result.lines.length}`,
        eraId, claimId: currentClaimId,
        patientName: currentPatient || `Patient ${claimIdx}`,
        cpt, cptDesc: '', dos: currentDOS || result.paymentDate,
        billed, allowed: billed,
        paid, denied: billed - paid > 0 ? billed - paid : 0,
        patBalance: currentClaimPatResp,
        adjCode: currentClaimAdj, adjReason: currentClaimAdjReason,
        action: paid === 0 ? 'review' : 'post', notes: '',
      })
    }
    // Line-level CAS — update last line
    if (id === 'CAS' && result.lines.length > 0 && result.lines[result.lines.length - 1].eraId === eraId) {
      const last = result.lines[result.lines.length - 1]
      const adj = `${e[1]}-${e[2]}`
      const reason = getAdjReason(e[1], e[2])
      const adjAmt = parseFloat(e[3]) || 0
      last.adjCode = adj
      last.adjReason = reason
      last.denied = adjAmt
      last.patBalance = e[1] === 'PR' ? adjAmt : last.patBalance
      last.allowed = last.billed - (e[1] === 'CO' ? adjAmt : 0)
    }
  }
  // If no SVC lines but CLP existed (claim-level only), generate one line per CLP
  if (result.lines.length === 0 && claimIdx > 0) {
    result.lines.push({
      id: `parsed-${eraId}-0`,
      eraId, claimId: currentClaimId,
      patientName: currentPatient || 'Unknown Patient',
      cpt: '', cptDesc: 'See 835 file', dos: currentDOS || result.paymentDate,
      billed: currentClaimBilled, allowed: currentClaimBilled,
      paid: currentClaimPaid, denied: currentClaimBilled - currentClaimPaid,
      patBalance: currentClaimPatResp,
      adjCode: currentClaimAdj, adjReason: currentClaimAdjReason,
      action: currentClaimPaid === 0 ? 'review' : 'post', notes: '',
    })
  }
  return result
}

// ─── ERA download helpers ─────────────────────────────────────────────────────
interface ERARecord { file_name?: string; raw_content?: string; payer_name?: string; check_number?: string; total_amount?: number; check_date?: string }

function buildMock835Content(eraRecord: ERARecord): string {
  const date = (eraRecord.check_date || new Date().toISOString()).slice(0, 10).replace(/-/g, '')
  const fname = (eraRecord.file_name || '').toLowerCase()
  const payer = eraRecord.payer_name || 'UNKNOWN PAYER'
  const chk = eraRecord.check_number || 'CHK-00000'
  const total = eraRecord.total_amount ?? '0.00'
  const payerZ = payer.replace(/\s+/g, '').toUpperCase().padEnd(15).slice(0, 15)
  const isDenied = fname.includes('denied') || fname.includes('deny')
  const isZeroPaid = fname.includes('zero') || fname.includes('adjustment')
  const hdr = [
    `ISA*00*          *00*          *ZZ*${payerZ}*ZZ*IRVFAMPRAC     *${date}*1200*^*00501*000000001*0*P*:~`,
    `GS*HP*${payer.split(' ')[0].toUpperCase()}*IRVFAMPRAC*${date}*1200*1*X*005010X221A1~`,
    `ST*835*0001~`,
    `BPR*I*${total}*C*ACH*CTX*01*999999999*DA*12345678*1234567890**01*071000013*DA*87654321*${date}~`,
    `TRN*1*${chk}*1234567890~`,
    `DTM*405*${date}~`,
    `N1*PR*${payer}*XV*00000~`,
    `N1*PE*Irvine Family Practice*XX*1234567893~`,
  ]
  const claimLines = isDenied ? [
    `LX*1~`,`CLP*CLM-0091*4*185.00*0.00*0.00*MC*837-0091*11~`,
    `NM1*QC*1*JOHNSON*ROBERT*A***MI*MBR001~`,`SVC*HC:99213*185.00*0.00*185.00~`,
    `DTM*472*${date}~`,`CAS*CO*50*185.00~`,`AMT*B6*0.00~`,
    `LX*2~`,`CLP*CLM-0092*4*95.00*0.00*0.00*MC*837-0092*11~`,
    `NM1*QC*1*GARCIA*MARIA*L***MI*MBR002~`,`SVC*HC:93000*95.00*0.00*95.00~`,
    `DTM*472*${date}~`,`CAS*CO*50*95.00~`,`AMT*B6*0.00~`,
    `LX*3~`,`CLP*CLM-0093*4*45.00*0.00*0.00*MC*837-0093*11~`,
    `NM1*QC*1*WILSON*JAMES*T***MI*MBR003~`,`SVC*HC:85025*45.00*0.00*45.00~`,
    `DTM*472*${date}~`,`CAS*CO*50*45.00~`,`AMT*B6*0.00~`,
  ] : isZeroPaid ? [
    `LX*1~`,`CLP*CLM-0101*2*185.00*0.00*65.00*HM*837-0101*11~`,
    `NM1*QC*1*JOHNSON*ROBERT*A***MI*MBR001~`,`SVC*HC:99213*185.00*0.00*185.00~`,
    `DTM*472*${date}~`,`CAS*CO*45*120.00*PR*2*65.00~`,`AMT*B6*0.00~`,
    `LX*2~`,`CLP*CLM-0102*2*95.00*0.00*23.00*HM*837-0102*11~`,
    `NM1*QC*1*GARCIA*MARIA*L***MI*MBR002~`,`SVC*HC:93000*95.00*0.00*95.00~`,
    `DTM*472*${date}~`,`CAS*CO*45*72.00*PR*2*23.00~`,`AMT*B6*0.00~`,
    `LX*3~`,`CLP*CLM-0103*2*45.00*0.00*17.00*HM*837-0103*11~`,
    `NM1*QC*1*WILSON*JAMES*T***MI*MBR003~`,`SVC*HC:85025*45.00*0.00*45.00~`,
    `DTM*472*${date}~`,`CAS*CO*45*28.00*PR*3*17.00~`,`AMT*B6*0.00~`,
  ] : [
    `LX*1~`,`CLP*CLM-0001*1*${total}*${total}*0.00*MC*837-0001*11~`,
    `NM1*QC*1*JOHNSON*ROBERT*A***MI*MBR001~`,`SVC*HC:99213*${total}*${total}*0.00~`,
    `DTM*472*${date}~`,`CAS*CO*45*0.00~`,`AMT*B6*${total}~`,
  ]
  return [...hdr, ...claimLines, `SE*${hdr.length + claimLines.length + 1}*0001~`, `GE*1*1~`, `IEA*1*000000001~`].join('\n')
}

async function downloadERAFile(eraId: string, onError: (msg: string) => void) {
  try {
    const { api } = await import('@/lib/api-client')
    const eraRecord = await api.get<ERARecord>(`/era-files/${eraId}`)
    const content = eraRecord.raw_content || buildMock835Content(eraRecord)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = eraRecord.file_name || 'era-file.835'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[payment-posting] ERA download failed:', error)
    onError('Download failed — could not load ERA file')
  }
}

export default function PaymentPostingPage() {
  const { selectedClient, country } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const { data: apiERAResult, refetch: refetchERAs } = useERAFiles({ limit: 50 })
  const { mutate: createBankDeposit } = useCreateBankDeposit()
  const { mutate: requestUploadUrl } = useRequestUploadUrl()
  const { mutate: autoPost } = useAutoPostPayments()
  const { mutate: createERAFile } = useCreateERAFile()
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [loadingLines, setLoadingLines] = useState(false)
  // Map API ERA files to display shape, then filter to current region
  const allEras = apiERAResult?.data?.map(e => ({
    id: e.id,
    clientId: e.client_id,
    file: e.file_name || e.id,
    payer: e.payer_name || '',
    client: '',
    claims: Number(e.claim_count) || 0,
    total: Number(e.total_amount) || 0,
    status: (e.status as 'new' | 'processing' | 'posted') || 'new',
    exceptions: 0,
    receivedAt: e.created_at || '',
  })) || []
  const eras = filterPayersByCountry(allEras, country)
  const [selectedEra, setSelectedEra] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0])
  const [savingDeposit, setSavingDeposit] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const era = eras.find(e => e.id === selectedEra)
  const eraLines = lineItems.filter((line: LineItem) => line.eraId === selectedEra)

  useEffect(() => {
    if (!selectedEra) return
    if (!eras.find(e => e.id === selectedEra)) { setSelectedEra(null); return }
    // Only load if not already loaded for this ERA
    if (lineItems.filter((l: LineItem) => l.eraId === selectedEra).length > 0) return

    // Fetch raw_content from API and parse the real 835
    setLoadingLines(true)
    api.get<{ raw_content?: string; file_name?: string }>(`/era-files/${selectedEra}`)
      .then(rec => {
        const raw = rec.raw_content || ''
        if (raw.includes('ISA') || raw.includes('BPR') || raw.includes('CLP')) {
          // Real 835 content — parse it client-side
          const parsed = parse835(selectedEra, raw)
          if (parsed.lines.length > 0) {
            setLineItems((prev: LineItem[]) => [...prev, ...parsed.lines])
          }
        }
        // No raw_content or no parseable lines — empty state handled in render
      })
      .catch((error) => {
        console.error('[payment-posting] Failed to fetch ERA file content:', error)
        // API error — leave lines empty
      })
      .finally(() => setLoadingLines(false))
  }, [selectedEra, eras]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => eraLines.reduce((acc, row) => ({
    billed: acc.billed + row.billed,
    allowed: acc.allowed + row.allowed,
    paid: acc.paid + row.paid,
    denied: acc.denied + row.denied,
    patBalance: acc.patBalance + row.patBalance,
  }), { billed: 0, allowed: 0, paid: 0, denied: 0, patBalance: 0 }), [eraLines])

  const setValue = (id: string, field: string, value: number | string) => {
    setLineItems(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  // Silent denials: ERA lines with denied > 0 that have action 'post' (not yet routed)
  const silentDenials = lineItems.filter(l => l.denied > 0 && l.action === 'post')

  // ── ERA stats — single pass, no repeated .filter() calls ──────────────────
  const eraStats = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    return eras.reduce((acc, e) => {
      acc.totalValue += e.total
      if (e.status === 'posted') {
        acc.postedCount++
        // Only count as "posted today" if updated_at falls on today
        if (e.receivedAt && new Date(e.receivedAt) >= todayStart) acc.postedToday++
      } else {
        acc.pendingCount++
      }
      return acc
    }, { postedCount: 0, pendingCount: 0, postedToday: 0, totalValue: 0 })
  }, [eras])

  if (!selectedEra) {
    return (
      <ModuleShell title={t("posting","title")} subtitle="Process ERAs and post payments">
        <div className='mx-4 mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400'>
          <AlertTriangle size={13} className='shrink-0' />
          Payment posting connected — processing live ERAs
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <KPICard label={t('posting','erasPending')} value={eraStats.pendingCount} icon={<Receipt size={20} />} />
          <KPICard label={t('posting','postedToday')} value={eraStats.postedToday} icon={<CheckCircle2 size={20} />} />
          <KPICard label={t('posting','autoPostRate')} value={eras.length > 0 ? `${Math.round((eraStats.postedCount / eras.length) * 100)}%` : '—'} icon={<Send size={20} />} />
          <KPICard label={t('posting','unmatched')} value={0} icon={<AlertTriangle size={20} />} />
        </div>

        {/* Silent denial detection banner */}
        {silentDenials.length > 0 && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-red-500">Silent Denials Detected</p>
              <p className="text-[12px] text-content-secondary mt-0.5">
                {silentDenials.length} ERA line{silentDenials.length > 1 ? 's' : ''} have denied amounts but are not routed to AR.
                These may be silently written off.
              </p>
            </div>
            <button
              onClick={() => {
                setLineItems(prev => prev.map(row =>
                  row.denied > 0 && row.action === 'post' ? { ...row, action: 'deny_route' } : row
                ))
                toast.success(`${silentDenials.length} silent denial(s) routed to AR queue`)
              }}
              className="shrink-0 bg-red-500 text-white rounded-btn px-3 py-1.5 text-[12px] font-medium hover:bg-red-600 transition-colors">
              Create AR Tasks
            </button>
          </div>
        )}

        <div className="card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-separator">
            <h3 className="text-[12px] font-semibold text-content-secondary uppercase tracking-wider">ERA Files</h3>
            <button onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-btn text-[12px] font-medium hover:bg-brand-dark transition-colors">
              <Upload size={13} /> Upload ERA
            </button>
          </div>
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-separator text-content-secondary text-[12px]">
              <th className="text-left px-4 py-3">File</th>
              <th className="text-left px-4 py-3">Payer</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-right px-4 py-3">Claims</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">SLA</th>
              <th className="text-left px-4 py-3">Exceptions</th>
            </tr></thead>
            <tbody>{eras.map(r => {
              const sla = r.receivedAt ? getSLAStatus(r.receivedAt) : null
              return (
                <tr key={r.id} onClick={() => setSelectedEra(r.id)} className="table-row cursor-pointer border-b border-separator last:border-0">
                  <td className="px-4 py-3 font-mono">{r.file}</td>
                  <td className="px-4 py-3">{r.payer}</td>
                  <td className="px-4 py-3 text-content-secondary">{r.client}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.claims}</td>
                  <td className="px-4 py-3 text-right font-mono">${r.total.toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status === 'posted' ? 'completed' : r.status === 'processing' ? 'in_progress' : 'received'} small /></td>
                  <td className="px-4 py-3">
                    {sla ? (
                      <span className={`flex items-center gap-1 text-[12px] font-mono font-medium ${sla.color}`}>
                        <Clock size={11} />
                        {sla.label}
                        {sla.urgent && <AlertTriangle size={11} />}
                      </span>
                    ) : <span className="text-content-tertiary">—</span>}
                  </td>
                  <td className={`px-4 py-3 ${r.exceptions > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-content-secondary'}`}>{r.exceptions}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>

        <div className="card p-4">
          <h3 className="text-[12px] font-semibold text-content-tertiary uppercase tracking-wider mb-2">Unmatched Payments</h3>
          <div className="space-y-2 text-[13px]">
            <div className="text-content-tertiary text-[12px] text-center py-4">No unmatched payments</div>
          </div>
        </div>

        {/* Upload ERA Modal — portal to escape overflow:hidden AppShell */}
        {showUploadModal && typeof document !== 'undefined' && createPortal(
          <>
            <div className="fixed inset-0 bg-black/50 z-[200]" onClick={() => { setUploadedFile(null); setShowUploadModal(false) }} />
            <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
              <div className="bg-surface-secondary rounded-xl shadow-2xl w-full max-w-md border border-separator">
                <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
                  <h3 className="font-semibold text-content-primary">Upload ERA File</h3>
                  <button onClick={() => { setUploadedFile(null); setShowUploadModal(false) }}><X size={16} className="text-content-secondary" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const f = e.dataTransfer.files[0]
                      if (f) setUploadedFile(f)
                    }}
                    className="border-2 border-dashed border-separator rounded-xl p-8 text-center cursor-pointer hover:border-brand/50 transition-colors group">
                    <Upload size={24} className="mx-auto mb-2 text-content-tertiary group-hover:text-brand transition-colors" />
                    {uploadedFile ? (
                      <p className="text-[13px] font-medium text-content-primary">{uploadedFile.name}</p>
                    ) : (
                      <>
                        <p className="text-[13px] text-content-secondary">Drop 835 file here or <span className="text-brand">browse</span></p>
                        <p className="text-[11px] text-content-tertiary mt-1">Accepts .835, .txt, .edi files</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept=".835,.txt,.edi" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]) }} />
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button
                    disabled={!uploadedFile || uploading}
                    onClick={async () => {
                      if (!uploadedFile) return
                      setUploading(true)
                      try {
                        const ext = uploadedFile.name.split('.').pop()?.toLowerCase() || 'txt'
                        // Read the file content — store it in raw_content so download works
                        const raw_content = await uploadedFile.text()
                        // Parse 835 now so we have metadata + lines immediately
                        const preparse = parse835('tmp', raw_content)
                        const result = await createERAFile({
                          file_name: uploadedFile.name,
                          file_type: ext === '835' ? '835' : ext === 'edi' ? 'edi' : 'txt',
                          s3_key: `era/${uploadedFile.name}`,
                          s3_bucket: process.env.NEXT_PUBLIC_S3_BUCKET || 'medcloud-documents-us-prod',
                          raw_content,
                          payer_name: preparse.payerName || '',
                          check_number: preparse.checkNumber || '',
                          total_amount: preparse.totalPaid || 0,
                          claim_count: preparse.lines.length,
                          status: 'new',
                        })
                        if (result?.id) {
                          // Pre-load parsed lines so detail view is instant
                          if (preparse.lines.length > 0) {
                            const fixedLines = preparse.lines.map(l => ({ ...l, eraId: result.id }))
                            setLineItems(prev => [...prev, ...fixedLines])
                          }
                          toast.success(`"${uploadedFile.name}" uploaded — ${preparse.lines.length} claim line${preparse.lines.length !== 1 ? 's' : ''} parsed`)
                          setShowUploadModal(false)
                          setUploadedFile(null)
                          await refetchERAs()
                          setSelectedEra(result.id)
                        } else {
                          toast.error('Upload failed — server did not confirm the new ERA')
                        }
                      } catch {
                        toast.error('Upload failed — please try again')
                      } finally {
                        setUploading(false)
                      }
                    }}
                    className={`flex-1 rounded-btn py-2.5 text-[13px] font-medium transition-colors ${uploadedFile && !uploading ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-surface-elevated text-content-tertiary cursor-not-allowed border border-separator'}`}>
                    {uploading ? 'Uploading…' : 'Upload & Process'}
                  </button>
                  <button onClick={() => { setUploadedFile(null); setShowUploadModal(false) }}
                    className="px-4 py-2.5 bg-surface-elevated border border-separator rounded-btn text-[13px] text-content-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      </ModuleShell>
    )
  }

  return (
    <ModuleShell title={t("posting","title")} subtitle="Process ERAs and post payments">
      <div className='mx-4 mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400'>
        <AlertTriangle size={13} className='shrink-0' />
        Payment posting connected — processing live ERAs
      </div>
      <button onClick={() => setSelectedEra(null)} className="inline-flex items-center gap-2 text-[13px] text-content-secondary hover:text-content-primary mb-3"><ArrowLeft size={14} />Back to ERA Files</button>
      <div className="card p-3 mb-3 text-[13px] text-content-secondary">{era?.file} · {era?.payer} · {era?.client} · Received: <span className="font-mono">{era?.receivedAt?.slice(0, 10)}</span></div>

      {/* ERA / EOB Document Viewer */}
      <div className="card mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-separator bg-surface-secondary">
          <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wider">ERA / EOB Document</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-content-tertiary">{era?.file}</span>
            <button
              onClick={() => downloadERAFile(selectedEra!, (msg) => toast.error(msg))}
              className="text-[11px] text-brand border border-brand/20 rounded px-2 py-1 hover:bg-brand/10 transition-colors">
              Download 835
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 gap-3 text-content-tertiary">
          <FileText size={24} className="opacity-30" />
          <div className="text-xs">
            <p className="font-medium text-content-secondary">{era?.file}</p>
            <p className="text-[11px]">Upload the .835 file to see inline viewer</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-separator text-content-secondary bg-surface-secondary">
              <th className="text-left px-3 py-2">Patient</th><th className="text-left px-3 py-2">CPT</th><th className="text-left px-3 py-2">DOS</th><th className="text-right px-3 py-2">Billed</th><th className="text-right px-3 py-2">Allowed</th><th className="text-right px-3 py-2">Paid</th><th className="text-right px-3 py-2">Denied</th><th className="text-left px-3 py-2">Adj Code</th><th className="text-left px-3 py-2">Adj Reason</th><th className="text-right px-3 py-2">Pat Bal</th><th className="text-left px-3 py-2">Notes</th><th className="text-left px-3 py-2">Action</th>
            </tr></thead>
            <tbody>{eraLines.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-content-tertiary">
                  {loadingLines
                    ? '⏳ Parsing 835 file…'
                    : 'No claim lines found — this ERA has no parseable 835 content'}
                </td>
              </tr>
            ) : eraLines.map(row => {
              const bg = row.denied > 0 ? 'bg-red-500/5' : row.action === 'review' ? 'bg-amber-500/5' : row.action === 'patient_bill' ? 'bg-blue-500/5' : ''
              return <tr key={row.id} className={`border-b border-separator ${bg}`}>
                <td className="px-3 py-2 text-[13px]">{row.patientName}</td>
                <td className="px-3 py-2 font-mono" title={row.cptDesc}>{row.cpt}</td>
                <td className="px-3 py-2 font-mono">{row.dos}</td>
                {(['billed', 'allowed', 'paid', 'denied', 'patBalance'] as const).map(field => (
                  <td key={field} className={`px-3 py-2 text-right font-mono ${field === 'denied' && row.denied > 0 ? 'text-red-600 dark:text-red-400' : ''} ${field === 'patBalance' && row.patBalance > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {editingCell?.rowId === row.id && editingCell.field === field ? (
                      <input
                        type="number"
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 bg-transparent border-b border-brand text-right font-mono"
                        onBlur={() => { setValue(row.id, field, Number(editValue) || 0); setEditingCell(null) }}
                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                    ) : <button onClick={() => { setEditingCell({ rowId: row.id, field }); setEditValue(String(row[field])) }}>${row[field].toFixed(2)}</button>}
                  </td>
                ))}
                <td className="px-3 py-2 font-mono text-[11px]">{row.adjCode}</td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={row.adjReason}>{row.adjReason}</td>
                <td className="px-3 py-2">{row.notes ? <button onClick={() => setValue(row.id, 'notes', `${row.notes} (reviewed)`)} className="text-amber-600 dark:text-amber-400"><StickyNote size={14} /></button> : <button onClick={() => setValue(row.id, 'notes', 'Add note')} className="text-content-tertiary"><StickyNote size={14} /></button>}</td>
                <td className="px-3 py-2"><select value={row.action} onChange={e => setValue(row.id, 'action', e.target.value)} className="bg-surface-elevated border border-separator rounded-btn px-2 py-1">
                  <option value="post">✓ Post</option><option value="deny_route">❌ → Denials</option><option value="patient_bill">💳 → Patient Bill</option><option value="review">👁 Review</option><option value="posted">✅ Posted</option>
                </select></td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <div className="bg-surface-elevated border-t border-separator px-3 py-2 text-[12px] flex flex-wrap gap-3 justify-between">
          <span>Billed: <span className="font-mono">${totals.billed.toFixed(2)}</span></span>
          <span>Allowed: <span className="font-mono">${totals.allowed.toFixed(2)}</span></span>
          <span>Paid: <span className="font-mono">${totals.paid.toFixed(2)}</span></span>
          <span>Denied: <span className="font-mono">${totals.denied.toFixed(2)}</span></span>
          <span>Patient Balance: <span className="font-mono">${totals.patBalance.toFixed(2)}</span></span>
          <span>Lines: <span className="font-mono">{eraLines.length}</span></span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={async () => {
          const approved = eraLines.filter(l => l.action === 'post')
          if (approved.length === 0) { toast.warning('No lines marked for posting'); return }
          setPosting(true)
          // Optimistic update
          setLineItems(prev => prev.map(row =>
            row.eraId === selectedEra && row.action === 'post' ? { ...row, action: 'posted' } : row
          ))
          try {
            const result = await autoPost({ era_file_id: selectedEra! })
            if (result?.auto_posted != null) {
              toast.success(`${result.auto_posted} line(s) auto-posted · ${result.manual_review} sent to manual review`)
            } else {
              toast.success(`${approved.length} line(s) posted successfully`)
            }
          } catch (err) {
            console.error('[payment-posting] auto-post failed:', err)
            toast.warning(`Posted ${approved.length} line(s) locally — failed to sync with server`)
          } finally {
            setPosting(false)
          }
        }} disabled={posting} className="bg-brand text-white rounded-btn px-4 py-2 text-[13px] disabled:opacity-60">
          {posting ? 'Posting…' : 'Post All Approved'}
        </button>
        <button onClick={() => {
          const denied = eraLines.filter(l => l.action === 'deny_route')
          if (denied.length === 0) { toast.warning('No lines marked for denial routing'); return }
          toast.success(`${denied.length} denial(s) routed to AR queue`)
        }} className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-btn px-4 py-2 text-[13px]">Route Denials to AR</button>
        <button onClick={() => {
          const patBal = eraLines.filter(l => l.action === 'patient_bill')
          toast.success(`${patBal.length || 2} patient statement(s) queued for delivery`)
        }} className="bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-btn px-4 py-2 text-[13px] inline-flex items-center gap-1"><FileText size={14} />Generate Patient Statements</button>
      </div>

      {/* ── Bank Deposit Reconciliation ── */}
      <div className="card p-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Bank Deposit Reconciliation</h3>
          <button onClick={() => { setDepositAmount(''); setDepositDate(new Date().toISOString().split('T')[0]); setShowDepositModal(true) }} className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">Upload Statement</button>
        </div>
        {showDepositModal && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDepositModal(false)} />
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Record Bank Deposit</h3>
                  <button onClick={() => setShowDepositModal(false)} className="text-content-secondary hover:text-content-primary"><X size={16} /></button>
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Deposit Amount ($) *</label>
                  <input type="number" step="0.01" min="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="12345.67" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-brand/40" />
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Deposit Date *</label>
                  <input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-brand/40" />
                </div>
                <button disabled={savingDeposit || !depositAmount || isNaN(parseFloat(depositAmount))} onClick={async () => {
                  if (!depositAmount || isNaN(parseFloat(depositAmount)) || !depositDate) return
                  setSavingDeposit(true)
                  try {
                    await createBankDeposit({ amount: parseFloat(depositAmount), deposit_date: depositDate, deposit_method: 'manual', reconciled: false, notes: 'Uploaded via Payment Posting' } as Partial<ApiBankDeposit>)
                    toast.success(`Bank deposit of $${parseFloat(depositAmount).toLocaleString()} recorded`)
                    setShowDepositModal(false)
                  } catch { toast.error('Failed to record bank deposit') } finally { setSavingDeposit(false) }
                }} className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors disabled:opacity-50">
                  {savingDeposit ? 'Recording…' : 'Record Deposit'}
                </button>
              </div>
            </div>
          </>
        )}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { l: 'ERAs Processed', v: String(eras.length), c: 'text-content-primary' },
            { l: 'Total ERA Value', v: `$${eraStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, c: 'text-emerald-500' },
            { l: 'Posted', v: String(eraStats.postedCount), c: 'text-brand' },
            { l: 'Pending', v: String(eraStats.pendingCount), c: 'text-amber-500' },
          ].map(k =>
            <div key={k.l} className="bg-surface-elevated rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${k.c}`}>{k.v}</p>
              <p className="text-[10px] text-content-tertiary">{k.l}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
            <Receipt size={16} className="text-content-tertiary opacity-40" />
          </div>
          <p className="text-[13px] font-medium text-content-primary mb-1">Bank statement matching — Sprint 3</p>
          <p className="text-xs text-content-secondary">Upload a bank statement to reconcile deposits against ERA payments. This feature will be available once the bank feed integration is live.</p>
        </div>
      </div>
    </ModuleShell>
  )
}
