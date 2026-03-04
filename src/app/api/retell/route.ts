import { NextRequest, NextResponse } from 'next/server'

const RETELL_API_KEY = process.env.RETELL_API_KEY
const RETELL_BASE = 'https://api.retellai.com'

const RETELL_AGENTS = {
  chris: process.env.RETELL_AGENT_CHRIS ?? '',
  cindy: process.env.RETELL_AGENT_CINDY ?? '',
}
const RETELL_PHONES = {
  chris: process.env.RETELL_PHONE_CHRIS ?? '+19499905052',
  cindy: process.env.RETELL_PHONE_CINDY ?? '+19495229502',
}

const RETELL_LLMS = {
  chris: process.env.RETELL_LLM_CHRIS ?? '',
  cindy: process.env.RETELL_LLM_CINDY ?? '',
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
    throw new Error(`Retell ${res.status} ${path}: ${err}`)
  }
  // Retell returns either an array or an object depending on endpoint
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

// Normalize Retell call list — handles both array and {call_list:[]} shapes
function normalizeCallList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.call_list)) return d.call_list as Record<string, unknown>[]
    if (Array.isArray(d.calls)) return d.calls as Record<string, unknown>[]
    // Some endpoints wrap in data key
    if (Array.isArray(d.data)) return d.data as Record<string, unknown>[]
  }
  return []
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    // ── List calls ────────────────────────────────────────────────────────
    if (action === 'list-calls') {
      const limit = Number(searchParams.get('limit') ?? '500')
      const agentFilter = searchParams.get('agent') // 'chris' | 'cindy' | null

      // Fetch without filter_criteria — Retell's filter format varies by version
      // We tag and filter client-side for reliability
      const data = await retellFetch('/v2/list-calls', {
        method: 'POST',
        body: JSON.stringify({ limit }),
      })

      let calls = normalizeCallList(data)

      // Tag each call with _agent_name
      // Match by agent_id first (exact), then fall back to agent_name string
      calls = calls.map((c: Record<string, unknown>) => {
        let agentName: string
        if (c.agent_id === RETELL_AGENTS.chris) {
          agentName = 'chris'
        } else if (c.agent_id === RETELL_AGENTS.cindy) {
          agentName = 'cindy'
        } else {
          // Fallback: match by agent_name field (handles inbound agents, renamed agents, etc.)
          const name = String(c.agent_name ?? '').toLowerCase()
          if (name.includes('chris')) agentName = 'chris'
          else if (name.includes('cindy')) agentName = 'cindy'
          else agentName = 'unknown'
        }
        return { ...c, _agent_name: agentName }
      })

      // Filter by agent if requested
      if (agentFilter === 'chris' || agentFilter === 'cindy') {
        calls = calls.filter((c: Record<string, unknown>) => c._agent_name === agentFilter)
      }

      return NextResponse.json({
        call_list: calls,
        total: calls.length,
        _debug: {
          raw_type: Array.isArray(data) ? 'array' : typeof data,
          raw_keys: data && typeof data === 'object' ? Object.keys(data as object) : [],
          agent_ids_configured: { chris: !!RETELL_AGENTS.chris, cindy: !!RETELL_AGENTS.cindy },
        },
      })
    }

    // ── Get single call ───────────────────────────────────────────────────
    if (action === 'get-call') {
      const callId = searchParams.get('call_id')
      if (!callId) return NextResponse.json({ error: 'call_id required' }, { status: 400 })
      const data = await retellFetch(`/v2/get-call/${callId}`)
      return NextResponse.json(data)
    }

    // ── List batches ──────────────────────────────────────────────────────
    if (action === 'list-batches') {
      const data = await retellFetch('/v2/list-batches', {
        method: 'POST',
        body: JSON.stringify({ limit: 100 }),
      })
      const batches = normalizeCallList(data)
      return NextResponse.json({ batch_list: batches })
    }

    // ── Get agent (for prompt editor) ─────────────────────────────────────
    if (action === 'get-agent') {
      const agentName = searchParams.get('agent') as 'chris' | 'cindy'
      const llmId = RETELL_LLMS[agentName]

      if (!llmId) {
        return NextResponse.json({ error: `RETELL_LLM_${agentName?.toUpperCase()} not set in Vercel env vars` }, { status: 400 })
      }

      const data = await retellFetch(`/v2/get-retell-llm/${llmId}`)
      return NextResponse.json({ general_prompt: data.general_prompt ?? '', llm_id: llmId, ...data })
    }

    // ── List all agents (to discover correct agent IDs) ───────────────────
    if (action === 'list-agents') {
      const data = await retellFetch('/v2/list-agents')
      return NextResponse.json(data)
    }

    // ── Agent info ────────────────────────────────────────────────────────
    if (action === 'agents') {
      return NextResponse.json({
        agents: [
          { id: RETELL_AGENTS.chris, name: 'Chris', role: 'Payer Follow-up', phone: RETELL_PHONES.chris, configured: !!RETELL_AGENTS.chris },
          { id: RETELL_AGENTS.cindy, name: 'Cindy', role: 'AR Collections', phone: RETELL_PHONES.cindy, configured: !!RETELL_AGENTS.cindy },
        ],
        api_configured: !!RETELL_API_KEY,
      })
    }

    // ── Debug: raw API response ───────────────────────────────────────────
    if (action === 'debug') {
      const data = await retellFetch('/v2/list-calls', {
        method: 'POST',
        body: JSON.stringify({ limit: 2 }),
      })
      return NextResponse.json({
        raw: data,
        type: Array.isArray(data) ? 'array' : typeof data,
        keys: data && typeof data === 'object' ? Object.keys(data as object) : [],
        agent_ids: RETELL_AGENTS,
        api_key_set: !!RETELL_API_KEY,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('[Retell GET]', err)
    return NextResponse.json({ error: String(err), fallback: true }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  try {
    // ── Single call ───────────────────────────────────────────────────────
    if (action === 'create-call') {
      const { agent_name, to_number, retell_llm_dynamic_variables } = body
      const agentId = RETELL_AGENTS[agent_name as 'chris' | 'cindy']
      const fromNumber = RETELL_PHONES[agent_name as 'chris' | 'cindy']
      if (!agentId) throw new Error(`Agent ${agent_name} not configured`)
      const data = await retellFetch('/v2/create-phone-call', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, from_number: fromNumber, to_number, retell_llm_dynamic_variables: retell_llm_dynamic_variables ?? {} }),
      })
      return NextResponse.json(data)
    }

    // ── Batch campaign ────────────────────────────────────────────────────
    if (action === 'create-batch') {
      const { agent_name, recipients, batch_name } = body
      const agentId = RETELL_AGENTS[agent_name as 'chris' | 'cindy']
      const fromNumber = RETELL_PHONES[agent_name as 'chris' | 'cindy']
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

    // ── Update agent prompt ───────────────────────────────────────────────
    if (action === 'update-agent') {
      const { agent_name, general_prompt } = body
      const llmId = RETELL_LLMS[agent_name as 'chris' | 'cindy']
      if (!llmId) throw new Error(`RETELL_LLM_${agent_name?.toUpperCase()} not set in Vercel env vars`)
      const data = await retellFetch(`/v2/update-retell-llm/${llmId}`, {
        method: 'PATCH',
        body: JSON.stringify({ general_prompt }),
      })
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('[Retell POST]', err)
    return NextResponse.json({ error: String(err), fallback: true }, { status: 502 })
  }
}
