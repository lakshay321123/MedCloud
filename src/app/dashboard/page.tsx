'use client'

import React from 'react'
import { useApp } from '@/lib/context'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { UserRole } from '@/types'
import {
  LayoutDashboard, DollarSign, FileText, ShieldAlert, Clock,
  TrendingUp, Users, Phone, BrainCircuit, CheckCircle, AlertTriangle,
  Target, Timer, ClipboardList, CreditCard, Upload, Eye, BarChart3,
  Activity, Zap, ArrowUpRight, Receipt,
} from 'lucide-react'

/* ═══════════ EXECUTIVE DASHBOARD (admin, director) ═══════════ */
function ExecutiveDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Revenue" value="$2.4M" change={12.5} changeLabel="vs last month" icon={<DollarSign size={18} />} />
        <KPICard title="Claims Submitted" value="3,847" change={8.2} changeLabel="vs last month" icon={<FileText size={18} />} />
        <KPICard title="Denial Rate" value="4.2%" change={-1.8} changeLabel="improvement" icon={<ShieldAlert size={18} />} />
        <KPICard title="Avg Days in A/R" value="28.5" change={-3.2} changeLabel="days faster" icon={<Clock size={18} />} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Collection Rate" value="96.8%" change={2.1} icon={<TrendingUp size={18} />} />
        <KPICard title="Active Patients" value="12,450" change={5.4} icon={<Users size={18} />} />
        <KPICard title="AI Calls Today" value="127" change={34} icon={<Phone size={18} />} />
        <KPICard title="AI Coding Accuracy" value="94.2%" change={1.3} icon={<BrainCircuit size={18} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Revenue Trend</h3>
          <div className="h-48 flex items-center justify-center text-[var(--text-secondary)] text-xs font-mono">[ Chart — Sprint 3 ]</div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {['Claim #4521 submitted', 'ERA file processed', 'Denial appeal sent', 'Voice call completed', 'Patient payment received'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-brand/50 flex-shrink-0" />
                <span>{item}</span>
                <span className="ml-auto font-mono opacity-50">{i + 1}m ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════ SUPERVISOR / MANAGER DASHBOARD ═══════════ */
function SupervisorDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Team Productivity" value="94%" change={3.2} changeLabel="vs target" icon={<Target size={18} />} />
        <KPICard title="Open Tasks" value="247" change={-12} changeLabel="less than yesterday" icon={<ClipboardList size={18} />} />
        <KPICard title="Claims in Queue" value="182" change={-8.5} changeLabel="clearing faster" icon={<FileText size={18} />} />
        <KPICard title="Avg Processing Time" value="4.2h" change={-15} changeLabel="faster" icon={<Timer size={18} />} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Denial Rate (Team)" value="4.2%" change={-1.8} icon={<ShieldAlert size={18} />} />
        <KPICard title="First Pass Rate" value="91.3%" change={2.4} icon={<CheckCircle size={18} />} />
        <KPICard title="Escalations Today" value="8" change={-3} icon={<AlertTriangle size={18} />} />
        <KPICard title="Staff Online" value="42/48" icon={<Users size={18} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Team Workload</h3>
          <div className="space-y-3">
            {[
              { name: 'Coding Team', tasks: 67, capacity: 80 },
              { name: 'Billing Team', tasks: 54, capacity: 60 },
              { name: 'AR Team', tasks: 82, capacity: 90 },
              { name: 'Posting Team', tasks: 39, capacity: 50 },
            ].map((team, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-primary)]">{team.name}</span>
                  <span className="text-[var(--text-secondary)] font-mono">{team.tasks}/{team.capacity}</span>
                </div>
                <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(team.tasks / team.capacity) * 100}%`, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pending Escalations</h3>
          <div className="space-y-3">
            {[
              { issue: 'Claim #8821 — payer not responding 45+ days', priority: 'high' },
              { issue: 'Patient complaint — billing dispute #3312', priority: 'high' },
              { issue: 'ERA mismatch — Aetna batch #992', priority: 'medium' },
              { issue: 'Coding query — modifier 25 usage', priority: 'low' },
            ].map((esc, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${esc.priority === 'high' ? 'bg-red-400' : esc.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-[var(--text-secondary)]">{esc.issue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════ CODER DASHBOARD ═══════════ */
function CoderDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="My Queue" value="23" icon={<ClipboardList size={18} />} />
        <KPICard title="Coded Today" value="47" change={12} changeLabel="vs avg" icon={<CheckCircle size={18} />} />
        <KPICard title="AI Suggestions Used" value="89%" change={4.2} icon={<BrainCircuit size={18} />} />
        <KPICard title="Accuracy Rate" value="97.1%" change={0.8} icon={<Target size={18} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">My Coding Queue</h3>
          <div className="space-y-2">
            {[
              { patient: 'Smith, John', type: 'E&M Visit', provider: 'Dr. Martinez', urgency: 'normal', age: '2h' },
              { patient: 'Johnson, Mary', type: 'Surgical', provider: 'Dr. Chen', urgency: 'urgent', age: '4h' },
              { patient: 'Williams, Robert', type: 'Lab/Path', provider: 'Dr. Patel', urgency: 'normal', age: '1h' },
              { patient: 'Brown, Lisa', type: 'Radiology', provider: 'Dr. Kim', urgency: 'normal', age: '30m' },
              { patient: 'Davis, Michael', type: 'E&M Visit', provider: 'Dr. Martinez', urgency: 'hold', age: '6h' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.urgency === 'urgent' ? 'bg-red-400' : item.urgency === 'hold' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-sm text-[var(--text-primary)] w-40 truncate">{item.patient}</span>
                <span className="text-xs text-[var(--text-secondary)] w-24">{item.type}</span>
                <span className="text-xs text-[var(--text-secondary)] flex-1">{item.provider}</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">{item.age}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">My Stats This Week</h3>
          <div className="space-y-4">
            {[
              { label: 'Charts Coded', value: '234', trend: '+18%' },
              { label: 'Avg Time per Chart', value: '6.2 min', trend: '-12%' },
              { label: 'AI Override Rate', value: '11%', trend: '-3%' },
              { label: 'Queries Sent', value: '4', trend: '' },
              { label: 'Auditor Returns', value: '2', trend: '' },
            ].map((stat, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-secondary)]">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{stat.value}</span>
                  {stat.trend && <span className={`text-[10px] font-mono ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-brand'}`}>{stat.trend}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════ BILLER DASHBOARD ═══════════ */
function BillerDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Claims to Submit" value="34" icon={<FileText size={18} />} />
        <KPICard title="Submitted Today" value="62" change={8} icon={<CheckCircle size={18} />} />
        <KPICard title="Rejections (24h)" value="3" change={-2} changeLabel="fewer" icon={<AlertTriangle size={18} />} />
        <KPICard title="First Pass Rate" value="93.1%" change={1.5} icon={<Target size={18} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Claims Ready for Submission</h3>
          <div className="space-y-2">
            {[
              { id: 'CLM-4892', patient: 'Smith, John', payer: 'UHC', amount: '$1,250', status: 'ready' },
              { id: 'CLM-4893', patient: 'Davis, Sarah', payer: 'Aetna', amount: '$820', status: 'ready' },
              { id: 'CLM-4894', patient: 'Wilson, Tom', payer: 'BCBS', amount: '$2,100', status: 'needs_review' },
              { id: 'CLM-4895', patient: 'Lee, Amy', payer: 'Cigna', amount: '$450', status: 'ready' },
            ].map((claim, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)]">
                <span className="text-xs font-mono text-brand">{claim.id}</span>
                <span className="text-sm text-[var(--text-primary)] w-32 truncate">{claim.patient}</span>
                <span className="text-xs text-[var(--text-secondary)] w-16">{claim.payer}</span>
                <span className="text-xs font-mono text-[var(--text-primary)] ml-auto">{claim.amount}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${claim.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {claim.status === 'ready' ? 'Ready' : 'Review'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Rejections</h3>
          <div className="space-y-3">
            {[
              { id: 'CLM-4870', reason: 'Missing modifier — CPT 99214', payer: 'UHC' },
              { id: 'CLM-4865', reason: 'Invalid NPI — rendering provider', payer: 'Humana' },
              { id: 'CLM-4851', reason: 'Duplicate claim submitted', payer: 'BCBS' },
            ].map((rej, i) => (
              <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-red-400">{rej.id}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{rej.payer}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{rej.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════ AR TEAM DASHBOARD ═══════════ */
function ARDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="My A/R Accounts" value="156" icon={<ClipboardList size={18} />} />
        <KPICard title="Worked Today" value="28" change={5} icon={<CheckCircle size={18} />} />
        <KPICard title="Follow-ups Due" value="42" icon={<Timer size={18} />} />
        <KPICard title="Avg Days Outstanding" value="34.2" change={-4.1} changeLabel="days faster" icon={<Clock size={18} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Aging Buckets (My Accounts)</h3>
          <div className="space-y-3">
            {[
              { bucket: '0-30 days', count: 45, color: 'bg-emerald-400' },
              { bucket: '31-60 days', count: 38, color: 'bg-brand' },
              { bucket: '61-90 days', count: 32, color: 'bg-amber-400' },
              { bucket: '91-120 days', count: 24, color: 'bg-orange-400' },
              { bucket: '120+ days', count: 17, color: 'bg-red-400' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)] w-24">{b.bucket}</span>
                <div className="flex-1 h-5 bg-[var(--bg-primary)] rounded overflow-hidden">
                  <div className={`h-full rounded ${b.color}`} style={{ width: `${(b.count / 50) * 100}%`, opacity: 0.7 }} />
                </div>
                <span className="text-xs font-mono text-[var(--text-primary)] w-8 text-right">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Today&apos;s Follow-up Priority</h3>
          <div className="space-y-2">
            {[
              { patient: 'Martinez, Carlos', payer: 'UHC', amount: '$4,200', days: 95, action: 'Call payer' },
              { patient: 'Kim, Susan', payer: 'Aetna', amount: '$1,800', days: 72, action: 'Send appeal' },
              { patient: 'Brown, James', payer: 'BCBS', amount: '$3,100', days: 64, action: 'Check portal' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-primary)] text-xs">
                <span className="text-[var(--text-primary)] w-32 truncate">{item.patient}</span>
                <span className="text-[var(--text-secondary)] w-12">{item.payer}</span>
                <span className="font-mono text-[var(--text-primary)]">{item.amount}</span>
                <span className="font-mono text-amber-400 ml-auto">{item.days}d</span>
                <span className="text-brand text-[10px]">{item.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════ POSTING TEAM DASHBOARD ═══════════ */
function PostingDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="ERAs to Process" value="12" icon={<Receipt size={18} />} />
        <KPICard title="Posted Today" value="89" change={14} icon={<CheckCircle size={18} />} />
        <KPICard title="Unmatched Payments" value="4" icon={<AlertTriangle size={18} />} />
        <KPICard title="Auto-Posted (AI)" value="76%" change={8.3} icon={<Zap size={18} />} />
      </div>
      <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pending ERA Files</h3>
        <div className="space-y-2">
          {[
            { file: 'ERA_UHC_20260301.835', claims: 45, total: '$34,200' },
            { file: 'ERA_AETNA_20260301.835', claims: 28, total: '$18,700' },
            { file: 'ERA_BCBS_20260228.835', claims: 12, total: '$8,400' },
          ].map((era, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)]">
              <Receipt size={14} className="text-brand flex-shrink-0" />
              <span className="text-xs font-mono text-[var(--text-primary)] flex-1 truncate">{era.file}</span>
              <span className="text-xs text-[var(--text-secondary)]">{era.claims} claims</span>
              <span className="text-xs font-mono text-[var(--text-primary)]">{era.total}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ═══════════ CLIENT DASHBOARD ═══════════ */
function ClientDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Claims This Month" value="342" change={5.2} icon={<FileText size={18} />} />
        <KPICard title="Pending Claims" value="28" icon={<Clock size={18} />} />
        <KPICard title="Denial Rate" value="3.8%" change={-1.2} changeLabel="improving" icon={<ShieldAlert size={18} />} />
        <KPICard title="Avg Days to Payment" value="22" change={-5} changeLabel="days faster" icon={<Timer size={18} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Claims Summary</h3>
          <div className="h-48 flex items-center justify-center text-[var(--text-secondary)] text-xs font-mono">[ Claims by Status Chart — Sprint 3 ]</div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Upload Superbill', icon: Upload, path: '/portal/scan-submit' },
              { label: 'Track Claims', icon: Eye, path: '/portal/watch-track' },
              { label: 'Add New Patient', icon: Users, path: '/portal/patients' },
              { label: 'Contact Support', icon: Activity, path: '/portal/talk-to-us' },
            ].map((action, i) => (
              <a key={i} href={action.path} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                <action.icon size={16} className="text-brand" />
                <span className="text-sm text-[var(--text-primary)]">{action.label}</span>
                <ArrowUpRight size={14} className="ml-auto text-[var(--text-secondary)]" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════ MAPPING ═══════════ */
const dashboardMap: Record<string, React.ComponentType> = {
  admin: ExecutiveDashboard,
  director: ExecutiveDashboard,
  supervisor: SupervisorDashboard,
  manager: SupervisorDashboard,
  coder: CoderDashboard,
  biller: BillerDashboard,
  ar_team: ARDashboard,
  posting_team: PostingDashboard,
  client: ClientDashboard,
}

const subtitleMap: Record<string, string> = {
  admin: 'Executive Overview',
  director: 'Executive Overview',
  supervisor: 'Team Performance',
  manager: 'Team Performance',
  coder: 'My Coding Workspace',
  biller: 'My Billing Queue',
  ar_team: 'My A/R Workload',
  posting_team: 'Payment Processing',
  client: 'Your Practice Overview',
}

export default function DashboardPage() {
  const { currentUser } = useApp()
  const Dashboard = dashboardMap[currentUser.role] || ExecutiveDashboard
  const subtitle = subtitleMap[currentUser.role] || 'Overview'

  return (
    <ModuleShell
      title="Dashboard"
      subtitle={`${subtitle} — Welcome, ${currentUser.name}`}
      sprint="Sprint 1"
      icon={<LayoutDashboard size={20} />}
    >
      <Dashboard />
    </ModuleShell>
  )
}
