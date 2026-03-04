'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import {
  Phone, PhoneCall, PhoneMissed, Clock, Play, X, ChevronRight,
  Plus, Edit2, Zap, BarChart2, Settings2, Radio, AlertTriangle,
  CheckCircle, XCircle, Mic, Users, RefreshCw, ExternalLink,
  PhoneOutgoing, Activity,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import {
  useRetellCalls, useRetellBatches, useRetellAgents, useLaunchCall, useLaunchBatch,
  formatDuration, formatCallStatus, RetellCall, RetellBatch,
} from '@/lib/retell'
import { demoScripts, DemoScript } from '@/lib/demo-data'

// ─── Status Dot ──────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: RetellCall['call_status'] }) {
  const map: Record<string, string> = {
    ongoing: 'bg-emerald-500 animate-pulse',
    registered: 'bg-blue-500 animate-pulse',
    ended: 'bg-gray-400',
    error: 'bg-red-500',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] ?? 'bg-gray-400'}`} />
}

// ─── Sentiment Badge ──────────────────────────────────────────────────────────
function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment || sentiment === 'Unknown') return null
  const c = sentiment === 'Positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : sentiment === 'Negative' ? 'bg-red-500/10 text-red-500'
    : 'bg-gray-500/10 text-content-secondary'
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c}`}>{sentiment}</span>
}

// ─── Call Detail Drawer ───────────────────────────────────────────────────────
function CallDetailDrawer({ call, onClose }: { call: RetellCall; onClose: () => void }) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const isActive = call.call_status === 'ongoing' || call.call_status === 'registered'
  const { label: statusLabel, color: statusColor } = formatCallStatus(call.call_status)

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [call.transcript])

  const transcriptLines = call.transcript_object ?? (call.transcript
    ? call.transcript.split('\n').filter(Boolean).map(line => {
        const isAgent = line.startsWith('Agent:')
        return { role: (isAgent ? 'agent' : 'user') as 'agent' | 'user', content: line.replace(/^(Agent|User):/, '').trim() }
      })
    : [])

  const variables = call.retell_llm_dynamic_variables ?? {}
  const analysis = call.call_analysis

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-separator flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={call.call_status} />
            <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
            {analysis?.call_successful === true && <CheckCircle size={13} className="text-emerald-500" />}
            {analysis?.call_successful === false && <XCircle size={13} className="text-red-500" />}
          </div>
          <p className="text-xs text-content-secondary font-mono">{call.to_number}</p>
          <p className="text-[10px] text-content-tertiary mt-0.5">ID: {call.call_id.slice(0, 16)}…</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn transition-colors">
          <X size={16} className="text-content-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats row */}
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

        {/* Summary */}
        {analysis?.call_summary && (
          <div className="p-4 border-b border-separator">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">AI Summary</h4>
            <p className="text-xs text-content-primary leading-relaxed">{analysis.call_summary}</p>
          </div>
        )}

        {/* Transcript */}
        <div className="p-4 border-b border-separator">
          <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Transcript</h4>
          <div ref={transcriptRef} className="bg-surface-elevated rounded-lg p-3 h-52 overflow-y-auto text-[11px] space-y-2">
            {transcriptLines.length > 0 ? (
              <>
                {transcriptLines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className={`shrink-0 font-semibold ${line.role === 'agent' ? 'text-brand' : 'text-content-secondary'}`}>
                      [{line.role === 'agent' ? 'AI' : 'User'}]
                    </span>
                    <span className="text-content-primary leading-relaxed">{line.content}</span>
                  </div>
                ))}
                {isActive && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-semibold text-brand">[AI]</span>
                    <span className="inline-block w-2 h-3 bg-brand animate-pulse rounded-sm mt-0.5" />
                  </div>
                )}
              </>
            ) : (
              <span className="text-content-tertiary">{isActive ? 'Call in progress…' : 'No transcript available'}</span>
            )}
          </div>
        </div>

        {/* Dynamic variables used in the call */}
        {Object.keys(variables).length > 0 && (
          <div className="p-4 border-b border-separator">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Call Context</h4>
            <div className="space-y-1.5">
              {Object.entries(variables).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-content-tertiary capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-content-primary font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disconnection reason */}
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

// ─── Tab 1: Live Calls ────────────────────────────────────────────────────────
function ActiveCallsTab() {
  const { calls, loading, fallback, refetch } = useRetellCalls('ongoing')
  const { calls: allCalls } = useRetellCalls()
  const [selectedCall, setSelectedCall] = useState<RetellCall | null>(null)
  const { toast } = useToast()

  const todayCalls = allCalls.filter(c => {
    if (!c.start_timestamp) return false
    return Date.now() - c.start_timestamp < 86400000
  })
  const successRate = todayCalls.length > 0
    ? Math.round((todayCalls.filter(c => c.call_analysis?.call_successful).length / todayCalls.length) * 100)
    : 0
  const avgDuration = todayCalls.length > 0
    ? formatDuration(todayCalls.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / todayCalls.length)
    : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="grid grid-cols-4 gap-4 flex-1">
          <KPICard label="Calls Today" value={todayCalls.length} icon={<Phone size={20} />} />
          <KPICard label="Live Now" value={calls.length} icon={<Activity size={20} />} />
          <KPICard label="Avg Duration" value={avgDuration} icon={<Clock size={20} />} />
          <KPICard label="Success Rate" value={`${successRate}%`} icon={<CheckCircle size={20} />} />
        </div>
        <button onClick={refetch} className="ml-4 p-2 hover:bg-surface-elevated rounded-btn text-content-secondary transition-colors" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {fallback && (
        <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={13} className="shrink-0" />
          Showing demo data — add RETELL_API_KEY + agent IDs to Vercel env to go live
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-sm text-content-tertiary">Loading live calls…</div>
      ) : calls.length === 0 ? (
        <div className="card p-12 text-center">
          <Phone size={32} className="mx-auto mb-3 text-content-tertiary opacity-40" />
          <p className="text-sm text-content-secondary">No active calls right now</p>
          <p className="text-xs text-content-tertiary mt-1">Launch a campaign to start calling</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3 w-8"></th>
                <th className="text-left px-4 py-3">To Number</th>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => {
                const { label, color } = formatCallStatus(call.call_status)
                return (
                  <tr key={call.call_id} onClick={() => setSelectedCall(call)}
                    className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3"><StatusDot status={call.call_status} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{call.to_number}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{call.from_number}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDuration(call.duration_ms)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium ${color}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); toast.error('Manual takeover not available via API') }}
                        className="text-[10px] border border-red-500/40 text-red-500 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCall && <>
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedCall(null)} />
        <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      </>}
    </div>
  )
}

// ─── Tab 2: Call Log ──────────────────────────────────────────────────────────
function CallLogTab() {
  const { calls, loading, fallback } = useRetellCalls('ended')
  const [selectedCall, setSelectedCall] = useState<RetellCall | null>(null)
  const [outcomeFilter, setOutcomeFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const filtered = calls.filter(c => {
    if (search && !c.to_number.includes(search)) return false
    if (outcomeFilter === 'success' && !c.call_analysis?.call_successful) return false
    if (outcomeFilter === 'failed' && c.call_analysis?.call_successful !== false) return false
    return true
  })

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by number…"
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40 w-48" />
        <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Outcomes</option>
          <option value="success">Resolved</option>
          <option value="failed">Failed / Voicemail</option>
        </select>
        {fallback && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-500">
            <AlertTriangle size={12} /> Demo mode — add Retell env vars to go live
          </span>
        )}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-content-tertiary">Loading call history…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Outcome</th>
                <th className="text-left px-4 py-3">Sentiment</th>
                <th className="text-left px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(call => (
                <tr key={call.call_id} onClick={() => setSelectedCall(call)}
                  className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors">
                  <td className="px-4 py-3 text-xs text-content-secondary">
                    {call.start_timestamp ? new Date(call.start_timestamp).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{call.to_number}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDuration(call.duration_ms)}</td>
                  <td className="px-4 py-3">
                    {call.call_analysis?.call_successful === true
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Resolved</span>
                      : call.call_analysis?.call_successful === false
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Failed</span>
                      : <span className="text-[10px] text-content-tertiary">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <SentimentBadge sentiment={call.call_analysis?.user_sentiment} />
                  </td>
                  <td className="px-4 py-3 text-xs text-content-secondary max-w-[220px] truncate">
                    {call.call_analysis?.call_summary ?? '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-content-tertiary">No calls found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedCall && <>
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedCall(null)} />
        <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      </>}
    </div>
  )
}

// ─── Tab 3: Campaign Launcher ─────────────────────────────────────────────────
function CampaignLauncherTab() {
  const { toast } = useToast()
  const { agents, apiConfigured } = useRetellAgents()
  const { batches, loading: batchLoading, fallback } = useRetellBatches()
  const { launch: launchBatch, loading: launching } = useLaunchBatch()
  const { launch: launchCall, loading: singleLoading } = useLaunchCall()

  const [mode, setMode] = useState<'batch' | 'single'>('batch')
  const [name, setCampaignName] = useState('')
  const [agentKey, setAgentKey] = useState<'chris' | 'cindy'>('chris')
  const [type, setType] = useState('Payer Status Check')
  const [singleNumber, setSingleNumber] = useState('')
  const [csvText, setCsvText] = useState('')

  const selectedAgent = agents.find(a => a.id === agentKey || (agentKey === 'chris' && a.name === 'Chris') || (agentKey === 'cindy' && a.name === 'Cindy'))

  async function handleLaunchBatch() {
    const lines = csvText.trim().split('\n').filter(Boolean)
    if (!lines.length) { toast.error('Add at least one phone number'); return }
    const recipients = lines.map(l => ({ to_number: l.split(',')[0].trim() }))
    try {
      const r = await launchBatch({ agent_name: agentKey, batch_name: name || type, recipients })
      toast.success(`Batch launched — ${recipients.length} calls queued`)
      setCsvText('')
    } catch (e) {
      toast.error(`Failed to launch: ${e}`)
    }
  }

  async function handleLaunchSingle() {
    if (!singleNumber) { toast.error('Enter a phone number'); return }
    try {
      await launchCall({ agent_name: agentKey, to_number: singleNumber, variables: { campaign_type: type } })
      toast.success(`Call to ${singleNumber} initiated`)
      setSingleNumber('')
    } catch (e) {
      toast.error(`Failed to call: ${e}`)
    }
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      {/* Past campaigns */}
      <div className="col-span-2 space-y-3">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
          Past Campaigns {fallback && <span className="text-amber-500 normal-case font-normal">(demo)</span>}
        </h3>
        {batchLoading ? (
          <div className="text-xs text-content-tertiary p-4">Loading…</div>
        ) : batches.length === 0 ? (
          <div className="card p-6 text-center text-xs text-content-tertiary">No campaigns yet</div>
        ) : batches.map(b => (
          <div key={b.batch_id} className="card p-4">
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-sm font-semibold text-content-primary truncate">{b.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                b.status === 'running' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                b.status === 'completed' ? 'bg-brand/10 text-brand' :
                'bg-amber-500/10 text-amber-500'
              }`}>{b.status}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-content-secondary mt-2">
              <span>{b.completed_count}/{b.total_count} completed</span>
              {b.failed_count > 0 && <span className="text-red-500">{b.failed_count} failed</span>}
            </div>
            {b.status === 'running' && (
              <div className="mt-2 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${Math.round((b.completed_count / b.total_count) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Builder */}
      <div className="col-span-3 card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">Launch Calls</h3>
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-0.5">
            {(['batch', 'single'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === m ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'}`}>
                {m === 'batch' ? 'Batch Campaign' : 'Single Call'}
              </button>
            ))}
          </div>
        </div>

        {!apiConfigured && (
          <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
            Add <code className="font-mono bg-amber-500/10 px-1 rounded">RETELL_API_KEY</code>, <code className="font-mono bg-amber-500/10 px-1 rounded">RETELL_AGENT_CHRIS</code>, and <code className="font-mono bg-amber-500/10 px-1 rounded">RETELL_AGENT_CINDY</code> to Vercel to go live.
          </div>
        )}

        {/* Agent selection */}
        <div>
          <label className="text-xs text-content-secondary block mb-1.5">Agent</label>
          <div className="flex gap-2">
            {agents.length > 0 ? agents.map(a => (
              <button key={a.name} onClick={() => setAgentKey(a.name.toLowerCase() as 'chris' | 'cindy')}
                className={`flex-1 p-3 rounded-lg border text-left transition-all ${agentKey === a.name.toLowerCase() ? 'border-brand/40 bg-brand/5' : 'border-separator hover:border-brand/20'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full ${a.configured ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-xs font-semibold text-content-primary">{a.name}</span>
                </div>
                <p className="text-[10px] text-content-tertiary">{a.role}</p>
                <p className="text-[10px] font-mono text-content-tertiary">{a.phone}</p>
              </button>
            )) : (
              <>
                {(['chris', 'cindy'] as const).map(n => (
                  <button key={n} onClick={() => setAgentKey(n)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${agentKey === n ? 'border-brand/40 bg-brand/5' : 'border-separator'}`}>
                    <p className="text-xs font-semibold text-content-primary capitalize">{n}</p>
                    <p className="text-[10px] text-content-tertiary">{n === 'chris' ? 'Payer Follow-up' : 'AR Collections'}</p>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Campaign type */}
        <div>
          <label className="text-xs text-content-secondary block mb-1">Campaign Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
            {['Payer Status Check', 'Payer Appeal Follow-up', 'Patient Balance Reminder', 'Appointment Reminder'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {mode === 'single' ? (
          <div>
            <label className="text-xs text-content-secondary block mb-1">Phone Number</label>
            <div className="flex gap-2">
              <input value={singleNumber} onChange={e => setSingleNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
              <button onClick={handleLaunchSingle} disabled={singleLoading || !singleNumber}
                className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-deep disabled:opacity-40 transition-colors whitespace-nowrap">
                <PhoneOutgoing size={14} className="inline mr-1.5" />
                {singleLoading ? 'Calling…' : 'Call Now'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Campaign Name</label>
              <input value={name} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Weekly Payer Status Check"
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
            </div>
            <div>
              <label className="text-xs text-content-secondary flex items-center justify-between mb-1">
                <span>Phone Numbers (one per line)</span>
                <span className="font-normal text-brand">{csvText.trim().split('\n').filter(Boolean).length} numbers</span>
              </label>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder={"+12125551234\n+13105557890\n+17185554321"}
                rows={5}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40 font-mono resize-y" />
            </div>
            <button onClick={handleLaunchBatch} disabled={launching || !csvText.trim()}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Zap size={14} className="inline mr-2" />
              {launching ? 'Launching…' : `Launch Campaign`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Tab 4: Script Builder (kept from before — Retell uses LLM prompts) ───────
const stepBadge: Record<string, string> = {
  DIAL: 'bg-blue-500/15 text-blue-500',
  DTMF: 'bg-amber-500/15 text-amber-500',
  SPEAK: 'bg-brand/15 text-brand',
  WAIT: 'bg-purple-500/15 text-purple-500',
  RECORD: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

function ScriptBuilderTab() {
  const { toast } = useToast()
  const [selected, setSelected] = useState<DemoScript>(demoScripts[0])
  const [scriptSteps, setScriptSteps] = useState(demoScripts[0].steps)
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  useEffect(() => {
    setScriptSteps(selected.steps)
    setEditingStep(null)
  }, [selected.id])

  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-2 space-y-2">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Payer Scripts</h3>
        {demoScripts.map(s => (
          <button key={s.id} onClick={() => setSelected(s)}
            className={`w-full text-left card p-4 hover:border-brand/30 transition-all ${selected.id === s.id ? 'border-brand/30 bg-brand/5' : ''}`}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-content-primary">{s.payer}</p>
              <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full">{s.steps.length} steps</span>
            </div>
            <p className="text-[10px] text-content-secondary mt-1">{s.type}</p>
            <p className="text-[10px] text-content-tertiary mt-0.5">Updated {s.lastUpdated}</p>
          </button>
        ))}
        <div className="card p-4 border-dashed text-center">
          <p className="text-[11px] text-content-tertiary">Scripts live in Retell dashboard</p>
          <a href="https://app.retellai.com" target="_blank" rel="noreferrer"
            className="text-[11px] text-brand hover:underline flex items-center justify-center gap-1 mt-1">
            Open Retell <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div className="col-span-3 card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">{selected.payer}</h3>
            <p className="text-xs text-content-secondary">{selected.type}</p>
          </div>
          <button onClick={() => toast.success('Test call queued')}
            className="px-3 py-1.5 text-xs font-medium border border-brand/30 text-brand rounded-lg hover:bg-brand/10 transition-colors">
            <Radio size={12} className="inline mr-1.5" />Test Script
          </button>
        </div>

        <div className="space-y-2">
          {scriptSteps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-1 ${stepBadge[step.type] ?? 'bg-surface-elevated text-content-secondary'}`}>{i + 1}</div>
                {i < scriptSteps.length - 1 && <div className="w-px flex-1 bg-separator min-h-[12px] mt-1" />}
              </div>
              <div className="flex-1 card p-3 flex flex-col gap-2 mb-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${stepBadge[step.type] ?? 'bg-surface-elevated'}`}>{step.type}</span>
                    <span className="text-xs text-content-primary">{step.content}</span>
                  </div>
                  <button onClick={() => { editingStep === i ? (setEditingStep(null), setEditingContent('')) : (setEditingStep(i), setEditingContent(step.content)) }}
                    className="shrink-0 p-1 hover:bg-surface-elevated rounded text-content-tertiary hover:text-content-secondary transition-colors">
                    <Edit2 size={12} />
                  </button>
                </div>
                {editingStep === i && (
                  <div className="flex gap-2">
                    <input value={editingContent} onChange={e => setEditingContent(e.target.value)}
                      className="flex-1 bg-surface-elevated border border-separator rounded px-2 py-1 text-xs"
                      onKeyDown={e => {
                        if (e.key === 'Enter') { const u = [...scriptSteps]; u[i] = { ...u[i], content: editingContent }; setScriptSteps(u); toast.success('Step updated'); setEditingStep(null) }
                        if (e.key === 'Escape') setEditingStep(null)
                      }} />
                    <button onClick={() => { const u = [...scriptSteps]; u[i] = { ...u[i], content: editingContent }; setScriptSteps(u); toast.success('Step updated'); setEditingStep(null) }}
                      className="text-[10px] bg-brand text-white px-2 py-1 rounded">Save</button>
                    <button onClick={() => setEditingStep(null)} className="text-[10px] border border-separator px-2 py-1 rounded text-content-secondary">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => { setScriptSteps(p => [...p, { type: 'SPEAK' as const, content: 'New step — click edit to update' }]); toast.success('Step added') }}
          className="mt-3 w-full border border-dashed border-brand/30 text-brand text-xs py-2 rounded-lg hover:bg-brand/5 transition-colors">
          <Plus size={12} className="inline mr-1" />Add Step
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'active', label: 'Live Calls', icon: PhoneCall },
  { id: 'log', label: 'Call Log', icon: PhoneMissed },
  { id: 'campaign', label: 'Campaign Launcher', icon: BarChart2 },
  { id: 'scripts', label: 'Script Builder', icon: Settings2 },
  { id: 'analytics', label: 'Call Analytics', icon: PhoneCall },
] as const

type TabId = typeof TABS[number]['id']

export default function VoiceAIPage() {
  const [tab, setTab] = useState<TabId>('active')
  const { t } = useT()

  return (
    <ModuleShell title={t('voice', 'title')} subtitle="Powered by Retell AI — real outbound calls to payers and patients">
      <div className="flex gap-1 mb-5 border-b border-separator">
        {TABS.map(tb => {
          const Icon = tb.icon
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
      {tab === 'scripts' && <ScriptBuilderTab />}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[{label:'Total Calls Today',value:'47',color:'text-brand'},{label:'Avg Hold Time',value:'4m 32s',color:'text-amber-500'},{label:'Success Rate',value:'78%',color:'text-emerald-500'},{label:'IVR Navigation',value:'92%',color:'text-blue-500'}].map(k=>
              <div key={k.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-content-tertiary mt-1">{k.label}</p>
              </div>
            )}
          </div>
          <div className="card p-4">
            <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Call Outcomes by Payer</h4>
            <div className="space-y-2">
              {[{payer:'Aetna',total:15,success:12,hold:'3:45'},{payer:'BCBS',total:12,success:9,hold:'5:12'},{payer:'United',total:10,success:7,hold:'4:58'},{payer:'Cigna',total:6,success:5,hold:'3:20'},{payer:'Medicare',total:4,success:4,hold:'2:15'}].map(p=>{
                const successPct = (p.success / p.total * 100).toFixed(0)
                return (
                <div key={p.payer} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2">
                  <span className="text-xs font-medium w-20">{p.payer}</span>
                  <div className="flex-1 mx-4 h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${successPct}%`}}/>
                  </div>
                  <span className="text-[10px] text-content-secondary w-16 text-right">{p.success}/{p.total} calls</span>
                  <span className="text-[10px] text-content-tertiary w-16 text-right">Hold: {p.hold}</span>
                </div>
              )})}
            </div>
          </div>
          <div className="card p-4">
            <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Call Purpose Breakdown</h4>
            <div className="grid grid-cols-3 gap-3">
              {[{purpose:'Claim Status',count:18,pct:38},{purpose:'Eligibility Verify',count:12,pct:26},{purpose:'Appeal Follow-up',count:8,pct:17},{purpose:'Prior Auth',count:5,pct:11},{purpose:'Payment Inquiry',count:3,pct:6},{purpose:'Other',count:1,pct:2}].map(c=>(
                <div key={c.purpose} className="bg-surface-elevated rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs">{c.purpose}</span>
                    <span className="text-xs font-bold">{c.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{width:`${c.pct}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
