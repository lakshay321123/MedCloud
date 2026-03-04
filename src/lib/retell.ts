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
  const data = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw new Error(data.error || `Retell API ${res.status}`)
  return data
}

async function retellPost(body: Record<string, unknown>) {
  const res = await fetch('/api/retell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw new Error(data.error || `Retell API ${res.status}`)
  return data
}

// ─── Hooks ─────────────────────────────────────────────────────────────────
export function useRetellCalls(status?: 'ongoing' | 'ended') {
  const [calls, setCalls] = useState<RetellCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: '100' }
      if (status) params.status = status
      const data = await retell('list-calls', params)
      setCalls(data.call_list ?? data ?? [])
    } catch (e) {
      setError(String(e))
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

  return { calls, loading, error, refetch: fetch_ }
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

  useEffect(() => {
    retell('list-batches')
      .then(d => setBatches(d.batch_list ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { batches, loading }
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
