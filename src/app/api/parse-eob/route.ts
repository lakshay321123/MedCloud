import { NextRequest, NextResponse } from 'next/server'

// ─── EOB PDF/TXT Parser ─────────────────────────────────────────────────────
// Handles PDF EOBs via Claude Vision and TXT EOBs via regex extraction

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { presigned_url, raw_content, file_name } = body

    if (presigned_url) {
      const urlObj = new URL(presigned_url)
      if (!urlObj.hostname.endsWith('.s3.amazonaws.com') && !urlObj.hostname.endsWith('.s3.us-east-1.amazonaws.com')) {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 403 })
      }

      const pdfResp = await fetch(presigned_url, { signal: AbortSignal.timeout(25000) })
      if (!pdfResp.ok) return NextResponse.json({ error: `PDF fetch failed: ${pdfResp.status}` }, { status: 502 })

      const pdfBytes = await pdfResp.arrayBuffer()
      // Convert to base64 without Node.js Buffer (works in Edge runtime too)
      const uint8 = new Uint8Array(pdfBytes)
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...Array.from(uint8.subarray(i, i + chunkSize)))
      }
      const base64 = btoa(binary)
      const mediaType = presigned_url.includes('.png') ? 'image/png'
        : presigned_url.includes('.jpg') || presigned_url.includes('.jpeg') ? 'image/jpeg'
        : 'application/pdf'

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } },
              {
                type: 'text',
                text: `This is an Explanation of Benefits (EOB) or remittance advice document. Extract all payment data. Return ONLY valid JSON, no markdown:
{
  "payer_name": "string",
  "check_number": "string",
  "payment_date": "MM/DD/YYYY",
  "total_paid": 0.00,
  "claims": [
    {
      "claim_number": "string",
      "patient_name": "string",
      "date_of_service": "MM/DD/YYYY",
      "billed": 0.00,
      "allowed": 0.00,
      "paid": 0.00,
      "patient_responsibility": 0.00,
      "lines": [
        {
          "cpt": "99213",
          "billed": 0.00,
          "allowed": 0.00,
          "paid": 0.00,
          "adjustment_code": "CO-45",
          "adjustment_reason": "Contractual adjustment",
          "adjustment_amount": 0.00
        }
      ]
    }
  ]
}
Extract every claim and service line visible. Use CARC codes like CO-45, PR-1, OA-23 for adjustments.`
              }
            ]
          }]
        })
      })

      if (!claudeResp.ok) {
        const err = await claudeResp.text()
        return NextResponse.json({ error: `Vision API failed: ${claudeResp.status}` }, { status: 502 })
      }

      const claudeData = await claudeResp.json()
      const aiText = claudeData.content?.[0]?.text || '{}'

      let parsed: EOBData = { payer_name: '', check_number: '', payment_date: '', total_paid: 0, claims: [] }
      try {
        parsed = JSON.parse(aiText.replace(/```json|```/g, '').trim())
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/)
        if (match) {
          try { parsed = JSON.parse(match[0]) } catch { /* fall through */ }
        }
      }

      return NextResponse.json({ ...parsed, source: 'pdf_vision', file_name })
    }

    if (raw_content) {
      const parsed = parseTxtEOB(raw_content as string)
      return NextResponse.json({ ...parsed, source: 'txt_parse', file_name })
    }

    return NextResponse.json({ error: 'Either presigned_url or raw_content required' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

interface EOBLine { cpt: string; billed: number; allowed: number; paid: number; adjustment_code: string; adjustment_reason: string; adjustment_amount: number }
interface EOBClaim { claim_number: string; patient_name: string; date_of_service: string; billed: number; allowed: number; paid: number; patient_responsibility: number; lines: EOBLine[] }
interface EOBData { payer_name: string; check_number: string; payment_date: string; total_paid: number; claims: EOBClaim[] }

function parseTxtEOB(raw: string): EOBData {
  const lines = raw.split(/\r?\n/)
  const result: EOBData = { payer_name: '', check_number: '', payment_date: '', total_paid: 0, claims: [] }

  for (const line of lines) {
    const l = line.trim()
    if (!result.payer_name) {
      const m = l.match(/(?:payer|insurance\s*company|insurer|carrier)[:\s]+([A-Za-z][^\n\r]{3,50})/i)
      if (m) result.payer_name = m[1].trim()
    }
    if (!result.check_number) {
      const m = l.match(/(?:check\s*(?:number|#|no)|eft\s*(?:number|#)|trace\s*(?:number|#)|reference\s*(?:no|number|#))[:\s#]+([A-Z0-9\-]{4,20})/i)
      if (m) result.check_number = m[1].trim()
    }
    if (!result.payment_date) {
      const m = l.match(/(?:payment\s*date|check\s*date|issue\s*date|paid\s*date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      if (m) result.payment_date = m[1].trim()
    }
    if (!result.total_paid) {
      const m = l.match(/(?:total\s*(?:payment|paid|amount)|net\s*payment)[:\s]+\$?([\d,]+\.?\d*)/i)
      if (m) result.total_paid = parseFloat(m[1].replace(/,/g, '')) || 0
    }
  }

  const claimPositions: { number: string; lineIdx: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const m1 = lines[i].match(/(?:claim\s*(?:number|no|#|id)[:\s#]+)([A-Z0-9\-]{4,20})/i)
    if (m1) { claimPositions.push({ number: m1[1], lineIdx: i }); continue }
    const m2 = lines[i].match(/\b(CLM[-]?[A-Z0-9]{4,15})\b/i)
    if (m2) claimPositions.push({ number: m2[1], lineIdx: i })
  }

  for (const cp of claimPositions) {
    const claim: EOBClaim = { claim_number: cp.number, patient_name: '', date_of_service: '', billed: 0, allowed: 0, paid: 0, patient_responsibility: 0, lines: [] }
    const start = Math.max(0, cp.lineIdx - 2)
    const end = Math.min(lines.length, cp.lineIdx + 15)
    const block = lines.slice(start, end).join('\n')

    const patM = block.match(/(?:patient|member|subscriber)[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i)
    if (patM) claim.patient_name = patM[1].trim()
    const dosM = block.match(/(?:date\s*of\s*service|dos|service\s*date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    if (dosM) claim.date_of_service = dosM[1].trim()
    const billedM = block.match(/(?:billed|charged|submitted)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (billedM) claim.billed = parseFloat(billedM[1].replace(/,/g, '')) || 0
    const allowedM = block.match(/(?:allowed|contracted|approved)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (allowedM) claim.allowed = parseFloat(allowedM[1].replace(/,/g, '')) || 0
    const paidM = block.match(/(?:paid|payment|amount\s*paid)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (paidM) claim.paid = parseFloat(paidM[1].replace(/,/g, '')) || 0
    const patRespM = block.match(/(?:patient\s*(?:responsibility|balance)|deductible|copay)[:\s]+\$?([\d,]+\.?\d*)/i)
    if (patRespM) claim.patient_responsibility = parseFloat(patRespM[1].replace(/,/g, '')) || 0

    const cptPattern = /\b(\d{5})\b[\s|,\t]+\$?([\d,]+\.?\d*)[\s|,\t]+(?:\$?([\d,]+\.?\d*)[\s|,\t]+)?(?:\$?([\d,]+\.?\d*))?/g
    let cptM: RegExpExecArray | null
    while ((cptM = cptPattern.exec(block)) !== null) {
      const cptNum = parseInt(cptM[1])
      if (cptNum >= 100 && cptNum <= 99499) {
        const lineBilled = parseFloat((cptM[2] || '0').replace(/,/g, '')) || 0
        const lineAllowed = parseFloat((cptM[3] || '0').replace(/,/g, '')) || 0
        const linePaid = parseFloat((cptM[4] || '0').replace(/,/g, '')) || 0
        if (lineBilled > 0 || linePaid > 0) {
          const ctx = block.slice(Math.max(0, cptM.index - 50), Math.min(block.length, cptM.index + 100))
          const carcM = ctx.match(/\b(CO|PR|OA|PI|CR)[-\s]?(\d{1,3})\b/i)
          const adjCode = carcM ? `${carcM[1].toUpperCase()}-${carcM[2]}` : ''
          claim.lines.push({ cpt: cptM[1], billed: lineBilled, allowed: lineAllowed || lineBilled, paid: linePaid, adjustment_code: adjCode, adjustment_reason: adjCode ? getAdjText(carcM![1], carcM![2]) : '', adjustment_amount: lineBilled - linePaid })
        }
      }
    }

    if (claim.lines.length === 0 && (claim.billed > 0 || claim.paid > 0)) {
      claim.lines.push({ cpt: '', billed: claim.billed, allowed: claim.allowed || claim.billed, paid: claim.paid, adjustment_code: '', adjustment_reason: '', adjustment_amount: claim.billed - claim.paid })
    }

    if (claim.claim_number || claim.lines.length > 0) result.claims.push(claim)
  }

  // Fallback: no structured claims — try global line scan
  if (result.claims.length === 0) {
    const fallback: EOBClaim = { claim_number: 'EOB-001', patient_name: '', date_of_service: '', billed: result.total_paid, allowed: result.total_paid, paid: result.total_paid, patient_responsibility: 0, lines: [] }
    const cptGlobal = /\b(\d{5})\b[\s|,\t]+\$?([\d,]+\.?\d*)[\s|,\t]+\$?([\d,]+\.?\d*)[\s|,\t]+\$?([\d,]+\.?\d*)/g
    let gm: RegExpExecArray | null
    while ((gm = cptGlobal.exec(raw)) !== null) {
      const n = parseInt(gm[1])
      if (n >= 100 && n <= 99499) {
        fallback.lines.push({ cpt: gm[1], billed: parseFloat(gm[2].replace(/,/g,''))||0, allowed: parseFloat(gm[3].replace(/,/g,''))||0, paid: parseFloat(gm[4].replace(/,/g,''))||0, adjustment_code:'', adjustment_reason:'', adjustment_amount:0 })
      }
    }
    if (fallback.lines.length > 0) result.claims.push(fallback)
  }

  return result
}

const ADJ_MAP: Record<string, string> = { '1':'Deductible','2':'Coinsurance','3':'Co-payment','45':'Contractual adjustment','97':'Payment in allowable','96':'Non-covered','50':'Not covered','16':'Missing info','18':'Duplicate','29':'Timely filing','B7':'Not authorized','57':'Prior auth required','4':'Auth required','109':'Not covered','119':'Max benefit reached','23':'Other carrier paid' }
function getAdjText(group: string, code: string): string { return ADJ_MAP[code] || `${group.toUpperCase()}-${code} adjustment` }
