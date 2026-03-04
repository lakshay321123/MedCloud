'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────
export interface RetellCall {
  call_id: string
  agent_id: string
  _agent_name?: 'chris' | 'cindy' | 'unknown'
  call_status: 'registered' | 'ongoing' | 'ended' | 'error'
  call_type: 'phone_call' | 'web_call'
  from_number: string
  to_number: string
  start_timestamp?: number
  end_timestamp?: number
  duration_ms?: number
  transcript?: string
  transcript_object?: { role: 'agent' | 'user'; content: string }[]
  call_analysis?: {
    call_summary?: string
    user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
    agent_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
    call_successful?: boolean
    custom_analysis_data?: Record<string, unknown>
  }
  retell_llm_dynamic_variables?: Record<string, string>
  disconnection_reason?: string
}

export interface RetellBatch {
  batch_id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  total_count: number
  completed_count: number
  failed_count: number
  created_at: number
}

export interface RetellAgent {
  id: string
  name: string
  role: string
  phone: string
  configured: boolean
}

export interface PayerStat {
  payer: string
  total: number
  resolved: number
  failed: number
  successRate: number
  avgDuration: number
  calls: RetellCall[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────
async function retellGet(action: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ action, ...params })
  const res = await fetch(`/api/retell?${qs}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function retellPost(body: Record<string, unknown>) {
  const res = await fetch('/api/retell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function getPayerFromCall(call: RetellCall): string {
  const vars = call.retell_llm_dynamic_variables ?? {}
  return vars['primary_carrier_name'] ?? vars['primaryinsurance'] ?? vars['Primary_Carrier_Name'] ?? 'Unknown'
}

// ─── Hooks ─────────────────────────────────────────────────────────────────
export function useRetellCalls(opts: {
  status?: 'ongoing' | 'ended'
  agent?: 'chris' | 'cindy'
  limit?: number
  startDate?: string
  endDate?: string
} = {}) {
  const [calls, setCalls] = useState<RetellCall[]>([])
  const [loading, setLoading] = useState(true)
  const [fallback, setFallback] = useState(false)

  const fetch_ = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: String(opts.limit ?? 500) }
      if (opts.agent) params.agent = opts.agent
      if (opts.startDate) params.start_date = opts.startDate
      if (opts.endDate) params.end_date = opts.endDate

      const data = await retellGet('list-calls', params)
      if (data.fallback) { setFallback(true); return }

      let list: RetellCall[] = data.call_list ?? []
      if (opts.status) list = list.filter(c => {
        if (opts.status === 'ongoing') return c.call_status === 'ongoing' || c.call_status === 'registered'
        if (opts.status === 'ended') return c.call_status === 'ended' || c.call_status === 'error'
        return true
      })
      setCalls(list)
      setFallback(false)
    } catch {
      setFallback(true)
    } finally {
      setLoading(false)
    }
  }, [opts.agent, opts.status, opts.limit, opts.startDate, opts.endDate])

  useEffect(() => { fetch_() }, [fetch_])

  // Poll live calls every 10s
  useEffect(() => {
    if (opts.status !== 'ongoing') return
    const id = setInterval(fetch_, 10000)
    return () => clearInterval(id)
  }, [opts.status, fetch_])

  return { calls, loading, fallback, refetch: fetch_ }
}

export function useRetellBatches() {
  const [batches, setBatches] = useState<RetellBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    retellGet('list-batches')
      .then(d => { if (d.fallback) { setFallback(true); return }; setBatches(d.batch_list ?? []) })
      .catch(() => setFallback(true))
      .finally(() => setLoading(false))
  }, [])

  return { batches, loading, fallback }
}

export function useRetellAgents() {
  const [agents, setAgents] = useState<RetellAgent[]>([])
  const [apiConfigured, setApiConfigured] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    retellGet('agents')
      .then(d => { setAgents(d.agents ?? []); setApiConfigured(d.api_configured ?? false) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { agents, apiConfigured, loading }
}

export function useAgentPrompt(agentName: 'chris' | 'cindy' | null) {
  const [prompt, setPrompt] = useState<string>('')
  const [agentData, setAgentData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    if (!agentName) return
    setLoading(true)
    try {
      const data = await retellGet('get-agent', { agent: agentName })
      setAgentData(data)
      setPrompt(data.general_prompt ?? data.llm_websocket_url ?? '')
    } catch (e) {
      console.error('Failed to load agent prompt:', e)
    } finally {
      setLoading(false)
    }
  }, [agentName])

  useEffect(() => { fetch_() }, [fetch_])
  return { prompt, agentData, loading, refetch: fetch_, setPrompt }
}

export function useUpdateAgentPrompt() {
  const [loading, setLoading] = useState(false)

  const update = useCallback(async (agentName: 'chris' | 'cindy', newPrompt: string) => {
    setLoading(true)
    try {
      return await retellPost({ action: 'update-agent', agent_name: agentName, general_prompt: newPrompt })
    } finally {
      setLoading(false)
    }
  }, [])

  return { update, loading }
}

export function useLaunchCall() {
  const [loading, setLoading] = useState(false)
  const launch = useCallback(async (params: { agent_name: 'chris' | 'cindy'; to_number: string; variables?: Record<string, string> }) => {
    setLoading(true)
    try {
      return await retellPost({ action: 'create-call', agent_name: params.agent_name, to_number: params.to_number, retell_llm_dynamic_variables: params.variables ?? {} })
    } finally { setLoading(false) }
  }, [])
  return { launch, loading }
}

export function useLaunchBatch() {
  const [loading, setLoading] = useState(false)
  const launch = useCallback(async (params: { agent_name: 'chris' | 'cindy'; batch_name: string; recipients: { to_number: string; variables?: Record<string, string> }[] }) => {
    setLoading(true)
    try {
      return await retellPost({ action: 'create-batch', ...params })
    } finally { setLoading(false) }
  }, [])
  return { launch, loading }
}

// ─── Payer analytics computed from call list ───────────────────────────────
export function computePayerStats(calls: RetellCall[]): PayerStat[] {
  const map = new Map<string, RetellCall[]>()
  for (const call of calls) {
    if (call.call_status !== 'ended') continue
    const payer = getPayerFromCall(call)
    if (!map.has(payer)) map.set(payer, [])
    map.get(payer)!.push(call)
  }

  return Array.from(map.entries())
    .map(([payer, cs]) => {
      const resolved = cs.filter(c => c.call_analysis?.call_successful === true).length
      const failed = cs.filter(c => c.call_analysis?.call_successful === false).length
      const avgDuration = cs.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / cs.length
      return {
        payer,
        total: cs.length,
        resolved,
        failed,
        successRate: cs.length > 0 ? Math.round((resolved / cs.length) * 100) : 0,
        avgDuration,
        calls: cs,
      }
    })
    .filter(p => p.payer !== 'Unknown')
    .sort((a, b) => b.total - a.total)
}

// ─── Formatters ────────────────────────────────────────────────────────────
export function formatDuration(ms?: number): string {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function formatCallStatus(status: RetellCall['call_status']): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    ongoing: { label: 'Live', color: 'text-emerald-500' },
    registered: { label: 'Connecting', color: 'text-blue-500' },
    ended: { label: 'Completed', color: 'text-content-secondary' },
    error: { label: 'Failed', color: 'text-red-500' },
  }
  return map[status] ?? { label: status, color: 'text-content-tertiary' }
}
