'use client'

export const CINDY_COLUMNS = ['ID','phone number','practicename','patientId','patientdob','patientfirstname','patientlastname','patientbalance','1ststatementdate','laststatementdate','lastoutreachdate','lastpaymentdate','balanceage','aginggroup','statementcount','smscount','emailcount','callcount','address','city','state','zip','email','sms','servicedate','physicianname','primaryinsurance','source_file'] as const
export const CHRIS_COLUMNS = ['ID','phone number','Practice_Name','NPI','Tax_ID','Billing_Address','Call_Back#','Acct#','Provider','Service_Location','Patient_Name','Patient_Birth_Date','Primary_Carrier_Name','Primary_Carrier_Policy#','Service_Date','Total_Charge','Our_Fax#'] as const
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

function toVarKey(col: string): string {
  return col.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '')
}

function detectAgent(columns: string[]): AgentKey | null {
  const lower = columns.map(c => c.toLowerCase())
  if (lower.includes('patientbalance') || lower.includes('aginggroup')) return 'cindy'
  if (lower.includes('npi') || lower.includes('tax_id') || lower.includes('primary_carrier_name')) return 'chris'
  return null
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

  if (rawRows.length === 0) return { rows: [], columns: [], errors: ['File is empty'], agentDetected: null, fileName: file.name, practiceNames: [] }

  const columns = Object.keys(rawRows[0])
  const agentDetected = detectAgent(columns)
  const errors: string[] = []
  const rows: ParsedRow[] = []
  const practiceSet = new Set<string>()
  const phoneColName = columns.find(c => c.toLowerCase() === 'phone number') ?? columns.find(c => c.toLowerCase().includes('phone')) ?? ''

  rawRows.forEach((raw, i) => {
    const rawPhone = phoneColName ? String(raw[phoneColName] ?? '') : ''
    if (!rawPhone) { errors.push(`Row ${i + 2}: no phone — skipped`); return }
    const phone = normalizePhone(rawPhone)
    if (phone.replace(/\D/g, '').length < 10) { errors.push(`Row ${i + 2}: invalid phone "${rawPhone}" — skipped`); return }

    const variables: Record<string, string> = {}
    for (const col of columns) {
      const val = raw[col]
      if (val === null || val === undefined || val === '') continue
      variables[toVarKey(col)] = val instanceof Date ? val.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : String(val)
    }

    const practiceName = String(raw['practicename'] ?? raw['Practice_Name'] ?? '')
    if (practiceName) practiceSet.add(practiceName)
    rows.push({ phone, variables, raw })
  })

  return { rows, columns, errors, agentDetected, fileName: file.name, practiceNames: Array.from(practiceSet) }
}
