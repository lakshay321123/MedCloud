import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const presigned_url = body.presigned_url
    const document_id = body.document_id
    if (!presigned_url) return NextResponse.json({ error: 'presigned_url required' }, { status: 400 })

    const pdfResp = await fetch(presigned_url, { signal: AbortSignal.timeout(15000) })
    if (!pdfResp.ok) return NextResponse.json({ error: `PDF fetch failed: ${pdfResp.status}` }, { status: 502 })
    
    const buffer = Buffer.from(await pdfResp.arrayBuffer())
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 200000))
    const fragments: string[] = []
    
    // Extract text between parentheses in PDF content streams
    const pdfTextRegex = /\(([^)]{2,200})\)/g
    let match: RegExpExecArray | null
    while ((match = pdfTextRegex.exec(text)) !== null) {
      const t = match[1].replace(/\\[()\\]/g, '').trim()
      if (t.length > 1 && !/^[\x00-\x1f]+$/.test(t)) fragments.push(t)
    }
    
    const unique = fragments.filter((v, i, a) => a.indexOf(v) === i)
    const rawText = unique.join(' ')
    
    // Extract ICD codes
    const icdSet = new Set<string>()
    const icdRegex = /\b([A-TV-Z]\d{2,3}(?:\.\d{1,4})?)\b/g
    while ((match = icdRegex.exec(rawText)) !== null) {
      if (/^[A-TV-Z]\d{2}/.test(match[1])) icdSet.add(match[1])
    }
    
    // Extract CPT codes (5-digit) + HCPCS J/G codes
    const cptSet = new Set<string>()
    const cptRegex = /\b(\d{5})\b/g
    while ((match = cptRegex.exec(rawText)) !== null) {
      if (/^(99|9[0-8]|8[0-9]|7[0-9]|6[0-9]|3[0-9]|2[0-9]|1[0-9]|0[0-9])/.test(match[1])) cptSet.add(match[1])
    }
    const hcpcsRegex = /\b([JGQA]\d{4})\b/g
    while ((match = hcpcsRegex.exec(rawText)) !== null) cptSet.add(match[1])
    
    // Extract charges
    const charges: number[] = []
    const chargeRegex = /\$(\d+(?:\.\d{2})?)/g
    while ((match = chargeRegex.exec(rawText)) !== null) charges.push(parseFloat(match[1]))
    
    const nameMatch = rawText.match(/(?:Patient|Name)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/)
    const dosMatch = rawText.match(/(\d{2}\/\d{2}\/\d{4})/)

    return NextResponse.json({
      raw_text: rawText,
      text_length: rawText.length,
      fragment_count: unique.length,
      fields: {
        patient_name: nameMatch?.[1] || null,
        date_of_service: dosMatch?.[1] || null,
        icd_codes: Array.from(icdSet),
        cpt_codes: Array.from(cptSet),
        charges,
        total_charges: charges.length > 0 ? Math.max(...charges) : 0,
      },
      document_id,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
