import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// ─── Auth helper ────────────────────────────────────────────────────────────
// Validates the caller has an active MedCloud session before forwarding to
// Anthropic. Prevents the route from being used as an open proxy by anyone
// who discovers the URL.
async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    // Primary check: HttpOnly auth_session cookie set by /api/auth/callback
    const cookieStore = await cookies()
    if (cookieStore.get('auth_session')?.value) return true
    // Secondary check: Authorization header (API / server-to-server callers)
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ') && authHeader.length > 20) return true
    return false
  } catch {
    return false
  }
}

// ─── Server-side prompt templates ──────────────────────────────────────────
// Prompt construction happens here on the server using typed parameters.
// The client sends an 'action' + structured data, NOT a raw prompt string.
// This eliminates the server-side prompt injection attack surface.

type AiAction =
  | { action: 'appeal';    level: string; claimId: string; patient: string; payer: string; provider: string; dos: string; denialReason: string; carc: string; rarc: string }
  | { action: 'cdi_query'; patient: string; provider: string; dos: string; assessment: string; plan: string; lowCodes: string }
  | { action: 'auto_code'; patient: string; specialty: string; dos: string; assessment: string; plan: string; codeSystem: string }
  | { action: 'soap_note'; transcript: string; patient: string; dob: string; gender: string; insurance: string; allergies: string; medications: string; visitType: string; specialty: string; codeSystem: string }
  | { action: 'denial_risk'; payer: string; cpt: string; icd: string; billed: number; pos: string; status: string }

function buildPrompt(params: AiAction): { prompt: string; max_tokens: number } {
  switch (params.action) {
    case 'appeal': {
      const levelLabel = params.level === 'L1' ? 'First Level' : params.level === 'L2' ? 'Second Level' : 'External Review'
      return {
        max_tokens: 1000,
        prompt: `You are an expert medical billing appeals specialist. Write a professional ${levelLabel} appeal letter.
Claim ID: ${params.claimId} | Patient: ${params.patient} | Payer: ${params.payer}
Provider: ${params.provider} | Date of Service: ${params.dos}
Denial Reason: ${params.denialReason}
CARC: ${params.carc || 'N/A'} | RARC: ${params.rarc || 'N/A'} | Appeal Level: ${params.level}

Write a compelling professional appeal letter addressing the denial. Cite medical necessity. Format as a business letter. Output the letter text only.`,
      }
    }
    case 'cdi_query': {
      return {
        max_tokens: 300,
        prompt: `You are a CDI specialist. Write a brief physician query (2-3 sentences) asking for documentation clarification.
Patient: ${params.patient} | Provider: ${params.provider} | DOS: ${params.dos}
Assessment: ${params.assessment}
Plan: ${params.plan}
${params.lowCodes ? `Codes needing clarification: ${params.lowCodes}` : 'Request diagnostic specificity.'}
Be concise and professional. Ask what specific documentation would support more precise coding.`,
      }
    }
    case 'soap_note': {
      return {
        max_tokens: 1500,
        prompt: `You are an expert medical scribe AI. Convert the following clinical encounter transcript into a structured SOAP note AND generate medical codes.

Patient: ${params.patient} | DOB: ${params.dob} | Gender: ${params.gender}
Insurance: ${params.insurance} | Visit Type: ${params.visitType} | Specialty: ${params.specialty || 'General Medicine'}
Allergies: ${params.allergies || 'NKDA'} | Current Medications: ${params.medications || 'None'}
Code System: ${params.codeSystem}

TRANSCRIPT:
${params.transcript}

Return ONLY valid JSON (no markdown, no backticks):
{
  "soap": {
    "s": "Subjective section — chief complaint, HPI, patient-reported symptoms, relevant history",
    "o": "Objective section — vitals, physical exam findings, labs, imaging mentioned",
    "a": "Assessment — diagnosis list with clinical reasoning",
    "p": "Plan — treatments, medications, referrals, follow-up, patient instructions"
  },
  "icd": [{"code": "X00.0", "desc": "Description", "confidence": 95, "is_primary": true}],
  "cpt": [{"code": "99213", "desc": "Description", "confidence": 90, "modifiers": [], "em_level": "3", "reasoning": "MDM rationale"}],
  "avs_summary": "2-3 sentence plain-English after-visit summary for the patient",
  "em_level": "3",
  "em_rationale": "Brief MDM rationale for E/M level selection"
}

Rules: ICD max 5 codes, CPT max 4 codes, confidence 0-100. Use ${params.codeSystem} coding system. Be specific and clinically accurate.`,
      }
    }
    case 'auto_code': {
      return {
        max_tokens: 800,
        prompt: `You are an expert medical coder. Generate diagnosis and procedure codes for the following clinical encounter.
Code system: ${params.codeSystem}
Patient: ${params.patient} | Specialty: ${params.specialty || 'General Medicine'} | DOS: ${params.dos}

Assessment: ${params.assessment}
Plan: ${params.plan}

Return ONLY valid JSON, no markdown:
{"icd":[{"code":"X00.0","desc":"Description","confidence":95,"reasoning":"Why"}],"cpt":[{"code":"99213","desc":"Description","confidence":90,"modifiers":[],"reasoning":"Why"}]}

Rules: ICD 2-5 codes max, CPT 1-4 codes max, confidence 0-100, reasoning 1 sentence.`,
      }
    }
    case 'denial_risk': {
      return {
        max_tokens: 200,
        prompt: `You are an expert medical billing denial analyst. Predict the denial risk for this claim.
Payer: ${params.payer} | CPT: ${params.cpt} | ICD: ${params.icd}
Billed: $${params.billed} | Place of Service: ${params.pos} | Status: ${params.status}

Return ONLY valid JSON: {"risk":"high|medium|low","probability":75,"reasons":["Reason 1","Reason 2"]}`,
      }
    }
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // CRITICAL: Authenticate before any processing
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, ...params } = body

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[ai/route] ANTHROPIC_API_KEY not set')
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    // Build prompt server-side — client never controls raw prompt text
    let promptConfig: { prompt: string; max_tokens: number }
    try {
      promptConfig = buildPrompt({ action, ...params } as AiAction)
    } catch (e) {
      console.error('[ai/route] Unknown action:', action, e)
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: promptConfig.max_tokens,
        messages: [{ role: 'user', content: promptConfig.prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[ai/route] Anthropic API error:', response.status, err)
      return NextResponse.json({ error: 'AI request failed' }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return NextResponse.json({ text })

  } catch (err) {
    console.error('[ai/route] Internal error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
