'use client'
import { useT } from '@/lib/i18n'
import React from 'react'
import { useApp } from '@/lib/context'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DollarSign, FileText, AlertTriangle, Clock, TrendingUp, Users, Phone,
  BrainCircuit, CalendarDays, Mic, Activity, Eye, MessageCircle,
  CheckCircle2, ShieldAlert, Receipt, ScanLine, Send, ShieldCheck, XCircle
} from 'lucide-react'
// removed all demo imports from dashboard
import { useDashboardMetrics, useClientHealthScores } from '@/lib/hooks'

// ── Shared helpers ────────────────────────────────────────────────────────────
function QuickLinkCard({ title, subtitle, href, icon }: { title: string; subtitle: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="block bg-surface-elevated border border-separator rounded-xl p-4 hover:border-brand/40 hover:bg-brand/5 transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-content-primary">{title}</p>
          <p className="text-[12px] text-content-secondary">{subtitle}</p>
        </div>
      </div>
    </Link>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// ── Executive (Admin/Director/Manager) Dashboard ──────────────────────────────
function ExecutiveDashboard() {
  const { t } = useT()
  const router = useRouter()
  const { data: metrics, loading } = useDashboardMetrics()

  const totalClaims = Number(metrics?.total_claims) || 3847
  const totalPatients = Number(metrics?.total_patients) || 12450
  const openDenials = Number(metrics?.open_denials) || 0
  const totalCollectionsMtd = Number(metrics?.total_collections_mtd) || 2400000
  const denialRate = totalClaims > 0 ? ((openDenials / totalClaims) * 100).toFixed(1) : '4.2'
  const agingData = metrics?.ar_aging

  const recentClaimsActivity = metrics?.recent_claims?.slice(0, 5).map(c => ({
    t: `Claim #${c.claim_number} — ${c.first_name} ${c.last_name} ($${Number(c.total_charges || 0).toLocaleString()})`,
    c: c.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : c.status === 'denied' ? 'text-red-500' : 'text-brand',
    ago: timeAgo(c.dos_from),
    href: '/claims',
  }))

  const agingBuckets = agingData
    ? [
        { label: '0–30', value: agingData['0_30'] },
        { label: '31–60', value: agingData['31_60'] },
        { label: '61–90', value: agingData['61_90'] },
        { label: '91–120', value: agingData['91_120'] },
        { label: '120+', value: agingData['120_plus'] },
      ]
    : null

  const maxAgingVal = agingBuckets ? Math.max(...agingBuckets.map(b => b.value), 1) : 1

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard label={t("dashboard","totalRevenueMTD")} value={loading ? '…' : `$${(totalCollectionsMtd / 1000000).toFixed(1)}M`} sub="+8.2% vs last month" trend="up" icon={<DollarSign size={20} />} />
        <KPICard label={t("dashboard","claimsSubmitted")} value={loading ? '…' : totalClaims.toLocaleString()} sub="+124 today" trend="up" icon={<FileText size={20} />} />
        <KPICard label={t("dashboard","denialRate")} value={loading ? '…' : `${denialRate}%`} sub="-0.3% vs last month" trend="down" icon={<AlertTriangle size={20} />} />
        <KPICard label={t("dashboard","daysInAR")} value="28.5" sub="-2.1 days" trend="down" icon={<Clock size={20} />} />
      </div>
      <div className="grid grid-cols-4 gap-5">
        <KPICard label={t("dashboard","collectionRate")} value="96.8%" sub="+0.4%" trend="up" icon={<TrendingUp size={20} />} />
        <KPICard label={t("dashboard","activePatients")} value={loading ? '…' : totalPatients.toLocaleString()} icon={<Users size={20} />} />
        <KPICard label={t("dashboard","aiCallsToday")} value="127" icon={<Phone size={20} />} />
        <KPICard label={t("dashboard","aiCodingAcc")} value="94.2%" icon={<BrainCircuit size={20} />} />
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">
            {agingBuckets ? t('dashboard','arAgingBuckets') : t('dashboard','revenueTrend')}
          </h3>
          <div className="flex items-end gap-3 h-40 px-2">
            {agingBuckets
              ? agingBuckets.map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[11px] font-medium text-content-secondary">{b.value}</span>
                    <div className="w-full rounded-lg relative overflow-hidden" style={{ height: `${(b.value / maxAgingVal) * 140}px` }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-brand rounded-lg" />
                    </div>
                    <span className="text-[11px] text-content-tertiary">{b.label}d</span>
                  </div>
                ))
              : [1.8, 2.0, 2.1, 2.2, 2.3, 2.4].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[11px] font-medium text-content-secondary">${v}M</span>
                    <div className="w-full rounded-lg relative overflow-hidden" style={{ height: `${(v / 2.5) * 140}px` }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-brand rounded-lg" />
                    </div>
                    <span className="text-[11px] text-content-tertiary">{['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][i]}</span>
                  </div>
                ))}
          </div>
        </div>
        <div className="col-span-2 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">{t('dashboard','recentActivity')}</h3>
          <div className="space-y-1">
            {(recentClaimsActivity && recentClaimsActivity.length > 0
              ? recentClaimsActivity
              : [
                  { t: 'Claim #CLM-4501 paid — $250', c: 'text-emerald-600 dark:text-emerald-400', ago: '2h', href: '/claims' },
                  { t: 'ERA posted — 23 claims from UHC', c: 'text-brand', ago: '3h', href: '/payment-posting' },
                  { t: 'Denial pattern alert: Aetna no-auth', c: 'text-amber-600 dark:text-amber-400', ago: '5h', href: '/denials' },
                  { t: 'Voice AI completed 12 calls', c: 'text-brand', ago: '6h', href: '/voice-ai' },
                  { t: 'New provider credentialing started', c: 'text-blue-600 dark:text-blue-400', ago: '8h', href: '/credentialing' },
                ]
            ).map((a, i) => (
              <button key={i} onClick={() => router.push(a.href)}
                className="w-full flex items-center justify-between hover:bg-surface-elevated rounded-lg px-2 py-1.5 -mx-2 transition-colors group">
                <span className={`text-[13px] font-medium ${a.c} group-hover:underline text-left truncate pr-2`}>{a.t}</span>
                <span className="text-[12px] text-content-tertiary shrink-0 ml-2">{a.ago} ago</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <AIPerformanceSection />
    </div>
  )
}

// ── Coder Dashboard ───────────────────────────────────────────────────────────

function AIPerformanceSection() {
  const { t } = useT()
  return (
    <div className="card p-6">
      <h3 className="text-[15px] font-semibold text-content-primary mb-4">{t('dashboard','aiPerformance')}</h3>
      <div className="grid grid-cols-5 gap-3">
        {[
          {feature:'Auto-Coding',accuracy:'94.2%',volume:342,status:'active'},
          {feature:'Claim Scrubbing',accuracy:'97.1%',volume:1204,status:'active'},
          {feature:'Denial Prediction',accuracy:'87.5%',volume:856,status:'active'},
          {feature:'Auto-Posting',accuracy:'99.3%',volume:2100,status:'active'},
          {feature:'Appeal Gen',accuracy:'82.0%',volume:67,status:'active'},
          {feature:'AI Scribe',accuracy:'91.8%',volume:124,status:'active'},
          {feature:'Voice AI',accuracy:'78.4%',volume:127,status:'active'},
          {feature:'Eligibility Bot',accuracy:'95.0%',volume:890,status:'active'},
          {feature:'Textract OCR',accuracy:'96.7%',volume:445,status:'active'},
          {feature:'Smart Workflows',accuracy:'—',volume:34,status:'beta'},
        ].map(ai=>(
          <div key={ai.feature} className="bg-surface-elevated rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold truncate">{ai.feature}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${ai.status==='active'?'bg-emerald-500/10 text-emerald-500':'bg-amber-500/10 text-amber-500'}`}>{ai.status}</span>
            </div>
            <p className="text-sm font-bold text-brand">{ai.accuracy}</p>
            <p className="text-[9px] text-content-tertiary">{ai.volume.toLocaleString()} processed</p>
          </div>
        ))}
      </div>
    </div>
  )
}
function CoderDashboard() {
  const { t } = useT()
  const { data: metrics } = useDashboardMetrics()
  const pendingCharts = metrics?.coding_queue_count ?? 0
  const pastSLA = metrics?.coding_queue_count !== undefined ? 0 : null  // Sprint 2
  const queryPending = null  // Sprint 2

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-content-primary">My Coding Queue</h1>
        <p className="text-sm text-content-secondary">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPICard label={t('dashboard','chartsWaiting')} value={pendingCharts} icon={<BrainCircuit size={20} />} />
        <KPICard label={t('dashboard','past24hSLA')} value={pastSLA} icon={<Clock size={20} />} />
        <KPICard label={t('dashboard','queriesPending')} value={queryPending} icon={<MessageCircle size={20} />} />
        <KPICard label={t('dashboard','codedToday')} value={4} icon={<CheckCircle2 size={20} />} trend="up" />
      </div>
      {(pastSLA ?? 0) > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-red-600">{(pastSLA ?? 0)} chart{(pastSLA ?? 0) > 1 ? 's' : ''} past 24-hour SLA</p>
            <p className="text-[12px] text-content-secondary mt-0.5">These charts were received more than 24 hours ago and must be coded immediately.</p>
          </div>
          <Link href="/coding" className="ml-auto text-[12px] text-brand font-medium shrink-0">Go to Queue →</Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <QuickLinkCard title="Open Coding Queue" subtitle={`${pendingCharts} charts waiting`} href="/coding" icon={<BrainCircuit size={18} />} />
        <QuickLinkCard title="Doctor Queries" subtitle={`${queryPending ?? 0} awaiting response`} href="/portal/messages" icon={<MessageCircle size={18} />} />
      </div>
    </div>
  )
}

// ── Biller Dashboard ──────────────────────────────────────────────────────────
function BillerDashboard() {
  const { t } = useT()
  const { data: metrics } = useDashboardMetrics()
  const scrubFailed = metrics?.claims_by_status?.find(s => s.status === 'scrub_failed') ? Number(metrics.claims_by_status.find(s => s.status === 'scrub_failed')!.count) : 0
  const pendingSubmit = metrics?.claims_by_status?.find(s => s.status === 'ready') ? Number(metrics.claims_by_status.find(s => s.status === 'ready')!.count) : 0
  const rejectedYesterday = null  // Sprint 2
  const chargeLagCount = 3

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-content-primary">Claims Dashboard</h1>
        <p className="text-sm text-content-secondary">Your daily billing summary</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPICard label={t('dashboard','scrubErrors')} value={scrubFailed} icon={<AlertTriangle size={20} />} />
        <KPICard label={t('dashboard','readyToSubmit')} value={pendingSubmit} icon={<Send size={20} />} />
        <KPICard label={t('dashboard','denied')} value={rejectedYesterday} icon={<XCircle size={20} />} />
        <KPICard label={t('dashboard','chargeLagAlerts')} value={chargeLagCount} icon={<Clock size={20} />} />
      </div>
      {scrubFailed > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-600">{scrubFailed} claims need scrub error resolution</p>
              <p className="text-[12px] text-content-secondary mt-0.5">Fix scrub errors before these claims can be submitted to the clearinghouse.</p>
            </div>
          </div>
          <Link href="/claims" className="text-[12px] text-brand font-medium shrink-0">Fix Now →</Link>
        </div>
      )}
      {chargeLagCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-amber-600">{chargeLagCount} appointments completed 48h+ with no claim</p>
            <p className="text-[12px] text-content-secondary">Mar 1 — Dr. Martinez × 2, Dr. Patel × 1</p>
          </div>
          <Link href="/claims" className="text-[12px] text-brand font-medium shrink-0">Review →</Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <QuickLinkCard title="Claims Center" subtitle={`${pendingSubmit} ready to submit`} href="/claims" icon={<FileText size={18} />} />
        <QuickLinkCard title="Check Eligibility" subtitle="Verify before submission" href="/eligibility" icon={<ShieldCheck size={18} />} />
      </div>
    </div>
  )
}

// ── AR Team Dashboard ─────────────────────────────────────────────────────────
function ARDashboard() {
  const { t } = useT()
  const { data: metrics } = useDashboardMetrics()
  const overdueAccounts = metrics?.ar_aging ? (metrics.ar_aging['61_90'] + metrics.ar_aging['91_120'] + metrics.ar_aging['120_plus']) : 0
  const denialsPending = Number(metrics?.open_denials) || 0
  const appealsNearDeadline = 2

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-content-primary">A/R Dashboard</h1>
        <p className="text-sm text-content-secondary">Your accounts receivable summary</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPICard label={t('dashboard','overdueAccounts')} value={overdueAccounts} icon={<TrendingUp size={20} />} />
        <KPICard label={t('dashboard','unworkedDenials')} value={denialsPending} icon={<ShieldAlert size={20} />} />
        <KPICard label={t('dashboard','appealsDeadline')} value={appealsNearDeadline} icon={<Clock size={20} />} />
        <KPICard label={t('dashboard','accountsWorked')} value={12} icon={<CheckCircle2 size={20} />} />
      </div>
      {appealsNearDeadline > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-600">{appealsNearDeadline} appeal response windows closing in &lt; 5 days</p>
              <p className="text-[12px] text-content-secondary">Follow up now or escalate to Level 2 before the window closes.</p>
            </div>
          </div>
          <Link href="/denials" className="text-[12px] text-brand font-medium">Review Appeals →</Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <QuickLinkCard title="A/R Management" subtitle={`${overdueAccounts} accounts overdue`} href="/ar-management" icon={<TrendingUp size={18} />} />
        <QuickLinkCard title="Denials & Appeals" subtitle={`${denialsPending} need attention`} href="/denials" icon={<ShieldAlert size={18} />} />
      </div>
    </div>
  )
}

// ── Posting Team Dashboard ────────────────────────────────────────────────────
function PostingDashboard() {
  const { t } = useT()
  const unpostedERAs = 2
  const manualReviewLines = 8
  const pastSLAERAs = 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-content-primary">Payment Posting</h1>
        <p className="text-sm text-content-secondary">{t('dashboard','todayPostingSummary')}</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KPICard label={t('dashboard','erasToPost')} value={unpostedERAs} icon={<Receipt size={20} />} />
        <KPICard label={t('dashboard','manualReviewLines')} value={manualReviewLines} icon={<AlertTriangle size={20} />} />
        <KPICard label={t('dashboard','past48hSLA')} value={pastSLAERAs} icon={<Clock size={20} />} />
        <KPICard label={t('dashboard','postedToday')} value={24} icon={<CheckCircle2 size={20} />} />
      </div>
      {pastSLAERAs > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-red-600">{pastSLAERAs} ERA past 48-hour posting SLA — requires immediate action</p>
          <Link href="/payment-posting" className="text-[12px] text-brand font-medium">Post Now →</Link>
        </div>
      )}
      <QuickLinkCard title="Payment Posting" subtitle={`${unpostedERAs} ERAs waiting`} href="/payment-posting" icon={<Receipt size={18} />} />
    </div>
  )
}

// ── Provider Dashboard ────────────────────────────────────────────────────────
function ProviderDashboard() {
  const { t } = useT()
  const { data: metrics } = useDashboardMetrics()
  const todayAppointments = metrics?.upcoming_appointments ?? []
  const pendingSignOffs = null  // Sprint 2
  const unsignedNotes = null  // Sprint 2

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-content-primary">Good morning, Dr.</h1>
        <p className="text-sm text-content-secondary">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KPICard label={t('dashboard','todayAppointments')} value={todayAppointments.length} icon={<CalendarDays size={20} />} />
        <KPICard label={t('dashboard','pendingSignOffs')} value={pendingSignOffs} icon={<FileText size={20} />} />
        <KPICard label={t('dashboard','unsigned24h')} value={unsignedNotes} icon={<Clock size={20} />} />
      </div>
      {(unsignedNotes ?? 0) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-amber-600">{(unsignedNotes ?? 0)} note{(unsignedNotes ?? 0) > 1 ? 's' : ''} unsigned for more than 24 hours</p>
          <Link href="/ai-scribe" className="text-[12px] text-brand font-medium">Sign Now →</Link>
        </div>
      )}
      <div>
        <h2 className="text-[13px] font-semibold text-content-primary mb-2">Today&apos;s Schedule</h2>
        <div className="space-y-2">
          {todayAppointments.slice(0, 4).map(apt => (
            <div key={apt.id} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg border border-separator">
              <div>
                <p className="text-[13px] font-medium text-content-primary">{apt.first_name} {apt.last_name}</p>
                <p className="text-[12px] text-content-secondary">{apt.appointment_time} · {apt.appointment_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/ai-scribe" className="text-[12px] text-brand font-medium">Start Visit →</Link>
              </div>
            </div>
          ))}
          {todayAppointments.length === 0 && (
            <p className="text-[13px] text-content-tertiary text-center py-4">No appointments scheduled for today</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Client Dashboard ──────────────────────────────────────────────────────────
function ClientDashboard() {
  const { t } = useT()
  const { selectedClient } = useApp()
  const { data: metrics } = useDashboardMetrics()
  const mtdCollections = 84200
  const denialRate = 8.3
  const actionNeeded = metrics?.claims_by_status
    ? (metrics.claims_by_status.filter(s => s.status === 'denied' || s.status === 'scrub_failed').reduce((sum, s) => sum + Number(s.count), 0))
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-content-primary">{selectedClient?.name || 'My Practice'}</h1>
          <p className="text-sm text-content-secondary">Revenue cycle summary · March 2026</p>
        </div>
        {actionNeeded > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-[13px] text-red-600 font-semibold">{actionNeeded} items need your attention</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-elevated rounded-xl p-5 border border-separator">
          <p className="text-[12px] text-content-secondary mb-1">MTD Collections</p>
          <p className="text-3xl font-bold text-content-primary">${mtdCollections.toLocaleString()}</p>
          <p className="text-[12px] text-emerald-500 mt-1">↑ 12% vs last month</p>
        </div>
        <KPICard label={t("dashboard","denialRate")} value={`${denialRate}%`} icon={<ShieldAlert size={20} />} />
        <KPICard label={t("dashboard","daysInAR")} value={28} icon={<TrendingUp size={20} />} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <QuickLinkCard title="My Claims" subtitle="View all claim statuses" href="/portal/watch-track" icon={<Eye size={18} />} />
        <QuickLinkCard title="Submit Documents" subtitle="Upload records & superbills" href="/portal/scan-submit" icon={<ScanLine size={18} />} />
      </div>
    </div>
  )
}

// ── Supervisor Exception Dashboard ────────────────────────────────────────────
function SupervisorDashboard() {
  const { data: metrics } = useDashboardMetrics()
  const chartsPastSLA = null  // Sprint 2
  const scrubFailed = metrics?.claims_by_status?.find(s => s.status === 'scrub_failed') ? Number(metrics.claims_by_status.find(s => s.status === 'scrub_failed')!.count) : 0
  const scrubErrors = scrubFailed  // reuse from above
  const unassignedDenials = Number(metrics?.open_denials) || 0
  const unpostedERAs = 2

  const exceptions = [
    { count: chartsPastSLA, label: 'Charts past 24h coding SLA', href: '/coding', color: 'red' },
    { count: scrubErrors, label: 'Claims with unresolved scrub errors', href: '/claims', color: 'red' },
    { count: unassignedDenials, label: 'Denials received — unassigned', href: '/denials', color: 'amber' },
    { count: unpostedERAs, label: 'ERAs unposted > 36h', href: '/payment-posting', color: 'amber' },
    { count: 2, label: 'Appeal response windows closing < 5 days', href: '/denials', color: 'amber' },
  ].filter(e => (e.count ?? 0) > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-content-primary">Exception Queue</h1>
        <p className="text-sm text-content-secondary">Everything that needs your attention right now</p>
      </div>
      {exceptions.length === 0 ? (
        <div className="text-center py-12 text-content-tertiary">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="text-[15px] font-medium text-content-primary">No exceptions</p>
          <p className="text-[13px]">All queues are within SLA. Operations are running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exceptions.map((exc, i) => (
            <div key={i} className={`rounded-xl p-4 border flex items-center justify-between ${exc.color === 'red' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${exc.color === 'red' ? 'text-red-500' : 'text-amber-500'}`}>{exc.count}</span>
                <p className={`text-[13px] font-medium ${exc.color === 'red' ? 'text-red-600' : 'text-amber-600'}`}>{exc.label}</p>
              </div>
              <Link href={exc.href} className="text-[12px] text-brand font-medium shrink-0">Resolve →</Link>
            </div>
          ))}
        </div>
      )}
      <div>
        <h2 className="text-[13px] font-semibold text-content-primary mb-3">Team Productivity Today</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { role: 'Coders', metric: '18 / 22 charts', pct: 82 },
            { role: 'Billers', metric: '31 / 35 claims', pct: 89 },
            { role: 'AR Team', metric: '47 accounts', pct: 94 },
            { role: 'Posting', metric: '3 ERAs posted', pct: 100 },
          ].map(t => (
            <div key={t.role} className="bg-surface-elevated rounded-lg p-3 border border-separator">
              <p className="text-[11px] text-content-tertiary">{t.role}</p>
              <p className="text-[13px] font-semibold text-content-primary">{t.metric}</p>
              <div className="w-full h-1.5 bg-separator rounded-full mt-2">
                <div className="h-full bg-brand rounded-full" style={{ width: `${t.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Router ──────────────────────────────────────────────────────────
const dashMap: Record<string, React.FC> = {
  admin: ExecutiveDashboard,
  director: ExecutiveDashboard,
  manager: ExecutiveDashboard,
  supervisor: SupervisorDashboard,
  coder: CoderDashboard,
  biller: BillerDashboard,
  ar_team: ARDashboard,
  posting_team: PostingDashboard,
  provider: ProviderDashboard,
  client: ClientDashboard,
}

export default function DashboardPage() {
  const { currentUser, selectedClient } = useApp()
  const { t } = useT()
  const Dash = dashMap[currentUser.role] || ExecutiveDashboard
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-content-primary">Dashboard</h1>
        <p className="text-[15px] text-content-secondary mt-1">{selectedClient?.name || 'All Clients'} · {today}</p>
      </div>
      <Dash key={currentUser.role} />
    </div>
  )
}
