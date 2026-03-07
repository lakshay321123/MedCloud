import { NextRequest, NextResponse } from 'next/server'

const HCC_CODES: Record<string, { hcc: number; raf: number; desc: string }> = {
  'E11.0': { hcc: 37, raf: 0.302, desc: 'Type 2 DM hyperosmolarity' },
  'E11.2': { hcc: 18, raf: 0.302, desc: 'Type 2 DM kidney' },
  'E11.4': { hcc: 18, raf: 0.302, desc: 'Type 2 DM neurological' },
  'E11.5': { hcc: 37, raf: 0.302, desc: 'Type 2 DM circulatory' },
  'E11.65': { hcc: 37, raf: 0.302, desc: 'Type 2 DM hyperglycemia' },
  'E11.9': { hcc: 37, raf: 0.302, desc: 'Type 2 DM w/o complication' },
  'I50.2': { hcc: 85, raf: 0.368, desc: 'Systolic HF' },
  'I50.9': { hcc: 85, raf: 0.368, desc: 'HF unspecified' },
  'I48.0': { hcc: 96, raf: 0.273, desc: 'Paroxysmal AFib' },
  'I48.91': { hcc: 96, raf: 0.273, desc: 'AFib unspecified' },
  'J44.0': { hcc: 111, raf: 0.335, desc: 'COPD acute' },
  'J44.1': { hcc: 111, raf: 0.335, desc: 'COPD exacerbation' },
  'N18.3': { hcc: 138, raf: 0.069, desc: 'CKD 3' },
  'N18.4': { hcc: 136, raf: 0.289, desc: 'CKD 4' },
  'F32.1': { hcc: 155, raf: 0.309, desc: 'MDD moderate' },
  'F33.1': { hcc: 155, raf: 0.309, desc: 'MDD recurrent' },
  'E66.01': { hcc: 48, raf: 0.273, desc: 'Morbid obesity' },
  'I63.9': { hcc: 100, raf: 0.268, desc: 'Stroke' },
  'B20': { hcc: 1, raf: 0.288, desc: 'HIV' },
  'G30': { hcc: 51, raf: 0.368, desc: "Alzheimer's" },
  'F20': { hcc: 57, raf: 0.562, desc: 'Schizophrenia' },
}

function lookupHCC(code: string) {
  for (let len = code.length; len >= 3; len--) {
    if (HCC_CODES[code.substring(0, len)]) return HCC_CODES[code.substring(0, len)]
  }
  return null
}

const FEW_SHOTS = `Example: 45yo male URI. Sore throat, congestion, low-grade fever. Pharyngeal erythema, lungs clear. Supportive care.
Codes: ICD: J06.9 (URI) | CPT: 99213 (E/M low MDM)

Example: 62yo female DM follow-up. A1C 7.8. Nocturia. Add glipizide, recheck 3mo.
Codes: ICD: E11.65 (T2DM hyperglycemia) | CPT: 99214 (E/M moderate MDM)

Example: 55yo male R knee pain. Crepitus, effusion. XR: joint narrowing. PT + injection.
Codes: ICD: M17.11 (Primary OA R knee) | CPT: 99213 + 20610 (E/M + arthrocentesis)`

export async function POST(req: NextRequest) {
  const startMs = Date.now()
  try {
    const { clinical_text, instructions } = await req.json()
    if (!clinical_text) return NextResponse.json({ error: 'clinical_text required' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const prompt = `You are an expert medical coder. Code this clinical encounter using 2021 E/M MDM guidelines.

${FEW_SHOTS}

Now code this encounter:
${clinical_text}
${instructions ? `\nCoder instructions: ${instructions}` : ''}

Respond ONLY in valid JSON (no markdown, no backticks):
{"suggested_cpt":[{"code":"string","description":"string","confidence":number,"modifier":null,"ncci_note":null}],"suggested_icd":[{"code":"string","description":"string","confidence":number,"is_primary":boolean,"is_hcc":boolean,"specificity_note":null}],"suggested_em":"string","em_confidence":number,"reasoning":"string","documentation_gaps":[],"audit_flags":[],"hcc_diagnoses":[]}`

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: 'You are an expert medical coding AI. Always respond with valid JSON only, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiResp.ok) {
      const err = await aiResp.text()
      console.error('[ai-coding] Anthropic:', aiResp.status, err.substring(0, 200))
      return NextResponse.json({ error: 'AI service error', status: aiResp.status }, { status: 502 })
    }

    const data = await aiResp.json()
    const aiText = data.content?.map((c: { text?: string }) => c.text || '').join('') || '{}'

    let suggestion
    try { suggestion = JSON.parse(aiText.replace(/```json|```/g, '').trim()) }
    catch { return NextResponse.json({ error: 'Parse error', raw: aiText.substring(0, 300) }, { status: 500 }) }

    // Enrich with HCC
    if (suggestion.suggested_icd) {
      suggestion.suggested_icd = suggestion.suggested_icd.map((icd: { code: string; is_hcc?: boolean; hcc_category?: number; raf_score?: number; specificity_note?: string }) => {
        const hcc = lookupHCC(icd.code)
        if (hcc) { icd.is_hcc = true; icd.hcc_category = hcc.hcc; icd.raf_score = hcc.raf; icd.specificity_note = icd.specificity_note || `HCC ${hcc.hcc} — RAF ${hcc.raf}` }
        return icd
      })
      suggestion.hcc_diagnoses = suggestion.suggested_icd.filter((i: { is_hcc?: boolean }) => i.is_hcc).map((i: { code: string; hcc_category?: number; raf_score?: number }) => `${i.code} (HCC ${i.hcc_category}, RAF ${i.raf_score})`)
    }

    return NextResponse.json({ ...suggestion, mock: false, processing_ms: Date.now() - startMs, model_id: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514', prompt_version: 'v3.0' })
  } catch (error) {
    console.error('[ai-coding]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
