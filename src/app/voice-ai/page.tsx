'use client'
import React, { useState, useEffect, useRef } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import {
  Phone, PhoneCall, PhoneMissed, Clock, Play, X, ChevronRight,
  Plus, Edit2, Zap, BarChart2, Settings2, Radio, AlertTriangle
} from 'lucide-react'
import {
  demoActiveCalls, demoCallLog, demoCampaigns, demoScripts,
  DemoCall, DemoCampaign, DemoScript
} from '@/lib/demo-data'
import { useApp } from '@/lib/context'

// ─── Status Dot ───────────────────────────────────────────────────────────
function StatusDot({ status }: { status: DemoCall['status'] }) {
  const map: Record<string, string> = {
    connected: 'bg-emerald-500 animate-pulse',
    on_hold: 'bg-amber-500 animate-pulse',
    ivr: 'bg-blue-500 animate-pulse',
    queued: 'bg-gray-400',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] ?? 'bg-gray-400'}`} />
}

// ─── Call Detail Drawer ───────────────────────────────────────────────────
function CallDetailDrawer({ call, onClose }: { call: DemoCall; onClose: () => void }) {
  const { toast } = useToast()
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [outcome, setOutcome] = useState(call.outcome ?? '')
  const isActive = ['connected', 'on_hold', 'ivr'].includes(call.status)

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [call.id])

  const roleColor: Record<string, string> = {
    AI: 'text-brand font-semibold',
    IVR: 'text-amber-500 font-semibold',
    REP: 'text-emerald-500 font-semibold',
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl animate-fade-in">
      <div className="p-4 border-b border-separator flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={call.status} />
            <span className="text-sm font-semibold text-content-primary">{call.type}</span>
          </div>
          <p className="text-xs text-content-secondary">{call.target}</p>
          {call.claimRef && <p className="text-[10px] text-content-tertiary mt-0.5">Ref: {call.claimRef}</p>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn transition-colors">
          <X size={16} className="text-content-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Live Transcript */}
        <div className="p-4 border-b border-separator">
          <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Live Transcript</h4>
          <div ref={transcriptRef} className="bg-surface-elevated rounded-lg p-3 h-52 overflow-y-auto font-mono text-[11px] space-y-2">
            {call.transcript && call.transcript.length > 0 ? (
              <>
                {call.transcript.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <span className={`shrink-0 w-8 ${roleColor[t.role] ?? 'text-content-secondary'}`}>[{t.role}]</span>
                    <span className="text-content-primary leading-relaxed">{t.text}</span>
                  </div>
                ))}
                {isActive && (
                  <div className="flex gap-2">
                    <span className={`shrink-0 w-8 ${roleColor['AI']}`}>[AI]</span>
                    <span className="inline-block w-2 h-3 bg-brand animate-pulse rounded-sm mt-0.5" />
                  </div>
                )}
              </>
            ) : (
              <span className="text-content-tertiary">Awaiting call start...</span>
            )}
          </div>
        </div>

        {/* IVR Progress */}
        {call.ivrSteps && call.ivrSteps.length > 0 && (
          <div className="p-4 border-b border-separator">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-3">IVR Progress</h4>
            <div className="flex items-center gap-1 flex-wrap">
              {call.ivrSteps.map((step, i) => (
                <React.Fragment key={i}>
                  <div className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                    step.done ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    step.current ? 'bg-brand/20 text-brand border border-brand/30' :
                    'bg-surface-elevated text-content-tertiary'
                  }`}>
                    {step.done && <span className="mr-1">✓</span>}
                    {step.label}
                  </div>
                  {i < call.ivrSteps!.length - 1 && <ChevronRight size={10} className="text-content-tertiary shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Linked Claim */}
        {call.claimRef && (
          <div className="p-4 border-b border-separator">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Linked Claim</h4>
            <button
              onClick={() => toast.info(`Opening claim ${call.claimRef}...`)}
              className="w-full text-left card p-3 hover:border-brand/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand">{call.claimRef}</p>
                  <p className="text-[10px] text-content-secondary">{call.target.split('—')[0].trim()}</p>
                </div>
                <ChevronRight size={14} className="text-content-tertiary group-hover:text-brand transition-colors" />
              </div>
            </button>
          </div>
        )}

        {/* Outcome for completed */}
        {call.status === 'completed' && (
          <div className="p-4">
            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-2">Outcome</h4>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"
            >
              <option value="">Select outcome...</option>
              {['Got Status', 'Voicemail', 'Transferred', 'Failed'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isActive && (
        <div className="p-4 border-t border-separator">
          <button
            onClick={() => { toast.success('Call transferred to your extension'); onClose() }}
            className="w-full border-2 border-red-500/50 text-red-500 rounded-lg py-2.5 text-sm font-medium hover:bg-red-500/10 transition-colors"
          >
            <Phone size={14} className="inline mr-2" />
            Take Over (Transfer to Extension)
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab 1: Active Calls ──────────────────────────────────────────────────
function ActiveCallsTab() {
  const { toast } = useToast()
  const [selectedCall, setSelectedCall] = useState<DemoCall | null>(null)

  const { selectedClient, country } = useApp()
  const uaeOrgIds = ['org-101', 'org-104']
  const usOrgIds = ['org-102', 'org-103']

  const filteredCalls = demoActiveCalls.filter(c => {
    if (selectedClient) return c.clientId === selectedClient.id
    if (country === 'uae') return uaeOrgIds.includes(c.clientId)
    if (country === 'usa') return usOrgIds.includes(c.clientId)
    return true
  })

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label="Calls Today" value={47} icon={<Phone size={20} />} />
        <KPICard label="Avg Duration" value="4:32" icon={<Clock size={20} />} />
        <KPICard label="Success Rate" value="78%" />
        <KPICard label="On Hold Right Now" value={filteredCalls.filter(c => c.status === 'on_hold').length} icon={<PhoneCall size={20} />} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-separator text-xs text-content-secondary">
              <th className="text-left px-4 py-3 w-8"></th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Target</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Stage</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.map(call => (
              <tr key={call.id} onClick={() => setSelectedCall(call)}
                className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
                <td className="px-4 py-3"><StatusDot status={call.status} /></td>
                <td className="px-4 py-3 text-xs font-medium">{call.type}</td>
                <td className="px-4 py-3 text-xs">{call.target}</td>
                <td className="px-4 py-3 text-xs text-content-secondary">{call.client}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {call.status === 'on_hold'
                    ? <span className="text-amber-500">Hold {call.holdTime}</span>
                    : call.duration}
                </td>
                <td className="px-4 py-3 text-xs text-content-secondary">{call.stage}</td>
                <td className="px-4 py-3">
                  {['connected', 'on_hold', 'ivr'].includes(call.status) && (
                    <button onClick={e => { e.stopPropagation(); toast.success('Call transferred to your extension') }}
                      className="text-[10px] border border-red-500/40 text-red-500 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                      Take Over
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCall && <>
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedCall(null)} />
        <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      </>}
    </div>
  )
}

// ─── Tab 2: Call Log ──────────────────────────────────────────────────────
function CallLogTab() {
  const { toast } = useToast()
  const [typeFilter, setTypeFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [selectedCall, setSelectedCall] = useState<DemoCall | null>(null)

  const { selectedClient, country } = useApp()
  const uaeOrgIds = ['org-101', 'org-104']
  const usOrgIds = ['org-102', 'org-103']

  const filtered = demoCallLog.filter(c => {
    if (selectedClient && c.clientId !== selectedClient.id) return false
    if (!selectedClient && country === 'uae' && !uaeOrgIds.includes(c.clientId)) return false
    if (!selectedClient && country === 'usa' && !usOrgIds.includes(c.clientId)) return false
    if (typeFilter && c.type !== typeFilter) return false
    if (outcomeFilter && c.outcome !== outcomeFilter) return false
    return true
  })

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Types</option>
          {['Payer Status Check', 'Payer Appeal Follow-up', 'Patient Balance Reminder', 'Appointment Reminder'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Outcomes</option>
          {['Got Status', 'Voicemail', 'Transferred', 'Failed'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-separator text-xs text-content-secondary">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Target / Patient</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Outcome</th>
              <th className="text-left px-4 py-3">Claim</th>
              <th className="text-left px-4 py-3">Recording</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(call => (
              <tr key={call.id} onClick={() => setSelectedCall(call)}
                className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
                <td className="px-4 py-3 text-xs text-content-secondary">Mar 2, 2026</td>
                <td className="px-4 py-3 text-xs">{call.type}</td>
                <td className="px-4 py-3 text-xs">{call.target}</td>
                <td className="px-4 py-3 font-mono text-xs">{call.duration}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    call.outcome === 'Got Status' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    call.outcome === 'Voicemail' ? 'bg-blue-500/10 text-blue-500' :
                    call.outcome === 'Transferred' ? 'bg-brand/10 text-brand' :
                    'bg-red-500/10 text-red-500'
                  }`}>{call.outcome}</span>
                </td>
                <td className="px-4 py-3 text-xs text-brand">{call.claimRef || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={e => {
                    e.stopPropagation()
                    toast.info(`Playing recording — ${call.duration}`)
                  }} className="p-1.5 rounded hover:bg-surface-elevated text-content-secondary hover:text-content-primary transition-colors">
                    <Play size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCall && <>
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedCall(null)} />
        <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      </>}
    </div>
  )
}

// ─── Tab 3: Campaign Launcher ─────────────────────────────────────────────
function CampaignLauncherTab() {
  const { toast } = useToast()
  const [selected, setSelected] = useState<DemoCampaign | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('Payer Status Check')
  const [schedule, setSchedule] = useState<'now' | 'daily' | 'weekly'>('now')
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri'])
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const estCalls = type === 'Payer Status Check' ? 12 : type === 'Patient Balance Reminder' ? 27 : type === 'Payer Appeal Follow-up' ? 6 : 18

  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-2 space-y-3">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Saved Campaigns</h3>
        {demoCampaigns.map(c => (
          <button key={c.id} onClick={() => { setSelected(c); setName(c.name); setType(c.type) }}
            className={`w-full text-left card p-4 hover:border-brand/30 transition-all ${selected?.id === c.id ? 'border-brand/30 bg-brand/5' : ''}`}>
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-sm font-semibold text-content-primary">{c.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                c.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                c.status === 'paused' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                'bg-surface-elevated text-content-tertiary'
              }`}>{c.status}</span>
            </div>
            <p className="text-[10px] text-content-secondary">{c.type}</p>
            <p className="text-[10px] text-content-tertiary mt-0.5">{c.schedule}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full">{c.estimatedCalls} calls</span>
              {c.lastRun && <span className="text-[10px] text-content-tertiary">Last: {c.lastRun}</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="col-span-3 card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-content-primary">Campaign Builder</h3>
        <div>
          <label className="text-xs text-content-secondary block mb-1">Campaign Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Weekly Payer Status Check"
            className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40" />
        </div>
        <div>
          <label className="text-xs text-content-secondary block mb-1">Campaign Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
            {['Payer Status Check', 'Payer Appeal Follow-up', 'Patient Balance Reminder', 'Appointment Reminder'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-content-secondary block mb-1">Target Filter</label>
          <div className="flex gap-2">
            <select className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-primary">
              <option>Claims &gt; $200 aged &gt; 30 days</option>
              <option>All denied claims</option>
              <option>Patient balance &gt; $50</option>
              <option>Appointments next 48h</option>
            </select>
            <div className="bg-brand/10 text-brand text-xs px-3 py-2 rounded-lg font-medium whitespace-nowrap">~{estCalls} calls</div>
          </div>
        </div>
        <div>
          <label className="text-xs text-content-secondary block mb-2">Schedule</label>
          <div className="flex gap-2">
            {(['now', 'daily', 'weekly'] as const).map(s => (
              <button key={s} onClick={() => setSchedule(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${schedule === s ? 'bg-brand/10 text-brand border-brand/30' : 'border-separator text-content-secondary hover:text-content-primary'}`}>
                {s === 'now' ? 'Run Now' : s === 'daily' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>
          {schedule === 'daily' && (
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="mt-2 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary" />
          )}
          {schedule === 'weekly' && (
            <div className="mt-2 flex gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                <button key={d}
                  onClick={() => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded border transition-all ${
                    selectedDays.includes(d)
                      ? 'bg-brand/10 text-brand border-brand/30'
                      : 'border-separator hover:bg-brand/10 hover:text-brand hover:border-brand/30'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => toast.success(`${estCalls} calls queued. Campaign started.`)} disabled={!name}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Zap size={14} className="inline mr-2" />
          Launch Campaign
        </button>
      </div>
    </div>
  )
}

// ─── Tab 4: Script Builder ────────────────────────────────────────────────
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
    setEditingContent('')
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
      </div>

      <div className="col-span-3 card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">{selected.payer}</h3>
            <p className="text-xs text-content-secondary">{selected.type}</p>
          </div>
          <button onClick={() => toast.info('Test call queued')}
            className="px-3 py-1.5 text-xs font-medium border border-brand/30 text-brand rounded-lg hover:bg-brand/10 transition-colors">
            <Radio size={12} className="inline mr-1.5" />
            Test Script
          </button>
        </div>

        <div className="space-y-2">
          {scriptSteps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-1 ${stepBadge[step.type] ?? 'bg-surface-elevated text-content-secondary'}`}>
                  {i + 1}
                </div>
                {i < scriptSteps.length - 1 && <div className="w-px flex-1 bg-separator min-h-[12px] mt-1" />}
              </div>
              <div className="flex-1 card p-3 flex flex-col gap-2 mb-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${stepBadge[step.type] ?? 'bg-surface-elevated'}`}>{step.type}</span>
                    <span className="text-xs text-content-primary">{step.content}</span>
                  </div>
                  <button onClick={() => {
                    if (editingStep === i) {
                      setEditingStep(null)
                      setEditingContent('')
                    } else {
                      setEditingStep(i)
                      setEditingContent(step.content)
                    }
                  }}
                    className="shrink-0 p-1 hover:bg-surface-elevated rounded text-content-tertiary hover:text-content-secondary transition-colors">
                    <Edit2 size={12} />
                  </button>
                </div>
                {editingStep === i && (
                  <div className="flex gap-2">
                    <input
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      className="flex-1 bg-surface-elevated border border-separator rounded px-2 py-1 text-xs"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const updated = [...scriptSteps]
                          updated[i] = { ...updated[i], content: editingContent }
                          setScriptSteps(updated)
                          toast.success('Step updated')
                          setEditingStep(null)
                          setEditingContent('')
                        }
                        if (e.key === 'Escape') {
                          setEditingStep(null)
                          setEditingContent('')
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const updated = [...scriptSteps]
                        updated[i] = { ...updated[i], content: editingContent }
                        setScriptSteps(updated)
                        toast.success('Step updated')
                        setEditingStep(null)
                        setEditingContent('')
                      }}
                      className="text-[10px] bg-brand text-white px-2 py-1 rounded"
                    >Save</button>
                    <button
                      onClick={() => { setEditingStep(null); setEditingContent('') }}
                      className="text-[10px] border border-separator px-2 py-1 rounded text-content-secondary"
                    >Cancel</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => {
          const newStep = { type: 'SPEAK' as const, content: 'New step — click edit to update' }
          setScriptSteps(prev => [...prev, newStep])
          toast.success('New step added — click ✏ to edit')
        }}
          className="mt-3 w-full border border-dashed border-brand/30 text-brand text-xs py-2 rounded-lg hover:bg-brand/5 transition-colors">
          <Plus size={12} className="inline mr-1" />
          Add Step
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'active', label: 'Active Calls', icon: PhoneCall },
  { id: 'log', label: 'Call Log', icon: PhoneMissed },
  { id: 'campaign', label: 'Campaign Launcher', icon: BarChart2 },
  { id: 'scripts', label: 'Script Builder', icon: Settings2 },
] as const

type TabId = typeof TABS[number]['id']

export default function VoiceAIPage() {
  const [tab, setTab] = useState<TabId>('active')

  return (
    <ModuleShell title="Voice AI" subtitle="Automated calls to payers and patients">
      <div className='mx-4 mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400'>
        <AlertTriangle size={13} className='shrink-0' />
        Demo data — live data connects in Sprint 2
      </div>
      <div className="flex gap-1 mb-5 border-b border-separator">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}>
              <Icon size={14} />
              {t.label}
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
