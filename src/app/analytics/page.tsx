'use client'
import React, { useState, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { demoClaims, demoClients } from '@/lib/demo-data'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import { useAnalyticsKPIs } from '@/lib/hooks'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  DollarSign, TrendingUp, Clock, AlertTriangle, ShieldAlert,
  CheckCircle2, Activity, BrainCircuit, Mic, Phone, FileText, Info
} from 'lucide-react'

// ─── KPI Tooltip ────────────────────────────────────────────────────────────
function KPITooltip({ formula }: { formula: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex ml-1" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={12} className="text-content-tertiary cursor-help" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-[240px] bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[11px] text-content-secondary shadow-xl whitespace-normal pointer-events-none">
          {formula}
        </span>
      )}
    </span>
  )
}

// ─── Static demo data ────────────────────────────────────────────────────────
const monthlyRevenue = [
  { month: 'Oct', revenue: 280000 },
  { month: 'Nov', revenue: 310000 },
  { month: 'Dec', revenue: 295000 },
  { month: 'Jan', revenue: 340000 },
  { month: 'Feb', revenue: 380000 },
  { month: 'Mar', revenue: 420000 },
]

const denialTrend = [
  { month: 'Oct', initial: 7.2, net: 4.1 },
  { month: 'Nov', initial: 6.8, net: 3.9 },
  { month: 'Dec', initial: 8.1, net: 4.8 },
  { month: 'Jan', initial: 6.2, net: 3.5 },
  { month: 'Feb', initial: 5.8, net: 3.2 },
  { month: 'Mar', initial: 5.1, net: 2.9 },
]

// Deterministic daily claim counts — no Math.random(), consistent on every render
const claimsByDay: Record<number, number> = {
  0: 16, 1: 38, 2: 42, 3: 35, 4: 40, 5: 44, 6: 17,
  7: 14, 8: 37, 9: 41, 10: 39, 11: 43, 12: 46, 13: 31,
}
const last14Days = Array.from({ length: 14 }, (_, i) => {
  const d = new Date('2026-03-02')
  d.setDate(d.getDate() - (13 - i))
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    claims: claimsByDay[i] ?? 30,
  }
})

const staffData = [
  { name: 'Maria Rodriguez', role: 'Coder', claimsToday: 18, aiAccept: '89%', avgMin: '16 min', accuracy: '97.2%', sla: '98%' },
  { name: 'James Wilson', role: 'Biller', claimsToday: 24, aiAccept: '—', avgMin: '8 min', accuracy: '—', sla: '96%' },
  { name: 'Linda Torres', role: 'Coder', claimsToday: 14, aiAccept: '82%', avgMin: '19 min', accuracy: '95.8%', sla: '94%' },
  { name: 'David Park', role: 'AR Team', claimsToday: 31, aiAccept: '—', avgMin: '5 min', accuracy: '—', sla: '99%' },
  { name: 'Sarah Lee', role: 'Coder', claimsToday: 21, aiAccept: '91%', avgMin: '14 min', accuracy: '98.4%', sla: '97%' },
]

const payerHassle: Record<string, { score: number; color: string }> = {
  UnitedHealthcare: { score: 42, color: 'text-amber-400' },
  Medicare: { score: 28, color: 'text-emerald-400' },
  Aetna: { score: 58, color: 'text-amber-400' },
  Daman: { score: 71, color: 'text-red-400' },
  NAS: { score: 35, color: 'text-emerald-400' },
  'Self-Pay': { score: 15, color: 'text-emerald-400' },
  BCBS: { score: 45, color: 'text-amber-400' },
}

const denialCategories = ['Auth','Eligibility','Timely Filing','Duplicate','Non-Covered','Coding','Medical Nec.','Billing Error']

const aiFeatures = [
  { name: 'AI Auto-Coding', icon: <BrainCircuit size={20}/>, metric: '88.3%', metricLabel: 'accuracy', uses: '847 uses this month', trend: '↑2.1% vs last month', barPct: 88 },
  { name: 'Claim Scrubbing', icon: <CheckCircle2 size={20}/>, metric: '96.1%', metricLabel: 'catch rate', uses: '1,203 claims scrubbed', trend: '↑0.8%', barPct: 96 },
  { name: 'Denial Prediction', icon: <AlertTriangle size={20}/>, metric: '71.4%', metricLabel: 'accuracy', uses: '892 predictions', trend: '↑5.2%', barPct: 71 },
  { name: 'Auto-Posting', icon: <DollarSign size={20}/>, metric: '76.4%', metricLabel: 'auto-post rate', uses: '432 ERAs', trend: '↔ flat', barPct: 76 },
  { name: 'AI Scribe', icon: <Mic size={20}/>, metric: '94.2%', metricLabel: 'acceptance', uses: '312 notes', trend: 'New', barPct: 94 },
  { name: 'Voice AI', icon: <Phone size={20}/>, metric: '78.1%', metricLabel: 'success rate', uses: '1,847 calls', trend: '↑3.4%', barPct: 78 },
  { name: 'Auto-Appeals', icon: <ShieldAlert size={20}/>, metric: '64.3%', metricLabel: 'overturn rate', uses: '89 appeals', trend: '↑8.1%', barPct: 64 },
  { name: 'Eligibility AI', icon: <Activity size={20}/>, metric: '99.1%', metricLabel: 'accuracy', uses: '2,103 checks', trend: '↑0.2%', barPct: 99 },
]

const PAYER_COLORS: Record<string, string> = {
  UnitedHealthcare: '#00B5D6',
  Medicare: '#8B5CF6',
  Aetna: '#F59E0B',
  Daman: '#10B981',
  NAS: '#3B82F6',
  'Self-Pay': '#6B7280',
  BCBS: '#EF4444',
}

// ─── Heatmap cell ─────────────────────────────────────────────────────────────
function HeatCell({ value }: { value: number }) {
  const bg = value === 0 ? 'bg-surface-elevated' : value <= 3 ? 'bg-red-500/20' : value <= 7 ? 'bg-red-500/40' : 'bg-red-500/70'
  return (
    <td className={`px-3 py-2 text-center text-[12px] ${bg} ${value > 0 ? 'text-red-300' : 'text-content-tertiary'}`}>
      {value || '—'}
    </td>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { selectedClient, country } = useApp()
  const [tab, setTab] = useState<'financial' | 'operational' | 'ai' | 'payer'>('financial')
  const [dateRange, setDateRange] = useState('last30')

  // Live API — returns aggregated KPIs from Aurora
  const { data: liveKPIs } = useAnalyticsKPIs()

  // Demo claims used for chart visualisations only (time-series not in API yet)
  const claims = useMemo(() =>
    selectedClient
      ? demoClaims.filter(c => c.clientId === selectedClient.id)
      : country === 'uae'
        ? demoClaims.filter(c => (UAE_ORG_IDS as readonly string[]).includes(c.clientId))
        : country === 'usa'
          ? demoClaims.filter(c => (US_ORG_IDS as readonly string[]).includes(c.clientId))
          : demoClaims,
    [selectedClient, country]
  )

  // ─── Financial calculations ───────────────────────────────────────────────
  const revenueCollected = useMemo(() =>
    claims.filter(c => ['paid','partial_pay'].includes(c.status)).reduce((s, c) => s + c.paid, 0),
    [claims]
  )
  const totalBilled = useMemo(() => claims.reduce((s, c) => s + c.billed, 0), [claims])
  const totalContractualAdj = useMemo(() =>
    claims.filter(c => c.allowed > 0).reduce((s, c) => s + (c.billed - c.allowed), 0),
    [claims]
  )
  const netCollectionRate = useMemo(() => {
    const denom = totalBilled - totalContractualAdj
    return denom > 0 ? ((revenueCollected / denom) * 100).toFixed(1) : '—'
  }, [revenueCollected, totalBilled, totalContractualAdj])

  const deniedClaims = claims.filter(c => ['denied','appealed'].includes(c.status))
  const submittedClaims = claims.filter(c => c.status !== 'draft')
  const denialRate = submittedClaims.length > 0
    ? ((deniedClaims.length / submittedClaims.length) * 100).toFixed(1)
    : '0.0'
  const denialAtRisk = deniedClaims.reduce((s, c) => s + c.billed, 0)

  const paidClaims = claims.filter(c => c.status === 'paid' && c.submittedDate && c.paymentDate)
  const avgDaysToPayment = paidClaims.length > 0
    ? Math.round(paidClaims.reduce((s, c) => {
        const diff = (new Date(c.paymentDate!).getTime() - new Date(c.submittedDate!).getTime()) / 86400000
        return s + diff
      }, 0) / paidClaims.length)
    : 24
  const totalARBalance = claims.filter(c => c.paid === 0 && c.status !== 'draft').reduce((s, c) => s + c.billed, 0)
  const daysInAR = totalARBalance > 0
    ? (totalARBalance / (totalBilled / 90)).toFixed(1)
    : '28.5'

  // ─── Payer mix pie data ───────────────────────────────────────────────────
  const payerMix = useMemo(() => {
    const counts: Record<string, number> = {}
    claims.forEach(c => { counts[c.payer] = (counts[c.payer] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [claims])

  // ─── Collection rate by client bar ──────────────────────────────────────
  const clientCollectionRates = useMemo(() =>
    demoClients.map(client => {
      const cc = demoClaims.filter(c => c.clientId === client.id)
      const billed = cc.reduce((s, c) => s + c.billed, 0)
      const paid = cc.reduce((s, c) => s + c.paid, 0)
      const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0
      return { name: client.name.split(' ')[0], rate, fill: rate >= 95 ? '#10B981' : rate >= 85 ? '#F59E0B' : '#EF4444' }
    }),
    []
  )

  // ─── Payer performance table ──────────────────────────────────────────────
  const payerPerf = useMemo(() => {
    const payers: Record<string, { billed: number; paid: number; denied: number; days: number[]; count: number }> = {}
    claims.forEach(c => {
      if (!payers[c.payer]) payers[c.payer] = { billed: 0, paid: 0, denied: 0, days: [], count: 0 }
      payers[c.payer].billed += c.billed
      payers[c.payer].paid += c.paid
      payers[c.payer].count += 1
      if (['denied','appealed'].includes(c.status)) payers[c.payer].denied += 1
      if (c.status === 'paid' && c.submittedDate && c.paymentDate) {
        const diff = (new Date(c.paymentDate).getTime() - new Date(c.submittedDate).getTime()) / 86400000
        payers[c.payer].days.push(diff)
      }
    })
    return Object.entries(payers).map(([payer, d]) => ({
      payer,
      count: d.count,
      billed: d.billed,
      paid: d.paid,
      denialRate: d.count > 0 ? ((d.denied / d.count) * 100).toFixed(0) : '0',
      avgDays: d.days.length > 0 ? Math.round(d.days.reduce((a, b) => a + b, 0) / d.days.length) : '—',
      phi: payerHassle[payer]?.score || 40,
      phiColor: payerHassle[payer]?.color || 'text-amber-400',
    }))
  }, [claims])

  // ─── Denial heatmap data ─────────────────────────────────────────────────
  const heatData = useMemo(() => {
    const payers = Array.from(new Set(claims.map(c => c.payer)))
    const seedRng = (str: string) => {
      let h = 0
      for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
      return Math.abs(h) % 10
    }
    return payers.map(p => ({
      payer: p,
      cats: denialCategories.map(cat => seedRng(p + cat) % 5),
    }))
  }, [claims])

  const TABS = [
    { id: 'financial', label: 'Financial' },
    { id: 'operational', label: 'Operational' },
    { id: 'ai', label: 'AI Performance' },
    { id: 'payer', label: 'By Payer' },
  ] as const

  return (
    <ModuleShell title="Analytics" subtitle="Financial and operational reporting">
      <div className='mx-4 mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400'>
        <AlertTriangle size={13} className='shrink-0' />
        Demo data — live data connects in Sprint 2
      </div>
      {/* Global filters */}
      <div className="flex items-center gap-3 mb-5">
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-btn px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:ring-1 focus:ring-brand/30">
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="ytd">Year to Date</option>
          <option value="custom">Custom</option>
        </select>
        <span className="text-[13px] text-content-tertiary">|</span>
        <span className="text-[13px] text-content-secondary">
          {selectedClient ? selectedClient.name : 'All Clients'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-separator mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-[13px] font-medium transition-colors ${tab === t.id ? 'text-brand border-b-2 border-brand' : 'text-content-secondary hover:text-content-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── FINANCIAL TAB ─────────────────────────────────────────────────── */}
      {tab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <KPICard label="Revenue Collected"
              value={liveKPIs?.overview?.total_collected != null
                ? `$${(liveKPIs.overview.total_collected / 1000).toFixed(0)}K`
                : `$${(revenueCollected / 1000).toFixed(0)}K`}
              icon={<DollarSign size={20}/>}
              sub={<span>Sum of paid amounts <KPITooltip formula="Sum of all paid amounts for claims with status: paid or partial_pay" /></span> as unknown as string} />
            <KPICard label="Net Collection Rate"
              value={liveKPIs?.overview?.collection_rate != null
                ? `${liveKPIs.overview.collection_rate}%`
                : `${netCollectionRate}%`}
              trend="up"
              icon={<TrendingUp size={20}/>}
              sub={<span>Revenue ÷ (Charges − Adj) <KPITooltip formula="Payments ÷ (Total charges − contractual adjustments) × 100. Target: > 95%" /></span> as unknown as string} />
            <KPICard label="Days in A/R"
              value={daysInAR}
              icon={<Clock size={20}/>}
              sub={<span>AR ÷ (90-day charges ÷ 90) <KPITooltip formula="Total AR balance ÷ (Charges last 90 days ÷ 90). Target: < 35 days" /></span> as unknown as string} />
            <KPICard label="Denial Rate"
              value={liveKPIs?.overview?.denial_rate != null
                ? `${liveKPIs.overview.denial_rate}%`
                : `${denialRate}%`}
              icon={<AlertTriangle size={20}/>}
              sub={<span>Denied ÷ Submitted <KPITooltip formula="Count of denied claims ÷ total submitted claims × 100. Target: < 5%" /></span> as unknown as string} />
            <KPICard label="Denial $ At Risk"
              value={`$${(denialAtRisk / 1000).toFixed(0)}K`}
              icon={<ShieldAlert size={20}/>}
              sub={<span>Denied + Appealed billed <KPITooltip formula="Sum of billed amounts for claims with status: denied or appealed" /></span> as unknown as string} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Revenue Trend */}
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tickFormatter={v => `$${v/1000}K`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(v: number | string | undefined) => [`$${(Number(v ?? 0)/1000).toFixed(0)}K`, 'Revenue']} contentStyle={{ background: '#1E2332', border: '1px solid #2D3146', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#00B5D6" strokeWidth={2} dot={{ fill: '#00B5D6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payer Mix */}
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-4">Payer Mix</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={payerMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: { name?: string; percent?: number }) => `${(name || '').split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {payerMix.map((entry, index) => (
                      <Cell key={index} fill={PAYER_COLORS[entry.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E2332', border: '1px solid #2D3146', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Collection Rate by Client */}
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-4">Collection Rate by Client</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={clientCollectionRates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9CA3AF' }} width={65} />
                  <Tooltip formatter={(v: number | string | undefined) => [`${v ?? 0}%`, 'Collection Rate']} contentStyle={{ background: '#1E2332', border: '1px solid #2D3146', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {clientCollectionRates.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Denial Rate Trend */}
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-4">Denial Rate Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={denialTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(v: number | string | undefined) => [`${v ?? 0}%`]} contentStyle={{ background: '#1E2332', border: '1px solid #2D3146', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={5} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Target 5%', position: 'insideTopRight', fontSize: 10, fill: '#F59E0B' }} />
                  <Line type="monotone" dataKey="initial" name="Initial Denial Rate" stroke="#EF4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="net" name="Net Denial Rate" stroke="#00B5D6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── OPERATIONAL TAB ──────────────────────────────────────────────── */}
      {tab === 'operational' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <KPICard label="Clean Claim Rate"
              value={liveKPIs?.overview?.clean_claim_rate != null ? `${liveKPIs.overview.clean_claim_rate}%` : '91.3%'}
              icon={<CheckCircle2 size={20}/>}
              sub={<span><KPITooltip formula="Claims that passed scrubbing without errors ÷ total claims × 100. Target: > 95%" />of claims pass scrub</span> as unknown as string} />
            <KPICard label="First Pass Rate" value="87.6%" icon={<Activity size={20}/>}
              sub={<span><KPITooltip formula="Claims paid on first submission ÷ total submitted × 100" />paid first try</span> as unknown as string} />
            <KPICard label="Avg Coding Time" value="16.2m" icon={<Clock size={20}/>} />
            <KPICard label="Submission Lag" value="1.2d" icon={<FileText size={20}/>}
              sub={<span><KPITooltip formula="Average days from DOS to submission date" />DOS to submit</span> as unknown as string} />
            <KPICard label="Posting Lag" value="0.8d" icon={<DollarSign size={20}/>}
              sub={<span><KPITooltip formula="Average days from ERA receipt to payment posting" />ERA to post</span> as unknown as string} />
          </div>

          {/* Staff Productivity */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-separator">
              <h3 className="text-[14px] font-semibold text-content-primary">Staff Productivity</h3>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-separator text-[11px] text-content-tertiary uppercase tracking-wider">
                {['Name','Role','Claims Today','AI Accept %','Avg Min/Claim','Accuracy','SLA %'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {staffData.map(s => (
                  <tr key={s.name} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                    <td className="px-4 py-2.5 font-medium text-content-primary">{s.name}</td>
                    <td className="px-4 py-2.5 text-content-secondary">{s.role}</td>
                    <td className="px-4 py-2.5 text-brand font-medium">{s.claimsToday}</td>
                    <td className="px-4 py-2.5">{s.aiAccept}</td>
                    <td className="px-4 py-2.5 text-content-secondary">{s.avgMin}</td>
                    <td className="px-4 py-2.5">
                      {s.accuracy !== '—' && (
                        <span className={parseFloat(s.accuracy) >= 97 ? 'text-emerald-400' : 'text-amber-400'}>{s.accuracy}</span>
                      )}
                      {s.accuracy === '—' && <span className="text-content-tertiary">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={parseFloat(s.sla) >= 97 ? 'text-emerald-400' : 'text-amber-400'}>{s.sla}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Claims Per Day */}
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-content-primary mb-4">Claims Processed Per Day (Last 14 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last14Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip contentStyle={{ background: '#1E2332', border: '1px solid #2D3146', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="claims" fill="#00B5D6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── AI PERFORMANCE TAB ──────────────────────────────────────────── */}
      {tab === 'ai' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <KPICard label="Auto-Coding Accuracy" value="88.3%" icon={<BrainCircuit size={20}/>} trend="up" sub="+2.1% vs last month" />
            <KPICard label="AI Acceptance Rate" value="84.7%" icon={<CheckCircle2 size={20}/>} />
            <KPICard label="Textract Confidence" value="91.2%" icon={<Activity size={20}/>} />
            <KPICard label="Auto-Post Rate" value="76.4%" icon={<DollarSign size={20}/>} />
            <KPICard label="Voice AI Success" value="78.1%" icon={<Phone size={20}/>} trend="up" sub="+3.4%" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {aiFeatures.map(f => (
              <div key={f.name} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-brand">{f.icon}</span>
                  <p className="text-[13px] font-semibold text-content-primary">{f.name}</p>
                </div>
                <p className="text-[24px] font-bold text-content-primary">{f.metric}</p>
                <p className="text-[11px] text-content-tertiary mb-2">{f.metricLabel}</p>
                <div className="h-1.5 bg-surface-elevated rounded-full mb-3">
                  <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${f.barPct}%` }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-content-secondary">{f.uses}</span>
                  <span className={`text-[11px] font-medium ${f.trend.startsWith('↑') ? 'text-emerald-400' : f.trend.startsWith('↓') ? 'text-red-400' : 'text-content-tertiary'}`}>{f.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── BY PAYER TAB ─────────────────────────────────────────────────── */}
      {tab === 'payer' && (
        <div className="space-y-6">
          {/* Payer Performance Table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-separator">
              <h3 className="text-[14px] font-semibold text-content-primary">Payer Performance</h3>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-separator text-[11px] text-content-tertiary uppercase tracking-wider">
                {['Payer','Claims','Billed','Paid','Denial Rate','Avg Days to Pay','PHI Score'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {payerPerf.map(p => (
                  <tr key={p.payer} className="border-b border-separator last:border-0 hover:bg-surface-elevated">
                    <td className="px-4 py-2.5 font-medium text-content-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: PAYER_COLORS[p.payer] || '#6B7280' }} />
                      {p.payer}
                    </td>
                    <td className="px-4 py-2.5">{p.count}</td>
                    <td className="px-4 py-2.5">${p.billed.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-emerald-400">${p.paid.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={parseInt(p.denialRate) > 10 ? 'text-red-400' : parseInt(p.denialRate) > 5 ? 'text-amber-400' : 'text-emerald-400'}>
                        {p.denialRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{p.avgDays}{typeof p.avgDays === 'number' ? 'd' : ''}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${p.phiColor}`}>{p.phi}</span>
                      <span className="text-content-tertiary text-[10px] ml-1">/ 100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Denial by Payer heatmap */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-separator">
              <h3 className="text-[14px] font-semibold text-content-primary">Denial by Payer + Category</h3>
              <p className="text-[11px] text-content-tertiary mt-0.5">Darker red = more denials in that category</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-separator">
                  <th className="text-left px-4 py-2.5 text-content-tertiary">Payer</th>
                  {denialCategories.map(c => (
                    <th key={c} className="px-3 py-2.5 text-content-tertiary text-center">{c}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {heatData.map(row => (
                    <tr key={row.payer} className="border-b border-separator last:border-0">
                      <td className="px-4 py-2.5 font-medium text-content-secondary">{row.payer.split(' ')[0]}</td>
                      {row.cats.map((v, i) => <HeatCell key={i} value={v} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
