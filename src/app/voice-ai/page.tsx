'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import {
  Phone, PhoneCall, PhoneMissed, Clock, X, Zap, BarChart2, Settings2,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, PhoneOutgoing, Activity,
  FileSpreadsheet, Eye, Trash2, Brain, TrendingUp, ChevronDown, ChevronUp,
  Save, RotateCcw, Sparkles, Target,
} from 'lucide-react'
import {
  useRetellCalls, useRetellBatches, useRetellAgents, useLaunchCall, useLaunchBatch,
  useCallsByAgent, usePayerAnalytics, useAgentPrompt, useUpdatePrompt, useAnalyzeCalls,
  formatDuration, formatCallStatus, RetellCall, PayerStat,
} from '@/lib/retell'
import { parseRetellExcel, ExcelParseResult } from '@/lib/retell-excel'
import { demoScripts } from '@/lib/demo-data'

function StatusDot({ status }: { status: RetellCall['call_status'] }) {
  const map: Record<string, string> = {
    ongoing: 'bg-emerald-500 animate-pulse', registered: 'bg-blue-500 animate-pulse',
    ended: 'bg-gray-400', error: 'bg-red-500',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] ?? 'bg-gray-400'}`} />
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment || sentiment === 'Unknown') return null
  const c = sentiment === 'Positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : sentiment === 'Negative' ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-content-secondary'
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c}`}>{sentiment}</span>
}

function CallDetailDrawer({ call, onClose }: { call: RetellCall; onClose: () => void }) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const isActive = call.call_status === 'ongoing' || call.call_status === 'registered'
  const { label: statusLabel, color: statusColor } = formatCallStatus(call.call_status)
  useEffect(() => { if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight }, [call.transcript])
  const lines = call.transcript_object ?? (call.transcript
    ? call.transcript.split('\n').filter(Boolean).map(l => ({ role: (l.startsWith('Agent:') ? 'agent' : 'user') as 'agent' | 'user', content: l.replace(/^(Agent|User):/, '').trim() }))
    : [])
  const vars = call.retell_llm_dynamic_variables ?? {}
  const payer = vars['Primary_Carrier_Name'] ?? vars['primary_carrier_name'] ?? ''
  const analysis = call.call_analysis
  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl animate-fade-in">
      <div className="p-4 border-b border-separator flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={call.call_status} />
            <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
            {analysis?.call_successful === true && <CheckCircle size={13} className="text-emerald-500" />}
            {analysis?.call_successful === false && <XCircle size={13} className="text-red-500" />}
          </div>
          <p className="text-xs text-content-secondary font-mono">{call.to_number}</p>
          {payer && <p className="text-[10px] text-brand mt-0.5">{payer}</p>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn transition-colors"><X size={16} className="text-content-secondary" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 grid grid-cols-3 gap-3 border-b border-separator">
          {[{ label: 'Duration', value: formatDuration(call.duration_ms) }, { label: 'Sentiment', value: analysis?.user_sentiment ?? '—' }, { label: 'Outcome', value: analysis?.call_successful ? 'Resolved' : 'Ended' }].map(s => (
            <div key={s.label} className="bg-surface-elevated rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-content-tertiary mb-1">{s.label}</p>
              <p className="text-xs font-semibold text-content-primary">{s.value}</p>
            </div>
          ))}
        </div>
        {analysis?.call_summary && <div className="p-4 border-b border-separator"><h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">AI Summary</h4><p className="text-xs text-content-primary leading-relaxed">{analysis.call_summary}</p></div>}
        <div className="p-4 border-b border-separator">
          <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Transcript</h4>
          <div ref={transcriptRef} className="bg-surface-elevated rounded-lg p-3 h-52 overflow-y-auto text-[11px] space-y-2">
            {lines.length > 0 ? (
              <>{lines.map((l, i) => <div key={i} className="flex gap-2"><span className={`shrink-0 font-semibold ${l.role === 'agent' ? 'text-brand' : 'text-content-secondary'}`}>[{l.role === 'agent' ? 'AI' : 'Rep'}]</span><span className="text-content-primary leading-relaxed">{l.content}</span></div>)}
              {isActive && <div className="flex gap-2"><span className="shrink-0 font-semibold text-brand">[AI]</span><span className="inline-block w-2 h-3 bg-brand animate-pulse rounded-sm mt-0.5" /></div>}</>
            ) : <span className="text-content-tertiary">{isActive ? 'In progress…' : 'No transcript'}</span>}
          </div>
        </div>
        {Object.keys(vars).length > 0 && (
          <div className="p-4">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Call Context</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {Object.entries(vars).slice(0, 20).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs"><span className="text-content-tertiary capitalize">{k.replace(/_/g, ' ')}</span><span className="text-content-primary font-medium ml-4 max-w-[200px] truncate">{String(v)}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 1: Live Calls ─────────────────────────────────────────────────────────
function ActiveCallsTab() {
  const { calls, loading, fallback, refetch } = useRetellCalls('ongoing')
  const { calls: allCalls } = useRetellCalls()
  const [sel, setSel] = useState<RetellCall | null>(null)
  const today = allCalls.filter(c => c.start_timestamp && Date.now() - c.start_timestamp < 86400000)
  const sr = today.length > 0 ? Math.round(today.filter(c => c.call_analysis?.call_successful).length / today.length * 100) : 0
  const avgDur = today.length > 0 ? formatDuration(today.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / today.length) : '—'
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="grid grid-cols-4 gap-4 flex-1">
          <KPICard label="Today" value={today.length} icon={<Phone size={20} />} />
          <KPICard label="Live Now" value={calls.length} icon={<Activity size={20} />} />
          <KPICard label="Avg Duration" value={avgDur} icon={<Clock size={20} />} />
          <KPICard label="Success Rate" value={`${sr}%`} icon={<CheckCircle size={20} />} />
        </div>
        <button onClick={refetch} className="ml-4 p-2 hover:bg-surface-elevated rounded-btn text-content-secondary transition-colors"><RefreshCw size={15} /></button>
      </div>
      {fallback && <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle size={13} />Demo data — add RETELL_API_KEY to Vercel</div>}
      {loading ? <div className="card p-12 text-center text-sm text-content-tertiary">Loading…</div>
      : calls.length === 0 ? <div className="card p-12 text-center"><Phone size={32} className="mx-auto mb-3 text-content-tertiary opacity-40" /><p className="text-sm text-content-secondary">No active calls</p></div>
      : <div className="card overflow-hidden"><table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary"><th className="text-left px-4 py-3 w-8"></th><th className="text-left px-4 py-3">Number</th><th className="text-left px-4 py-3">Payer</th><th className="text-left px-4 py-3">Duration</th><th className="text-left px-4 py-3">Status</th></tr></thead>
          <tbody>{calls.map(c => { const { label, color } = formatCallStatus(c.call_status); const payer = c.retell_llm_dynamic_variables?.['Primary_Carrier_Name'] ?? '—'; return (
            <tr key={c.call_id} onClick={() => setSel(c)} className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3"><StatusDot status={c.call_status} /></td>
              <td className="px-4 py-3 font-mono text-xs">{c.to_number}</td>
              <td className="px-4 py-3 text-xs text-brand">{payer}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatDuration(c.duration_ms)}</td>
              <td className="px-4 py-3"><span className={`text-[11px] font-medium ${color}`}>{label}</span></td>
            </tr>
          )})}</tbody>
        </table></div>}
      {sel && <><div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSel(null)} /><CallDetailDrawer call={sel} onClose={() => setSel(null)} /></>}
    </div>
  )
}

// ── Tab 2: Call Log — Chris & Cindy, payer filter, pagination ─────────────────
function CallLogTab() {
  const [agent, setAgent] = useState<'chris' | 'cindy'>('chris')
  const [payerFilter, setPayerFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [sel, setSel] = useState<RetellCall | null>(null)
  const { calls, loading, loadMore, hasMore, refetch } = useCallsByAgent(agent, 'ended')

  const payers = Array.from(new Set(calls.map(c => c.retell_llm_dynamic_variables?.['Primary_Carrier_Name'] ?? c.retell_llm_dynamic_variables?.['primaryinsurance'] ?? '').filter(Boolean))).sort()
  const filtered = calls.filter(c => {
    const p = c.retell_llm_dynamic_variables?.['Primary_Carrier_Name'] ?? ''
    if (payerFilter && p !== payerFilter) return false
    if (outcomeFilter === 'success' && !c.call_analysis?.call_successful) return false
    if (outcomeFilter === 'failed' && c.call_analysis?.call_successful !== false) return false
    return true
  })
  const successCount = calls.filter(c => c.call_analysis?.call_successful).length
  const avgDur = calls.length > 0 ? formatDuration(calls.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / calls.length) : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
          {(['chris', 'cindy'] as const).map(a => (
            <button key={a} onClick={() => { setAgent(a); setPayerFilter('') }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${agent === a ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary hover:text-content-primary'}`}>
              {a === 'chris' ? '📞 Chris — Payer' : '💰 Cindy — AR'}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} className="p-2 hover:bg-surface-elevated rounded-btn text-content-secondary transition-colors"><RefreshCw size={15} /></button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Total Loaded" value={calls.length} icon={<Phone size={20} />} />
        <KPICard label="Resolved" value={successCount} icon={<CheckCircle size={20} />} />
        <KPICard label="Success Rate" value={calls.length > 0 ? `${Math.round(successCount / calls.length * 100)}%` : '—'} icon={<TrendingUp size={20} />} />
        <KPICard label="Avg Duration" value={avgDur} icon={<Clock size={20} />} />
      </div>
      <div className="flex gap-3 mb-4">
        <select value={payerFilter} onChange={e => setPayerFilter(e.target.value)} className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Payers ({calls.length})</option>
          {payers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)} className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Outcomes</option><option value="success">Resolved</option><option value="failed">Failed</option>
        </select>
        <span className="ml-auto text-xs text-content-tertiary self-center">{filtered.length} shown{hasMore ? ' — more available' : ''}</span>
      </div>
      {loading ? <div className="card p-12 text-center text-sm text-content-tertiary">Loading…</div> : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3">{agent === 'chris' ? 'Payer' : 'Patient'}</th>
                <th className="text-left px-4 py-3">Duration</th><th className="text-left px-4 py-3">Outcome</th>
                <th className="text-left px-4 py-3">Sentiment</th><th className="text-left px-4 py-3">Summary</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => {
                  const v = c.retell_llm_dynamic_variables ?? {}
                  const lbl = agent === 'chris' ? (v['Primary_Carrier_Name'] ?? '—') : ([v['patientfirstname'], v['patientlastname']].filter(Boolean).join(' ') || '—')
                  return (
                    <tr key={c.call_id} onClick={() => setSel(c)} className="border-b border-separator last:border-0 cursor-pointer hover:bg-surface-elevated transition-colors">
                      <td className="px-4 py-3 text-xs text-content-secondary">{c.start_timestamp ? new Date(c.start_timestamp).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.to_number}</td>
                      <td className="px-4 py-3 text-xs">{lbl}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatDuration(c.duration_ms)}</td>
                      <td className="px-4 py-3">
                        {c.call_analysis?.call_successful === true ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Resolved</span>
                        : c.call_analysis?.call_successful === false ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Failed</span>
                        : <span className="text-[10px] text-content-tertiary">—</span>}
                      </td>
                      <td className="px-4 py-3"><SentimentBadge sentiment={c.call_analysis?.user_sentiment} /></td>
                      <td className="px-4 py-3 text-xs text-content-secondary max-w-[200px] truncate">{c.call_analysis?.call_summary ?? '—'}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-content-tertiary">No calls found</td></tr>}
              </tbody>
            </table>
          </div>
          {hasMore && <div className="mt-4 text-center"><button onClick={loadMore} className="px-6 py-2 text-xs font-medium border border-separator rounded-lg text-content-secondary hover:text-content-primary hover:border-brand/30 transition-colors">Load More</button></div>}
        </>
      )}
      {sel && <><div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSel(null)} /><CallDetailDrawer call={sel} onClose={() => setSel(null)} /></>}
    </div>
  )
}

// ── Tab 3: Campaign Launcher ──────────────────────────────────────────────────
function CampaignLauncherTab() {
  const { toast } = useToast()
  const { agents } = useRetellAgents()
  const { batches, loading: batchLoading } = useRetellBatches()
  const { launch: launchBatch, loading: launching } = useLaunchBatch()
  const { launch: launchCall, loading: singleLoading } = useLaunchCall()
  const [mode, setMode] = useState<'excel' | 'single'>('excel')
  const [agentKey, setAgentKey] = useState<'chris' | 'cindy'>('cindy')
  const [parsed, setParsed] = useState<ExcelParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [filterPractice, setFilterPractice] = useState('all')
  const [singleNum, setSingleNum] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const rows = parsed ? (filterPractice === 'all' ? parsed.rows : parsed.rows.filter((r: {phone: string; variables: Record<string,string>; raw: Record<string,unknown>}) => (r.variables['practicename'] ?? '') === filterPractice)) : []

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setParsing(true); setParsed(null)
    try {
      const res = await parseRetellExcel(file); setParsed(res)
      if (res.agentDetected) setAgentKey(res.agentDetected)
      toast[res.errors.length > 0 ? 'warning' : 'success'](`${res.rows.length} contacts ready${res.errors.length > 0 ? ` — ${res.errors.length} skipped` : ''}`)
    } catch (err) { toast.error(`Parse failed: ${err}`) }
    finally { setParsing(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-2 space-y-3">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Past Campaigns</h3>
        {batchLoading ? <div className="text-xs text-content-tertiary p-4">Loading…</div>
        : batches.length === 0 ? <div className="card p-6 text-center text-xs text-content-tertiary">No campaigns yet</div>
        : batches.map(b => (
          <div key={b.batch_id} className="card p-4">
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-sm font-semibold text-content-primary truncate pr-2">{b.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${b.status === 'running' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : b.status === 'completed' ? 'bg-brand/10 text-brand' : 'bg-amber-500/10 text-amber-500'}`}>{b.status}</span>
            </div>
            <div className="flex gap-3 text-[10px] text-content-secondary">{b.completed_count}/{b.total_count} completed{b.failed_count > 0 && <span className="text-red-500 ml-1">{b.failed_count} failed</span>}</div>
            {b.total_count > 0 && <div className="mt-2 h-1.5 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${Math.round(b.completed_count / b.total_count * 100)}%` }} /></div>}
          </div>
        ))}
      </div>

      <div className="col-span-3 card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">Launch Calls</h3>
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-0.5">
            {(['excel', 'single'] as const).map(m => <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === m ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'}`}>{m === 'excel' ? '📊 Excel' : '📞 Single'}</button>)}
          </div>
        </div>

        <div className="flex gap-2">
          {([{ key: 'cindy' as const, name: 'Cindy', role: 'AR Collections' }, { key: 'chris' as const, name: 'Chris', role: 'Payer Follow-up' }]).map(a => (
            <button key={a.key} onClick={() => { setAgentKey(a.key); setParsed(null) }}
              className={`flex-1 p-3 rounded-lg border text-left transition-all ${agentKey === a.key ? 'border-brand/40 bg-brand/5' : 'border-separator hover:border-brand/20'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-2 h-2 rounded-full ${agents.find(ag => ag.name.toLowerCase() === a.key)?.configured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span className="text-xs font-semibold text-content-primary">{a.name}</span>
              </div>
              <p className="text-[10px] text-content-tertiary">{a.role}</p>
            </button>
          ))}
        </div>

        {mode === 'excel' ? (!parsed ? (
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-brand/30 rounded-xl p-8 text-center cursor-pointer hover:border-brand/60 hover:bg-brand/5 transition-all group">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <FileSpreadsheet size={32} className="mx-auto mb-3 text-brand/40 group-hover:text-brand/60 transition-colors" />
            {parsing ? <p className="text-sm text-content-secondary">Parsing…</p> : <><p className="text-sm font-medium text-content-primary mb-1">Drop Excel file or click to browse</p><p className="text-xs text-content-tertiary">Same format as Retell — all columns become call variables</p></>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-emerald-500" />
                <div><p className="text-xs font-semibold text-content-primary">{parsed.fileName}</p><p className="text-[10px] text-content-secondary">{parsed.rows.length} contacts · {parsed.columns.length} columns{parsed.agentDetected && <span className="ml-1 text-brand">· {parsed.agentDetected}</span>}</p></div>
              </div>
              <button onClick={() => setParsed(null)} className="p-1 hover:bg-surface-elevated rounded text-content-tertiary hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
            {parsed.practiceNames.length > 1 && (
              <select value={filterPractice} onChange={e => setFilterPractice(e.target.value)} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-primary">
                <option value="all">All Practices ({parsed.rows.length})</option>
                {parsed.practiceNames.map((p: string) => { const cnt = parsed.rows.filter((r: {phone: string; variables: Record<string,string>; raw: Record<string,unknown>}) => (r.variables['practicename'] ?? '') === p).length; return <option key={p} value={p}>{p} ({cnt})</option> })}
              </select>
            )}
            <div className="border border-separator rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-surface-elevated border-b border-separator flex items-center justify-between">
                <span className="text-[10px] font-semibold text-content-secondary uppercase tracking-wide">Preview — {rows.length} calls</span>
                <Eye size={12} className="text-content-tertiary" />
              </div>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-surface-secondary"><tr className="border-b border-separator text-content-tertiary">
                    <th className="text-left px-3 py-1.5">#</th><th className="text-left px-3 py-1.5">Phone</th>
                    {agentKey === 'cindy' ? <><th className="text-left px-3 py-1.5">Patient</th><th className="text-left px-3 py-1.5">Balance</th><th className="text-left px-3 py-1.5">Aging</th></>
                    : <><th className="text-left px-3 py-1.5">Patient</th><th className="text-left px-3 py-1.5">Payer</th><th className="text-left px-3 py-1.5">Charge</th></>}
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 50).map((r: {phone: string; variables: Record<string,string>; raw: Record<string,unknown>}, i: number) => (
                      <tr key={i} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                        <td className="px-3 py-1.5 text-content-tertiary">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono">{r.phone}</td>
                        {agentKey === 'cindy' ? (
                          <><td className="px-3 py-1.5">{[r.variables['patientfirstname'], r.variables['patientlastname']].filter(Boolean).join(' ') || '—'}</td>
                          <td className="px-3 py-1.5 text-emerald-600 dark:text-emerald-400 font-medium">{r.variables['patientbalance'] ? `$${Number(r.variables['patientbalance']).toLocaleString()}` : '—'}</td>
                          <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${r.variables['aginggroup']?.includes('180') ? 'bg-red-500/10 text-red-500' : 'bg-surface-elevated text-content-secondary'}`}>{r.variables['aginggroup'] || '—'}</span></td></>
                        ) : (
                          <><td className="px-3 py-1.5">{r.variables['patient_name'] || '—'}</td>
                          <td className="px-3 py-1.5">{r.variables['primary_carrier_name'] || '—'}</td>
                          <td className="px-3 py-1.5 font-medium">{r.variables['total_charge'] ? `$${Number(r.variables['total_charge']).toLocaleString()}` : '—'}</td></>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {parsed.errors.length > 0 && <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"><p className="text-[10px] text-amber-500 font-medium">{parsed.errors.length} rows skipped (invalid phones)</p></div>}
            <button onClick={async () => {
              if (!rows.length) { toast.error('No rows'); return }
              try { await launchBatch({ agent_name: agentKey, batch_name: parsed?.fileName.replace(/\.xlsx?$/, '') ?? 'Campaign', recipients: rows.map((r: {phone: string; variables: Record<string,string>}) => ({ to_number: r.phone, variables: r.variables })) }); toast.success(`${rows.length} calls queued`); setParsed(null) }
              catch (e) { toast.error(`Failed: ${e}`) }
            }} disabled={launching || !rows.length} className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 transition-colors">
              <Zap size={14} className="inline mr-2" />{launching ? 'Queuing…' : `Launch ${rows.length} Calls via ${agentKey === 'cindy' ? 'Cindy' : 'Chris'}`}
            </button>
          </div>
        )) : (
          <div><label className="text-xs text-content-secondary block mb-1">Phone Number</label>
            <div className="flex gap-2">
              <input value={singleNum} onChange={e => setSingleNum(e.target.value)} placeholder="+1 (702) 555-0000"
                className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
              <button onClick={async () => {
                if (!singleNum) { toast.error('Enter a number'); return }
                try { await launchCall({ agent_name: agentKey, to_number: singleNum }); toast.success('Call initiated'); setSingleNum('') }
                catch (e) { toast.error(`Failed: ${e}`) }
              }} disabled={singleLoading || !singleNum} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-deep disabled:opacity-40 transition-colors">
                <PhoneOutgoing size={14} className="inline mr-1.5" />{singleLoading ? 'Calling…' : 'Call'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 4: Payer Intelligence ─────────────────────────────────────────────────
function PayerIntelligenceTab() {
  const { payers, loading, fallback } = usePayerAnalytics()
  const { agent: chrisAgent } = useAgentPrompt('chris')
  const { analyze, loading: analyzing, result } = useAnalyzeCalls()
  const { update: updatePrompt, loading: saving } = useUpdatePrompt()
  const { toast } = useToast()
  const [sel, setSel] = useState<PayerStat | null>(null)
  const [playbook, setPlaybook] = useState('')
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(false)

  const rc = (r: number) => r >= 70 ? 'text-emerald-600 dark:text-emerald-400' : r >= 50 ? 'text-amber-500' : 'text-red-500'

  async function analyze_(payer: PayerStat) {
    setSel(payer); setPlaybook(''); setSaved(false)
    if (!chrisAgent?.general_prompt) { toast.error('Chris prompt not loaded'); return }
    setFetching(true)
    try {
      const d = await fetch('/api/retell?action=list-calls&limit=100').then(r => r.json())
      const allCalls: RetellCall[] = d.call_list ?? []
      const t = allCalls.filter(c => (c.retell_llm_dynamic_variables?.['Primary_Carrier_Name'] ?? '') === payer.name && c.transcript).map(c => c.transcript!).slice(0, 20)
      if (t.length < 2) { toast.warning('Not enough transcript data yet'); return }
      const res = await analyze({ agent_name: 'chris', current_prompt: chrisAgent.general_prompt, call_transcripts: t, focus: 'payer', payer_name: payer.name })
      if (res?.playbook) setPlaybook(res.playbook)
    } catch (e) { toast.error(`Failed: ${e}`) }
    finally { setFetching(false) }
  }

  async function savePlaybook() {
    if (!chrisAgent?.general_prompt || !playbook || !sel) return
    try {
      await updatePrompt('chris', `${chrisAgent.general_prompt}\n\n---\n\n# Payer-Specific Rules → ${sel.name}\n\n${playbook}`)
      toast.success(`${sel.name} playbook is now live in Chris`)
      setSaved(true)
    } catch (e) { toast.error(`Failed: ${e}`) }
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-2 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Payer Performance — Chris</h3>
          {fallback && <span className="text-[10px] text-amber-500">demo</span>}
        </div>
        {loading ? <div className="text-xs text-content-tertiary p-4">Loading…</div>
        : payers.length === 0 ? <div className="card p-6 text-center text-xs text-content-tertiary">No data yet</div>
        : payers.map(p => (
          <button key={p.name} onClick={() => analyze_(p)}
            className={`w-full text-left card p-4 hover:border-brand/30 transition-all ${sel?.name === p.name ? 'border-brand/40 bg-brand/5' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-content-primary truncate pr-2">{p.name}</p>
              <span className={`text-xs font-bold ${rc(p.successRate)}`}>{p.successRate}%</span>
            </div>
            <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${p.successRate >= 70 ? 'bg-emerald-500' : p.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${p.successRate}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-content-tertiary">
              <span>{p.total} calls</span>
              {p.hasPlaybookData && <span className="text-brand flex items-center gap-1"><Brain size={9} />Analyzable</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="col-span-3">
        {!sel ? (
          <div className="card p-12 text-center h-full flex flex-col items-center justify-center gap-3">
            <Target size={36} className="text-content-tertiary opacity-40" />
            <p className="text-sm font-medium text-content-secondary">Select a payer to generate a playbook</p>
            <p className="text-xs text-content-tertiary max-w-xs">Claude reads call transcripts and identifies exactly where Chris gets stuck — then writes specific IVR instructions to fix it</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h3 className="text-base font-semibold text-content-primary">{sel.name}</h3><p className="text-xs text-content-secondary">{sel.total} calls · {sel.successRate}% success</p></div>
              {!analyzing && !fetching && <button onClick={() => analyze_(sel)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-brand/30 text-brand rounded-lg hover:bg-brand/5 transition-colors"><Sparkles size={12} />Re-analyze</button>}
            </div>
            {(analyzing || fetching) && <div className="card p-8 text-center"><Brain size={20} className="mx-auto mb-3 text-brand animate-pulse" /><p className="text-sm text-content-secondary">{fetching ? 'Fetching transcripts…' : 'Claude analyzing IVR patterns…'}</p></div>}
            {result && !analyzing && !fetching && (
              <>
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Analysis</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${result.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>{result.confidence} confidence</span>
                  </div>
                  <p className="text-xs text-content-primary leading-relaxed">{result.summary}</p>
                </div>
                {result.issues.length > 0 && (
                  <div className="card p-4">
                    <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Issues</h4>
                    <div className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div key={i} className={`rounded-lg p-3 border-l-2 ${issue.severity === 'high' ? 'bg-red-500/5 border-red-500' : issue.severity === 'medium' ? 'bg-amber-500/5 border-amber-500' : 'bg-blue-500/5 border-blue-500'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase ${issue.severity === 'high' ? 'text-red-500' : issue.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'}`}>{issue.severity}</span>
                            <span className="text-xs font-semibold text-content-primary">{issue.title}</span>
                          </div>
                          <p className="text-xs text-content-secondary">{issue.description}</p>
                          {issue.evidence && <p className="text-[10px] font-mono text-content-tertiary bg-surface-elevated rounded px-2 py-1 mt-1.5 italic">"{issue.evidence}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(result.playbook || playbook) && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div><h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Generated Playbook</h4><p className="text-[10px] text-content-tertiary mt-0.5">Edit if needed, then push live</p></div>
                      {!saved
                        ? <button onClick={savePlaybook} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-deep disabled:opacity-40 transition-colors"><Save size={12} />{saving ? 'Pushing…' : 'Push to Chris'}</button>
                        : <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle size={13} />Live in Retell</span>}
                    </div>
                    <textarea value={playbook || result.playbook || ''} onChange={e => setPlaybook(e.target.value)} rows={12}
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-xs text-content-primary font-mono outline-none focus:border-brand/40 resize-y" />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 5: Prompt Hub ─────────────────────────────────────────────────────────
function PromptHubTab() {
  const { toast } = useToast()
  const [activeAgent, setActiveAgent] = useState<'chris' | 'cindy'>('chris')
  const { agent, loading: promptLoading, refetch } = useAgentPrompt(activeAgent)
  const { update, loading: saving } = useUpdatePrompt()
  const { analyze, loading: analyzing, result } = useAnalyzeCalls()
  const { calls: agentCalls } = useCallsByAgent(activeAgent, 'ended')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [versions, setVersions] = useState<{ ts: string; prompt: string }[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [activeSugg, setActiveSugg] = useState<number | null>(null)

  useEffect(() => { if (agent?.general_prompt) { setEditedPrompt(agent.general_prompt); setIsDirty(false) } }, [agent?.general_prompt])

  async function handleSave() {
    if (!isDirty) return
    if (agent?.general_prompt) setVersions(p => [{ ts: new Date().toLocaleTimeString(), prompt: agent.general_prompt }, ...p.slice(0, 9)])
    try { await update(activeAgent, editedPrompt); toast.success(`${activeAgent === 'chris' ? 'Chris' : 'Cindy'} updated`); setIsDirty(false); refetch() }
    catch (e) { toast.error(`Failed: ${e}`) }
  }

  async function handleAnalyze() {
    if (!agent?.general_prompt) { toast.error('Prompt not loaded'); return }
    const t = agentCalls.filter(c => c.transcript).map(c => c.transcript!).slice(0, 30)
    if (t.length < 3) { toast.warning('Need at least 3 completed calls'); return }
    await analyze({ agent_name: activeAgent, current_prompt: editedPrompt || agent.general_prompt, call_transcripts: t, focus: 'general' })
  }

  function apply(i: number) {
    const s = result?.suggestions[i]; if (!s) return
    if (s.current && editedPrompt.includes(s.current)) setEditedPrompt(p => p.replace(s.current, s.suggested))
    else setEditedPrompt(p => `${p}\n\n${s.suggested}`)
    setIsDirty(true); setActiveSugg(null); toast.success('Applied — push when ready')
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
            {(['chris', 'cindy'] as const).map(a => <button key={a} onClick={() => setActiveAgent(a)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeAgent === a ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'}`}>{a === 'chris' ? 'Chris — Payer' : 'Cindy — AR'}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowVersions(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-separator rounded-lg text-content-secondary hover:text-content-primary transition-colors"><RotateCcw size={12} />History ({versions.length})</button>
            {isDirty && <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-deep disabled:opacity-40 transition-colors"><Save size={12} />{saving ? 'Pushing…' : 'Push to Retell'}</button>}
          </div>
        </div>

        {showVersions && versions.length > 0 && (
          <div className="card p-3 space-y-2">
            <p className="text-[11px] font-semibold text-content-secondary uppercase tracking-wide mb-1">Version History</p>
            {versions.map((v, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-elevated rounded-lg">
                <div><p className="text-xs font-medium text-content-primary">Saved {v.ts}</p><p className="text-[10px] text-content-tertiary">{v.prompt.slice(0, 60)}…</p></div>
                <button onClick={() => { setEditedPrompt(v.prompt); setIsDirty(true); setShowVersions(false); toast.info('Restored') }} className="text-[10px] px-2 py-1 border border-separator rounded text-content-secondary hover:text-brand hover:border-brand/30 transition-colors">Restore</button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          {promptLoading ? <div className="card p-12 text-center text-sm text-content-tertiary">Loading prompt from Retell…</div> : (
            <>
              <textarea value={editedPrompt} onChange={e => { setEditedPrompt(e.target.value); setIsDirty(true) }} rows={30}
                placeholder="Prompt will load from Retell…"
                className="w-full bg-surface-elevated border border-separator rounded-xl px-4 py-3 text-xs text-content-primary font-mono outline-none focus:border-brand/40 resize-y leading-relaxed" />
              {isDirty && <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Unsaved</span></div>}
            </>
          )}
        </div>
        {agent && <p className="text-[10px] text-content-tertiary">{editedPrompt.length} chars · {editedPrompt.split('\n').length} lines{agent.last_modification_timestamp && ` · Updated ${new Date(agent.last_modification_timestamp * 1000).toLocaleString()}`}</p>}
      </div>

      <div className="col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">AI Optimization</h3>
          <button onClick={handleAnalyze} disabled={analyzing || agentCalls.length < 3} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-deep disabled:opacity-40 transition-colors"><Sparkles size={12} />{analyzing ? 'Analyzing…' : 'Analyze Calls'}</button>
        </div>
        <div className="px-3 py-2.5 bg-surface-elevated rounded-lg text-xs text-content-secondary">
          <p className="font-medium text-content-primary mb-1">How it works</p>
          <p>Claude reads your last {Math.min(agentCalls.length, 30)} transcripts and suggests exact prompt edits based on what's failing.</p>
          {agentCalls.length < 3 && <p className="text-amber-500 mt-1.5">Need at least 3 completed calls.</p>}
        </div>
        {analyzing && <div className="card p-6 text-center"><Brain size={24} className="mx-auto mb-3 text-brand animate-pulse" /><p className="text-sm text-content-secondary">Reading transcripts…</p></div>}
        {result && !analyzing && (
          <div className="space-y-3">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Summary</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${result.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>{result.confidence}</span>
              </div>
              <p className="text-xs text-content-primary leading-relaxed">{result.summary}</p>
            </div>
            {result.suggestions.length > 0 && (
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Suggestions ({result.suggestions.length})</h4>
                <div className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className={`rounded-lg border transition-all ${activeSugg === i ? 'border-brand/40 bg-brand/5' : 'border-separator'}`}>
                      <button className="w-full text-left p-3 flex items-center justify-between" onClick={() => setActiveSugg(activeSugg === i ? null : i)}>
                        <div className="flex items-center gap-2 flex-1 min-w-0"><span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-medium shrink-0">{s.section}</span><span className="text-xs text-content-secondary truncate">{s.rationale.slice(0, 50)}…</span></div>
                        {activeSugg === i ? <ChevronUp size={14} className="text-content-tertiary shrink-0 ml-2" /> : <ChevronDown size={14} className="text-content-tertiary shrink-0 ml-2" />}
                      </button>
                      {activeSugg === i && (
                        <div className="px-3 pb-3 space-y-2">
                          <p className="text-xs text-content-secondary">{s.rationale}</p>
                          {s.current && <div className="bg-red-500/5 border border-red-500/20 rounded p-2"><p className="text-[10px] text-red-500 font-semibold mb-1">CURRENT</p><p className="text-[10px] font-mono text-content-secondary">{s.current}</p></div>}
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2"><p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">SUGGESTED</p><p className="text-[10px] font-mono text-content-primary">{s.suggested}</p></div>
                          <button onClick={() => apply(i)} className="w-full py-1.5 bg-brand/10 text-brand text-xs font-medium rounded hover:bg-brand/20 transition-colors">Apply to Prompt</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.issues.length > 0 && (
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3">Issues ({result.issues.length})</h4>
                <div className="space-y-2">
                  {result.issues.slice(0, 5).map((issue, i) => (
                    <div key={i} className={`p-2.5 rounded-lg border-l-2 ${issue.severity === 'high' ? 'bg-red-500/5 border-red-500' : issue.severity === 'medium' ? 'bg-amber-500/5 border-amber-500' : 'bg-blue-500/5 border-blue-500'}`}>
                      <div className="flex items-center gap-2 mb-0.5"><span className={`text-[9px] font-bold uppercase ${issue.severity === 'high' ? 'text-red-500' : issue.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'}`}>{issue.severity}</span><span className="text-xs font-medium text-content-primary">{issue.title}</span></div>
                      <p className="text-[11px] text-content-secondary">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'active', label: 'Live Calls', icon: PhoneCall },
  { id: 'log', label: 'Call Log', icon: PhoneMissed },
  { id: 'campaign', label: 'Campaign Launcher', icon: BarChart2 },
  { id: 'payer', label: 'Payer Intelligence', icon: Target },
  { id: 'prompt', label: 'Prompt Hub', icon: Brain },
] as const
type TabId = typeof TABS[number]['id']

export default function VoiceAIPage() {
  const [tab, setTab] = useState<TabId>('active')
  const { t } = useT()
  return (
    <ModuleShell title={t('voice', 'title')} subtitle="Retell AI — live calls, payer intelligence, AI prompt optimization">
      <div className="flex gap-1 mb-5 border-b border-separator overflow-x-auto">
        {TABS.map(tb => { const Icon = tb.icon; return (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === tb.id ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>
            <Icon size={14} />{tb.label}
          </button>
        )})}
      </div>
      {tab === 'active' && <ActiveCallsTab />}
      {tab === 'log' && <CallLogTab />}
      {tab === 'campaign' && <CampaignLauncherTab />}
      {tab === 'payer' && <PayerIntelligenceTab />}
      {tab === 'prompt' && <PromptHubTab />}
    </ModuleShell>
  )
}
