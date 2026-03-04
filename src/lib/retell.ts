'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types matching Retell API response shapes ─────────────────────────────
export interface RetellCall {
  call_id: string
  agent_id: string
  call_status: 'registered' | 'ongoing' | 'ended' | 'error'
  call_type: 'phone_call' | 'web_call'
  from_number: string
  to_number: string
  start_timestamp?: number
  end_timestamp?: number
  duration_ms?: number
  transcript?: string
  transcript_object?: { role: 'agent' | 'user'; content: string; words?: { word: string; start: number; end: number }[] }[]
  call_analysis?: {
    call_summary?: string
    user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
    agent_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
    call_successful?: boolean
    custom_analysis_data?: Record<string, unknown>
  }
  retell_llm_dynamic_variables?: Record<string, string>
  disconnection_reason?: string
  metadata?: Record<string, unknown>
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

// ─── Client helpers ────────────────────────────────────────────────────────
async function retell(action: string, params: Record<string, string> = {}) {
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

// ─── Hooks ─────────────────────────────────────────────────────────────────
export function useRetellCalls(status?: 'ongoing' | 'ended') {
  const [calls, setCalls] = useState<RetellCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)

  const fetch_ = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: '100' }
      if (status) params.status = status
      const data = await retell('list-calls', params)
      if (data.fallback) { setFallback(true); return }
      setCalls(data.call_list ?? data ?? [])
      setFallback(false)
    } catch (e) {
      setError(String(e))
      setFallback(true)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetch_() }, [fetch_])

  // Poll active calls every 10s
  useEffect(() => {
    if (status !== 'ongoing') return
    const id = setInterval(fetch_, 10000)
    return () => clearInterval(id)
  }, [status, fetch_])

  return { calls, loading, error, fallback, refetch: fetch_ }
}

export function useRetellCall(callId: string | null) {
  const [call, setCall] = useState<RetellCall | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!callId) return
    setLoading(true)
    retell('get-call', { call_id: callId })
      .then(d => setCall(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [callId])

  return { call, loading }
}

export function useRetellBatches() {
  const [batches, setBatches] = useState<RetellBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    retell('list-batches')
      .then(d => {
        if (d.fallback) { setFallback(true); return }
        setBatches(d.batch_list ?? [])
      })
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
    retell('agents')
      .then(d => {
        setAgents(d.agents ?? [])
        setApiConfigured(d.api_configured ?? false)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { agents, apiConfigured, loading }
}

export function useLaunchCall() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launch = useCallback(async (params: {
    agent_name: 'chris' | 'cindy'
    to_number: string
    variables?: Record<string, string>
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await retellPost({
        action: 'create-call',
        agent_name: params.agent_name,
        to_number: params.to_number,
        retell_llm_dynamic_variables: params.variables ?? {},
      })
      return result as RetellCall
    } catch (e) {
      const msg = String(e)
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { launch, loading, error }
}

export function useLaunchBatch() {
  const [loading, setLoading] = useState(false)

  const launch = useCallback(async (params: {
    agent_name: 'chris' | 'cindy'
    batch_name: string
    recipients: { to_number: string; variables?: Record<string, string> }[]
  }) => {
    setLoading(true)
    try {
      return await retellPost({ action: 'create-batch', ...params })
    } finally {
      setLoading(false)
    }
  }, [])

  return { launch, loading }
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

// ─── Payer Analytics ──────────────────────────────────────────────────────────
export interface PayerStat {
  name: string
  total: number
  success: number
  failed: number
  successRate: number
  hasPlaybookData: boolean
}

export function usePayerAnalytics() {
  const [payers, setPayers] = useState<PayerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    fetch('/api/retell?action=payer-analytics')
      .then(r => r.json())
      .then(d => {
        if (d.fallback) { setFallback(true); return }
        setPayers(d.payers ?? [])
      })
      .catch(() => setFallback(true))
      .finally(() => setLoading(false))
  }, [])

  return { payers, loading, fallback }
}

// ─── Agent Prompt ─────────────────────────────────────────────────────────────
export interface RetellAgent {
  agent_id: string
  agent_name: string
  general_prompt: string
  voice_id?: string
  language?: string
  last_modification_timestamp?: number
}

export function useAgentPrompt(agentName: 'chris' | 'cindy' | null) {
  const [agent, setAgent] = useState<RetellAgent | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    if (!agentName) return
    setLoading(true)
    try {
      const r = await fetch(`/api/retell?action=get-agent&agent=${agentName}`)
      const d = await r.json()
      setAgent(d)
    } catch (e) {
      console.error('[useAgentPrompt]', e)
    } finally {
      setLoading(false)
    }
  }, [agentName])

  useEffect(() => { fetch_() }, [fetch_])

  return { agent, loading, refetch: fetch_ }
}

export function useUpdatePrompt() {
  const [loading, setLoading] = useState(false)

  const update = useCallback(async (agentName: 'chris' | 'cindy', prompt: string) => {
    setLoading(true)
    try {
      const r = await fetch('/api/retell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-prompt', agent_name: agentName, prompt }),
      })
      if (!r.ok) throw new Error(await r.text())
      return await r.json()
    } finally {
      setLoading(false)
    }
  }, [])

  return { update, loading }
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────
export interface PromptIssue {
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  evidence: string
}

export interface PromptSuggestion {
  section: string
  current: string
  suggested: string
  rationale: string
}

export interface AnalysisResult {
  summary: string
  issues: PromptIssue[]
  suggestions: PromptSuggestion[]
  playbook?: string
  confidence: 'high' | 'medium' | 'low'
}

export function useAnalyzeCalls() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const analyze = useCallback(async (params: {
    agent_name: 'chris' | 'cindy'
    current_prompt: string
    call_transcripts: string[]
    focus: 'general' | 'payer'
    payer_name?: string
  }) => {
    setLoading(true)
    setResult(null)
    try {
      const r = await fetch('/api/retell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-calls', ...params }),
      })
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      setResult(data)
      return data as AnalysisResult
    } finally {
      setLoading(false)
    }
  }, [])

  return { analyze, loading, result }
}

// ─── Calls by agent name (wraps useRetellCalls) ────────────────────────────────
export function useCallsByAgent(agentName: 'chris' | 'cindy' | null, status?: 'ongoing' | 'ended') {
  const [agentId, setAgentId] = useState<string | null>(null)

  useEffect(() => {
    if (!agentName) return
    fetch('/api/retell?action=agents')
      .then(r => r.json())
      .then(d => {
        const a = d.agents?.find((ag: RetellAgent & {name: string}) => ag.name.toLowerCase() === agentName)
        setAgentId(a?.id ?? null)
      })
      .catch(console.error)
  }, [agentName])

  const [calls, setCalls] = useState<RetellCall[]>([])
  const [loading, setLoading] = useState(true)
  const [nextPageKey, setNextPageKey] = useState<string | null>(null)

  const fetch_ = useCallback(async (pageKey?: string) => {
    if (!agentId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'list-calls', limit: '100', agent_id: agentId })
      if (status) params.set('status', status)
      if (pageKey) params.set('pagination_key', pageKey)
      const r = await fetch(`/api/retell?${params}`)
      const d = await r.json()
      const newCalls = d.call_list ?? []
      setCalls(prev => pageKey ? [...prev, ...newCalls] : newCalls)
      setNextPageKey(d.pagination_key ?? null)
    } catch (e) {
      console.error('[useCallsByAgent]', e)
    } finally {
      setLoading(false)
    }
  }, [agentId, status])

  useEffect(() => { fetch_() }, [fetch_])

  const loadMore = useCallback(() => {
    if (nextPageKey) fetch_(nextPageKey)
  }, [nextPageKey, fetch_])

  return { calls, loading, loadMore, hasMore: !!nextPageKey, refetch: () => fetch_() }
}
