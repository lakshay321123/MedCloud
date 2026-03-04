import { NextRequest, NextResponse } from 'next/server'

const RETELL_API_KEY = process.env.RETELL_API_KEY
const RETELL_BASE = 'https://api.retellai.com'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const RETELL_AGENTS = {
  chris: process.env.RETELL_AGENT_CHRIS ?? '',
  cindy: process.env.RETELL_AGENT_CINDY ?? '',
}
const RETELL_PHONES = {
  chris: process.env.RETELL_PHONE_CHRIS ?? '+19499905052',
  cindy: process.env.RETELL_PHONE_CINDY ?? '+19495229502',
}

async function retellFetch(path: string, options: RequestInit = {}) {
  if (!RETELL_API_KEY) throw new Error('RETELL_API_KEY not configured')
  const res = await fetch(`${RETELL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Retell API ${res.status}: ${err}`)
  }
  return res.json()
}

async function claudeAnalyze(systemPrompt: string, userMessage: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    // ── List calls with agent + payer filtering ──────────────────────────────
    if (action === 'list-calls') {
      const limit = Number(searchParams.get('limit') ?? '100')
      const agentId = searchParams.get('agent_id')
      const paginationKey = searchParams.get('pagination_key')

      const filterCriteria: Record<string, unknown> = {}
      if (agentId) filterCriteria.agent_id = [agentId]

      const reqBody: Record<string, unknown> = { limit }
      if (Object.keys(filterCriteria).length > 0) reqBody.filter_criteria = filterCriteria
      if (paginationKey) reqBody.pagination_key = paginationKey

      const data = await retellFetch('/v2/list-calls', { method: 'POST', body: JSON.stringify(reqBody) })
      return NextResponse.json(data)
    }

    // ── Get single call ──────────────────────────────────────────────────────
    if (action === 'get-call') {
      const callId = searchParams.get('call_id')
      if (!callId) return NextResponse.json({ error: 'call_id required' }, { status: 400 })
      const data = await retellFetch(`/v2/get-call/${callId}`)
      return NextResponse.json(data)
    }

    // ── List batches ─────────────────────────────────────────────────────────
    if (action === 'list-batches') {
      const data = await retellFetch('/v2/list-batches', { method: 'POST', body: JSON.stringify({ limit: 50 }) })
      return NextResponse.json(data)
    }

    // ── Agents info ──────────────────────────────────────────────────────────
    if (action === 'agents') {
      return NextResponse.json({
        agents: [
          { id: RETELL_AGENTS.chris, name: 'Chris', role: 'Payer Follow-up', phone: RETELL_PHONES.chris, configured: !!RETELL_AGENTS.chris },
          { id: RETELL_AGENTS.cindy, name: 'Cindy', role: 'AR Collections', phone: RETELL_PHONES.cindy, configured: !!RETELL_AGENTS.cindy },
        ],
        api_configured: !!RETELL_API_KEY,
      })
    }

    // ── Get agent prompt ─────────────────────────────────────────────────────
    if (action === 'get-agent') {
      const agentName = searchParams.get('agent') as 'chris' | 'cindy'
      const agentId = agentName === 'cindy' ? RETELL_AGENTS.cindy : RETELL_AGENTS.chris
      if (!agentId) throw new Error(`Agent ${agentName} not configured`)
      const data = await retellFetch(`/v2/get-agent/${agentId}`)
      return NextResponse.json(data)
    }

    // ── Payer analytics — success rate by payer from call history ────────────
    if (action === 'payer-analytics') {
      const agentId = RETELL_AGENTS.chris
      if (!agentId) return NextResponse.json({ payers: [], fallback: true })

      // Fetch last 200 ended calls for Chris
      const data = await retellFetch('/v2/list-calls', {
        method: 'POST',
        body: JSON.stringify({
          limit: 200,
          filter_criteria: { agent_id: [agentId] },
        }),
      })

      const calls = data.call_list ?? []
      const payerMap: Record<string, { total: number; success: number; failed: number; transcripts: string[] }> = {}

      for (const call of calls) {
        const vars = call.retell_llm_dynamic_variables ?? {}
        const payer = vars['Primary_Carrier_Name'] ?? vars['primary_carrier_name'] ?? 'Unknown'
        if (!payerMap[payer]) payerMap[payer] = { total: 0, success: 0, failed: 0, transcripts: [] }
        payerMap[payer].total++
        if (call.call_analysis?.call_successful) payerMap[payer].success++
        else payerMap[payer].failed++
        if (call.transcript && payerMap[payer].transcripts.length < 10) {
          payerMap[payer].transcripts.push(call.transcript.slice(0, 500))
        }
      }

      const payers = Object.entries(payerMap)
        .map(([name, stats]) => ({
          name,
          total: stats.total,
          success: stats.success,
          failed: stats.failed,
          successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
          hasPlaybookData: stats.transcripts.length >= 3,
        }))
        .sort((a, b) => b.total - a.total)

      return NextResponse.json({ payers })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[Retell API]', err)
    return NextResponse.json({ error: String(err), fallback: true }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  try {
    // ── Single call ──────────────────────────────────────────────────────────
    if (action === 'create-call') {
      const { agent_name, to_number, retell_llm_dynamic_variables } = body
      const agentId = agent_name === 'cindy' ? RETELL_AGENTS.cindy : RETELL_AGENTS.chris
      const fromNumber = agent_name === 'cindy' ? RETELL_PHONES.cindy : RETELL_PHONES.chris
      if (!agentId) throw new Error(`Agent ${agent_name} not configured`)
      const data = await retellFetch('/v2/create-phone-call', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, from_number: fromNumber, to_number, retell_llm_dynamic_variables: retell_llm_dynamic_variables ?? {} }),
      })
      return NextResponse.json(data)
    }

    // ── Batch campaign ───────────────────────────────────────────────────────
    if (action === 'create-batch') {
      const { agent_name, recipients, batch_name } = body
      const agentId = agent_name === 'cindy' ? RETELL_AGENTS.cindy : RETELL_AGENTS.chris
      const fromNumber = agent_name === 'cindy' ? RETELL_PHONES.cindy : RETELL_PHONES.chris
      if (!agentId) throw new Error(`Agent ${agent_name} not configured`)
      const data = await retellFetch('/v2/create-batch-call', {
        method: 'POST',
        body: JSON.stringify({
          from_number: fromNumber,
          name: batch_name,
          tasks: recipients.map((r: { to_number: string; variables?: Record<string, string> }) => ({
            agent_id: agentId,
            to_number: r.to_number,
            retell_llm_dynamic_variables: r.variables ?? {},
          })),
        }),
      })
      return NextResponse.json(data)
    }

    // ── Update agent prompt ───────────────────────────────────────────────────
    if (action === 'update-prompt') {
      const { agent_name, prompt } = body
      const agentId = agent_name === 'cindy' ? RETELL_AGENTS.cindy : RETELL_AGENTS.chris
      if (!agentId) throw new Error(`Agent ${agent_name} not configured`)
      // Retell: PATCH /v2/update-agent/:id with general_prompt
      const data = await retellFetch(`/v2/update-agent/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ general_prompt: prompt }),
      })
      return NextResponse.json(data)
    }

    // ── AI: Analyze calls and suggest prompt improvements ────────────────────
    if (action === 'analyze-calls') {
      const { agent_name, current_prompt, call_transcripts, focus } = body
      // focus: 'general' | 'payer' (with payer_name)
      const payerName = body.payer_name ?? null

      const systemPrompt = `You are an expert medical billing AI prompt engineer.
You analyze real call transcripts from an AI billing agent and suggest specific, actionable improvements to the agent's prompt.
You understand Retell AI's prompt format, IVR navigation, medical billing terminology, and payer-specific behavior.
Return ONLY valid JSON matching the schema specified. No markdown, no explanation outside the JSON.`

      const transcriptBlock = call_transcripts
        .slice(0, 20)
        .map((t: string, i: number) => `--- Call ${i + 1} ---\n${t}`)
        .join('\n\n')

      const userMessage = `Here is the current prompt for agent "${agent_name}":

<current_prompt>
${current_prompt}
</current_prompt>

Here are real call transcripts${payerName ? ` for payer: ${payerName}` : ''}:

<transcripts>
${transcriptBlock}
</transcripts>

${payerName
  ? `Focus specifically on how the agent handles ${payerName}'s IVR and reps. Identify exactly where it gets stuck or fails.`
  : `Analyze overall call performance. Identify patterns in failures vs successes.`}

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence analysis of what's working and what's failing",
  "issues": [
    { "title": "Short issue title", "description": "What's going wrong", "severity": "high|medium|low", "evidence": "Quote from a transcript showing this" }
  ],
  "suggestions": [
    { "section": "Which section of prompt to change e.g. IVR Navigation", "current": "Current text if applicable", "suggested": "New text to use", "rationale": "Why this improves performance" }
  ],
  ${payerName ? `"playbook": "Full payer-specific section to append to the prompt for ${payerName}. Include IVR steps, known pitfalls, what to say/avoid. Written in same style as existing prompt.",` : ''}
  "confidence": "high|medium|low"
}`

      const result = await claudeAnalyze(systemPrompt, userMessage)

      // Parse JSON safely
      const clean = result.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[Retell API]', err)
    return NextResponse.json({ error: String(err), fallback: true }, { status: 502 })
  }
}
