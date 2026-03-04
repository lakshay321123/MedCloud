'use client'

// ─── Column mappings per agent ─────────────────────────────────────────────
// These map the Excel column headers → Retell dynamic variable names
// Retell agent LLM uses these as {{variable_name}} in the script

export const CINDY_COLUMNS = [
  'ID', 'phone number', 'practicename', 'patientId', 'patientdob',
  'patientfirstname', 'patientlastname', 'patientbalance',
  '1ststatementdate', 'laststatementdate', 'lastoutreachdate',
  'lastpaymentdate', 'balanceage', 'aginggroup', 'statementcount',
  'smscount', 'emailcount', 'callcount',
  'address', 'city', 'state', 'zip', 'email', 'sms',
  'servicedate', 'physicianname', 'primaryinsurance', 'source_file',
] as const

export const CHRIS_COLUMNS = [
  'ID', 'phone number', 'Practice_Name', 'NPI', 'Tax_ID',
  'Billing_Address', 'Call_Back#', 'Acct#', 'Provider',
  'Service_Location', 'Patient_Name', 'Patient_Birth_Date',
  'Primary_Carrier_Name', 'Primary_Carrier_Policy#',
  'Service_Date', 'Total_Charge', 'Our_Fax#',
] as const

export type AgentKey = 'cindy' | 'chris'

export interface ParsedRow {
  phone: string
  variables: Record<string, string>
  raw: Record<string, unknown>
}

export interface ExcelParseResult {
  rows: ParsedRow[]
  columns: string[]
  errors: string[]
  agentDetected: AgentKey | null
  fileName: string
  practiceNames: string[]
}

// Normalize column name for Retell variable key (no spaces, lowercase)
function toVarKey(col: string): string {
  return col.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '')
}

// Detect which agent this file is for based on columns present
function detectAgent(columns: string[]): AgentKey | null {
  const lower = columns.map(c => c.toLowerCase())
  if (lower.includes('patientbalance') || lower.includes('aginggroup')) return 'cindy'
  if (lower.includes('npi') || lower.includes('tax_id') || lower.includes('primary_carrier_name')) return 'chris'
  return null
}

// Find phone number column regardless of exact name
function findPhoneCol(row: Record<string, unknown>, columns: string[]): string {
  const phoneCols = columns.filter(c =>
    c.toLowerCase().includes('phone') || c.toLowerCase() === 'sms'
  )
  for (const col of phoneCols) {
    const val = String(row[col] ?? '').replace(/\D/g, '')
    if (val.length >= 10) return col
  }
  return ''
}

function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export async function parseRetellExcel(file: File): Promise<ExcelParseResult> {
  const { read, utils } = await import('xlsx')

  const buffer = await file.arrayBuffer()
  const wb = read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows: Record<string, unknown>[] = utils.sheet_to_json(ws, { defval: '' })

  if (rawRows.length === 0) {
    return { rows: [], columns: [], errors: ['File is empty'], agentDetected: null, fileName: file.name, practiceNames: [] }
  }

  const columns = Object.keys(rawRows[0])
  const agentDetected = detectAgent(columns)
  const errors: string[] = []
  const rows: ParsedRow[] = []
  const practiceSet = new Set<string>()

  // Find phone column name
  const phoneColName = columns.find(c => c.toLowerCase() === 'phone number') ??
                       columns.find(c => c.toLowerCase().includes('phone')) ?? ''

  rawRows.forEach((raw, i) => {
    // Get phone
    const rawPhone = phoneColName ? String(raw[phoneColName] ?? '') : ''
    if (!rawPhone) {
      errors.push(`Row ${i + 2}: no phone number — skipped`)
      return
    }
    const phone = normalizePhone(rawPhone)
    if (phone.replace(/\D/g, '').length < 10) {
      errors.push(`Row ${i + 2}: invalid phone "${rawPhone}" — skipped`)
      return
    }

    // Build variables — all columns become dynamic vars
    const variables: Record<string, string> = {}
    for (const col of columns) {
      const val = raw[col]
      if (val === null || val === undefined || val === '') continue
      // Format dates nicely
      const formatted = val instanceof Date
        ? val.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : String(val)
      variables[toVarKey(col)] = formatted
    }

    // Practice name for grouping
    const practiceName = String(raw['practicename'] ?? raw['Practice_Name'] ?? '')
    if (practiceName) practiceSet.add(practiceName)

    rows.push({ phone, variables, raw })
  })

  return {
    rows,
    columns,
    errors,
    agentDetected,
    fileName: file.name,
    practiceNames: Array.from(practiceSet),
  }
}
