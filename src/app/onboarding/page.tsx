'use client'
import React, { useState, useCallback, useRef, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { Upload, FileSpreadsheet, Users, Building2, DollarSign, Stethoscope, CalendarDays, CheckCircle2, AlertCircle, X, ChevronRight, Loader2, RotateCcw, ArrowLeft, Info, Plug, Globe, Wifi, WifiOff, RefreshCw, Trash2, Server, FileText, FolderUp, Eye, Link2, Circle } from 'lucide-react'
import { useImportJobs, useImportPreview, useImportExecute, useClients, ApiImportJob, useEhrConnections, useCreateEhrConnection, ApiEhrConnection } from '@/lib/hooks'
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
      { key: 'diagnosis_codes', label: 'Diagnosis Codes (ICD-10-CM)', required: false },
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
  }
  // Fallback: check if header matches a field key directly
  if (FUZZY_MAP[h]) return h
  return null
}


// ── Document categories for bulk upload ──────────────────────────────────────
const DOC_CATEGORIES = [
  { id: 'provider_credentials', label: 'Provider Credentials', desc: 'Licenses, DEA certs, malpractice insurance, board certs, CAQH', icon: 'Stethoscope' },
  { id: 'payer_contracts', label: 'Payer Contracts', desc: 'Signed contract PDFs with fee schedule exhibits', icon: 'DollarSign' },
  { id: 'prior_authorizations', label: 'Prior Authorizations', desc: 'Active/pending prior auth letters', icon: 'FileText' },
  { id: 'appeals', label: 'Appeal Documents', desc: 'Supporting docs for claims currently in appeals', icon: 'AlertCircle' },
  { id: 'other', label: 'Other Documents', desc: 'EOBs, W-9s, CVs, other operational documents', icon: 'FileSpreadsheet' },
] as const

type DocFile = {
  id: string
  file: File
  name: string
  size: string
  category: string
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'
  docId?: string
  classification?: string
  extractedData?: Record<string, string>
  error?: string
  entitySuggestion?: { type: string; id: string; name: string; npi?: string; confidence: number; match_type?: string }
  linkedEntityId?: string
  linkedEntityType?: string
  providers?: Array<{ id: string; name: string; npi: string; specialty: string }>
  payers?: Array<{ id: string; name: string }>
}

// ── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string, delimiter: string = ','): { headers: string[]; rows: Record<string, string>[] } {
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
      if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ''; continue }
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
  // MM/DD/YYYY or DD/MM/YYYY — if first number > 12, it must be DD/MM
  const parts = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (parts) {
    const a = parseInt(parts[1]), b = parseInt(parts[2])
    if (a > 12) return `${parts[3]}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}` // EU: DD/MM
    return `${parts[3]}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}` // US: MM/DD (default)
  }
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

  // ── Mode (tab) ─────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('upload' as 'upload' | 'connect')

  // ── EHR Connection State ───────────────────────────────────────────────────
  const [showAddConnection, setShowAddConnection] = useState(false)
  const [ehrForm, setEhrForm] = useState({ vendor: 'epic', display_name: '', fhir_base_url: '', auth_type: 'oauth2', oauth_client_id: '', oauth_client_secret: '', token_endpoint: '', scope: 'system/*.read' })
  const [testingId, setTestingId] = useState(null as string | null)
  const [testResultMap, setTestResultMap] = useState({} as Record<string, { success: boolean; message: string; capabilities: Array<{ fhir_resource: string; medcloud_entity: string }> }>)
  const [pullingId, setPullingId] = useState(null as string | null)
  const [selectedResources, setSelectedResources] = useState([] as string[])
  const [pullResultMap, setPullResultMap] = useState({} as Record<string, { resources_pulled: Record<string, number>; errors: Array<{ resource: string; reason: string }>; total_records: number }>)


  // ── Document Upload State ───────────────────────────────────────────────────
  const [docCategory, setDocCategory] = useState('provider_credentials')
  const [docFiles, setDocFiles] = useState([] as DocFile[])
  const [docUploading, setDocUploading] = useState(false)

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: jobsData, refetch: refreshJobs } = useImportJobs({})
  const importPreview = useImportPreview()
  const importExecute = useImportExecute()

  // ── EHR Connection hooks ───────────────────────────────────────────────────
  const { data: ehrData, refetch: refreshEhr } = useEhrConnections({})
  const createEhr = useCreateEhrConnection()
  const ehrConnections = ehrData?.data || []

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
        const delimiter = ext === 'tsv' ? '\t' : ','
        const parsed = parseCSV(text, delimiter)
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
        const segments = text.split(/\r\n|\r|\n/).filter(l => l.startsWith('PID'))
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
      if (!res) { toast.error(`Preview failed: ${importPreview.error?.message || 'server returned empty response'}`); return }
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

  // ── EHR Connection Handlers ────────────────────────────────────────────────
  const EHR_VENDORS = [
    { id: 'epic', label: 'Epic', desc: 'MyChart, App Orchard, SMART on FHIR' },
    { id: 'cerner', label: 'Cerner (Oracle Health)', desc: 'Ignite APIs, Millennium, FHIR R4' },
    { id: 'athena', label: 'Athenahealth', desc: 'Cloud-based, FHIR R4 + proprietary REST' },
    { id: 'eclinicalworks', label: 'eClinicalWorks', desc: 'FHIR R4, V11+' },
    { id: 'nextgen', label: 'NextGen', desc: 'FHIR R3/R4' },
    { id: 'allscripts', label: 'Allscripts', desc: 'FHIR R4, Open API' },
    { id: 'other', label: 'Other FHIR R4', desc: 'Any FHIR R4 compliant EHR' },
  ]

  const handleCreateConnection = useCallback(async () => {
    if (!ehrForm.fhir_base_url || !ehrForm.vendor) {
      toast.error('FHIR base URL and vendor are required')
      return
    }
    try {
      const res = await createEhr.mutate(ehrForm)
      if (res) {
        toast.success('Connection saved')
        setShowAddConnection(false)
        setEhrForm({ vendor: 'epic', display_name: '', fhir_base_url: '', auth_type: 'oauth2', oauth_client_id: '', oauth_client_secret: '', token_endpoint: '', scope: 'system/*.read' })
        refreshEhr()
      }
    } catch (e) {
      toast.error(`Failed to create connection: ${(e as Error).message}`)
    }
  }, [ehrForm, createEhr, toast, refreshEhr])

  const handleTestConnection = useCallback(async (connId: string) => {
    setTestingId(connId)
    setTestResultMap((prev: Record<string, { success: boolean; message: string; capabilities: Array<{ fhir_resource: string; medcloud_entity: string }> }>) => { const n = { ...prev }; delete n[connId]; return n })
    try {
      const { api } = await import('@/lib/api-client')
      const res = await api.post(`/ehr-connections/${connId}/test`, {}) as unknown as { success: boolean; message: string; capabilities: Array<{ fhir_resource: string; medcloud_entity: string }> }
      setTestResultMap((prev: Record<string, { success: boolean; message: string; capabilities: Array<{ fhir_resource: string; medcloud_entity: string }> }>) => ({ ...prev, [connId]: res }))
      refreshEhr()
      res.success ? toast.success('Connection successful') : toast.error('Connection failed')
    } catch (e) {
      setTestResultMap((prev: Record<string, { success: boolean; message: string; capabilities: Array<{ fhir_resource: string; medcloud_entity: string }> }>) => ({ ...prev, [connId]: { success: false, message: (e as Error).message, capabilities: [] } }))
      toast.error('Connection test failed')
    }
    setTestingId(null)
  }, [refreshEhr, toast])

  const handlePullData = useCallback(async (connId: string) => {
    if (selectedResources.length === 0) {
      toast.error('Select at least one resource type to pull')
      return
    }
    setPullingId(connId)
    setPullResultMap((prev: Record<string, { resources_pulled: Record<string, number>; errors: Array<{ resource: string; reason: string }>; total_records: number }>) => { const n = { ...prev }; delete n[connId]; return n })
    try {
      const { api } = await import('@/lib/api-client')
      const res = await api.post(`/ehr-connections/${connId}/pull`, { resource_types: selectedResources }) as unknown as { resources_pulled: Record<string, number>; errors: Array<{ resource: string; reason: string }>; total_records: number }
      setPullResultMap((prev: Record<string, { resources_pulled: Record<string, number>; errors: Array<{ resource: string; reason: string }>; total_records: number }>) => ({ ...prev, [connId]: res }))
      refreshEhr()
      refreshJobs()
      const total = Object.values(res.resources_pulled).reduce((a: number, b: number) => a + b, 0)
      toast.success(`Pulled ${total} records from ${selectedResources.length} resource types`)
    } catch (e) {
      setPullResultMap((prev: Record<string, { resources_pulled: Record<string, number>; errors: Array<{ resource: string; reason: string }>; total_records: number }>) => ({ ...prev, [connId]: { resources_pulled: {}, errors: [{ resource: 'all', reason: (e as Error).message }], total_records: 0 } }))
      toast.error('Pull failed')
    }
    setPullingId(null)
  }, [selectedResources, refreshEhr, refreshJobs, toast])


  // ── Document Upload Handlers ────────────────────────────────────────────────
  const handleDocDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files as unknown as File[]).filter((f) =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    const newFiles: DocFile[] = files.map((f: File) => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
      category: docCategory,
      status: 'pending' as const,
    }))
    setDocFiles((prev: DocFile[]) => [...prev, ...newFiles])
  }, [docCategory])

  const handleDocBrowse = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((e.target.files || []) as unknown as File[]).filter((f) =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    const newFiles: DocFile[] = files.map((f: File) => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
      category: docCategory,
      status: 'pending' as const,
    }))
    setDocFiles((prev: DocFile[]) => [...prev, ...newFiles])
  }, [docCategory])

  const handleDocUploadAll = useCallback(async () => {
    const pending = docFiles.filter((f: DocFile) => f.status === 'pending')
    if (pending.length === 0) return
    setDocUploading(true)
    try {
    const { api } = await import('@/lib/api-client')
    const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET
    if (!S3_BUCKET) console.warn('NEXT_PUBLIC_S3_BUCKET not set, using server-provided bucket')

    for (const df of pending) {
      const fileId = df.id
      const fileCategory = df.category // Use category captured at drop time (#11)

      try {
        // Step 1: Get presigned URL
        setDocFiles((prev: DocFile[]) => prev.map((f: DocFile) => f.id === fileId ? { ...f, status: 'uploading' as const } : f))
        const uploadRes = await api.post('/documents/upload-url', {
          file_name: df.name,
          content_type: df.file.type,
          folder: `onboarding/${fileCategory}`,
        }) as unknown as { upload_url: string; s3_key: string }

        // Step 2: Upload to S3 — require presigned URL from server
        if (!uploadRes.upload_url || !uploadRes.s3_key) {
          throw new Error('Server did not return upload URL or S3 key')
        }
        {
          const s3Resp = await fetch(uploadRes.upload_url, {
            method: 'PUT',
            body: df.file,
            headers: { 'Content-Type': df.file.type },
          })
          if (!s3Resp.ok) throw new Error(`S3 upload failed: ${s3Resp.status} ${s3Resp.statusText}`)
        }

        // Step 3: Create document record
        const docRes = await api.post('/documents', {
          document_type: fileCategory.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          file_name: df.name,
          s3_key: uploadRes.s3_key,
          s3_bucket: S3_BUCKET || 'medcloud-documents-us-prod',
          content_type: df.file.type,
          file_size: df.file.size,
          source: 'Onboarding Upload',
          category: fileCategory,
        }) as unknown as { id: string }

        // Step 4: Trigger Textract + Classify
        setDocFiles((prev: DocFile[]) => prev.map((f: DocFile) => f.id === fileId ? { ...f, status: 'processing' as const, docId: docRes.id } : f))

        let classification = fileCategory
        let extractedData = {} as Record<string, string>
        try {
          await api.post(`/documents/${docRes.id}/textract`, {})
          const classRes = await api.post(`/documents/${docRes.id}/classify`, {}) as unknown as { classified_type?: string; document_type?: string; confidence?: number; extracted_fields?: Record<string, string> }
          classification = classRes.classified_type || classRes.document_type || fileCategory
          extractedData = classRes.extracted_fields || {}
        } catch (classErr) {
          console.warn(`Textract/classify failed for ${df.name}:`, (classErr as Error).message)
        }

        // Step 5: Match entity (suggest which provider/payer this belongs to)
        let entitySuggestion: DocFile['entitySuggestion'] = undefined
        let matchProviders: DocFile['providers'] = []
        let matchPayers: DocFile['payers'] = []
        try {
          const matchRes = await api.post(`/documents/${docRes.id}/match-entity`, { category: fileCategory }) as unknown as {
            best_match?: { type: string; id: string; name: string; npi?: string }
            match_type?: string; confidence?: number
            providers?: Array<{ id: string; name: string; npi: string; specialty: string }>
            payers?: Array<{ id: string; name: string }>
          }
          if (matchRes.best_match) {
            entitySuggestion = { ...matchRes.best_match, confidence: matchRes.confidence || 0, match_type: matchRes.match_type }
          }
          matchProviders = matchRes.providers || []
          matchPayers = matchRes.payers || []

          // Auto-link if confidence is very high (NPI match)
          if (entitySuggestion && (matchRes.confidence || 0) >= 90) {
            const linkBody = entitySuggestion.type === 'provider'
              ? { provider_id: entitySuggestion.id }
              : { payer_id: entitySuggestion.id }
            await api.post(`/documents/${docRes.id}/link-entity`, linkBody)
          }
        } catch (matchErr) {
          console.warn(`Entity match failed for ${df.name}:`, (matchErr as Error).message)
        }

        setDocFiles((prev: DocFile[]) => prev.map((f: DocFile) => f.id === fileId ? {
          ...f, status: 'done' as const, classification, extractedData,
          entitySuggestion, providers: matchProviders, payers: matchPayers,
          linkedEntityId: entitySuggestion && (entitySuggestion.confidence >= 90) ? entitySuggestion.id : undefined,
          linkedEntityType: entitySuggestion && (entitySuggestion.confidence >= 90) ? entitySuggestion.type : undefined,
        } : f))
        toast.success(`Uploaded ${df.name}`)
      } catch (e) {
        setDocFiles((prev: DocFile[]) => prev.map((f: DocFile) => f.id === fileId ? { ...f, status: 'error' as const, error: (e as Error).message } : f))
        toast.error(`Failed: ${df.name}`)
      }
    }
    } finally {
      setDocUploading(false)
    }
  }, [docFiles, toast])

  const removeDocFile = useCallback((fileId: string) => {
    setDocFiles((prev: DocFile[]) => prev.filter((f: DocFile) => f.id !== fileId))
  }, [])

  const handleLinkEntity = useCallback(async (fileId: string, docId: string, entityType: string, entityId: string) => {
    try {
      const { api } = await import('@/lib/api-client')
      const linkBody = entityType === 'provider' ? { provider_id: entityId } : { payer_id: entityId }
      await api.post(`/documents/${docId}/link-entity`, linkBody)
      setDocFiles((prev: DocFile[]) => prev.map((f: DocFile) => f.id === fileId ? { ...f, linkedEntityId: entityId, linkedEntityType: entityType } : f))
      toast.success('Document linked successfully')
    } catch (e) {
      toast.error(`Link failed: ${(e as Error).message}`)
    }
  }, [toast])

  // ── Compute progress from import jobs ───────────────────────────────────────
  const completedEntities = new Set(
    (jobs || [])
      .filter((j: ApiImportJob) => j.status === 'completed' && ((j.imported_count || 0) > 0 || (j.updated_count || 0) > 0))
      .map((j: ApiImportJob) => j.entity_type)
  )

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <ModuleShell title="Onboarding">
      {/* ── Breadcrumb / Step indicator ─────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 text-sm text-content-tertiary">
        <button type="button" onClick={reset} className="hover:text-brand font-medium">Onboarding</button>
        {entityType && <><ChevronRight className="w-4 h-4" /><span className="text-content-primary font-medium">{entityConfig?.label}</span></>}
        {step !== 'select' && step !== 'upload' && <><ChevronRight className="w-4 h-4" /><span className="capitalize">{step}</span></>}
      </div>


      {/* ── Onboarding Progress Tracker ────────────────────────────────── */}
      {step === 'select' && (
        <div className="card p-4 mb-6">
          <h3 className="text-[13px] font-semibold text-content-primary mb-3">Data Import Progress</h3>
          <div className="flex flex-wrap gap-3">
            {ENTITIES.map(e => {
              const done = completedEntities.has(e.id)
              return (
                <div key={e.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] font-medium ${done ? 'bg-brand/10 text-brand-dark' : 'bg-surface-elevated text-content-tertiary'}`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {e.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Mode Tabs (Manual Upload | Connect EHR) ─────────────────────── */}
      {step === 'select' && (
        <div className="flex gap-2 mb-6">
          {[{ id: 'upload' as const, label: 'Manual Upload', icon: <Upload className="w-4 h-4" /> },
            { id: 'connect' as const, label: 'Connect EHR', icon: <Plug className="w-4 h-4" /> }].map(t => (
            <button key={t.id} type="button" onClick={() => setMode(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all ${mode === t.id ? 'bg-brand text-white shadow-sm' : 'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30 hover:text-brand-dark'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 1: SELECT ENTITY TYPE (Manual Upload mode)
          ════════════════════════════════════════════════════════════════ */}
      {step === 'select' && mode === 'upload' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-content-primary">What data are you importing?</h2>
            <p className="text-sm text-content-secondary mt-1">Select the type of data to upload. Import in order: Providers first, then Payers, Fee Schedules, Patients, and finally Open A/R.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENTITIES.map((e, idx) => (
              <button key={e.id} onClick={() => { setEntityType(e.id); setStep('upload') }}
                className="card flex items-start gap-3 p-5 text-left hover:border-brand/30">
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
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">File</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-content-tertiary tracking-wider">Imported</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-content-tertiary tracking-wider">Skipped</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-content-tertiary tracking-wider">Errors</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-content-tertiary tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 20).map((j: any) => (
                      <tr key={j.id} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                        <td className="px-4 py-3 text-[13px] text-content-secondary">{new Date(j.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-[13px] capitalize">{j.entity_type?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-[13px] text-content-secondary truncate max-w-[200px]">{j.file_name}</td>
                        <td className="px-4 py-3 text-right text-[13px] text-brand font-medium tabular-nums">{j.imported_count}</td>
                        <td className="px-4 py-3 text-right text-[13px] text-brand-mid tabular-nums">{j.skipped_count}</td>
                        <td className="px-4 py-3 text-right text-[13px] text-brand-deep tabular-nums">{j.error_count}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${j.status === 'completed' ? 'bg-brand/10 text-brand-dark border border-brand/20' : j.status === 'failed' ? 'bg-brand-deep/10 text-brand-deep border border-brand-deep/20' : 'bg-brand/5 text-brand border border-brand/15'}`}>
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
          CONNECT EHR TAB
          ════════════════════════════════════════════════════════════════ */}
      {step === 'select' && mode === 'connect' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-content-primary">Connect to EHR System</h2>
            <p className="text-sm text-content-secondary mt-1">Pull patient demographics, provider data, and clinical records directly from your EHR via FHIR R4 API.</p>
          </div>

          {/* Existing connections */}
          {ehrConnections.length > 0 && (
            <div className="space-y-4 mb-6">
              {ehrConnections.map((conn: ApiEhrConnection) => (
                <div key={conn.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${conn.status === 'connected' ? 'bg-brand/10 text-brand' : conn.status === 'error' ? 'bg-brand-deep/10 text-brand-deep' : 'bg-surface-elevated text-content-secondary'}`}>
                        {conn.status === 'connected' ? <Wifi className="w-5 h-5" /> : conn.status === 'error' ? <WifiOff className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-content-primary">{conn.display_name || conn.vendor}</div>
                        <div className="text-[12px] text-content-tertiary">{conn.fhir_base_url}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${conn.status === 'connected' ? 'bg-brand/10 text-brand-dark border-brand/20' : conn.status === 'error' ? 'bg-brand-deep/10 text-brand-deep border-brand-deep/20' : 'bg-brand/5 text-brand border-brand/15'}`}>
                      {conn.status}
                    </span>
                  </div>

                  {conn.last_error && (
                    <div className="text-[12px] text-brand-deep mb-3 p-2 rounded bg-brand-deep/5">{conn.last_error}</div>
                  )}

                  {conn.last_sync_at && (
                    <div className="text-[12px] text-content-tertiary mb-3">Last sync: {new Date(conn.last_sync_at).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'}</div>
                  )}

                  {/* Available resources */}
                  {conn.status === 'connected' && Array.isArray(conn.resources_available) && conn.resources_available.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[12px] font-semibold text-content-secondary mb-2">Available Resources (select to pull)</div>
                      <div className="flex flex-wrap gap-2">
                        {conn.resources_available.map((res: { fhir_resource: string; medcloud_entity: string }) => (
                          <button key={res.fhir_resource} type="button"
                            onClick={() => setSelectedResources((prev: string[]) => prev.includes(res.fhir_resource) ? prev.filter((r: string) => r !== res.fhir_resource) : [...prev, res.fhir_resource])}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${selectedResources.includes(res.fhir_resource) ? 'bg-brand text-white' : 'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30'}`}>
                            {res.fhir_resource} &rarr; {res.medcloud_entity}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pull result */}
                  {pullResultMap[conn.id] && pullingId === null && (
                    <div className="card p-4 mb-4">
                      <div className="text-[13px] font-semibold text-content-primary mb-2">Pull Results</div>
                      {Object.entries(pullResultMap[conn.id].resources_pulled).map(([k, v]) => (
                        <div key={k} className="text-[12px] text-content-secondary">{k}: {v as number} records imported</div>
                      ))}
                      {pullResultMap[conn.id].errors.length > 0 && pullResultMap[conn.id].errors.map((e: { resource: string; reason: string }, i: number) => (
                        <div key={i} className="text-[12px] text-brand-deep">{e.resource}: {e.reason}</div>
                      ))}
                    </div>
                  )}

                  {/* Test result */}
                  {testResultMap[conn.id] && testingId === null && (
                    <div className="card p-4 mb-4">
                      <div className={`text-[13px] font-semibold ${testResultMap[conn.id].success ? 'text-brand-dark' : 'text-brand-deep'} mb-1`}>
                        {testResultMap[conn.id].success ? 'Connection Successful' : 'Connection Failed'}
                      </div>
                      <div className="text-[12px] text-content-secondary">{testResultMap[conn.id].message}</div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => handleTestConnection(conn.id)} disabled={testingId === conn.id}
                      className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-[12px] font-medium text-content-secondary hover:border-brand/30 hover:text-brand-dark disabled:opacity-50 flex items-center gap-1.5">
                      {testingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Test Connection
                    </button>
                    {conn.status === 'connected' && selectedResources.length > 0 && (
                      <button type="button" onClick={() => handlePullData(conn.id)} disabled={pullingId === conn.id}
                        className="bg-brand text-white rounded-lg px-3 py-1.5 text-[12px] font-medium hover:bg-brand/90 disabled:opacity-50 flex items-center gap-1.5">
                        {pullingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                        Pull {selectedResources.length} Resource{selectedResources.length > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new connection form */}
          {!showAddConnection ? (
            <button type="button" onClick={() => setShowAddConnection(true)}
              className="card w-full p-5 text-left hover:border-brand/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
                <Plug className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-content-primary">Add EHR Connection</div>
                <div className="text-[12px] text-content-secondary">Connect to Epic, Cerner, Athena, or any FHIR R4 compliant EHR</div>
              </div>
            </button>
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-content-primary">New EHR Connection</h3>
                <button type="button" onClick={() => setShowAddConnection(false)} className="text-content-tertiary hover:text-content-primary"><X className="w-4 h-4" /></button>
              </div>

              {/* Vendor selector */}
              <div className="mb-4">
                <label htmlFor="ehr-vendor" className="text-[12px] font-semibold text-content-secondary mb-1.5 block">EHR Vendor</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EHR_VENDORS.map(v => (
                    <button key={v.id} type="button" onClick={() => setEhrForm((prev: typeof ehrForm) => ({ ...prev, vendor: v.id, display_name: v.label }))}
                      className={`p-3 rounded-lg text-left text-[12px] transition-all ${ehrForm.vendor === v.id ? 'bg-brand text-white' : 'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30'}`}>
                      <div className="font-semibold">{v.label}</div>
                      <div className={`mt-0.5 ${ehrForm.vendor === v.id ? 'text-white/70' : 'text-content-tertiary'}`}>{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* FHIR URL */}
              <div className="mb-4">
                <label htmlFor="ehr-fhir-url" className="text-[12px] font-semibold text-content-secondary mb-1.5 block">FHIR Base URL *</label>
                <input type="url" value={ehrForm.fhir_base_url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEhrForm((prev: typeof ehrForm) => ({ ...prev, fhir_base_url: e.target.value }))}
                  placeholder="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
                  className="w-full px-3 py-2 rounded-lg border border-separator bg-surface-primary text-[13px] focus:outline-none focus:border-brand placeholder:text-content-tertiary" />
              </div>

              {/* OAuth credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="ehr-client-id" className="text-[12px] font-semibold text-content-secondary mb-1.5 block">OAuth Client ID</label>
                  <input type="text" value={ehrForm.oauth_client_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEhrForm((prev: typeof ehrForm) => ({ ...prev, oauth_client_id: e.target.value }))}
                    placeholder="your-client-id"
                    className="w-full px-3 py-2 rounded-lg border border-separator bg-surface-primary text-[13px] focus:outline-none focus:border-brand placeholder:text-content-tertiary" />
                </div>
                <div>
                  <label htmlFor="ehr-client-secret" className="text-[12px] font-semibold text-content-secondary mb-1.5 block">OAuth Client Secret</label>
                  <input type="password" value={ehrForm.oauth_client_secret} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEhrForm((prev: typeof ehrForm) => ({ ...prev, oauth_client_secret: e.target.value }))}
                    placeholder="your-client-secret"
                    className="w-full px-3 py-2 rounded-lg border border-separator bg-surface-primary text-[13px] focus:outline-none focus:border-brand placeholder:text-content-tertiary" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="ehr-token-endpoint" className="text-[12px] font-semibold text-content-secondary mb-1.5 block">Token Endpoint</label>
                  <input type="url" value={ehrForm.token_endpoint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEhrForm((prev: typeof ehrForm) => ({ ...prev, token_endpoint: e.target.value }))}
                    placeholder="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
                    className="w-full px-3 py-2 rounded-lg border border-separator bg-surface-primary text-[13px] focus:outline-none focus:border-brand placeholder:text-content-tertiary" />
                </div>
                <div>
                  <label htmlFor="ehr-scope" className="text-[12px] font-semibold text-content-secondary mb-1.5 block">Scope</label>
                  <input type="text" value={ehrForm.scope} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEhrForm((prev: typeof ehrForm) => ({ ...prev, scope: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-separator bg-surface-primary text-[13px] focus:outline-none focus:border-brand" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={handleCreateConnection} disabled={!ehrForm.fhir_base_url || createEhr.loading}
                  className="bg-brand text-white rounded-lg px-5 py-2 text-[13px] font-medium hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2">
                  {createEhr.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Connection
                </button>
                <button type="button" onClick={() => setShowAddConnection(false)}
                  className="bg-surface-elevated border border-separator rounded-lg px-4 py-2 text-[13px] text-content-secondary hover:border-brand/30">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Import History (shared between both tabs) */}
          {jobs.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold text-content-primary mb-3">Import History</h3>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-separator">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">Source</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">Type</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-content-tertiary tracking-wider">Imported</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-content-tertiary tracking-wider">Errors</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold text-content-tertiary tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 20).map((j: ApiImportJob) => (
                      <tr key={j.id} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                        <td className="px-4 py-3 text-[13px] text-content-secondary">{new Date(j.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-[13px]">{j.file_type === 'fhir' ? 'FHIR API' : j.file_name}</td>
                        <td className="px-4 py-3 text-[13px] capitalize">{j.entity_type?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-right text-[13px] text-brand font-medium tabular-nums">{j.imported_count}</td>
                        <td className="px-4 py-3 text-right text-[13px] text-brand-deep tabular-nums">{j.error_count}</td>
                        <td className="px-4 py-3 text-center"><span className={`text-[11px] px-2 py-0.5 rounded-full border ${j.status === 'completed' ? 'bg-brand/10 text-brand-dark border-brand/20' : 'bg-brand-deep/10 text-brand-deep border-brand-deep/20'}`}>{j.status}</span></td>
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
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() }}}
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`card border-2 border-dashed p-12 text-center cursor-pointer transition-all ${dragOver ? 'border-brand bg-brand/5' : 'border-separator hover:border-brand/40'}`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-content-secondary" />
            <p className="text-content-primary font-medium">Drop your file here or click to browse</p>
            <p className="text-sm text-content-secondary mt-1">CSV, XLSX, XLS, HL7</p>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.hl7,.tsv" onChange={handleFileInput} />

          {/* Required fields info */}
          <div className="card mt-6 p-5">
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
              <span className={`font-medium ${allRequiredMapped ? 'text-brand' : 'text-brand-mid'}`}>{mappedCount} mapped</span>
              <span className="text-content-secondary"> / {parsedFile.headers.length} columns</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-content-secondary w-1/3">Your File Column</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-content-tertiary w-12">&rarr;</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider w-1/3">MedCloud Field</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-content-tertiary tracking-wider">Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {parsedFile.headers.map((h: string) => (
                  <tr key={h} className="border-b border-separator last:border-0">
                    <td className="px-4 py-3 text-[13px] font-medium text-content-primary">{h}</td>
                    <td className="px-4 py-3 text-center text-content-tertiary">&rarr;</td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-content-tertiary text-[12px] truncate max-w-[200px]">
                      {parsedFile.rows[0]?.[h] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!allRequiredMapped && (
            <div className="mt-3 flex items-center gap-2 text-brand-mid text-sm">
              <AlertCircle className="w-4 h-4" />
              Required fields not mapped: {requiredFields.filter(f => !Object.values(columnMap).includes(f.key)).map(f => f.label).join(', ')}
            </div>
          )}

          {/* Duplicate strategy */}
          <div className="card mt-6 p-5">
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
              ? <span className="text-brand font-medium">All rows valid. Ready to import {parsedFile.totalRows} rows.</span>
              : <span className="text-brand-deep font-medium">{previewErrors.length} validation errors found. Fix mapping or data before importing.</span>}
          </p>

          {previewErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-brand-deep/10 border border-brand-deep/20 text-sm">
              {previewErrors.map((e: any, i: number) => (
                <div key={i} className="text-brand-deep">Row {e.row + 1}: {e.field} &mdash; {e.reason}</div>
              ))}
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
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
                      return <td key={f.key} className={`px-2 py-1.5 ${hasError ? 'text-brand-deep bg-brand-deep/5' : 'text-content-primary'}`}>{val || '—'}</td>
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
            <div className="card p-5 text-center">
              <div className="text-2xl font-bold text-brand-dark">{results.imported_count}</div>
              <div className="text-xs text-brand mt-1">Imported</div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-2xl font-bold text-brand-deep">{results.skipped_count}</div>
              <div className="text-xs text-brand-mid mt-1">Skipped (Duplicates)</div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-2xl font-bold text-brand-dark">{results.updated_count}</div>
              <div className="text-xs text-brand-mid mt-1">Updated</div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-2xl font-bold text-brand-deep">{results.error_count}</div>
              <div className="text-xs text-brand-deep mt-1">Errors</div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-brand-deep/10 border border-brand-deep/20">
              <h3 className="text-sm font-medium text-brand-deep mb-2">Errors ({results.errors.length})</h3>
              <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                {results.errors.slice(0, 50).map((e: any, i: number) => (
                  <div key={i} className="text-brand-deep">Row {e.row + 1}: {e.reason}</div>
                ))}
                {results.errors.length > 50 && <div className="text-brand-deep italic">...and {results.errors.length - 50} more</div>}
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

      {/* ════════════════════════════════════════════════════════════════════
          DOCUMENT UPLOAD SECTION (always visible on select step)
          ════════════════════════════════════════════════════════════════ */}
      {step === 'select' && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                <FolderUp className="w-5 h-5 text-brand" />
                Document Upload
              </h2>
              <p className="text-sm text-content-secondary mt-1">Upload provider credentials, payer contracts, prior auth letters, and other operational documents.</p>
            </div>
          </div>

          {/* Category selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DOC_CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => setDocCategory(cat.id)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${docCategory === cat.id ? 'bg-brand text-white' : 'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30'}`}>
                {cat.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-content-tertiary mb-4">{DOC_CATEGORIES.find(c => c.id === docCategory)?.desc}</p>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDrop={handleDocDrop}
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('doc-file-input')?.click() } }}
            className="border-2 border-dashed border-separator rounded-[12px] p-8 text-center hover:border-brand/40 focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors cursor-pointer mb-4"
            onClick={() => document.getElementById('doc-file-input')?.click()}
          >
            <Upload className="w-8 h-8 text-content-tertiary mx-auto mb-2" />
            <p className="text-sm text-content-secondary">Drag and drop PDF, JPG, or PNG files here</p>
            <p className="text-[12px] text-content-tertiary mt-1">or click to browse</p>
            <input id="doc-file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocBrowse} />
          </div>

          {/* File list */}
          {docFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {docFiles.map((df: DocFile) => (
                <div key={df.id} className="flex items-center justify-between p-3 rounded-[8px] bg-surface-elevated">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-brand shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-content-primary truncate">{df.name}</div>
                      <div className="text-[11px] text-content-tertiary">{df.size} &middot; {df.category.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {df.status === 'pending' && <span className="text-[11px] text-content-tertiary">Ready</span>}
                    {df.status === 'uploading' && <Loader2 className="w-4 h-4 text-brand animate-spin" />}
                    {df.status === 'processing' && <span className="text-[11px] text-brand">Processing...</span>}
                    {df.status === 'done' && (
                      <span className="flex items-center gap-1 text-[11px] text-brand-dark">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {df.classification || 'Uploaded'}
                      </span>
                    )}
                    {df.status === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] text-brand-deep">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                    {df.status === 'pending' && (
                      <button type="button" onClick={() => removeDocFile(df.id)} className="text-content-tertiary hover:text-brand-deep">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {docFiles.some((f: DocFile) => f.status === 'pending') && (
            <button type="button" onClick={handleDocUploadAll} disabled={docUploading}
              className="w-full py-2.5 rounded-[10px] bg-brand text-white text-[13px] font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50">
              {docUploading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Uploading...</> : `Upload ${docFiles.filter((f: DocFile) => f.status === 'pending').length} file(s) to S3`}
            </button>
          )}

          {/* Entity Linking — for uploaded docs that need a provider/payer link */}
          {docFiles.some((f: DocFile) => f.status === 'done' && !f.linkedEntityId && (f.providers?.length || f.payers?.length)) && (
            <div className="mt-4 p-4 rounded-[10px] bg-surface-elevated border border-separator">
              <h4 className="text-[13px] font-semibold text-content-primary mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand" />
                Link Documents to Providers / Payers
              </h4>
              <div className="space-y-3">
                {docFiles.filter((f: DocFile) => f.status === 'done' && !f.linkedEntityId).map((df: DocFile) => {
                  const isProviderDoc = df.category === 'provider_credentials' || df.category === 'appeals' || df.category === 'prior_authorizations'
                  const isPayer = df.category === 'payer_contracts'
                  const entities = isProviderDoc ? (df.providers || []) : isPayer ? (df.payers || []) : []
                  if (entities.length === 0) return null

                  return (
                    <div key={df.id} className="flex items-center gap-3 flex-wrap">
                      <div className="min-w-0 flex-shrink-0">
                        <span className="text-[12px] font-medium text-content-primary">{df.name}</span>
                        {df.entitySuggestion && (
                          <span className="ml-2 text-[11px] text-brand">
                            AI suggests: {df.entitySuggestion.name} ({df.entitySuggestion.confidence}%)
                          </span>
                        )}
                      </div>
                      <select
                        defaultValue={df.entitySuggestion?.id || ''}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          if (e.target.value && df.docId) {
                            handleLinkEntity(df.id, df.docId, isProviderDoc ? 'provider' : 'payer', e.target.value)
                          }
                        }}
                        className="px-3 py-1.5 rounded-[8px] bg-surface-primary border border-separator text-[12px] text-content-primary min-w-[200px]"
                      >
                        <option value="">Select {isProviderDoc ? 'provider' : 'payer'}...</option>
                        {isProviderDoc && (df.providers || []).map((p: { id: string; name: string; npi: string; specialty: string }) => (
                          <option key={p.id} value={p.id}>{p.name} (NPI: {p.npi}){p.specialty ? ` — ${p.specialty}` : ''}</option>
                        ))}
                        {isPayer && (df.payers || []).map((p: { id: string; name: string }) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Show linked status on completed files */}
          {docFiles.some((f: DocFile) => f.linkedEntityId) && (
            <div className="mt-3 space-y-1">
              {docFiles.filter((f: DocFile) => f.linkedEntityId).map((df: DocFile) => (
                <div key={df.id} className="flex items-center gap-2 text-[12px] text-brand-dark">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-medium">{df.name}</span>
                  <span className="text-content-tertiary">linked to</span>
                  <span className="font-medium">{df.entitySuggestion?.name || df.linkedEntityType}</span>
                </div>
              ))}
            </div>
          )}

          {/* Extracted data summary for completed files */}
          {docFiles.some((f: DocFile) => f.status === 'done' && f.extractedData && Object.keys(f.extractedData).length > 0) && (
            <div className="mt-4 p-3 rounded-[8px] bg-surface-elevated">
              <h4 className="text-[12px] font-semibold text-content-primary mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand" />
                AI Extracted Data
              </h4>
              {docFiles.filter((f: DocFile) => f.status === 'done' && f.extractedData && Object.keys(f.extractedData).length > 0).map((df: DocFile) => (
                <div key={df.id} className="mb-2 last:mb-0">
                  <div className="text-[11px] font-medium text-brand-dark mb-1">{df.name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(df.extractedData || {}).map(([k, v]) => (
                      <div key={k} className="text-[11px]">
                        <span className="text-content-tertiary">{k.replace(/_/g, ' ')}:</span>{' '}
                        <span className="text-content-primary">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </ModuleShell>
  )
}
