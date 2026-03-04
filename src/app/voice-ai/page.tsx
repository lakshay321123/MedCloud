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
  PhoneOutgoing, Activity, Upload, FileSpreadsheet, Eye, Trash2,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import {
  useRetellCalls, useRetellBatches, useRetellAgents, useLaunchCall, useLaunchBatch,
  formatDuration, formatCallStatus, RetellCall, RetellBatch,
} from '@/lib/retell'
import { parseRetellExcel, ExcelParseResult } from '@/lib/retell-excel'
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


// ─── Tab 3: Campaign Launcher (Excel Upload) ──────────────────────────────────
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
  const [previewRow, setPreviewRow] = useState<number | null>(null)
  const [singleNumber, setSingleNumber] = useState('')
  const [filterPractice, setFilterPractice] = useState<string>('all')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const filteredRows = parsed
    ? (filterPractice === 'all'
        ? parsed.rows
        : parsed.rows.filter(r =>
            (r.variables['practicename'] ?? r.variables['practice_name'] ?? '') === filterPractice
          ))
    : []

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setParsed(null)
    try {
      const result = await parseRetellExcel(file)
      setParsed(result)
      // Auto-select agent based on file content
      if (result.agentDetected) setAgentKey(result.agentDetected)
      if (result.errors.length > 0) {
        toast.warning(`${result.rows.length} valid rows — ${result.errors.length} skipped`)
      } else {
        toast.success(`${result.rows.length} contacts ready to call`)
      }
    } catch (err) {
      toast.error(`Failed to parse file: ${err}`)
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleLaunchBatch() {
    if (!filteredRows.length) { toast.error('No rows to call'); return }
    try {
      const recipients = filteredRows.map(r => ({
        to_number: r.phone,
        variables: r.variables,
      }))
      await launchBatch({
        agent_name: agentKey,
        batch_name: parsed?.fileName.replace('.xlsx', '') ?? `Campaign ${new Date().toLocaleDateString()}`,
        recipients,
      })
      toast.success(`${recipients.length} calls queued via Retell`)
      setParsed(null)
    } catch (err) {
      toast.error(`Launch failed: ${err}`)
    }
  }

  async function handleLaunchSingle() {
    if (!singleNumber) { toast.error('Enter a phone number'); return }
    try {
      await launchCall({ agent_name: agentKey, to_number: singleNumber })
      toast.success(`Call to ${singleNumber} initiated`)
      setSingleNumber('')
    } catch (err) {
      toast.error(`Failed: ${err}`)
    }
  }

  return (
    <div className="grid grid-cols-5 gap-5">

      {/* Left: Past campaigns */}
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
              <p className="text-sm font-semibold text-content-primary truncate pr-2">{b.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${
                b.status === 'running' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                b.status === 'completed' ? 'bg-brand/10 text-brand' :
                b.status === 'paused' ? 'bg-amber-500/10 text-amber-500' :
                'bg-red-500/10 text-red-500'
              }`}>{b.status}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-content-secondary mt-1">
              <span>{b.completed_count}/{b.total_count} completed</span>
              {b.failed_count > 0 && <span className="text-red-500">{b.failed_count} failed</span>}
            </div>
            {(b.status === 'running' || b.status === 'completed') && (
              <div className="mt-2.5 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${b.total_count > 0 ? Math.round((b.completed_count / b.total_count) * 100) : 0}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right: Launch panel */}
      <div className="col-span-3 card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">Launch Calls</h3>
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-0.5">
            {(['excel', 'single'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === m ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary hover:text-content-primary'}`}>
                {m === 'excel' ? '📊 Excel Upload' : '📞 Single Call'}
              </button>
            ))}
          </div>
        </div>

        {!apiConfigured && (
          <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
            Add <code className="font-mono bg-amber-500/10 px-1 rounded">RETELL_API_KEY</code> + agent env vars to Vercel to go live.
          </div>
        )}

        {/* Agent selector */}
        <div>
          <label className="text-xs text-content-secondary block mb-1.5">Agent</label>
          <div className="flex gap-2">
            {[
              { key: 'cindy' as const, name: 'Cindy', role: 'Patient AR Collections', desc: 'Balance reminders, payment plans' },
              { key: 'chris' as const, name: 'Chris', role: 'Payer Follow-up', desc: 'Claim status, appeals, auth' },
            ].map(a => {
              const liveAgent = agents.find(ag => ag.name.toLowerCase() === a.key)
              return (
                <button key={a.key} onClick={() => { setAgentKey(a.key); setParsed(null) }}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${agentKey === a.key ? 'border-brand/40 bg-brand/5' : 'border-separator hover:border-brand/20'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ${liveAgent?.configured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span className="text-xs font-semibold text-content-primary">{a.name}</span>
                  </div>
                  <p className="text-[10px] text-content-secondary">{a.role}</p>
                  <p className="text-[10px] text-content-tertiary mt-0.5 italic">{a.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {mode === 'excel' ? (
          <>
            {/* Excel expected format hint */}
            <div className="bg-surface-elevated rounded-lg p-3">
              <p className="text-[10px] font-semibold text-content-secondary mb-1.5 uppercase tracking-wide">
                Expected columns — {agentKey === 'cindy' ? 'Cindy (Patient Collections)' : 'Chris (Payer Follow-up)'}
              </p>
              <p className="text-[10px] text-content-tertiary leading-relaxed font-mono">
                {agentKey === 'cindy'
                  ? 'phone number, practicename, patientfirstname, patientlastname, patientbalance, aginggroup, primaryinsurance…'
                  : 'phone number, Practice_Name, NPI, Tax_ID, Patient_Name, Primary_Carrier_Name, Service_Date, Total_Charge…'}
              </p>
            </div>

            {/* Drop zone */}
            {!parsed ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-brand/30 rounded-xl p-8 text-center cursor-pointer hover:border-brand/60 hover:bg-brand/5 transition-all group">
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                <FileSpreadsheet size={32} className="mx-auto mb-3 text-brand/40 group-hover:text-brand/60 transition-colors" />
                {parsing ? (
                  <p className="text-sm text-content-secondary">Parsing…</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-content-primary mb-1">Drop Excel file or click to browse</p>
                    <p className="text-xs text-content-tertiary">.xlsx, .xls, .csv — same format as existing Retell campaigns</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* File summary */}
                <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={18} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-content-primary">{parsed.fileName}</p>
                      <p className="text-[10px] text-content-secondary">
                        {parsed.rows.length} contacts · {parsed.columns.length} columns
                        {parsed.agentDetected && <span className="ml-1 text-brand">· {parsed.agentDetected === 'cindy' ? 'Cindy format' : 'Chris format'} detected</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setParsed(null)} className="p-1 hover:bg-surface-elevated rounded text-content-tertiary hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Practice filter if multiple */}
                {parsed.practiceNames.length > 1 && (
                  <div>
                    <label className="text-xs text-content-secondary block mb-1">Filter by Practice</label>
                    <select value={filterPractice} onChange={e => setFilterPractice(e.target.value)}
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-primary">
                      <option value="all">All Practices ({parsed.rows.length} contacts)</option>
                      {parsed.practiceNames.map(p => {
                        const count = parsed.rows.filter(r => (r.variables['practicename'] ?? r.variables['practice_name'] ?? '') === p).length
                        return <option key={p} value={p}>{p} ({count})</option>
                      })}
                    </select>
                  </div>
                )}

                {/* Preview table */}
                <div className="border border-separator rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-surface-elevated border-b border-separator flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-content-secondary uppercase tracking-wide">
                      Preview — {filteredRows.length} calls
                    </span>
                    <Eye size={12} className="text-content-tertiary" />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-surface-secondary">
                        <tr className="border-b border-separator text-content-tertiary">
                          <th className="text-left px-3 py-1.5">#</th>
                          <th className="text-left px-3 py-1.5">Phone</th>
                          {agentKey === 'cindy' ? (
                            <>
                              <th className="text-left px-3 py-1.5">Patient</th>
                              <th className="text-left px-3 py-1.5">Balance</th>
                              <th className="text-left px-3 py-1.5">Aging</th>
                            </>
                          ) : (
                            <>
                              <th className="text-left px-3 py-1.5">Patient</th>
                              <th className="text-left px-3 py-1.5">Payer</th>
                              <th className="text-left px-3 py-1.5">Charge</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-separator last:border-0 hover:bg-surface-elevated transition-colors"
                            onClick={() => setPreviewRow(previewRow === i ? null : i)}>
                            <td className="px-3 py-1.5 text-content-tertiary">{i + 1}</td>
                            <td className="px-3 py-1.5 font-mono">{row.phone}</td>
                            {agentKey === 'cindy' ? (
                              <>
                                <td className="px-3 py-1.5">
                                  {[row.variables['patientfirstname'], row.variables['patientlastname']].filter(Boolean).join(' ') || '—'}
                                </td>
                                <td className="px-3 py-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                  {row.variables['patientbalance'] ? `$${Number(row.variables['patientbalance']).toLocaleString()}` : '—'}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                    row.variables['aginggroup']?.includes('180') ? 'bg-red-500/10 text-red-500' :
                                    row.variables['aginggroup']?.includes('90') ? 'bg-amber-500/10 text-amber-500' :
                                    'bg-surface-elevated text-content-secondary'
                                  }`}>{row.variables['aginggroup'] || '—'}</span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-1.5">{row.variables['patient_name'] || '—'}</td>
                                <td className="px-3 py-1.5">{row.variables['primary_carrier_name'] || '—'}</td>
                                <td className="px-3 py-1.5 font-medium">
                                  {row.variables['total_charge'] ? `$${Number(row.variables['total_charge']).toLocaleString()}` : '—'}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                        {filteredRows.length > 50 && (
                          <tr><td colSpan={5} className="px-3 py-2 text-center text-content-tertiary">+{filteredRows.length - 50} more rows</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Errors */}
                {parsed.errors.length > 0 && (
                  <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-1">{parsed.errors.length} rows skipped:</p>
                    <div className="max-h-16 overflow-y-auto space-y-0.5">
                      {parsed.errors.map((e, i) => <p key={i} className="text-[10px] text-content-tertiary">{e}</p>)}
                    </div>
                  </div>
                )}

                <button onClick={handleLaunchBatch} disabled={launching || filteredRows.length === 0}
                  className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Zap size={14} className="inline mr-2" />
                  {launching ? 'Queuing calls…' : `Launch ${filteredRows.length} Calls via ${agentKey === 'cindy' ? 'Cindy' : 'Chris'}`}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Single call mode */
          <div className="space-y-3">
            <div>
              <label className="text-xs text-content-secondary block mb-1">Phone Number</label>
              <div className="flex gap-2">
                <input value={singleNumber} onChange={e => setSingleNumber(e.target.value)}
                  placeholder="+1 (702) 555-0000"
                  className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
                <button onClick={handleLaunchSingle} disabled={singleLoading || !singleNumber}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-deep disabled:opacity-40 transition-colors whitespace-nowrap">
                  <PhoneOutgoing size={14} className="inline mr-1.5" />
                  {singleLoading ? 'Calling…' : 'Call Now'}
                </button>
              </div>
              <p className="text-[10px] text-content-tertiary mt-1.5">
                Uses {agentKey === 'cindy' ? 'Cindy (AR Collections)' : 'Chris (Payer Follow-up)'} — no patient context passed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


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
    </ModuleShell>
  )
}
