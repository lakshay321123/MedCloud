import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const presigned_url = body.presigned_url
    const document_id = body.document_id
    if (!presigned_url) return NextResponse.json({ error: 'presigned_url required' }, { status: 400 })

    // SSRF protection: only allow S3 presigned URLs
    const urlObj = new URL(presigned_url)
    if (!urlObj.hostname.endsWith('.s3.amazonaws.com') && !urlObj.hostname.endsWith('.s3.us-east-1.amazonaws.com')) {
      return NextResponse.json({ error: 'Invalid URL — only S3 presigned URLs allowed' }, { status: 403 })
    }

    // Fetch PDF bytes
    const pdfResp = await fetch(presigned_url, { signal: AbortSignal.timeout(20000) })
    if (!pdfResp.ok) return NextResponse.json({ error: `PDF fetch failed: ${pdfResp.status}` }, { status: 502 })
    
    const buffer = Buffer.from(await pdfResp.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mediaType = presigned_url.includes('.png') ? 'image/png' 
      : presigned_url.includes('.jpg') || presigned_url.includes('.jpeg') ? 'image/jpeg'
      : 'application/pdf'

    // Use Claude to read the PDF/image and extract structured medical data
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Extract medical codes from this superbill/encounter form. Return ONLY valid JSON (no markdown, no backticks):
{
  "patient_name": "string or null",
  "date_of_service": "MM/DD/YYYY or null",
  "icd_codes": ["J06.9", "R05.9"],
  "cpt_codes": ["99213", "87880"],
  "hcpcs_codes": ["J1100"],
  "charges": [165.00, 35.00],
  "total_charges": 264.00,
  "provider_name": "string or null",
  "insurance": "string or null",
  "notes": "string or null"
}
Only include codes that are clearly selected/circled/checked on the form. Do not include unchecked codes.`
            }
          ]
        }]
      })
    })

    if (!claudeResp.ok) {
      const errText = await claudeResp.text()
      return NextResponse.json({ error: `Claude API failed: ${claudeResp.status} ${errText.slice(0, 200)}` }, { status: 502 })
    }

    const claudeData = await claudeResp.json()
    const aiText = claudeData.content?.[0]?.text || '{}'
    
    let parsed: any = {}
    try {
      parsed = JSON.parse(aiText.replace(/```json|```/g, '').trim())
    } catch {
      // Try to extract JSON from response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    }

    const allCpt = [...(parsed.cpt_codes || []), ...(parsed.hcpcs_codes || [])]
    
    return NextResponse.json({
      raw_text: `Patient: ${parsed.patient_name || 'Unknown'} | DOS: ${parsed.date_of_service || ''} | ICD: ${(parsed.icd_codes || []).join(', ')} | CPT: ${allCpt.join(', ')} | Charges: $${parsed.total_charges || 0} | Insurance: ${parsed.insurance || ''} | Notes: ${parsed.notes || ''}`,
      text_length: aiText.length,
      fields: {
        patient_name: parsed.patient_name || null,
        date_of_service: parsed.date_of_service || null,
        icd_codes: parsed.icd_codes || [],
        cpt_codes: allCpt,
        charges: parsed.charges || [],
        total_charges: parsed.total_charges || 0,
        provider_name: parsed.provider_name || null,
        insurance: parsed.insurance || null,
        notes: parsed.notes || null,
      },
      document_id,
      method: 'claude_vision',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
