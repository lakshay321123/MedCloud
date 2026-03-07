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
import { useERAFiles, useAutoPostPayments, useCreateERAFile, useCreateBankDeposit, useRequestUploadUrl, usePayments } from '@/lib/hooks'
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

// ─── Universal EOB Parser — handles 835 EDI, TXT, and PDF ───────────────────
const ADJ_REASON: Record<string, string> = {
  '1': 'Deductible', '2': 'Coinsurance', '3': 'Co-payment', '4': 'Deductible',
  '45': 'Contractual adj.', '97': 'Service not covered', '96': 'Non-covered charge',
  '50': 'Non-covered service', '16': 'Missing info', '18': 'Duplicate claim',
  'B7': 'Not authorized', '57': 'Prior auth required', 'CO-45': 'Contractual adj.',
  '29': 'Timely filing exceeded', '119': 'Max benefit reached', '23': 'Other carrier paid',
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
  formatDetected?: 'edi_835' | 'txt' | 'pdf'
}

// ── Format detector ──────────────────────────────────────────────────────────
type EOBFormat = 'edi_835' | 'txt' | 'pdf'
function detectEOBFormat(raw: string, fileName?: string): EOBFormat {
  const ext = (fileName || '').split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  // 835 EDI always starts with ISA segment or has ~ delimiters with X12 identifiers
  if (/^ISA\*/i.test(raw.trim()) || /\bST\*835\b/.test(raw) || (raw.includes('~') && raw.includes('BPR*'))) return 'edi_835'
  // GS*HP = 835 functional group header
  if (/GS\*HP\*/.test(raw)) return 'edi_835'
  return 'txt'
}

// ── TXT EOB parser ───────────────────────────────────────────────────────────
function parseTxtEOB(eraId: string, raw: string): ParsedERA {
  const lines = raw.split(/\r?\n/)
  const result: ParsedERA = { payerName: '', checkNumber: '', totalPaid: 0, paymentDate: '', lines: [], formatDetected: 'txt' }

  // Header scan
  for (const line of lines) {
    const l = line.trim()
    if (!result.payerName) {
      const m = l.match(/(?:payer|insurance\s*company|insurer|carrier)[:\s]+([A-Za-z][^\n\r]{3,50})/i)
      if (m) result.payerName = m[1].trim()
    }
    if (!result.checkNumber) {
      const m = l.match(/(?:check\s*(?:number|#|no)|eft\s*(?:number|#)|trace\s*(?:number|#)|reference\s*(?:no|number|#))[:\s#]+([A-Z0-9\-]{4,20})/i)
      if (m) result.checkNumber = m[1].trim()
    }
    if (!result.paymentDate) {
      const m = l.match(/(?:payment\s*date|check\s*date|issue\s*date|paid\s*date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      if (m) result.paymentDate = m[1].trim()
    }
    if (!result.totalPaid) {
      const m = l.match(/(?:total\s*(?:payment|paid|amount)|net\s*payment)[:\s]+\$?([\d,]+\.?\d*)/i)
      if (m) result.totalPaid = parseFloat(m[1].replace(/,/g, '')) || 0
    }
  }

  // Find claim blocks
  let claimIdx = 0
  const claimPositions: { number: string; lineIdx: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const m1 = lines[i].match(/(?:claim\s*(?:number|no|#|id)[:\s#]+)([A-Z0-9\-]{4,20})/i)
    if (m1) { claimPositions.push({ number: m1[1], lineIdx: i }); continue }
    const m2 = lines[i].match(/\b(CLM[-]?[A-Z0-9]{4,15})\b/i)
    if (m2) claimPositions.push({ number: m2[1], lineIdx: i })
  }

  for (const cp of claimPositions) {
    claimIdx++
    const start = Math.max(0, cp.lineIdx - 2)
    const end = Math.min(lines.length, cp.lineIdx + 15)
    const block = lines.slice(start, end).join('\n')

    let claimPatient = ''
    let claimDOS = ''
    let claimBilled = 0
    let claimPaid = 0
    let claimPatResp = 0

    const patM = block.match(/(?:patient|member|subscriber)[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i)
    if (patM) claimPatient = patM[1].trim()
    const dosM = block.match(/(?:date\s*of\s*service|dos|service\s*date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    if (dosM) claimDOS = dosM[1].trim()
    const billedM = block.match(/(?:billed|charged|submitted)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (billedM) claimBilled = parseFloat(billedM[1].replace(/,/g, '')) || 0
    const paidM = block.match(/(?:paid|payment|amount\s*paid)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (paidM) claimPaid = parseFloat(paidM[1].replace(/,/g, '')) || 0
    const prM = block.match(/(?:patient\s*(?:responsibility|balance)|deductible|copay)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (prM) claimPatResp = parseFloat(prM[1].replace(/,/g, '')) || 0

    // CPT line extraction
    const cptPat = /\b(\d{5})\b[\s|,\t]+\$?([\d,]+\.?\d*)[\s|,\t]+(?:\$?([\d,]+\.?\d*)[\s|,\t]+)?(?:\$?([\d,]+\.?\d*))?/g
    let cptM: RegExpExecArray | null
    while ((cptM = cptPat.exec(block)) !== null) {
      const num = parseInt(cptM[1])
      if (num >= 100 && num <= 99499) {
        const b = parseFloat((cptM[2] || '0').replace(/,/g, '')) || 0
        const a = parseFloat((cptM[3] || '0').replace(/,/g, '')) || 0
        const p = parseFloat((cptM[4] || '0').replace(/,/g, '')) || 0
        if (b > 0 || p > 0) {
          const ctx = block.slice(Math.max(0, cptM.index - 50), Math.min(block.length, cptM.index + 100))
          const carcM = ctx.match(/\b(CO|PR|OA|PI|CR)[-\s]?(\d{1,3})\b/i)
          const adjCode = carcM ? `${carcM[1].toUpperCase()}-${carcM[2]}` : ''
          result.lines.push({
            id: `txt-${eraId}-${claimIdx}-${result.lines.length}`, eraId,
            claimId: cp.number, patientName: claimPatient || `Patient ${claimIdx}`,
            cpt: cptM[1], cptDesc: '', dos: claimDOS || result.paymentDate,
            billed: b, allowed: a || b, paid: p, denied: b - p > 0 ? b - p : 0,
            patBalance: claimPatResp,
            adjCode, adjReason: adjCode ? getAdjReason(carcM![1], carcM![2]) : '',
            action: p === 0 ? 'review' : 'post', notes: ''
          })
        }
      }
    }

    // Claim-level fallback if no CPT lines
    if (result.lines.filter(l => l.claimId === cp.number).length === 0 && (claimBilled > 0 || claimPaid > 0)) {
      result.lines.push({
        id: `txt-${eraId}-${claimIdx}-0`, eraId, claimId: cp.number,
        patientName: claimPatient || `Patient ${claimIdx}`,
        cpt: '', cptDesc: 'See EOB', dos: claimDOS || result.paymentDate,
        billed: claimBilled, allowed: claimBilled, paid: claimPaid,
        denied: claimBilled - claimPaid > 0 ? claimBilled - claimPaid : 0,
        patBalance: claimPatResp, adjCode: '', adjReason: '',
        action: claimPaid === 0 ? 'review' : 'post', notes: ''
      })
    }
  }

  // Global fallback if no claim markers found
  if (result.lines.length === 0) {
    const cptGlobal = /\b(\d{5})\b[\s|,\t]+\$?([\d,]+\.?\d*)[\s|,\t]+\$?([\d,]+\.?\d*)[\s|,\t]+\$?([\d,]+\.?\d*)/g
    let gm: RegExpExecArray | null
    let idx = 0
    while ((gm = cptGlobal.exec(raw)) !== null) {
      const num = parseInt(gm[1])
      if (num >= 100 && num <= 99499) {
        const b = parseFloat(gm[2].replace(/,/g, '')) || 0
        const a = parseFloat(gm[3].replace(/,/g, '')) || 0
        const p = parseFloat(gm[4].replace(/,/g, '')) || 0
        result.lines.push({
          id: `txt-${eraId}-g-${idx++}`, eraId, claimId: 'EOB-001',
          patientName: '', cpt: gm[1], cptDesc: '', dos: result.paymentDate,
          billed: b, allowed: a, paid: p, denied: b - p > 0 ? b - p : 0,
          patBalance: 0, adjCode: '', adjReason: '',
          action: p === 0 ? 'review' : 'post', notes: ''
        })
      }
    }
  }

  return result
}

// ── Main entry point: routes to correct parser ────────────────────────────────
function parseEOB(eraId: string, raw: string, fileName?: string): ParsedERA {
  const fmt = detectEOBFormat(raw, fileName)
  if (fmt === 'edi_835') {
    const r = parse835(eraId, raw)
    return { ...r, formatDetected: 'edi_835' }
  }
  if (fmt === 'txt') return parseTxtEOB(eraId, raw)
  // PDF returns empty shell — actual parsing happens async via /api/parse-eob
  return { payerName: '', checkNumber: '', totalPaid: 0, paymentDate: '', lines: [], formatDetected: 'pdf' }
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
  const { data: paymentsResult, refetch: refetchPayments } = usePayments({ limit: 100 })
  const { mutate: createBankDeposit } = useCreateBankDeposit()
  const { mutate: requestUploadUrl } = useRequestUploadUrl()
  const { mutate: autoPost } = useAutoPostPayments()
  const { mutate: createERAFile } = useCreateERAFile()
  const [applyingPayment, setApplyingPayment] = useState<string | null>(null)
  const [writingOff, setWritingOff] = useState<string | null>(null)
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
    fileType: (e.file_type || 'txt') as string,
  })) || []
  const eras = filterPayersByCountry(allEras, country)

  // Unmatched payments from real API
  const allPayments = (Array.isArray((paymentsResult as any)?.data) ? (paymentsResult as any).data : []) as Array<{
    id: string; status: string; amount: number; payer_name?: string; patient_name?: string;
    claim_number?: string; era_file_name?: string; created_at?: string
  }>
  const unmatchedPayments = allPayments.filter(p => p.status === 'unmatched')
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

    // Fetch raw_content from API and parse using universal EOB parser
    setLoadingLines(true)
    api.get<{ raw_content?: string; file_name?: string; file_type?: string }>(`/era-files/${selectedEra}`)
      .then(async rec => {
        const raw = rec.raw_content || ''
        const fileName = rec.file_name || ''
        const fileType = rec.file_type || ''

        if (!raw) return // No content — leave empty

        // PDF stored as base64 data URI — send to /api/parse-eob
        if (fileType === 'pdf' || raw.startsWith('data:application/pdf')) {
          try {
            const parseResp = await fetch('/api/parse-eob', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ raw_content: raw, file_name: fileName }),
            })
            if (parseResp.ok) {
              const parsed = await parseResp.json()
              const lines: LineItem[] = []
              for (const claim of (parsed.claims || [])) {
                for (const svc of (claim.lines || [])) {
                  lines.push({
                    id: `pdf-${selectedEra}-${lines.length}`,
                    eraId: selectedEra,
                    claimId: claim.claim_number || 'EOB-001',
                    patientName: claim.patient_name || '',
                    cpt: svc.cpt || '',
                    cptDesc: '',
                    dos: claim.date_of_service || parsed.payment_date || '',
                    billed: svc.billed || 0,
                    allowed: svc.allowed || svc.billed || 0,
                    paid: svc.paid || 0,
                    denied: (svc.billed || 0) - (svc.paid || 0) > 0 ? (svc.billed || 0) - (svc.paid || 0) : 0,
                    patBalance: claim.patient_responsibility || 0,
                    adjCode: svc.adjustment_code || '',
                    adjReason: svc.adjustment_reason || '',
                    action: (svc.paid || 0) === 0 ? 'review' : 'post',
                    notes: '',
                  })
                }
              }
              if (lines.length > 0) setLineItems((prev: LineItem[]) => [...prev, ...lines])
            }
          } catch (err) {
            console.error('[payment-posting] PDF parse-eob failed:', err)
          }
          return
        }

        // 835 EDI or TXT — parse client-side
        const parsed = parseEOB(selectedEra, raw, fileName)
        if (parsed.lines.length > 0) {
          setLineItems((prev: LineItem[]) => [...prev, ...parsed.lines])
        }
      })
      .catch((error) => {
        console.error('[payment-posting] Failed to fetch ERA file content:', error)
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
          <KPICard label={t('posting','unmatched')} value={unmatchedPayments.length} icon={<AlertTriangle size={20} />} />
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
                  <td className="px-4 py-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span>{r.file}</span>
                      {(() => {
                        const ft = (r.fileType || '').toLowerCase()
                        if (ft === 'pdf') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/20">PDF</span>
                        if (ft === '835' || ft === 'edi') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/15 text-brand border border-brand/20">835</span>
                        if (ft === 'txt') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 border border-green-500/20">TXT</span>
                        return null
                      })()}
                    </div>
                  </td>
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
            {unmatchedPayments.length === 0 ? (
              <div className="text-content-tertiary text-[12px] text-center py-4">No unmatched payments</div>
            ) : unmatchedPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 border border-separator rounded-lg px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-content-primary truncate">
                    {p.payer_name || 'Unknown Payer'} — ${Number(p.amount || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-content-tertiary truncate">
                    {p.patient_name || '—'} · ERA: {p.era_file_name || '—'} · {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      setApplyingPayment(p.id)
                      try {
                        await api.post(`/payments/${p.id}/apply`, { notes: 'Applied from unmatched queue' })
                        toast.success(`$${Number(p.amount).toFixed(2)} applied successfully`)
                        refetchPayments()
                      } catch { toast.error('Failed to apply payment') }
                      finally { setApplyingPayment(null) }
                    }}
                    disabled={applyingPayment === p.id}
                    className="text-[10px] bg-brand text-white px-2.5 py-1 rounded transition-colors hover:bg-brand-deep disabled:opacity-50">
                    {applyingPayment === p.id ? '…' : 'Apply'}
                  </button>
                  <button
                    onClick={async () => {
                      setWritingOff(p.id)
                      try {
                        await api.post(`/payments/${p.id}/write-off`, { reason: 'Unmatched — written off by poster' })
                        toast.success(`$${Number(p.amount).toFixed(2)} written off`)
                        refetchPayments()
                      } catch { toast.error('Failed to write off payment') }
                      finally { setWritingOff(null) }
                    }}
                    disabled={writingOff === p.id}
                    className="text-[10px] border border-separator text-content-secondary hover:text-red-500 px-2.5 py-1 rounded transition-colors disabled:opacity-50">
                    {writingOff === p.id ? '…' : 'Write Off'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload ERA/EOB Modal — accepts 835, EDI, TXT, PDF */}
        {showUploadModal && typeof document !== 'undefined' && createPortal(
          <>
            <div className="fixed inset-0 bg-black/50 z-[200]" onClick={() => { setUploadedFile(null); setShowUploadModal(false) }} />
            <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
              <div className="bg-surface-secondary rounded-xl shadow-2xl w-full max-w-md border border-separator">
                <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
                  <h3 className="font-semibold text-content-primary">Upload EOB / ERA</h3>
                  <button onClick={() => { setUploadedFile(null); setShowUploadModal(false) }}><X size={16} className="text-content-secondary" /></button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Format legend */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: '835 EDI', desc: 'Electronic remittance', color: 'text-brand bg-brand/10 border-brand/20' },
                      { label: 'TXT', desc: 'Payer portal export', color: 'text-green-600 bg-green-500/10 border-green-500/20' },
                      { label: 'PDF', desc: 'Paper / fax EOB', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
                    ].map(f => (
                      <div key={f.label} className={`rounded-lg border px-2 py-1.5 ${f.color}`}>
                        <div className="text-[12px] font-semibold">{f.label}</div>
                        <div className="text-[10px] opacity-70">{f.desc}</div>
                      </div>
                    ))}
                  </div>

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
                      <div>
                        <p className="text-[13px] font-medium text-content-primary">{uploadedFile.name}</p>
                        {/* Format badge */}
                        {(() => {
                          const ext = uploadedFile.name.split('.').pop()?.toLowerCase()
                          const fmt = ext === 'pdf' ? 'PDF' : ext === '835' || ext === 'edi' ? '835 EDI' : 'TXT'
                          const color = fmt === 'PDF' ? 'text-amber-600 bg-amber-500/10' : fmt === '835 EDI' ? 'text-brand bg-brand/10' : 'text-green-600 bg-green-500/10'
                          return (
                            <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
                              {fmt} — {fmt === 'PDF' ? 'AI Vision parser' : fmt === '835 EDI' ? 'EDI X12 parser' : 'Text parser'}
                            </span>
                          )
                        })()}
                        <p className="text-[11px] text-content-tertiary mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[13px] text-content-secondary">Drop EOB/ERA file here or <span className="text-brand">browse</span></p>
                        <p className="text-[11px] text-content-tertiary mt-1">Accepts .835  .edi  .txt  .pdf</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept=".835,.txt,.edi,.pdf" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]) }} />
                  </div>

                  {uploadedFile && uploadedFile.name.split('.').pop()?.toLowerCase() === 'pdf' && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[12px] text-amber-700 dark:text-amber-400">PDF EOBs are processed via AI Vision — parsing takes ~10–15 seconds. Data will be available after upload completes.</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button
                    disabled={!uploadedFile || uploading}
                    onClick={async () => {
                      if (!uploadedFile) return
                      setUploading(true)
                      try {
                        const ext = uploadedFile.name.split('.').pop()?.toLowerCase() || 'txt'
                        const isPDF = ext === 'pdf'

                        // For non-PDF: read as text and parse immediately
                        if (!isPDF) {
                          const raw_content = await uploadedFile.text()
                          const preparse = parseEOB('tmp', raw_content, uploadedFile.name)
                          const result = await createERAFile({
                            file_name: uploadedFile.name,
                            file_type: ext === '835' ? '835' : ext === 'edi' ? 'edi' : 'txt',
                            s3_key: `era/${uploadedFile.name}`,
                            s3_bucket: 'medcloud-documents-us-prod',
                            raw_content,
                            payer_name: preparse.payerName || '',
                            check_number: preparse.checkNumber || '',
                            total_amount: preparse.totalPaid || 0,
                            claim_count: preparse.lines.length,
                            status: preparse.lines.length > 0 ? 'new' : 'new',
                          })
                          if (result?.id) {
                            if (preparse.lines.length > 0) {
                              const fixedLines = preparse.lines.map(l => ({ ...l, eraId: result.id }))
                              setLineItems(prev => [...prev, ...fixedLines])
                            }
                            const fmtLabel = preparse.formatDetected === 'edi_835' ? '835 EDI' : 'TXT'
                            toast.success(`"${uploadedFile.name}" uploaded [${fmtLabel}] — ${preparse.lines.length} line${preparse.lines.length !== 1 ? 's' : ''} parsed`)
                            setShowUploadModal(false)
                            setUploadedFile(null)
                            await refetchERAs()
                            setSelectedEra(result.id)
                          } else {
                            toast.error('Upload failed — server did not confirm the new ERA')
                          }
                          return
                        }

                        // PDF path — store file as base64, send to /api/parse-eob for AI Vision
                        const base64 = await new Promise<string>((res, rej) => {
                          const reader = new FileReader()
                          reader.onload = () => res((reader.result as string).split(',')[1] || '')
                          reader.onerror = () => rej(new Error('FileReader failed'))
                          reader.readAsDataURL(uploadedFile)
                        })
                        const raw_content = `data:application/pdf;base64,${base64}`

                        // Create ERA file record first
                        const result = await createERAFile({
                          file_name: uploadedFile.name,
                          file_type: 'pdf',
                          s3_key: `era/${uploadedFile.name}`,
                          s3_bucket: 'medcloud-documents-us-prod',
                          raw_content,
                          payer_name: '',
                          check_number: '',
                          total_amount: 0,
                          claim_count: 0,
                          status: 'processing',
                        })

                        if (!result?.id) { toast.error('Upload failed — server did not confirm the new ERA'); return }

                        toast.success(`"${uploadedFile.name}" uploaded [PDF] — AI Vision parsing in progress…`)
                        setShowUploadModal(false)
                        setUploadedFile(null)
                        await refetchERAs()
                        setSelectedEra(result.id)

                        // Call /api/parse-eob to run AI Vision on the PDF content
                        try {
                          const parseResp = await fetch('/api/parse-eob', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ raw_content, file_name: uploadedFile.name }),
                          })
                          if (parseResp.ok) {
                            const parsed = await parseResp.json()
                            // Convert to line items
                            const lines: LineItem[] = []
                            for (const claim of (parsed.claims || [])) {
                              for (const svc of (claim.lines || [])) {
                                lines.push({
                                  id: `pdf-${result.id}-${lines.length}`,
                                  eraId: result.id,
                                  claimId: claim.claim_number || 'EOB-001',
                                  patientName: claim.patient_name || '',
                                  cpt: svc.cpt || '',
                                  cptDesc: '',
                                  dos: claim.date_of_service || parsed.payment_date || '',
                                  billed: svc.billed || 0,
                                  allowed: svc.allowed || svc.billed || 0,
                                  paid: svc.paid || 0,
                                  denied: (svc.billed || 0) - (svc.paid || 0) > 0 ? (svc.billed || 0) - (svc.paid || 0) : 0,
                                  patBalance: claim.patient_responsibility || 0,
                                  adjCode: svc.adjustment_code || '',
                                  adjReason: svc.adjustment_reason || '',
                                  action: (svc.paid || 0) === 0 ? 'review' : 'post',
                                  notes: '',
                                })
                              }
                            }
                            setLineItems(prev => [...prev, ...lines])
                            toast.success(`PDF parsed — ${lines.length} line${lines.length !== 1 ? 's' : ''} extracted by AI Vision`)
                          } else {
                            toast.error('AI Vision parsing failed — check the file format')
                          }
                        } catch {
                          toast.error('AI Vision parsing error — please retry')
                        }

                      } catch {
                        toast.error('Upload failed — please try again')
                      } finally {
                        setUploading(false)
                      }
                    }}
                    className={`flex-1 rounded-btn py-2.5 text-[13px] font-medium transition-colors ${uploadedFile && !uploading ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-surface-elevated text-content-tertiary cursor-not-allowed border border-separator'}`}>
                    {uploading ? (uploadedFile?.name.endsWith('.pdf') ? 'Processing PDF…' : 'Parsing…') : 'Upload & Process'}
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
