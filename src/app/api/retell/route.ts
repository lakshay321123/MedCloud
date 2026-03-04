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
    throw new Error(`Retell ${res.status}: ${err}`)
  }
  return res.json()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    // ── Active / live calls ──────────────────────────────────────────────
    if (action === 'list-calls') {
      const limit = Number(searchParams.get('limit') ?? '200')
      const agentFilter = searchParams.get('agent') // 'chris' | 'cindy' | null
      const payer = searchParams.get('payer')
      const startDate = searchParams.get('start_date')
      const endDate = searchParams.get('end_date')

      const body: Record<string, unknown> = { limit }
      const filterCriteria: Record<string, unknown> = {}

      if (agentFilter && RETELL_AGENTS[agentFilter as 'chris' | 'cindy']) {
        filterCriteria.agent_id = [RETELL_AGENTS[agentFilter as 'chris' | 'cindy']]
      } else if (!agentFilter) {
        // Return all known agents
        const ids = [RETELL_AGENTS.chris, RETELL_AGENTS.cindy].filter(Boolean)
        if (ids.length > 0) filterCriteria.agent_id = ids
      }
      if (startDate) filterCriteria.start_timestamp = new Date(startDate).getTime()
      if (endDate) filterCriteria.end_timestamp = new Date(endDate).getTime() + 86400000

      if (Object.keys(filterCriteria).length > 0) body.filter_criteria = filterCriteria

      const data = await retellFetch('/v2/list-calls', { method: 'POST', body: JSON.stringify(body) })

      // Client-side payer filter (from dynamic variables)
      let calls = data.call_list ?? []
      if (payer && payer !== 'all') {
        calls = calls.filter((c: Record<string, unknown>) => {
          const vars = (c.retell_llm_dynamic_variables ?? {}) as Record<string, string>
          const p = (vars['primary_carrier_name'] ?? vars['primaryinsurance'] ?? '').toLowerCase()
          return p.includes(payer.toLowerCase())
        })
      }

      // Tag each call with agent name
      calls = calls.map((c: Record<string, unknown>) => ({
        ...c,
        _agent_name: c.agent_id === RETELL_AGENTS.chris ? 'chris'
          : c.agent_id === RETELL_AGENTS.cindy ? 'cindy' : 'unknown',
      }))

      return NextResponse.json({ call_list: calls, total: calls.length })
    }

    // ── Single call detail ───────────────────────────────────────────────
    if (action === 'get-call') {
      const callId = searchParams.get('call_id')
      if (!callId) return NextResponse.json({ error: 'call_id required' }, { status: 400 })
      const data = await retellFetch(`/v2/get-call/${callId}`)
      return NextResponse.json(data)
    }

    // ── Batch campaigns ──────────────────────────────────────────────────
    if (action === 'list-batches') {
      const data = await retellFetch('/v2/list-batches', { method: 'POST', body: JSON.stringify({ limit: 100 }) })
      return NextResponse.json(data)
    }

    // ── Agent config (prompt, name, etc.) ───────────────────────────────
    if (action === 'get-agent') {
      const agentName = searchParams.get('agent') as 'chris' | 'cindy'
      const agentId = RETELL_AGENTS[agentName]
      if (!agentId) return NextResponse.json({ error: `Agent ${agentName} not configured` }, { status: 400 })
      const data = await retellFetch(`/v2/get-agent/${agentId}`)
      return NextResponse.json(data)
    }

    // ── Agents info ──────────────────────────────────────────────────────
    if (action === 'agents') {
      return NextResponse.json({
        agents: [
          { id: RETELL_AGENTS.chris, name: 'Chris', role: 'Payer Follow-up', phone: RETELL_PHONES.chris, configured: !!RETELL_AGENTS.chris },
          { id: RETELL_AGENTS.cindy, name: 'Cindy', role: 'AR Collections', phone: RETELL_PHONES.cindy, configured: !!RETELL_AGENTS.cindy },
        ],
        api_configured: !!RETELL_API_KEY,
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
    // ── Single outbound call ─────────────────────────────────────────────
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

    // ── Batch campaign ───────────────────────────────────────────────────
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

    // ── Update agent prompt ──────────────────────────────────────────────
    if (action === 'update-agent') {
      const { agent_name, general_prompt, agent_name_label } = body
      const agentId = RETELL_AGENTS[agent_name as 'chris' | 'cindy']
      if (!agentId) throw new Error(`Agent ${agent_name} not configured`)
      const payload: Record<string, unknown> = {}
      if (general_prompt !== undefined) payload.general_prompt = general_prompt
      if (agent_name_label !== undefined) payload.agent_name = agent_name_label
      const data = await retellFetch(`/v2/update-agent/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[Retell POST]', err)
    return NextResponse.json({ error: String(err), fallback: true }, { status: 502 })
  }
}
