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
  | { action: 'denial_risk'; payer: string; cpt: string; icd: string; billed: number; pos: string; status: string }
  | { action: 'voice_analyze'; agent: string; localPrompt: string; failedSamples: string; successSamples: string; callCount: number; successRate: number }
  | { action: 'voice_playbook'; payer: string; successRate: number; transcripts: string; callCount: number }

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
    case 'voice_analyze': {
      return {
        max_tokens: 2000,
        prompt: `You are an expert AI prompt engineer specializing in medical billing voice AI agents. You analyze real call performance data and suggest targeted, specific improvements to the agent's system prompt.

Be surgical — only suggest changes that are directly supported by the call data evidence. Do not rewrite the entire prompt. Output a clear diff-style suggestion showing what to add, change, or remove, and why.

Agent: ${params.agent === 'chris' ? 'Chris (Payer Follow-up)' : 'Cindy (AR Collections)'}
Current success rate from last ${params.callCount} calls: ${params.successRate}%

FAILED CALL PATTERNS:
${params.failedSamples || 'No failure data yet'}

SUCCESSFUL CALL PATTERNS:
${params.successSamples || 'No success data yet'}

CURRENT PROMPT:
${params.localPrompt}

Based on the failure patterns above, what specific changes to the prompt would improve success rate?
Format your response as:
## What's Going Wrong
[specific patterns from failed calls]

## Suggested Changes
[exact text to add/modify/remove, with rationale]

## Expected Impact
[what improvement this should drive]`,
      }
    }
    case 'voice_playbook': {
      return {
        max_tokens: 1500,
        prompt: `You are an expert medical billing AI analyst. You analyze real call transcripts between an AI billing agent and insurance company representatives to identify payer-specific patterns and create actionable IVR navigation playbooks.

Output ONLY the playbook section in markdown format — no preamble, no explanation. Write it as a section to be inserted directly into the agent's system prompt.

Payer: ${params.payer} | Success rate: ${params.successRate}% across ${params.callCount} calls

CALL TRANSCRIPTS:
${params.transcripts}

Based on these real calls, write a payer-specific playbook section for ${params.payer} that covers:
1. IVR navigation sequence (exact button presses and menu paths)
2. What commonly causes failures / where the agent gets stuck
3. What to do / not do when navigating ${params.payer}'s system
4. Any special phrases, holds, or transfers specific to this payer

Format as:
# Payer-Specific Rules → ${params.payer}
[your analysis here]

Be specific and actionable. Reference exact patterns from the transcripts.`,
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
