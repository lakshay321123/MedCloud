'use client'
import React, { useState, useCallback, useRef, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { Upload, FileSpreadsheet, Users, Building2, DollarSign, Stethoscope, CalendarDays, CheckCircle2, AlertCircle, X, ChevronRight, Loader2, RotateCcw, ArrowLeft, Info } from 'lucide-react'
import { useImportJobs, useImportPreview, useImportExecute, useClients, ApiImportJob } from '@/lib/hooks'
import { useApp } from '@/lib/context'
import * as XLSX from 'xlsx'

// ── Types ────────────────────────────────────────────────────────────────────
type EntityType = 'providers' | 'payers' | 'fee_schedules' | 'patients' | 'claims' | 'appointments'
type Step = 'select' | 'upload' | 'mapping' | 'preview' | 'importing' | 'results'

interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
  fileType: string
  totalRows: number
}

interface ColumnMap {
  [fileHeader: string]: string // file header -> MedCloud field
}

// ── Entity configs ───────────────────────────────────────────────────────────
const ENTITIES: { id: EntityType; label: string; icon: React.ReactNode; desc: string; fields: { key: string; label: string; required: boolean }[] }[] = [
  { id: 'providers', label: 'Providers', icon: <Stethoscope className="w-5 h-5" />, desc: 'NPI, name, specialty, license, DEA',
    fields: [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name', required: true },
      { key: 'npi', label: 'NPI', required: true },
      { key: 'specialty', label: 'Specialty', required: false },
      { key: 'license_number', label: 'License Number', required: false },
      { key: 'license_state', label: 'License State', required: false },
      { key: 'dea_number', label: 'DEA Number', required: false },
      { key: 'tax_id', label: 'Tax ID', required: false },
      { key: 'taxonomy_code', label: 'Taxonomy Code', required: false },
      { key: 'email', label: 'Email', required: false },
      { key: 'phone', label: 'Phone', required: false },
    ] },
  { id: 'payers', label: 'Payers', icon: <Building2 className="w-5 h-5" />, desc: 'Insurance companies and their IDs',
    fields: [
      { key: 'payer_name', label: 'Payer Name', required: true },
      { key: 'payer_id_code', label: 'Payer ID (EDI)', required: false },
      { key: 'timely_filing_days', label: 'Timely Filing Days', required: false },
      { key: 'address', label: 'Address', required: false },
      { key: 'phone', label: 'Phone', required: false },
      { key: 'portal_url', label: 'Portal URL', required: false },
      { key: 'payer_type', label: 'Payer Type', required: false },
    ] },
  { id: 'fee_schedules', label: 'Fee Schedules', icon: <DollarSign className="w-5 h-5" />, desc: 'Contracted rates by payer and CPT',
    fields: [
      { key: 'payer_name', label: 'Payer Name', required: false },
      { key: 'payer_id', label: 'Payer ID (system)', required: false },
      { key: 'cpt_code', label: 'CPT Code', required: true },
      { key: 'description', label: 'Description', required: false },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', required: true },
      { key: 'medicare_rate', label: 'Medicare Rate ($)', required: false },
      { key: 'effective_date', label: 'Effective Date', required: false },
      { key: 'termination_date', label: 'Expiry Date', required: false },
    ] },
  { id: 'patients', label: 'Patient Roster', icon: <Users className="w-5 h-5" />, desc: 'Demographics, insurance, contact info',
    fields: [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name', required: true },
      { key: 'dob', label: 'Date of Birth', required: false },
      { key: 'gender', label: 'Gender', required: false },
      { key: 'phone', label: 'Phone', required: false },
      { key: 'email', label: 'Email', required: false },
      { key: 'address', label: 'Address', required: false },
      { key: 'city', label: 'City', required: false },
      { key: 'state', label: 'State', required: false },
      { key: 'zip', label: 'ZIP Code', required: false },
      { key: 'payer_name', label: 'Insurance Payer', required: false },
      { key: 'insurance_member_id', label: 'Member ID', required: false },
      { key: 'insurance_group', label: 'Group Number', required: false },
      { key: 'mrn', label: 'MRN (Medical Record #)', required: false },
    ] },
  { id: 'claims', label: 'Open A/R', icon: <FileSpreadsheet className="w-5 h-5" />, desc: 'Outstanding claims from previous system',
    fields: [
      { key: 'claim_number', label: 'Claim Number', required: false },
      { key: 'patient_first_name', label: 'Patient First Name', required: false },
      { key: 'patient_last_name', label: 'Patient Last Name', required: false },
      { key: 'payer_name', label: 'Payer', required: false },
      { key: 'cpt_code', label: 'CPT Code', required: false },
      { key: 'total_charges', label: 'Billed Amount ($)', required: true },
      { key: 'allowed_amount', label: 'Allowed Amount ($)', required: false },
      { key: 'date_of_service', label: 'Date of Service', required: false },
      { key: 'diagnosis_codes', label: 'Diagnosis Codes (ICD-10)', required: false },
      { key: 'status', label: 'Current Status', required: false },
      { key: 'days_in_ar', label: 'Days in A/R', required: false },
    ] },
  { id: 'appointments', label: 'Appointments', icon: <CalendarDays className="w-5 h-5" />, desc: 'Upcoming scheduled visits',
    fields: [
      { key: 'patient_first_name', label: 'Patient First Name', required: false },
      { key: 'patient_last_name', label: 'Patient Last Name', required: false },
      { key: 'provider_name', label: 'Provider Name', required: false },
      { key: 'appointment_date', label: 'Date', required: true },
      { key: 'appointment_time', label: 'Time', required: false },
      { key: 'appointment_type', label: 'Type', required: false },
      { key: 'status', label: 'Status', required: false },
      { key: 'location', label: 'Location', required: false },
      { key: 'notes', label: 'Notes', required: false },
    ] },
]

// ── Fuzzy column name matcher ────────────────────────────────────────────────
const FUZZY_MAP: Record<string, string[]> = {
  first_name: ['first name', 'firstname', 'fname', 'first', 'patient first name', 'patientfirstname', 'given name', 'givenname'],
  last_name: ['last name', 'lastname', 'lname', 'last', 'patient last name', 'patientlastname', 'surname', 'family name'],
  dob: ['dob', 'date of birth', 'dateofbirth', 'birthdate', 'birth date', 'birth_date', 'birthday'],
  gender: ['gender', 'sex', 'patient sex', 'patient gender'],
  phone: ['phone', 'telephone', 'phone number', 'phonenumber', 'tel', 'mobile', 'cell'],
  email: ['email', 'email address', 'emailaddress', 'e-mail'],
  address: ['address', 'street', 'street address', 'address1', 'address line 1'],
  city: ['city', 'town'],
  state: ['state', 'province', 'st'],
  zip: ['zip', 'zipcode', 'zip code', 'postal code', 'postalcode', 'postal'],
  npi: ['npi', 'national provider identifier', 'provider npi', 'providernpi'],
  specialty: ['specialty', 'speciality', 'provider specialty', 'spec'],
  license_number: ['license', 'license number', 'license#', 'lic number', 'lic#', 'license no'],
  license_state: ['license state', 'lic state', 'state of license'],
  dea_number: ['dea', 'dea number', 'dea#', 'dea no'],
  tax_id: ['tax id', 'taxid', 'tin', 'tax identification', 'ein', 'ssn'],
  taxonomy_code: ['taxonomy', 'taxonomy code'],
  payer_name: ['payer', 'payer name', 'payername', 'insurance', 'insurance company', 'ins company', 'ins co', 'carrier', 'insurer'],
  payer_id_code: ['payer id', 'payerid', 'payer code', 'edi payer id', 'clearinghouse id'],
  timely_filing_days: ['timely filing', 'filing days', 'timely filing days', 'tf days'],
  portal_url: ['portal', 'portal url', 'website', 'url'],
  cpt_code: ['cpt', 'cpt code', 'procedure code', 'procedurecode', 'hcpcs', 'code'],
  contracted_rate: ['contracted rate', 'rate', 'fee', 'allowed', 'contracted', 'amount', 'price', 'charge'],
  medicare_rate: ['medicare', 'medicare rate', 'cms rate'],
  effective_date: ['effective', 'effective date', 'start date', 'eff date'],
  termination_date: ['termination', 'termination date', 'end date', 'expiry', 'expiry date', 'exp date'],
  description: ['description', 'desc', 'procedure description', 'procedure name'],
  insurance_member_id: ['member id', 'memberid', 'subscriber id', 'subscriberid', 'id number', 'policy number', 'policy#'],
  insurance_group: ['group', 'group number', 'group#', 'grp', 'group id'],
  mrn: ['mrn', 'medical record number', 'chart number', 'chart#', 'patient id', 'patientid', 'account number', 'acct'],
  claim_number: ['claim number', 'claim#', 'claim id', 'claimid', 'icn', 'tcn'],
  total_charges: ['total charges', 'billed', 'billed amount', 'charge', 'charges', 'amount', 'total', 'total billed'],
  allowed_amount: ['allowed', 'allowed amount', 'allowable'],
  date_of_service: ['dos', 'date of service', 'dateofservice', 'service date', 'visit date'],
  diagnosis_codes: ['diagnosis', 'dx', 'icd', 'icd-10', 'icd10', 'diagnosis code', 'dx code'],
  days_in_ar: ['days in ar', 'aging', 'age', 'days outstanding', 'days'],
  appointment_date: ['date', 'appointment date', 'appt date', 'visit date', 'scheduled date'],
  appointment_time: ['time', 'appointment time', 'appt time', 'start time'],
  appointment_type: ['type', 'appointment type', 'appt type', 'visit type', 'reason'],
  location: ['location', 'office', 'facility', 'site'],
  notes: ['notes', 'comments', 'note', 'comment', 'remarks'],
  payer_type: ['payer type', 'type', 'category', 'insurance type'],
  patient_first_name: ['patient first name', 'patient first', 'pt first', 'pt fname'],
  patient_last_name: ['patient last name', 'patient last', 'pt last', 'pt lname'],
  provider_name: ['provider', 'provider name', 'doctor', 'physician', 'rendering provider', 'attending'],
  status: ['status', 'claim status', 'current status', 'appt status'],
}

function fuzzyMatch(header: string): string | null {
  const h = header.toLowerCase().replace(/[_\-\.\/\\]/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [field, aliases] of Object.entries(FUZZY_MAP)) {
    if (aliases.includes(h)) return field
    // Check if header contains any alias
    for (const alias of aliases) {
      if (h === alias) return field
    }
  }
  // Fallback: check if header matches a field key directly
  if (FUZZY_MAP[h]) return h
  return null
}

// ── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  // Simple CSV parse (handles quoted fields)
  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
      current += ch
    }
    result.push(current.trim())
    return result
  }
  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(row => Object.values(row).some(v => v !== ''))
  return { headers, rows }
}

// ── Date normalizer ──────────────────────────────────────────────────────────
function normalizeDate(val: string): string {
  if (!val) return ''
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.split('T')[0]
  // US format: MM/DD/YYYY or M/D/YYYY
  const us = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (us) return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`
  // Written: March 14, 2026 or 14-Mar-2026
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return val
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function OnboardingPage() {
  const { toast } = useToast()
  const { currentUser } = useApp()

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState('select' as Step)
  const [entityType, setEntityType] = useState(null as EntityType | null)
  const [parsedFile, setParsedFile] = useState(null as ParsedFile | null)
  const [columnMap, setColumnMap] = useState({} as ColumnMap)
  const [dupeStrategy, setDupeStrategy] = useState('skip' as 'skip' | 'update')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [results, setResults] = useState(null as null | { job_id: string; imported_count: number; skipped_count: number; updated_count: number; error_count: number; errors: Array<{ row: number; reason: string }> })
  const [previewErrors, setPreviewErrors] = useState([] as Array<{ row: number; field: string; reason: string }>)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null as HTMLInputElement | null)

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: jobsData, refetch: refreshJobs } = useImportJobs({})
  const importPreview = useImportPreview()
  const importExecute = useImportExecute()

  const jobs = jobsData?.data || []
  const entityConfig = ENTITIES.find(e => e.id === entityType)

  // ── File parsing ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    let headers: string[] = []
    let rows: Record<string, string>[] = []

    try {
      if (ext === 'csv' || ext === 'tsv') {
        const text = await file.text()
        const parsed = parseCSV(text)
        headers = parsed.headers
        rows = parsed.rows
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]
        if (json.length > 0) {
          headers = json[0].map(h => String(h || '').trim())
          rows = json.slice(1).map(row => {
            const obj: Record<string, string> = {}
            headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
            return obj
          }).filter(row => Object.values(row).some(v => v !== ''))
        }
      } else if (ext === 'hl7') {
        // Basic HL7v2 parser for PID segments
        const text = await file.text()
        const segments = text.split(/\r?\n/).filter(l => l.startsWith('PID'))
        if (segments.length > 0) {
          headers = ['last_name', 'first_name', 'dob', 'gender', 'address', 'phone', 'mrn']
          rows = segments.map(seg => {
            const f = seg.split('|')
            const name = (f[5] || '').split('^')
            return {
              last_name: name[0] || '',
              first_name: name[1] || '',
              dob: normalizeDate(f[7] || ''),
              gender: f[8] || '',
              address: (f[11] || '').replace(/\^/g, ', '),
              phone: f[13] || '',
              mrn: (f[3] || '').split('^')[0] || '',
            }
          })
        }
      } else {
        toast.error('Unsupported file type. Use CSV, Excel (.xlsx/.xls), or HL7.')
        return
      }

      if (headers.length === 0 || rows.length === 0) {
        toast.error('File is empty or could not be parsed.')
        return
      }

      setParsedFile({ headers, rows, fileName: file.name, fileType: ext, totalRows: rows.length })

      // Auto-map columns
      const autoMap: ColumnMap = {}
      headers.forEach(h => {
        const match = fuzzyMatch(h)
        if (match && entityConfig?.fields.some(f => f.key === match)) {
          autoMap[h] = match
        }
      })
      setColumnMap(autoMap)
      setStep('mapping')
      toast.success(`Parsed ${rows.length} rows from ${file.name}`)
    } catch (e) {
      toast.error(`Failed to parse file: ${(e as Error).message}`)
    }
  }, [entityConfig, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ── Preview validation ─────────────────────────────────────────────────────
  const runPreview = useCallback(async () => {
    if (!parsedFile || !entityType) return
    // Map rows using column mapping
    const mappedRows = parsedFile.rows.slice(0, 10).map((row: Record<string, string>) => {
      const mapped: Record<string, string> = {}
      for (const [fileH, medH] of Object.entries(columnMap) as [string, string][]) {
        if (medH && row[fileH] !== undefined) {
          let val = row[fileH]
          if (['dob', 'date_of_service', 'effective_date', 'termination_date', 'appointment_date'].includes(medH)) {
            val = normalizeDate(val)
          }
          mapped[medH] = val
        }
      }
      return mapped
    })
    try {
      const res = await importPreview.mutate({ entity_type: entityType, rows: mappedRows })
      if (!res) { toast.error('Preview failed'); return }
      setPreviewErrors(res.errors || [])
      setStep('preview')
    } catch {
      toast.error('Preview validation failed')
    }
  }, [parsedFile, entityType, columnMap, importPreview, toast])

  // ── Execute import ─────────────────────────────────────────────────────────
  const runImport = useCallback(async () => {
    if (!parsedFile || !entityType) return
    setImporting(true)
    setStep('importing')
    setImportProgress(0)

    // Map ALL rows
    const mappedRows = parsedFile.rows.map((row: Record<string, string>) => {
      const mapped: Record<string, string> = {}
      for (const [fileH, medH] of Object.entries(columnMap) as [string, string][]) {
        if (medH && row[fileH] !== undefined) {
          let val = row[fileH]
          if (['dob', 'date_of_service', 'effective_date', 'termination_date', 'appointment_date'].includes(medH)) {
            val = normalizeDate(val)
          }
          mapped[medH] = val
        }
      }
      return mapped
    })

    // Send in chunks for progress indication (but API handles chunking internally)
    const CHUNK = 500
    let totalImported = 0, totalSkipped = 0, totalUpdated = 0, totalErrors = 0
    const allErrors: Array<{ row: number; reason: string }> = []
    let lastJobId = ''

    for (let i = 0; i < mappedRows.length; i += CHUNK) {
      const chunk = mappedRows.slice(i, i + CHUNK)
      try {
        const res = await importExecute.mutate({
          entity_type: entityType,
          rows: chunk,
          column_mapping: columnMap,
          duplicate_strategy: dupeStrategy,
          file_name: parsedFile.fileName,
          file_type: parsedFile.fileType,
        })
        if (!res) continue
        totalImported += res.imported_count
        totalSkipped += res.skipped_count
        totalUpdated += res.updated_count || 0
        totalErrors += res.error_count
        allErrors.push(...(res.errors || []).map((e: any) => ({ ...e, row: e.row + i })))
        lastJobId = res.job_id
      } catch (err: any) {
        totalErrors += chunk.length
        allErrors.push({ row: i, reason: String(err?.message || err) })
      }
      setImportProgress(Math.min(100, Math.round(((i + chunk.length) / mappedRows.length) * 100)))
    }

    setResults({
      job_id: lastJobId,
      imported_count: totalImported,
      skipped_count: totalSkipped,
      updated_count: totalUpdated,
      error_count: totalErrors,
      errors: allErrors,
    })
    setImporting(false)
    setStep('results')
    refreshJobs()
    toast.success(`Import complete: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`)
  }, [parsedFile, entityType, columnMap, dupeStrategy, importExecute, refreshJobs, toast])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('select')
    setEntityType(null)
    setParsedFile(null)
    setColumnMap({})
    setResults(null)
    setPreviewErrors([])
    setImportProgress(0)
  }

  // ── Mapped field count ─────────────────────────────────────────────────────
  const mappedCount = Object.values(columnMap).filter(v => v).length
  const requiredFields = entityConfig?.fields.filter(f => f.required) || []
  const mappedRequired = requiredFields.filter(f => Object.values(columnMap).includes(f.key))
  const allRequiredMapped = mappedRequired.length === requiredFields.length

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <ModuleShell title="Onboarding">
      {/* ── Breadcrumb / Step indicator ─────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 text-sm text-content-secondary">
        <button onClick={reset} className="hover:text-brand">Onboarding</button>
        {entityType && <><ChevronRight className="w-4 h-4" /><span className="text-content-primary font-medium">{entityConfig?.label}</span></>}
        {step !== 'select' && step !== 'upload' && <><ChevronRight className="w-4 h-4" /><span className="capitalize">{step}</span></>}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STEP 1: SELECT ENTITY TYPE
          ════════════════════════════════════════════════════════════════ */}
      {step === 'select' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-content-primary">What data are you importing?</h2>
            <p className="text-sm text-content-secondary mt-1">Select the type of data to upload. Import in order: Providers first, then Payers, Fee Schedules, Patients, and finally Open A/R.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENTITIES.map((e, idx) => (
              <button key={e.id} onClick={() => { setEntityType(e.id); setStep('upload') }}
                className="flex items-start gap-3 p-4 rounded-lg border border-separator hover:border-brand hover:bg-surface-secondary transition-all text-left">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10 text-brand shrink-0">
                  {e.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-secondary font-medium">Step {idx + 1}</span>
                  </div>
                  <div className="font-semibold text-content-primary">{e.label}</div>
                  <div className="text-xs text-content-secondary mt-0.5">{e.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* ── Import History ─────────────────────────────────────────── */}
          {jobs.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold text-content-primary mb-3">Import History</h3>
              <div className="border border-separator rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-content-secondary">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-content-secondary">Type</th>
                      <th className="px-3 py-2 text-left font-medium text-content-secondary">File</th>
                      <th className="px-3 py-2 text-right font-medium text-content-secondary">Imported</th>
                      <th className="px-3 py-2 text-right font-medium text-content-secondary">Skipped</th>
                      <th className="px-3 py-2 text-right font-medium text-content-secondary">Errors</th>
                      <th className="px-3 py-2 text-center font-medium text-content-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 20).map((j: any) => (
                      <tr key={j.id} className="border-t border-separator hover:bg-surface-secondary/50">
                        <td className="px-3 py-2 text-content-secondary">{new Date(j.created_at).toLocaleDateString()}</td>
                        <td className="px-3 py-2 capitalize">{j.entity_type?.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-content-secondary truncate max-w-[200px]">{j.file_name}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">{j.imported_count}</td>
                        <td className="px-3 py-2 text-right text-yellow-600">{j.skipped_count}</td>
                        <td className="px-3 py-2 text-right text-red-600">{j.error_count}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${j.status === 'completed' ? 'bg-green-100 text-green-700' : j.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {j.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 2: UPLOAD FILE
          ════════════════════════════════════════════════════════════════ */}
      {step === 'upload' && entityConfig && (
        <div>
          <button onClick={() => { setStep('select'); setEntityType(null) }} className="flex items-center gap-1 text-sm text-content-secondary hover:text-brand mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to entity selection
          </button>
          <h2 className="text-lg font-semibold text-content-primary mb-1">Upload {entityConfig.label} File</h2>
          <p className="text-sm text-content-secondary mb-6">Accepts CSV, Excel (.xlsx/.xls), or HL7 files</p>

          <div
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-brand bg-brand/5' : 'border-separator hover:border-brand/50'}`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-content-secondary" />
            <p className="text-content-primary font-medium">Drop your file here or click to browse</p>
            <p className="text-sm text-content-secondary mt-1">CSV, XLSX, XLS, HL7</p>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.hl7,.tsv" onChange={handleFileInput} />

          {/* Required fields info */}
          <div className="mt-6 p-4 rounded-lg bg-surface-secondary border border-separator">
            <div className="flex items-center gap-2 text-sm font-medium text-content-primary mb-2">
              <Info className="w-4 h-4 text-brand" /> Expected Fields for {entityConfig.label}
            </div>
            <div className="flex flex-wrap gap-2">
              {entityConfig.fields.map(f => (
                <span key={f.key} className={`px-2 py-0.5 rounded text-xs ${f.required ? 'bg-brand/10 text-brand font-medium' : 'bg-surface-primary text-content-secondary'}`}>
                  {f.label} {f.required && '*'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 3: COLUMN MAPPING
          ════════════════════════════════════════════════════════════════ */}
      {step === 'mapping' && parsedFile && entityConfig && (
        <div>
          <button onClick={() => setStep('upload')} className="flex items-center gap-1 text-sm text-content-secondary hover:text-brand mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to upload
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-content-primary">Map Columns</h2>
              <p className="text-sm text-content-secondary">{parsedFile.totalRows} rows from {parsedFile.fileName}. Match your file columns to MedCloud fields.</p>
            </div>
            <div className="text-sm">
              <span className={`font-medium ${allRequiredMapped ? 'text-green-600' : 'text-amber-600'}`}>{mappedCount} mapped</span>
              <span className="text-content-secondary"> / {parsedFile.headers.length} columns</span>
            </div>
          </div>

          <div className="border border-separator rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary w-1/3">Your File Column</th>
                  <th className="px-3 py-2 text-center font-medium text-content-secondary w-12">&rarr;</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary w-1/3">MedCloud Field</th>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary">Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {parsedFile.headers.map((h: string) => (
                  <tr key={h} className="border-t border-separator">
                    <td className="px-3 py-2 font-medium text-content-primary">{h}</td>
                    <td className="px-3 py-2 text-center text-content-secondary">&rarr;</td>
                    <td className="px-3 py-2">
                      <select
                        value={columnMap[h] || ''}
                        onChange={(e: any) => setColumnMap((prev: any) => ({ ...prev, [h]: e.target.value }))}
                        className="w-full px-2 py-1 rounded border border-separator bg-surface-primary text-sm focus:outline-none focus:border-brand"
                      >
                        <option value="">-- Skip this column --</option>
                        {entityConfig.fields.map(f => (
                          <option key={f.key} value={f.key}>{f.label} {f.required ? '*' : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-content-secondary text-xs truncate max-w-[200px]">
                      {parsedFile.rows[0]?.[h] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!allRequiredMapped && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              Required fields not mapped: {requiredFields.filter(f => !Object.values(columnMap).includes(f.key)).map(f => f.label).join(', ')}
            </div>
          )}

          {/* Duplicate strategy */}
          <div className="mt-6 p-4 rounded-lg bg-surface-secondary border border-separator">
            <div className="text-sm font-medium text-content-primary mb-2">Duplicate Handling</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={dupeStrategy === 'skip'} onChange={() => setDupeStrategy('skip')} className="text-brand" />
                <span className="text-sm">Skip duplicates</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={dupeStrategy === 'update'} onChange={() => setDupeStrategy('update')} className="text-brand" />
                <span className="text-sm">Update existing records</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={runPreview} disabled={!allRequiredMapped || importPreview.loading}
              className="px-6 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {importPreview.loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Preview & Validate
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 4: PREVIEW
          ════════════════════════════════════════════════════════════════ */}
      {step === 'preview' && parsedFile && entityConfig && (
        <div>
          <button onClick={() => setStep('mapping')} className="flex items-center gap-1 text-sm text-content-secondary hover:text-brand mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to mapping
          </button>
          <h2 className="text-lg font-semibold text-content-primary mb-1">Preview (First 10 Rows)</h2>
          <p className="text-sm text-content-secondary mb-4">
            {previewErrors.length === 0
              ? <span className="text-green-600 font-medium">All rows valid. Ready to import {parsedFile.totalRows} rows.</span>
              : <span className="text-red-600 font-medium">{previewErrors.length} validation errors found. Fix mapping or data before importing.</span>}
          </p>

          {previewErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
              {previewErrors.map((e: any, i: number) => (
                <div key={i} className="text-red-700">Row {e.row + 1}: {e.field} &mdash; {e.reason}</div>
              ))}
            </div>
          )}

          <div className="border border-separator rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-content-secondary">#</th>
                  {entityConfig.fields.filter(f => Object.values(columnMap).includes(f.key)).map(f => (
                    <th key={f.key} className="px-2 py-1.5 text-left font-medium text-content-secondary">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedFile.rows.slice(0, 10).map((row: any, idx: number) => (
                  <tr key={idx} className="border-t border-separator">
                    <td className="px-2 py-1.5 text-content-secondary">{idx + 1}</td>
                    {entityConfig.fields.filter((f: any) => Object.values(columnMap).includes(f.key)).map((f: any) => {
                      const fileH = Object.entries(columnMap).find(([, v]) => v === f.key)?.[0]
                      const val = fileH ? row[fileH] : ''
                      const hasError = previewErrors.some((pe: {row: number; field: string; reason: string}) => pe.row === idx && pe.field === f.key)
                      return <td key={f.key} className={`px-2 py-1.5 ${hasError ? 'text-red-600 bg-red-50' : 'text-content-primary'}`}>{val || '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={runImport} disabled={importing}
              className="px-6 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2">
              Import {parsedFile.totalRows} Rows
            </button>
            <button onClick={() => setStep('mapping')} className="px-4 py-2 border border-separator rounded-lg text-sm hover:bg-surface-secondary">
              Fix Mapping
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 5: IMPORTING (Progress)
          ════════════════════════════════════════════════════════════════ */}
      {step === 'importing' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-content-primary">Importing data...</h2>
          <p className="text-sm text-content-secondary mt-1">{importProgress}% complete</p>
          <div className="w-64 h-2 bg-surface-secondary rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 6: RESULTS
          ════════════════════════════════════════════════════════════════ */}
      {step === 'results' && results && (
        <div>
          <h2 className="text-lg font-semibold text-content-primary mb-4">Import Complete</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
              <div className="text-2xl font-bold text-green-700">{results.imported_count}</div>
              <div className="text-xs text-green-600 mt-1">Imported</div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
              <div className="text-2xl font-bold text-yellow-700">{results.skipped_count}</div>
              <div className="text-xs text-yellow-600 mt-1">Skipped (Duplicates)</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <div className="text-2xl font-bold text-blue-700">{results.updated_count}</div>
              <div className="text-xs text-blue-600 mt-1">Updated</div>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center">
              <div className="text-2xl font-bold text-red-700">{results.error_count}</div>
              <div className="text-xs text-red-600 mt-1">Errors</div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <h3 className="text-sm font-medium text-red-800 mb-2">Errors ({results.errors.length})</h3>
              <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                {results.errors.slice(0, 50).map((e: any, i: number) => (
                  <div key={i} className="text-red-700">Row {e.row + 1}: {e.reason}</div>
                ))}
                {results.errors.length > 50 && <div className="text-red-500 italic">...and {results.errors.length - 50} more</div>}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="px-6 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand/90 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Import More Data
            </button>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
