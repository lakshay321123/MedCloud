'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import {
  Phone, PhoneCall, PhoneMissed, Clock, X, ChevronRight, ChevronDown,
  Plus, Edit2, Zap, BarChart2, Settings2, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, ExternalLink,
  PhoneOutgoing, Activity, Upload, FileSpreadsheet, Trash2, Eye,
  Brain, Sparkles, TrendingUp, TrendingDown, Save, RotateCcw,
  AlertCircle, Filter, Calendar, User, Building2,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import {
  useRetellCalls, useRetellBatches, useRetellAgents, useLaunchCall, useLaunchBatch,
  useAgentPrompt, useUpdateAgentPrompt, computePayerStats,
  formatDuration, formatCallStatus, RetellCall, PayerStat,
} from '@/lib/retell'
import { parseRetellExcel, ExcelParseResult } from '@/lib/retell-excel'

// ─── Shared: Status Dot ──────────────────────────────────────────────────────
function StatusDot({ status }: { status: RetellCall['call_status'] }) {
  const map: Record<string, string> = {
    ongoing: 'bg-emerald-500 animate-pulse',
    registered: 'bg-blue-500 animate-pulse',
    ended: 'bg-gray-400',
    error: 'bg-red-500',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] ?? 'bg-gray-400'}`} />
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment || sentiment === 'Unknown') return null
  const c = sentiment === 'Positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : sentiment === 'Negative' ? 'bg-red-500/10 text-red-500'
    : 'bg-gray-500/10 text-content-secondary'
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c}`}>{sentiment}</span>
}

function AgentBadge({ agent }: { agent?: string }) {
  if (!agent) return null
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
      agent === 'chris' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
    }`}>
      {agent === 'chris' ? 'Chris' : 'Cindy'}
    </span>
  )
}

// ─── Call Detail Drawer ───────────────────────────────────────────────────────
function CallDetailDrawer({ call, onClose }: { call: RetellCall; onClose: () => void }) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const isActive = call.call_status === 'ongoing' || call.call_status === 'registered'
  const { label: statusLabel, color: statusColor } = formatCallStatus(call.call_status)
  const analysis = call.call_analysis
  const vars = call.retell_llm_dynamic_variables ?? {}

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [])

  const lines = call.transcript_object ?? (call.transcript
    ? call.transcript.split('\n').filter(Boolean).map(l => ({
        role: l.startsWith('Agent:') ? 'agent' : 'user' as 'agent' | 'user',
        content: l.replace(/^(Agent|User):/, '').trim(),
      }))
    : [])

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl animate-fade-in">
      <div className="p-4 border-b border-separator flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={call.call_status} />
            <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
            <AgentBadge agent={call._agent_name} />
            {analysis?.call_successful === true && <CheckCircle size={13} className="text-emerald-500" />}
            {analysis?.call_successful === false && <XCircle size={13} className="text-red-500" />}
          </div>
          <p className="text-xs text-content-secondary font-mono">{call.to_number}</p>
          {vars['patient_name'] && <p className="text-[10px] text-content-tertiary mt-0.5">{vars['patient_name']}</p>}
          {vars['primary_carrier_name'] && <p className="text-[10px] text-brand mt-0.5">{vars['primary_carrier_name']}</p>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn transition-colors">
          <X size={16} className="text-content-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 grid grid-cols-3 gap-3 border-b border-separator">
          {[
            { label: 'Duration', value: formatDuration(call.duration_ms) },
            { label: 'Sentiment', value: analysis?.user_sentiment ?? '—' },
            { label: 'Outcome', value: analysis?.call_successful ? 'Resolved' : call.call_status === 'ended' ? 'Ended' : '…' },
          ].map(s => (
            <div key={s.label} className="bg-surface-elevated rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-content-tertiary mb-1">{s.label}</p>
              <p className="text-xs font-semibold text-content-primary">{s.value}</p>
            </div>
          ))}
        </div>

        {analysis?.call_summary && (
          <div className="p-4 border-b border-separator">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">AI Summary</h4>
            <p className="text-xs text-content-primary leading-relaxed">{analysis.call_summary}</p>
          </div>
        )}

        <div className="p-4 border-b border-separator">
          <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Transcript</h4>
          <div ref={transcriptRef} className="bg-surface-elevated rounded-lg p-3 h-52 overflow-y-auto text-[11px] space-y-2">
            {lines.length > 0 ? lines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className={`shrink-0 font-semibold w-8 ${line.role === 'agent' ? 'text-brand' : 'text-content-secondary'}`}>
                  [{line.role === 'agent' ? 'AI' : 'Rep'}]
                </span>
                <span className="text-content-primary leading-relaxed">{line.content}</span>
              </div>
            )) : (
              <span className="text-content-tertiary">{isActive ? 'Call in progress…' : 'No transcript available'}</span>
            )}
            {isActive && <div className="flex gap-2"><span className="text-brand font-semibold">[AI]</span><span className="w-2 h-3 bg-brand animate-pulse rounded-sm inline-block mt-0.5" /></div>}
          </div>
        </div>

        {Object.keys(vars).length > 0 && (
          <div className="p-4 border-b border-separator">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Call Context</h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {Object.entries(vars).slice(0, 15).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs gap-2">
                  <span className="text-content-tertiary capitalize shrink-0">{k.replace(/_/g, ' ')}</span>
                  <span className="text-content-primary font-medium text-right truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {call.disconnection_reason && (
          <div className="p-4">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-1">Disconnection</h4>
            <p className="text-xs text-content-secondary">{call.disconnection_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 1: Live Calls ────────────────────────────────────────────────────────
function ActiveCallsTab() {
  const { calls, loading, fallback, refetch } = useRetellCalls({ status: 'ongoing' })
  const { calls: allCalls } = useRetellCalls({ limit: 500 })
  const [selected, setSelected] = useState<RetellCall | null>(null)

  const todayCalls = allCalls.filter(c => c.start_timestamp && Date.now() - c.start_timestamp < 86400000)
  const successRate = todayCalls.length > 0 ? Math.round(todayCalls.filter(c => c.call_analysis?.call_successful).length / todayCalls.length * 100) : 0
  const avgDuration = todayCalls.length > 0 ? formatDuration(todayCalls.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / todayCalls.length) : '—'

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <KPICard label="Calls Today" value={todayCalls.length} icon={<Phone size={20} />} />
          <KPICard label="Live Now" value={calls.length} icon={<Activity size={20} />} />
          <KPICard label="Avg Duration" value={avgDuration} icon={<Clock size={20} />} />
          <KPICard label="Success Rate" value={`${successRate}%`} icon={<CheckCircle size={20} />} />
        </div>
        <button onClick={refetch} className="p-2 hover:bg-surface-elevated rounded-btn text-content-secondary transition-colors"><RefreshCw size={15} /></button>
      </div>

      {fallback && <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle size={13} />Demo mode — add RETELL_API_KEY to Vercel</div>}

      {loading ? <div className="card p-12 text-center text-sm text-content-tertiary">Loading…</div>
        : calls.length === 0 ? (
          <div className="card p-12 text-center">
            <Phone size={32} className="mx-auto mb-3 text-content-tertiary opacity-40" />
            <p className="text-sm text-content-secondary">No active calls right now</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3 w-8"></th>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr></thead>
              <tbody>
                {calls.map(call => {
                  const { label, color } = formatCallStatus(call.call_status)
                  return (
                    <tr key={call.call_id} onClick={() => setSelected(call)} className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors">
                      <td className="px-4 py-3"><StatusDot status={call.call_status} /></td>
                      <td className="px-4 py-3"><AgentBadge agent={call._agent_name} /></td>
                      <td className="px-4 py-3 font-mono text-xs">{call.to_number}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatDuration(call.duration_ms)}</td>
                      <td className="px-4 py-3 text-xs font-medium"><span className={color}>{label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      {selected && <><div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} /><CallDetailDrawer call={selected} onClose={() => setSelected(null)} /></>}
    </div>
  )
}

// ─── TAB 2: Call Log ──────────────────────────────────────────────────────────
function CallLogTab() {
  const [agentFilter, setAgentFilter] = useState<'all' | 'chris' | 'cindy'>('all')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [payerFilter, setPayerFilter] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const [debugging, setDebugging] = useState(false)

  async function runDebug() {
    setDebugging(true)
    try {
      const res = await fetch('/api/retell?action=debug')
      const data = await res.json()
      setDebugInfo(data)
    } catch (e) { setDebugInfo({ error: String(e) }) }
    finally { setDebugging(false) }
  }
  const [selected, setSelected] = useState<RetellCall | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  const { calls, loading, fallback, refetch } = useRetellCalls({
    status: 'ended',
    agent: agentFilter === 'all' ? undefined : agentFilter,
    limit: 500,
  })

  // Extract unique payers
  const payers = Array.from(new Set(
    calls.map(c => c.retell_llm_dynamic_variables?.['primary_carrier_name'] ?? c.retell_llm_dynamic_variables?.['primaryinsurance'] ?? '').filter(Boolean)
  )).sort()

  const filtered = calls.filter(c => {
    if (outcomeFilter === 'success' && !c.call_analysis?.call_successful) return false
    if (outcomeFilter === 'failed' && c.call_analysis?.call_successful !== false) return false
    if (payerFilter) {
      const p = (c.retell_llm_dynamic_variables?.['primary_carrier_name'] ?? c.retell_llm_dynamic_variables?.['primaryinsurance'] ?? '').toLowerCase()
      if (!p.includes(payerFilter.toLowerCase())) return false
    }
    if (dateRange.start && c.start_timestamp) {
      if (c.start_timestamp < new Date(dateRange.start).getTime()) return false
    }
    if (dateRange.end && c.start_timestamp) {
      if (c.start_timestamp > new Date(dateRange.end).getTime() + 86400000) return false
    }
    return true
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // Reset page on filter change
  useEffect(() => setPage(0), [agentFilter, outcomeFilter, payerFilter, dateRange.start, dateRange.end])

  const chrisCount = calls.filter(c => c._agent_name === 'chris').length
  const cindyCount = calls.filter(c => c._agent_name === 'cindy').length

  return (
    <div className="space-y-4">
      {/* Agent tabs */}
      <div className="flex items-center gap-1 border-b border-separator pb-0">
        {[
          { key: 'all', label: `All (${calls.length})` },
          { key: 'chris', label: `Chris (${chrisCount})` },
          { key: 'cindy', label: `Cindy (${cindyCount})` },
        ].map(t => (
          <button key={t.key} onClick={() => setAgentFilter(t.key as typeof agentFilter)}
            className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              agentFilter === t.key ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}>{t.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <button onClick={refetch} className="p-1.5 hover:bg-surface-elevated rounded text-content-secondary transition-colors"><RefreshCw size={13} /></button>
          <button onClick={runDebug} disabled={debugging} className="text-[10px] px-2 py-1 border border-separator rounded text-content-tertiary hover:text-content-secondary hover:bg-surface-elevated disabled:opacity-40 transition-colors">
            {debugging ? '…' : 'Debug API'}
          </button>
          {fallback && <span className="text-[10px] text-amber-500 flex items-center gap-1"><AlertTriangle size={11} />Demo</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Outcomes</option>
          <option value="success">Resolved</option>
          <option value="failed">Failed</option>
        </select>
        <select value={payerFilter} onChange={e => setPayerFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Payers</option>
          {payers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="date" value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary" />
        <input type="date" value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary" />
        {(outcomeFilter || payerFilter || dateRange.start || dateRange.end) && (
          <button onClick={() => { setOutcomeFilter(''); setPayerFilter(''); setDateRange({ start: '', end: '' }) }}
            className="text-xs text-content-tertiary hover:text-red-500 px-2 transition-colors">✕ Clear</button>
        )}
        <span className="ml-auto text-xs text-content-tertiary self-center">{filtered.length} calls</span>
      </div>

      {/* Debug panel */}
      {debugInfo && (
        <div className="card p-4 border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">API Debug Response</p>
            <button onClick={() => setDebugInfo(null)} className="text-[10px] text-content-tertiary hover:text-content-secondary">✕</button>
          </div>
          <pre className="text-[10px] text-content-secondary font-mono bg-surface-elevated p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {loading ? <div className="card p-12 text-center text-sm text-content-tertiary">Loading…</div> : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3">Payer</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Outcome</th>
                <th className="text-left px-4 py-3">Sentiment</th>
                <th className="text-left px-4 py-3 max-w-[200px]">Summary</th>
              </tr></thead>
              <tbody>
                {paginated.map(call => {
                  const vars = call.retell_llm_dynamic_variables ?? {}
                  const payer = vars['primary_carrier_name'] ?? vars['primaryinsurance'] ?? '—'
                  return (
                    <tr key={call.call_id} onClick={() => setSelected(call)}
                      className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors">
                      <td className="px-4 py-3 text-xs text-content-secondary whitespace-nowrap">
                        {call.start_timestamp ? new Date(call.start_timestamp).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3"><AgentBadge agent={call._agent_name} /></td>
                      <td className="px-4 py-3 font-mono text-xs">{call.to_number}</td>
                      <td className="px-4 py-3 text-xs text-content-secondary">{payer}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatDuration(call.duration_ms)}</td>
                      <td className="px-4 py-3">
                        {call.call_analysis?.call_successful === true
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Resolved</span>
                          : call.call_analysis?.call_successful === false
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Failed</span>
                          : <span className="text-[10px] text-content-tertiary">—</span>}
                      </td>
                      <td className="px-4 py-3"><SentimentBadge sentiment={call.call_analysis?.user_sentiment} /></td>
                      <td className="px-4 py-3 text-xs text-content-secondary max-w-[200px] truncate">
                        {call.call_analysis?.call_summary ?? '—'}
                      </td>
                    </tr>
                  )
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-content-tertiary">No calls match filters</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-xs px-3 py-1.5 border border-separator rounded-lg disabled:opacity-40 hover:bg-surface-elevated transition-colors">← Prev</button>
              <span className="text-xs text-content-secondary">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="text-xs px-3 py-1.5 border border-separator rounded-lg disabled:opacity-40 hover:bg-surface-elevated transition-colors">Next →</button>
            </div>
          )}
        </>
      )}
      {selected && <><div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} /><CallDetailDrawer call={selected} onClose={() => setSelected(null)} /></>}
    </div>
  )
}

// ─── TAB 3: Campaign Launcher ─────────────────────────────────────────────────
function CampaignLauncherTab() {
  const { toast } = useToast()
  const { agents, apiConfigured } = useRetellAgents()
  const { batches, loading: batchLoading, fallback } = useRetellBatches()
  const { launch: launchBatch, loading: launching } = useLaunchBatch()
  const { launch: launchCall, loading: singleLoading } = useLaunchCall()
  const [mode, setMode] = useState<'excel' | 'single'>('excel')
  const [agentKey, setAgentKey] = useState<'chris' | 'cindy'>('cindy')
  const [parsed, setParsed] = useState<ExcelParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [filterPractice, setFilterPractice] = useState('all')
  const [singleNumber, setSingleNumber] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const filteredRows = parsed ? (filterPractice === 'all' ? parsed.rows
    : parsed.rows.filter(r => (r.variables['practicename'] ?? r.variables['practice_name'] ?? '') === filterPractice)) : []

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setParsing(true); setParsed(null)
    try {
      const result = await parseRetellExcel(file)
      setParsed(result)
      if (result.agentDetected) setAgentKey(result.agentDetected)
      toast[result.errors.length > 0 ? 'warning' : 'success'](`${result.rows.length} contacts ready — ${result.errors.length} skipped`)
    } catch (err) { toast.error(`Parse failed: ${err}`) }
    finally { setParsing(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleLaunchBatch() {
    if (!filteredRows.length) { toast.error('No rows'); return }
    try {
      await launchBatch({ agent_name: agentKey, batch_name: parsed?.fileName.replace(/\.xlsx?/, '') ?? 'Campaign', recipients: filteredRows.map(r => ({ to_number: r.phone, variables: r.variables })) })
      toast.success(`${filteredRows.length} calls queued`)
      setParsed(null)
    } catch (err) { toast.error(`Launch failed: ${err}`) }
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-2 space-y-3">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Past Campaigns {fallback && <span className="text-amber-500 normal-case font-normal">(demo)</span>}</h3>
        {batchLoading ? <div className="text-xs text-content-tertiary p-4">Loading…</div>
          : batches.length === 0 ? <div className="card p-6 text-center text-xs text-content-tertiary">No campaigns yet</div>
          : batches.map(b => (
            <div key={b.batch_id} className="card p-4">
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-sm font-semibold text-content-primary truncate pr-2">{b.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${b.status === 'running' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : b.status === 'completed' ? 'bg-brand/10 text-brand' : 'bg-amber-500/10 text-amber-500'}`}>{b.status}</span>
              </div>
              <p className="text-[10px] text-content-secondary">{b.completed_count}/{b.total_count} completed{b.failed_count > 0 ? ` · ${b.failed_count} failed` : ''}</p>
              {b.status === 'running' && <div className="mt-2 h-1.5 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${Math.round(b.completed_count / b.total_count * 100)}%` }} /></div>}
            </div>
          ))}
      </div>

      <div className="col-span-3 card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">Launch Calls</h3>
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-0.5">
            {(['excel', 'single'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === m ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'}`}>
                {m === 'excel' ? '📊 Excel Upload' : '📞 Single Call'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {(['cindy', 'chris'] as const).map(a => {
            const live = agents.find(ag => ag.name.toLowerCase() === a)
            return (
              <button key={a} onClick={() => { setAgentKey(a); setParsed(null) }}
                className={`flex-1 p-3 rounded-lg border text-left transition-all ${agentKey === a ? 'border-brand/40 bg-brand/5' : 'border-separator hover:border-brand/20'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full ${live?.configured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="text-xs font-semibold text-content-primary capitalize">{a}</span>
                </div>
                <p className="text-[10px] text-content-tertiary">{a === 'cindy' ? 'Patient AR Collections' : 'Payer Follow-up'}</p>
              </button>
            )
          })}
        </div>

        {mode === 'excel' ? (
          !parsed ? (
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-brand/30 rounded-xl p-8 text-center cursor-pointer hover:border-brand/60 hover:bg-brand/5 transition-all group">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              <FileSpreadsheet size={32} className="mx-auto mb-3 text-brand/40 group-hover:text-brand/60 transition-colors" />
              {parsing ? <p className="text-sm text-content-secondary">Parsing…</p> : (
                <>
                  <p className="text-sm font-medium text-content-primary mb-1">Drop Excel file or click to browse</p>
                  <p className="text-xs text-content-tertiary">.xlsx · same format as your existing Retell campaigns</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold text-content-primary">{parsed.fileName}</p>
                    <p className="text-[10px] text-content-secondary">{parsed.rows.length} contacts · {parsed.columns.length} columns{parsed.agentDetected && <span className="text-brand ml-1">· {parsed.agentDetected} format</span>}</p>
                  </div>
                </div>
                <button onClick={() => setParsed(null)} className="p-1 hover:bg-surface-elevated rounded text-content-tertiary hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>

              {parsed.practiceNames.length > 1 && (
                <select value={filterPractice} onChange={e => setFilterPractice(e.target.value)}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-primary">
                  <option value="all">All Practices ({parsed.rows.length})</option>
                  {parsed.practiceNames.map(p => { const cnt = parsed.rows.filter(r => (r.variables['practicename'] ?? '') === p).length; return <option key={p} value={p}>{p} ({cnt})</option> })}
                </select>
              )}

              <div className="border border-separator rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-surface-elevated border-b border-separator flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-content-secondary uppercase tracking-wide">Preview — {filteredRows.length} calls</span>
                  <Eye size={12} className="text-content-tertiary" />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-surface-secondary">
                      <tr className="border-b border-separator text-content-tertiary">
                        <th className="text-left px-3 py-1.5">#</th>
                        <th className="text-left px-3 py-1.5">Phone</th>
                        {agentKey === 'cindy' ? <><th className="text-left px-3 py-1.5">Patient</th><th className="text-left px-3 py-1.5">Balance</th><th className="text-left px-3 py-1.5">Aging</th></>
                          : <><th className="text-left px-3 py-1.5">Patient</th><th className="text-left px-3 py-1.5">Payer</th><th className="text-left px-3 py-1.5">Charge</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                          <td className="px-3 py-1.5 text-content-tertiary">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono">{row.phone}</td>
                          {agentKey === 'cindy' ? (
                            <><td className="px-3 py-1.5">{[row.variables['patientfirstname'], row.variables['patientlastname']].filter(Boolean).join(' ') || '—'}</td>
                            <td className="px-3 py-1.5 text-emerald-600 dark:text-emerald-400 font-medium">{row.variables['patientbalance'] ? `$${Number(row.variables['patientbalance']).toLocaleString()}` : '—'}</td>
                            <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${row.variables['aginggroup']?.includes('180') ? 'bg-red-500/10 text-red-500' : 'bg-surface-elevated text-content-secondary'}`}>{row.variables['aginggroup'] || '—'}</span></td></>
                          ) : (
                            <><td className="px-3 py-1.5">{row.variables['patient_name'] || '—'}</td>
                            <td className="px-3 py-1.5">{row.variables['primary_carrier_name'] || '—'}</td>
                            <td className="px-3 py-1.5 font-medium">{row.variables['total_charge'] ? `$${Number(row.variables['total_charge']).toLocaleString()}` : '—'}</td></>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={handleLaunchBatch} disabled={launching || !filteredRows.length}
                className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 transition-colors">
                <Zap size={14} className="inline mr-2" />{launching ? 'Queuing…' : `Launch ${filteredRows.length} Calls via ${agentKey === 'cindy' ? 'Cindy' : 'Chris'}`}
              </button>
            </div>
          )
        ) : (
          <div className="flex gap-2">
            <input value={singleNumber} onChange={e => setSingleNumber(e.target.value)} placeholder="+1 (702) 555-0000"
              className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
            <button onClick={async () => { try { await launchCall({ agent_name: agentKey, to_number: singleNumber }); toast.success('Call initiated'); setSingleNumber('') } catch (e) { toast.error(`${e}`) } }}
              disabled={singleLoading || !singleNumber}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-deep disabled:opacity-40 transition-colors whitespace-nowrap">
              <PhoneOutgoing size={14} className="inline mr-1.5" />{singleLoading ? 'Calling…' : 'Call Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 4: Payer Intelligence ─────────────────────────────────────────────────
function PayerIntelligenceTab() {
  const { toast } = useToast()
  const { calls, loading } = useRetellCalls({ agent: 'chris', limit: 500 })
  const [selectedPayer, setSelectedPayer] = useState<PayerStat | null>(null)
  const [generating, setGenerating] = useState(false)
  const [playbook, setPlaybook] = useState<string>('')
  const [pushing, setPushing] = useState(false)
  const { update: updateAgent } = useUpdateAgentPrompt()
  const { prompt: currentPrompt, refetch: refetchPrompt } = useAgentPrompt('chris')

  const stats = computePayerStats(calls)

  async function generatePlaybook(payer: PayerStat) {
    setGenerating(true)
    setPlaybook('')
    try {
      // Sample up to 30 transcripts for this payer
      const sampleCalls = payer.calls.slice(0, 30)
      const transcripts = sampleCalls.map(c => {
        const outcome = c.call_analysis?.call_successful ? 'RESOLVED' : 'FAILED'
        const summary = c.call_analysis?.call_summary ?? ''
        const transcript = c.transcript ?? c.transcript_object?.map(l => `${l.role.toUpperCase()}: ${l.content}`).join('\n') ?? ''
        return `--- CALL ${outcome} (${formatDuration(c.duration_ms)}) ---\nSummary: ${summary}\n${transcript}\n`
      }).join('\n')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: `You are an expert medical billing AI analyst. You analyze real call transcripts between an AI billing agent (Chris) and insurance company representatives to identify payer-specific patterns and create actionable IVR navigation playbooks.

Output ONLY the playbook section in markdown format — no preamble, no explanation. Write it as a section to be inserted directly into Chris's system prompt.`,
          messages: [{
            role: 'user',
            content: `Analyze these ${sampleCalls.length} call transcripts with ${payer.payer} (success rate: ${payer.successRate}%). 

${transcripts}

Based on these real calls, write a payer-specific playbook section for ${payer.payer} that covers:
1. IVR navigation sequence (exact button presses and menu paths)
2. What commonly causes failures / where Chris gets stuck
3. What to do / not do when navigating ${payer.payer}'s system
4. Any special phrases, holds, or transfers specific to this payer

Format as:
# Payer-Specific Rules → ${payer.payer}
[your analysis here]

Be specific and actionable. Reference exact patterns from the transcripts.`
          }],
        }),
      })

      const data = await response.json()
      const text = data.content?.[0]?.text ?? ''
      setPlaybook(text)
    } catch (err) {
      toast.error(`Generation failed: ${err}`)
    } finally {
      setGenerating(false)
    }
  }

  async function pushPlaybook() {
    if (!playbook || !selectedPayer) return
    setPushing(true)
    try {
      // Append playbook to existing prompt, replacing any existing section for this payer
      const payerHeader = `# Payer-Specific Rules → ${selectedPayer.payer}`
      let newPrompt = currentPrompt
      // Remove existing section if present
      const existingIdx = newPrompt.indexOf(payerHeader)
      if (existingIdx !== -1) {
        const nextSection = newPrompt.indexOf('\n# ', existingIdx + 1)
        newPrompt = nextSection !== -1
          ? newPrompt.slice(0, existingIdx) + newPrompt.slice(nextSection)
          : newPrompt.slice(0, existingIdx)
      }
      newPrompt = newPrompt.trimEnd() + '\n\n' + playbook
      await updateAgent('chris', newPrompt)
      await refetchPrompt()
      toast.success(`${selectedPayer.payer} playbook pushed to Chris live`)
      setPlaybook('')
    } catch (err) {
      toast.error(`Push failed: ${err}`)
    } finally {
      setPushing(false)
    }
  }

  if (loading) return <div className="card p-12 text-center text-sm text-content-tertiary">Loading call data…</div>

  return (
    <div className="grid grid-cols-5 gap-5">
      {/* Payer table */}
      <div className="col-span-2">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Payer Performance — Chris</h3>
        {stats.length === 0 ? (
          <div className="card p-8 text-center text-xs text-content-tertiary">
            No call data yet — launch Chris campaigns to see payer analytics
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-[10px] text-content-secondary">
                <th className="text-left px-4 py-2.5">Payer</th>
                <th className="text-left px-4 py-2.5">Calls</th>
                <th className="text-left px-4 py-2.5">Rate</th>
                <th className="text-left px-4 py-2.5">Avg</th>
              </tr></thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s.payer} onClick={() => { setSelectedPayer(s); setPlaybook('') }}
                    className={`border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors ${selectedPayer?.payer === s.payer ? 'bg-brand/5' : ''}`}>
                    <td className="px-4 py-3 text-xs font-medium">{s.payer}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{s.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.successRate >= 70 ? 'bg-emerald-500' : s.successRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${s.successRate}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${s.successRate >= 70 ? 'text-emerald-500' : s.successRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{s.successRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDuration(s.avgDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Playbook panel */}
      <div className="col-span-3 space-y-4">
        {!selectedPayer ? (
          <div className="card p-12 text-center">
            <Brain size={32} className="mx-auto mb-3 text-content-tertiary opacity-40" />
            <p className="text-sm text-content-secondary">Select a payer to generate its IVR playbook</p>
            <p className="text-xs text-content-tertiary mt-1">AI reads all call transcripts for that payer and writes navigation rules</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-content-primary">{selectedPayer.payer}</h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  {selectedPayer.total} calls · {selectedPayer.successRate}% success · {formatDuration(selectedPayer.avgDuration)} avg
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedPayer.successRate < 50 && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
                    <AlertCircle size={11} />Needs playbook
                  </span>
                )}
              </div>
            </div>

            {/* Sample failures */}
            <div className="card p-4">
              <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-3">Recent Failures</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedPayer.calls.filter(c => c.call_analysis?.call_successful === false).slice(0, 5).map(c => (
                  <div key={c.call_id} className="text-xs text-content-secondary bg-surface-elevated rounded p-2">
                    <span className="text-red-500 font-medium mr-2">✗</span>
                    {c.call_analysis?.call_summary ?? c.disconnection_reason ?? 'No summary'}
                  </div>
                ))}
                {selectedPayer.calls.filter(c => c.call_analysis?.call_successful === false).length === 0 && (
                  <p className="text-xs text-content-tertiary">No failures recorded</p>
                )}
              </div>
            </div>

            {!playbook ? (
              <button onClick={() => generatePlaybook(selectedPayer)} disabled={generating}
                className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand-deep disabled:opacity-60 transition-colors">
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing {selectedPayer.total} calls…
                  </span>
                ) : (
                  <span><Sparkles size={14} className="inline mr-2" />Generate {selectedPayer.payer} Playbook with AI</span>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">Generated Playbook</h4>
                  <button onClick={() => setPlaybook('')} className="text-[10px] text-content-tertiary hover:text-content-secondary transition-colors">Discard</button>
                </div>
                <textarea value={playbook} onChange={e => setPlaybook(e.target.value)}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-3 text-xs text-content-primary font-mono leading-relaxed resize-none outline-none focus:border-brand/40"
                  rows={12} />
                <div className="flex gap-2">
                  <button onClick={() => generatePlaybook(selectedPayer)} disabled={generating}
                    className="px-4 py-2 border border-separator rounded-lg text-xs text-content-secondary hover:bg-surface-elevated transition-colors">
                    <RefreshCw size={12} className="inline mr-1.5" />Regenerate
                  </button>
                  <button onClick={pushPlaybook} disabled={pushing}
                    className="flex-1 bg-emerald-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                    {pushing ? 'Pushing to Chris…' : `Push to Chris's Prompt Live`}
                  </button>
                </div>
                <p className="text-[10px] text-content-tertiary">This will append the playbook to Chris's live Retell prompt. Review carefully before pushing.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── TAB 5: Prompt Editor ─────────────────────────────────────────────────────
function PromptEditorTab() {
  const { toast } = useToast()
  const [activeAgent, setActiveAgent] = useState<'chris' | 'cindy'>('chris')
  const { prompt, loading: promptLoading, refetch: refetchPrompt, setPrompt } = useAgentPrompt(activeAgent)
  const { update: updateAgent, loading: saving } = useUpdateAgentPrompt()
  const [localPrompt, setLocalPrompt] = useState('')
  const [versions, setVersions] = useState<{ label: string; prompt: string; ts: number }[]>([])
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [showVersions, setShowVersions] = useState(false)

  // Sync local when prompt loads
  useEffect(() => { if (prompt) setLocalPrompt(prompt) }, [prompt])

  const isDirty = localPrompt !== prompt

  async function handleSave() {
    try {
      // Save version before overwriting
      if (prompt) setVersions(v => [{ label: `Before save ${new Date().toLocaleTimeString()}`, prompt, ts: Date.now() }, ...v].slice(0, 10))
      await updateAgent(activeAgent, localPrompt)
      setPrompt(localPrompt)
      toast.success(`${activeAgent === 'chris' ? 'Chris' : 'Cindy'}'s prompt updated live in Retell`)
    } catch (err) { toast.error(`Save failed: ${err}`) }
  }

  async function handleAIOptimize() {
    setAnalyzing(true)
    setAiSuggestion('')
    try {
      // Load recent call data for context
      const callsRes = await fetch(`/api/retell?action=list-calls&agent=${activeAgent}&limit=100`)
      const callsData = await callsRes.json()
      const calls: RetellCall[] = callsData.call_list ?? []

      const ended = calls.filter(c => c.call_status === 'ended')
      const successRate = ended.length > 0 ? Math.round(ended.filter(c => c.call_analysis?.call_successful).length / ended.length * 100) : 0

      const failedSamples = ended.filter(c => !c.call_analysis?.call_successful).slice(0, 15)
        .map(c => `FAILED: ${c.call_analysis?.call_summary ?? c.disconnection_reason ?? 'Unknown reason'}`).join('\n')
      const successSamples = ended.filter(c => c.call_analysis?.call_successful).slice(0, 10)
        .map(c => `SUCCESS: ${c.call_analysis?.call_summary ?? ''}`).join('\n')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: `You are an expert AI prompt engineer specializing in medical billing voice AI agents. You analyze real call performance data and suggest targeted, specific improvements to the agent's system prompt.

Be surgical — only suggest changes that are directly supported by the call data evidence. Do not rewrite the entire prompt. Output a clear diff-style suggestion showing what to add, change, or remove, and why.`,
          messages: [{
            role: 'user',
            content: `Agent: ${activeAgent === 'chris' ? 'Chris (Payer Follow-up)' : 'Cindy (AR Collections)'}
Current success rate from last ${ended.length} calls: ${successRate}%

FAILED CALL PATTERNS:
${failedSamples || 'No failure data yet'}

SUCCESSFUL CALL PATTERNS:
${successSamples || 'No success data yet'}

CURRENT PROMPT:
${localPrompt}

Based on the failure patterns above, what specific changes to the prompt would improve success rate? 
Format your response as:
## What's Going Wrong
[specific patterns from failed calls]

## Suggested Changes
[exact text to add/modify/remove, with rationale]

## Expected Impact
[what improvement this should drive]`
          }],
        }),
      })

      const data = await response.json()
      setAiSuggestion(data.content?.[0]?.text ?? '')
    } catch (err) {
      toast.error(`Analysis failed: ${err}`)
    } finally {
      setAnalyzing(false)
    }
  }

  function applySection(sectionText: string) {
    setLocalPrompt(p => p.trimEnd() + '\n\n' + sectionText)
    toast.success('Section added to prompt — review and save when ready')
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      {/* Left: editor */}
      <div className="col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-0.5">
            {(['chris', 'cindy'] as const).map(a => (
              <button key={a} onClick={() => { setActiveAgent(a); setAiSuggestion('') }}
                className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${activeAgent === a ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isDirty && <span className="text-[10px] text-amber-500 flex items-center gap-1"><AlertCircle size={11} />Unsaved changes</span>}
            <button onClick={() => setShowVersions(v => !v)} className="text-[10px] text-content-tertiary hover:text-content-secondary flex items-center gap-1 transition-colors">
              <RotateCcw size={11} />History ({versions.length})
            </button>
            <button onClick={refetchPrompt} className="p-1.5 hover:bg-surface-elevated rounded text-content-secondary transition-colors"><RefreshCw size={13} /></button>
          </div>
        </div>

        {/* Version history dropdown */}
        {showVersions && versions.length > 0 && (
          <div className="card p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Version History</p>
            {versions.map((v, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-elevated rounded p-2">
                <span className="text-xs text-content-secondary">{v.label}</span>
                <button onClick={() => { setLocalPrompt(v.prompt); toast.info('Version restored — save to push live') }}
                  className="text-[10px] text-brand hover:underline">Restore</button>
              </div>
            ))}
          </div>
        )}

        {promptLoading ? (
          <div className="card p-12 text-center text-sm text-content-tertiary">Loading prompt from Retell…</div>
        ) : (
          <>
            <textarea value={localPrompt} onChange={e => setLocalPrompt(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-4 py-3 text-xs text-content-primary font-mono leading-relaxed resize-none outline-none focus:border-brand/40 h-[500px]"
              placeholder={`${activeAgent === 'chris' ? 'Chris' : 'Cindy'}'s prompt will load here from Retell…`} />

            <div className="flex gap-2">
              <button onClick={() => setLocalPrompt(prompt)} disabled={!isDirty}
                className="px-4 py-2 border border-separator rounded-lg text-xs text-content-secondary hover:bg-surface-elevated disabled:opacity-40 transition-colors">
                Discard Changes
              </button>
              <button onClick={handleSave} disabled={saving || !isDirty}
                className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 transition-colors">
                <Save size={14} className="inline mr-2" />{saving ? 'Pushing to Retell…' : `Save & Push ${activeAgent === 'chris' ? 'Chris' : 'Cindy'} Live`}
              </button>
            </div>
            <p className="text-[10px] text-content-tertiary text-center">Changes go live immediately on next call. Always review before saving.</p>
          </>
        )}
      </div>

      {/* Right: AI optimizer */}
      <div className="col-span-2 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">AI Prompt Optimizer</h3>
          <p className="text-[10px] text-content-tertiary">Reads {activeAgent === 'chris' ? 'Chris' : 'Cindy'}'s last 100 calls and suggests specific prompt improvements based on failure patterns</p>
        </div>

        <button onClick={handleAIOptimize} disabled={analyzing}
          className="w-full bg-gradient-to-r from-brand to-purple-600 text-white rounded-lg py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all">
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing calls…
            </span>
          ) : (
            <span><Brain size={14} className="inline mr-2" />Analyze Calls & Suggest Improvements</span>
          )}
        </button>

        {aiSuggestion && (
          <div className="space-y-3">
            <div className="card p-4 max-h-[420px] overflow-y-auto">
              <div className="prose prose-xs text-content-primary text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {aiSuggestion}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => applySection(aiSuggestion)}
                className="flex-1 bg-emerald-500 text-white rounded-lg py-2 text-xs font-semibold hover:bg-emerald-600 transition-colors">
                <Plus size={12} className="inline mr-1.5" />Append to Prompt
              </button>
              <button onClick={() => setAiSuggestion('')}
                className="px-3 py-2 border border-separator rounded-lg text-xs text-content-secondary hover:bg-surface-elevated transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {!aiSuggestion && !analyzing && (
          <div className="card p-6 text-center">
            <Sparkles size={24} className="mx-auto mb-2 text-content-tertiary opacity-40" />
            <p className="text-xs text-content-secondary">Click above to analyze real call outcomes</p>
            <p className="text-[10px] text-content-tertiary mt-1">Works best after 20+ calls</p>
          </div>
        )}

        <div className="card p-4 space-y-2">
          <p className="text-[10px] font-semibold text-content-secondary uppercase tracking-wider">Quick Actions</p>
          {[
            { label: 'Add Payer Playbooks', desc: 'Go to Payer Intelligence tab', action: null },
            { label: 'View Retell Dashboard', desc: 'Open agent in Retell', action: () => window.open('https://app.retellai.com', '_blank') },
          ].map((q, i) => (
            <button key={i} onClick={() => q.action?.()}
              className="w-full text-left flex items-center justify-between bg-surface-elevated hover:bg-surface-secondary rounded-lg px-3 py-2.5 transition-colors group">
              <div>
                <p className="text-xs font-medium text-content-primary">{q.label}</p>
                <p className="text-[10px] text-content-tertiary">{q.desc}</p>
              </div>
              <ExternalLink size={12} className="text-content-tertiary group-hover:text-brand transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'active', label: 'Live Calls', icon: PhoneCall },
  { id: 'log', label: 'Call Log', icon: PhoneMissed },
  { id: 'campaign', label: 'Campaign Launcher', icon: BarChart2 },
  { id: 'payer', label: 'Payer Intelligence', icon: Brain },
  { id: 'prompt', label: 'Prompt Editor', icon: Sparkles },
] as const

type TabId = typeof TABS[number]['id']

export default function VoiceAIPage() {
  const [tab, setTab] = useState<TabId>('active')
  const { t } = useT()

  return (
    <ModuleShell title={t('voice', 'title')} subtitle="Powered by Retell AI — real outbound calls to payers and patients">
      <div className="flex gap-1 mb-5 border-b border-separator overflow-x-auto">
        {TABS.map(tb => {
          const Icon = tb.icon
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === tb.id ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}>
              <Icon size={14} />
              {tb.label}
            </button>
          )
        })}
      </div>
      {tab === 'active' && <ActiveCallsTab />}
      {tab === 'log' && <CallLogTab />}
      {tab === 'campaign' && <CampaignLauncherTab />}
      {tab === 'payer' && <PayerIntelligenceTab />}
      {tab === 'prompt' && <PromptEditorTab />}
    </ModuleShell>
  )
}
