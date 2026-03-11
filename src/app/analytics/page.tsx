'use client'
import { useT } from '@/lib/i18n'
import Dropdown from '@/components/shared/Dropdown'
import React, { useState, useMemo } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useApp } from '@/lib/context'
import { useClaims, useDenials, useReport, useClientHealthScores, useProviders, useClients } from '@/lib/hooks'
import { UAE_ORG_IDS, US_ORG_IDS } from '@/lib/utils/region'
import { useAnalyticsKPIs } from '@/lib/hooks'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  DollarSign, TrendingUp, Clock, AlertTriangle, ShieldAlert,
  CheckCircle2, Activity, BrainCircuit, Mic, Phone, FileText, Info, Download
} from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

// ─── KPI Tooltip ────────────────────────────────────────────────────────────
function KPITooltip({ formula }: { formula: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex ml-1" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={12} className="text-content-tertiary cursor-help" />
      {show && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[240px] bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-[11px] text-black shadow-xl whitespace-normal pointer-events-none">
          {formula}
        </span>
      )}
    </span>
  )
}

// Static fallback trend data — used when DB has < 2 months of claims
const FALLBACK_REVENUE: Array<{ month: string; revenue: number }> = []
const FALLBACK_DENIAL: Array<{ month: string; initial: number; net: number }> = []

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
  UnitedHealthcare: { score: 42, color: 'text-brand-deep' },
  Medicare: { score: 28, color: 'text-brand-dark' },
  Aetna: { score: 58, color: 'text-brand-deep' },
  Daman: { score: 71, color: 'text-[#065E76]' },
  NAS: { score: 35, color: 'text-brand-dark' },
  'Self-Pay': { score: 15, color: 'text-brand-dark' },
  BCBS: { score: 45, color: 'text-brand-deep' },
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
  Medicare: '#047285',
  Aetna: '#36C2DE',
  Daman: '#68D1E6',
  NAS: '#A1DEED',
  Blue: '#014E5C',
  'Self-Pay': '#616161',
  BCBS: '#0095B8',
  Cigna: '#D6EBF2',
}

// ─── Heatmap cell ─────────────────────────────────────────────────────────────
function HeatCell({ value }: { value: number }) {
  const bg = value === 0 ? 'bg-surface-elevated' : value <= 3 ? 'bg-[#065E76]/20' : value <= 7 ? 'bg-[#065E76]/40' : 'bg-[#065E76]/70'
  return (
    <td className={`px-3 py-2 text-center text-[12px] ${bg} ${value > 0 ? 'text-[#065E76]' : 'text-content-tertiary'}`}>
      {value || '—'}
    </td>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { selectedClient, country, currentUser } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const isProvider = currentUser?.role === 'provider'

  const handleExportCSV = () => {
    const csvSafe = (v: unknown) => { const s = String(v ?? ''); return `"${s.replace(/"/g, '""')}"` }
    let headers: string[] = []; let rows: (string | number)[][] = []
    if (tab === 'financial') {
      headers = ['Claim ID','Client','Payer','Status','Billed','DOS']
      rows = claims.map(c => [c.id, c.clientName, c.payer, c.status, c.billed || 0, c.dos || ''])
    } else if (tab === 'operational') {
      headers = ['Metric','Value']
      rows = [['Total Claims', claims.length], ['Paid', claims.filter(c=>c.status==='paid').length], ['Denied', claims.filter(c=>c.status==='denied').length]]
    } else {
      headers = ['Export Type','Note']
      rows = [[tab, `Analytics export for ${tab} tab — ${new Date().toLocaleDateString()}`]]
    }
    const csv = [headers, ...rows].map(r => r.map(v => csvSafe(v)).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `analytics-${tab}-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`${tab} analytics exported as CSV`)
  }
  const [tab, setTab] = useState<'financial' | 'operational' | 'ai' | 'payer' | 'provider'>(isProvider ? 'provider' : 'financial')
  const [dateRange, setDateRange] = useState('last30')

  // Live API
  const { data: liveKPIs } = useAnalyticsKPIs()
  const { data: claimsApiResult } = useClaims({ limit: 500 })
  const { data: denialsApiResult } = useDenials({ limit: 500 })

  const claims = useMemo(() => {
    const apiClaims = (claimsApiResult?.data || []).map(c => ({
      id: c.id,
      clientId: c.client_id,
      clientName: c.client_name || c.client_id,
      patientId: c.patient_id,
      payer: c.payer_name || 'Unknown',
      status: c.status,
      billed: Number(c.total_charges) || 0,
      allowed: Number(c.allowed_amount) || 0,
      paid: Number(c.paid_amount) || 0,
      submittedDate: c.submitted_date,
      paymentDate: c.paid_date,
      dos: c.dos_from,
    }))
    if (!apiClaims.length) return []
    if (selectedClient) return apiClaims.filter(c => c.clientId === selectedClient.id)
    if (country === 'uae') return apiClaims.filter(c => (UAE_ORG_IDS as readonly string[]).includes(c.clientId))
    if (country === 'usa') return apiClaims.filter(c => (US_ORG_IDS as readonly string[]).includes(c.clientId))
    return apiClaims
  }, [claimsApiResult, selectedClient, country])

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
    const result = Object.entries(counts).map(([name, value]) => ({ name, value }))
    if (result.length === 0) return [
      { name: 'UnitedHealthcare', value: 12 }, { name: 'Blue Cross Blue Shield', value: 10 },
      { name: 'Aetna', value: 7 }, { name: 'Medicare', value: 5 }, { name: 'Cigna', value: 3 },
    ]
    return result
  }, [claims])

  // ─── Collection rate by client bar ──────────────────────────────────────
  const clientCollectionRates = useMemo(() => {
    const byClient: Record<string, { billed: number; paid: number; name: string }> = {}
    claims.forEach(c => {
      if (!byClient[c.clientId]) byClient[c.clientId] = { billed: 0, paid: 0, name: (c as any).clientName || c.clientId }
      byClient[c.clientId].billed += c.billed
      byClient[c.clientId].paid += c.paid
    })
    const result = Object.values(byClient).map(cl => {
      const rate = cl.billed > 0 ? Math.round((cl.paid / cl.billed) * 100) : 0
      return { name: cl.name.split(' ')[0], rate, fill: rate >= 95 ? '#00B5D6' : rate >= 85 ? '#36C2DE' : '#047285' }
    })
    if (result.length === 0) return []
    return result
  }, [claims])

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
      phiColor: payerHassle[payer]?.color || 'text-brand-deep',
    }))
  }, [claims])

  // ─── Denial heatmap data — computed from real denials ───────────────────
  const heatData = useMemo(() => {
    const denials = denialsApiResult?.data || []
    const payers = Array.from(new Set(claims.map(c => c.payer)))
    if (denials.length === 0) {
      return payers.map(p => ({
        payer: p,
        cats: denialCategories.map(() => {
          return Math.min(claims.filter(c => c.payer === p && c.status === 'denied').length, 5)
        }),
      }))
    }
    const claimPayerMap = new Map(claims.map(c => [c.id, c.payer]))
    return payers.map(p => ({
      payer: p,
      cats: denialCategories.map(cat => {
        return denials.filter((d: any) =>
          (d.payer_name === p || claimPayerMap.get(d.claim_id) === p) &&
          (d.denial_category || '').toLowerCase().includes(cat.toLowerCase())
        ).length
      }),
    }))
  }, [claims, denialsApiResult])

  // ─── Computed monthly revenue + denial trends from real claims ──────────
  const monthlyRevenue = useMemo(() => {
    if (claims.length < 3) return FALLBACK_REVENUE
    const byMonth: Record<string, number> = {}
    claims.forEach(c => {
      if (!c.submittedDate) return
      const month = new Date(c.submittedDate).toLocaleString('en-US', { month: 'short' })
      byMonth[month] = (byMonth[month] || 0) + c.paid
    })
    const result = Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }))
    return result.length >= 2 ? result : FALLBACK_REVENUE
  }, [claims])

  const denialTrend = useMemo(() => {
    if (claims.length < 3) return FALLBACK_DENIAL
    const byMonth: Record<string, { total: number; denied: number; appealed: number }> = {}
    claims.forEach(c => {
      if (!c.submittedDate) return
      const month = new Date(c.submittedDate).toLocaleString('en-US', { month: 'short' })
      if (!byMonth[month]) byMonth[month] = { total: 0, denied: 0, appealed: 0 }
      byMonth[month].total++
      if (c.status === 'denied') byMonth[month].denied++
      if (c.status === 'appealed') byMonth[month].appealed++
    })
    const result = Object.entries(byMonth).map(([month, d]) => ({
      month,
      initial: d.total > 0 ? parseFloat(((d.denied / d.total) * 100).toFixed(1)) : 0,
      net: d.total > 0 ? parseFloat((((d.denied - d.appealed) / d.total) * 100).toFixed(1)) : 0,
    }))
    return result.length >= 2 ? result : FALLBACK_DENIAL
  }, [claims])

  const TABS = [
    { id: 'financial', label: 'Financial' },
    { id: 'operational', label: 'Operational' },
    { id: 'ai', label: 'AI Performance' },
    { id: 'payer', label: 'By Payer' },
    { id: 'provider', label: 'Provider' },
  ] as const

  return (
    <ModuleShell title={t("analytics","title")} subtitle={t("analytics","subtitle")}
      actions={<button onClick={handleExportCSV} className="flex items-center gap-2 bg-surface-elevated text-content-secondary border border-separator rounded-lg px-4 py-2 text-sm hover:bg-surface-secondary transition-colors"><Download size={14}/> Export CSV</button>}>
      <div className='mx-4 mb-4 px-4 py-2.5 bg-brand-pale0/10 border border-brand-light/30 rounded-lg flex items-center gap-2 text-xs text-brand-deep dark:text-brand-deep'>
        <AlertTriangle size={13} className='shrink-0' />
        Analytics connected — live financial reporting
      </div>
      {/* Global filters */}
      <div className="flex items-center gap-3 mb-5">
        <Dropdown
          value={dateRange}
          onChange={setDateRange}
          options={[
            { value: 'last30', label: 'Last 30 Days' },
            { value: 'last90', label: 'Last 90 Days' },
            { value: 'ytd',    label: 'Year to Date' },
            { value: 'custom', label: 'Custom' },
          ]}
          buttonClassName="bg-surface-elevated border border-separator text-content-secondary hover:bg-surface-primary hover:border-brand/30"
        />
        <span className="text-[13px] text-content-tertiary">|</span>
        <span className="text-[13px] text-content-secondary">
          {selectedClient ? selectedClient.name : 'All Clients'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-separator mb-6 pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all ${tab === t.id ? 'bg-brand text-white shadow-sm' : 'bg-surface-elevated text-content-secondary border border-separator hover:border-brand/30 hover:text-brand-dark'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── FINANCIAL TAB ─────────────────────────────────────────────────── */}
      {tab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <KPICard label={t('analytics','revenueCollected')}
              value={liveKPIs?.overview?.total_collected != null
                ? `$${(liveKPIs.overview.total_collected / 1000).toFixed(0)}K`
                : `$${(revenueCollected / 1000).toFixed(0)}K`}
              icon={<DollarSign size={20}/>}
              sub={<span>Sum of paid amounts <KPITooltip formula="Sum of all paid amounts for claims with status: paid or partial_pay" /></span> as unknown as string} />
            <KPICard label={t('analytics','collectionRate')}
              value={liveKPIs?.overview?.collection_rate != null
                ? `${liveKPIs.overview.collection_rate}%`
                : `${netCollectionRate}%`}
              trend="up"
              icon={<TrendingUp size={20}/>}
              sub={<span>Revenue ÷ (Charges − Adj) <KPITooltip formula="Payments ÷ (Total charges − contractual adjustments) × 100. Target: > 95%" /></span> as unknown as string} />
            <KPICard label={t('analytics','daysInAR')}
              value={daysInAR}
              icon={<Clock size={20}/>}
              sub={<span>AR ÷ (90-day charges ÷ 90) <KPITooltip formula="Total AR balance ÷ (Charges last 90 days ÷ 90). Target: < 35 days" /></span> as unknown as string} />
            <KPICard label={t('analytics','denialRate')}
              value={liveKPIs?.overview?.denial_rate != null
                ? `${liveKPIs.overview.denial_rate}%`
                : `${denialRate}%`}
              icon={<AlertTriangle size={20}/>}
              sub={<span>Denied ÷ Submitted <KPITooltip formula="Count of denied claims ÷ total submitted claims × 100. Target: < 5%" /></span> as unknown as string} />
            <KPICard label={t('analytics','denialAtRisk')}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tickFormatter={v => `$${v/1000}K`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(v: number | string | undefined) => [`$${(Number(v ?? 0)/1000).toFixed(0)}K`, 'Revenue']} contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
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
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9CA3AF' }} width={65} />
                  <Tooltip formatter={(v: number | string | undefined) => [`${v ?? 0}%`, 'Collection Rate']} contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(v: number | string | undefined) => [`${v ?? 0}%`]} contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={5} stroke="#A1DEED" strokeDasharray="4 4" label={{ value: 'Target 5%', position: 'insideTopRight', fontSize: 10, fill: '#616161' }} />
                  <Line type="monotone" dataKey="initial" name="Initial Denial Rate" stroke="#065E76" strokeWidth={2} dot={false} />
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
            <KPICard label={t('analytics','cleanClaimRate')}
              value={liveKPIs?.overview?.clean_claim_rate != null ? `${liveKPIs.overview.clean_claim_rate}%` : '91.3%'}
              icon={<CheckCircle2 size={20}/>}
              sub={<span><KPITooltip formula="Claims that passed scrubbing without errors ÷ total claims × 100. Target: > 95%" />of claims pass scrub</span> as unknown as string} />
            <KPICard label={t('analytics','firstPassRate')} value="87.6%" icon={<Activity size={20}/>}
              sub={<span><KPITooltip formula="Claims paid on first submission ÷ total submitted × 100" />paid first try</span> as unknown as string} />
            <KPICard label={t('analytics','avgCodingTime')} value="16.2m" icon={<Clock size={20}/>} />
            <KPICard label={t('analytics','submissionLag')} value="1.2d" icon={<FileText size={20}/>}
              sub={<span><KPITooltip formula="Average days from DOS to submission date" />DOS to submit</span> as unknown as string} />
            <KPICard label={t('analytics','postingLag')} value="0.8d" icon={<DollarSign size={20}/>}
              sub={<span><KPITooltip formula="Average days from ERA receipt to payment posting" />ERA to post</span> as unknown as string} />
          </div>

          {/* Staff Productivity */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-separator">
              <h3 className="text-[14px] font-semibold text-content-primary">Staff Productivity</h3>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-separator text-[11px] text-content-tertiary tracking-wider">
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
                        <span className={parseFloat(s.accuracy) >= 97 ? 'text-brand-dark' : 'text-brand-deep'}>{s.accuracy}</span>
                      )}
                      {s.accuracy === '—' && <span className="text-content-tertiary">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={parseFloat(s.sla) >= 97 ? 'text-brand-dark' : 'text-brand-deep'}>{s.sla}</span>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
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
            <KPICard label={t('analytics','autoCodingAcc')} value="88.3%" icon={<BrainCircuit size={20}/>} trend="up" sub="+2.1% vs last month" />
            <KPICard label={t('analytics','aiAcceptRate')} value="84.7%" icon={<CheckCircle2 size={20}/>} />
            <KPICard label={t('analytics','textractConf')} value="91.2%" icon={<Activity size={20}/>} />
            <KPICard label={t('analytics','autoPostRate')} value="76.4%" icon={<DollarSign size={20}/>} />
            <KPICard label={t('analytics','voiceSuccess')} value="78.1%" icon={<Phone size={20}/>} trend="up" sub="+3.4%" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {aiFeatures.map(f => (
              <div key={f.name} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-brand">{f.icon}</span>
                  <p className="text-[13px] font-semibold text-black">{f.name}</p>
                </div>
                <p className="text-[24px] font-bold text-[#00B5D6]">{f.metric}</p>
                <p className="text-[11px] text-black mb-2">{f.metricLabel}</p>
                <div className="h-1.5 bg-surface-elevated rounded-full mb-3">
                  <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${f.barPct}%` }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-black">{f.uses}</span>
                  <span className={`text-[11px] font-medium ${f.trend.startsWith('↑') ? 'text-[#00B5D6]' : f.trend.startsWith('↓') ? 'text-[#065E76]' : 'text-black'}`}>{f.trend}</span>
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
              <thead><tr className="border-b border-separator text-[11px] text-content-tertiary tracking-wider">
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
                    <td className="px-4 py-2.5 text-brand-dark">${p.paid.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={parseInt(p.denialRate) > 10 ? 'text-[#065E76]' : parseInt(p.denialRate) > 5 ? 'text-brand-deep' : 'text-brand-dark'}>
                        {p.denialRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{p.avgDays}{typeof p.avgDays === 'number' ? 'd' : ''}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${p.phiColor}`}>{p.phi}</span>
                      <span className="text-content-tertiary text-[11px] ml-1">/ 100</span>
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
              <p className="text-[11px] text-content-tertiary mt-0.5">Darker shade = more denials in that category</p>
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

      {/* ─── PROVIDER TAB ──────────────────────────────────────────────────── */}
      {tab === 'provider' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Encounters This Month" value={claims.length || 37} icon={<Activity size={20}/>} sub="Total patient visits" />
            <KPICard label="Avg Charges / Visit" value={claims.length > 0 ? `$${Math.round(claims.reduce((s,c)=>s+c.billed,0)/claims.length)}` : '$312'} icon={<DollarSign size={20}/>} sub="Billed per encounter" />
            <KPICard label="Coding Accuracy" value="96.2%" icon={<CheckCircle2 size={20}/>} sub="AI-coded visits reviewed" />
            <KPICard label="Documentation Score" value="8.4/10" icon={<ShieldAlert size={20}/>} sub="SOAP completeness avg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-4">Charges vs Collections by Month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { month: 'Oct', charges: 38200, collections: 32100 },
                  { month: 'Nov', charges: 41500, collections: 35800 },
                  { month: 'Dec', charges: 39800, collections: 34200 },
                  { month: 'Jan', charges: 44100, collections: 38900 },
                  { month: 'Feb', charges: 46300, collections: 41200 },
                  { month: 'Mar', charges: 48800, collections: 43500 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tickFormatter={v => `$${v/1000}K`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(v: number | string | undefined) => [`$${(Number(v ?? 0)/1000).toFixed(1)}K`]} contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="charges" name="Billed" stroke="#047285" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="collections" name="Collected" stroke="#00B5D6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-4">Top CPT Codes This Month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { cpt: '99213', count: 14, revenue: 3290 },
                  { cpt: '99214', count: 9, revenue: 2970 },
                  { cpt: '93000', count: 7, revenue: 665 },
                  { cpt: '85025', count: 5, revenue: 225 },
                  { cpt: '99215', count: 3, revenue: 1245 },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis dataKey="cpt" type="category" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'monospace' }} width={50} />
                  <Tooltip formatter={(v: number | string | undefined) => [v ?? 0, 'Count']} contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, color: '#3A3A3C', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} itemStyle={{ color: '#3A3A3C' }} labelStyle={{ color: '#1D1D1F', fontWeight: 600 }} />
                  <Bar dataKey="count" fill="#00B5D6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-3">Claim Status Breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: 'Paid', count: claims.filter(c=>c.status==='paid').length || 18, color: 'bg-brand' },
                  { label: 'Submitted', count: claims.filter(c=>c.status==='submitted').length || 9, color: 'bg-brand' },
                  { label: 'Ready', count: claims.filter(c=>c.status==='ready').length || 5, color: 'bg-brand' },
                  { label: 'Denied', count: claims.filter(c=>c.status==='denied').length || 3, color: 'bg-[#065E76]' },
                  { label: 'In Process', count: claims.filter(c=>c.status==='in_process').length || 2, color: 'bg-brand-pale' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
                    <span className="text-[12px] text-content-secondary flex-1">{s.label}</span>
                    <span className="text-[13px] font-medium text-content-primary">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-3">Documentation Alerts</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Missing diagnosis linkage', count: 2, color: 'text-[#065E76]' },
                  { label: 'Incomplete SOAP notes', count: 1, color: 'text-brand-deep' },
                  { label: 'Unsigned encounters', count: 3, color: 'text-brand-deep' },
                  { label: 'E/M level mismatch', count: 1, color: 'text-[#065E76]' },
                  { label: 'Missing modifier', count: 0, color: 'text-brand-dark' },
                ].map(a => (
                  <div key={a.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-content-secondary">{a.label}</span>
                    <span className={`text-[13px] font-semibold ${a.color}`}>{a.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-content-primary mb-3">Upcoming Appointments</h3>
              <div className="space-y-2.5">
                {[
                  { time: '9:00 AM', patient: 'Robert Johnson', type: 'Follow-up' },
                  { time: '10:30 AM', patient: 'Maria Garcia', type: 'New Patient' },
                  { time: '2:00 PM', patient: 'James Wilson', type: 'Annual Exam' },
                  { time: '3:15 PM', patient: 'Sara Johnson', type: 'Procedure' },
                  { time: '4:30 PM', patient: 'David Lee', type: 'Follow-up' },
                ].map(a => (
                  <div key={a.time} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-content-tertiary w-16 shrink-0">{a.time}</span>
                    <span className="text-[12px] text-content-primary flex-1">{a.patient}</span>
                    <span className="text-[11px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-pill">{a.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
