import { NextRequest, NextResponse } from 'next/server'

const RETELL_API_KEY = process.env.RETELL_API_KEY
const RETELL_BASE = 'https://api.retellai.com'

// Agent IDs from Retell dashboard — set in Vercel env vars
const RETELL_AGENTS = {
  chris: process.env.RETELL_AGENT_CHRIS ?? '', // Payer follow-up
  cindy: process.env.RETELL_AGENT_CINDY ?? '', // AR collections
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'list-calls') {
      // GET /v2/list-calls — paginated call history
      const limit = searchParams.get('limit') ?? '100'
      const filterStatus = searchParams.get('status') // ongoing | ended
      const agentId = searchParams.get('agent_id')

      const body: Record<string, unknown> = { limit: Number(limit) }
      if (filterStatus) body.filter_criteria = { call_status: [filterStatus] }
      if (agentId) body.filter_criteria = { ...(body.filter_criteria as object ?? {}), agent_id: [agentId] }

      const data = await retellFetch('/v2/list-calls', {
        method: 'POST', // Retell uses POST for listing with filters
        body: JSON.stringify(body),
      })
      return NextResponse.json(data)
    }

    if (action === 'get-call') {
      const callId = searchParams.get('call_id')
      if (!callId) return NextResponse.json({ error: 'call_id required' }, { status: 400 })
      const data = await retellFetch(`/v2/get-call/${callId}`)
      return NextResponse.json(data)
    }

    if (action === 'list-batches') {
      const data = await retellFetch('/v2/list-batches', { method: 'POST', body: JSON.stringify({ limit: 50 }) })
      return NextResponse.json(data)
    }

    if (action === 'agents') {
      // Return configured agents (without exposing full API key)
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
    console.error('[Retell API]', err)
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  try {
    if (action === 'create-call') {
      // Launch a single outbound call
      const { agent_name, to_number, retell_llm_dynamic_variables } = body
      const agentId = agent_name === 'cindy' ? RETELL_AGENTS.cindy : RETELL_AGENTS.chris
      const fromNumber = agent_name === 'cindy' ? RETELL_PHONES.cindy : RETELL_PHONES.chris

      if (!agentId) throw new Error(`Agent ${agent_name} not configured (add RETELL_AGENT_${agent_name?.toUpperCase()} to Vercel env)`)

      const data = await retellFetch('/v2/create-phone-call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: agentId,
          from_number: fromNumber,
          to_number,
          retell_llm_dynamic_variables: retell_llm_dynamic_variables ?? {},
        }),
      })
      return NextResponse.json(data)
    }

    if (action === 'create-batch') {
      // Launch a batch campaign
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

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[Retell API]', err)
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
