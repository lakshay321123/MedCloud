'use client'
import React from 'react'
import { useApp } from '@/lib/context'
import KPICard from '@/components/shared/KPICard'
import { DollarSign, FileText, AlertTriangle, Clock, TrendingUp, Users, Phone, BrainCircuit, CalendarDays, ListChecks, Mic, Activity, ArrowRight, Upload, Eye, MessageCircle } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function ProgressRing({ percent, size = 48, stroke = 4, color = '#00B5D6' }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} className="ring-track" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} stroke={color} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  )
}

function MiniBar({ values, colors }: { values: number[]; colors: string[] }) {
  const max = Math.max(...values)
  return (
    <div className="flex items-end gap-1.5 h-16">{values.map((v, i) => (
      <div key={i} className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${(v / max) * 100}%`, background: colors[i] || '#00B5D6' }} />
    ))}</div>
  )
}

function ExecutiveDashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard label="Total Revenue (MTD)" value="$2.4M" sub="+8.2% vs last month" trend="up" icon={<DollarSign size={20}/>} />
        <KPICard label="Claims Submitted" value="3,847" sub="+124 today" trend="up" icon={<FileText size={20}/>} />
        <KPICard label="Denial Rate" value="4.2%" sub="-0.3% vs last month" trend="down" icon={<AlertTriangle size={20}/>} />
        <KPICard label="Avg Days in A/R" value="28.5" sub="-2.1 days" trend="down" icon={<Clock size={20}/>} />
      </div>
      <div className="grid grid-cols-4 gap-5">
        <KPICard label="Collection Rate" value="96.8%" sub="+0.4%" trend="up" icon={<TrendingUp size={20}/>} />
        <KPICard label="Active Patients" value="12,450" icon={<Users size={20}/>} />
        <KPICard label="AI Calls Today" value="127" icon={<Phone size={20}/>} />
        <KPICard label="AI Coding Accuracy" value="94.2%" icon={<BrainCircuit size={20}/>} />
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Revenue Trend</h3>
          <div className="flex items-end gap-3 h-40 px-2">
            {[1.8,2.0,2.1,2.2,2.3,2.4].map((v,i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[11px] font-medium text-content-secondary">${v}M</span>
                <div className="w-full rounded-lg relative overflow-hidden" style={{height:`${(v/2.5)*140}px`}}>
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-brand rounded-lg" />
                </div>
                <span className="text-[11px] text-content-tertiary">{['Oct','Nov','Dec','Jan','Feb','Mar'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Recent Activity</h3>
          <div className="space-y-1">
            {[
              { t: 'Claim #CLM-4501 paid — $250', c: 'text-emerald-600 dark:text-emerald-400', ago: '2h', href: '/claims' },
              { t: 'ERA posted — 23 claims from UHC', c: 'text-brand', ago: '3h', href: '/payment-posting' },
              { t: 'Denial pattern alert: Aetna no-auth', c: 'text-amber-600 dark:text-amber-400', ago: '4h', href: '/denials' },
              { t: 'Voice AI completed 12 calls', c: 'text-brand', ago: '5h', href: '/voice-ai' },
              { t: 'New provider credentialing started', c: 'text-blue-600 dark:text-blue-400', ago: '6h', href: '/credentialing' },
            ].map((a, i) => (
              <button key={i} onClick={() => router.push(a.href)}
                className="w-full flex items-center justify-between hover:bg-surface-elevated rounded-lg px-2 py-1.5 -mx-2 transition-colors group">
                <span className={`text-[13px] font-medium ${a.c} group-hover:underline text-left`}>{a.t}</span>
                <span className="text-[12px] text-content-tertiary shrink-0 ml-2">{a.ago} ago</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProviderDashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard label="Today's Patients" value="14" icon={<Users size={20}/>} />
        <KPICard label="Pending Sign-offs" value="3" icon={<Mic size={20}/>} />
        <KPICard label="Seen Today" value="5" icon={<CalendarDays size={20}/>} />
        <KPICard label="Clinical Alerts" value="1" sub="drug interaction" icon={<AlertTriangle size={20}/>} />
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            {[
              { time: '9:00', patient: 'John Smith', type: 'Follow-up', status: 'completed' },
              { time: '9:30', patient: 'Sarah Johnson', type: 'Consultation', status: 'checked_in' },
              { time: '10:00', patient: 'Ahmed Al Mansouri', type: 'Follow-up', status: 'confirmed' },
              { time: '10:30', patient: 'Maria Garcia', type: 'New Patient', status: 'booked' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 py-2.5 border-b border-separator last:border-0">
                <span className="text-[14px] font-mono text-content-secondary w-12">{a.time}</span>
                <span className="text-[14px] font-medium text-content-primary flex-1">{a.patient}</span>
                <span className="text-[13px] text-content-secondary">{a.type}</span>
                <StatusBadge status={a.status} small />
                {a.status === 'checked_in' && (
                  <button onClick={() => router.push('/ai-scribe')}
                    className="text-[11px] bg-brand text-white px-2.5 py-1 rounded-btn hover:bg-brand-deep transition-colors">
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Pending Sign-offs</h3>
          <div className="space-y-3">
            {[
              { patient: 'Robert Chen', date: '2026-03-01', type: 'Follow-up' },
              { patient: 'Ahmed Al Mansouri', date: '2026-03-01', type: 'Follow-up' },
              { patient: 'John Smith', date: '2026-03-02', type: 'Post-op' },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-separator last:border-0">
                <div>
                  <div className="text-[14px] font-medium text-content-primary">{n.patient}</div>
                  <div className="text-[12px] text-content-tertiary">{n.date} · {n.type}</div>
                </div>
                <StatusBadge status="pending_signoff" small />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClientDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard label="Claims This Month" value="342" icon={<FileText size={20}/>} />
        <KPICard label="Pending Claims" value="28" icon={<Clock size={20}/>} />
        <KPICard label="Denial Rate" value="3.8%" sub="-0.5%" trend="down" icon={<AlertTriangle size={20}/>} />
        <KPICard label="Avg Days to Payment" value="22" sub="-3 days" trend="down" icon={<DollarSign size={20}/>} />
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Today's Appointments</h3>
          <div className="space-y-3">
            {[
              { time: '9:00', patient: 'John Smith', status: 'completed' },
              { time: '9:30', patient: 'Sarah Johnson', status: 'checked_in' },
              { time: '10:30', patient: 'Maria Garcia', status: 'booked' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 py-2.5 border-b border-separator last:border-0">
                <span className="text-[14px] font-mono text-content-secondary w-12">{a.time}</span>
                <span className="text-[14px] font-medium text-content-primary flex-1">{a.patient}</span>
                <StatusBadge status={a.status} small />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Upload Documents', icon: Upload, href: '/portal/scan-submit' },
              { label: 'Track Claims', icon: Eye, href: '/portal/watch-track' },
              { label: 'View Schedule', icon: CalendarDays, href: '/portal/appointments' },
              { label: 'Messages', icon: MessageCircle, href: '/portal/messages' },
            ].map(a => (
              <Link key={a.label} href={a.href} className="card flex flex-col items-center justify-center py-4 gap-2 hover:bg-surface-elevated transition-colors">
                <a.icon size={20} className="text-brand" />
                <span className="text-[12px] font-medium text-content-secondary">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard label="Team Productivity" value="94%" sub="+2%" trend="up" icon={<TrendingUp size={20}/>} />
        <KPICard label="Open Tasks" value="247" icon={<ListChecks size={20}/>} />
        <KPICard label="Claims in Queue" value="182" icon={<FileText size={20}/>} />
        <KPICard label="Escalations" value="8" sub="3 urgent" icon={<AlertTriangle size={20}/>} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Team Workload</h3>
          <div className="space-y-4">{[
            { team: 'Coding', pct: 85, color: '#00B5D6' }, { team: 'Billing', pct: 72, color: '#069DB8' },
            { team: 'A/R', pct: 91, color: '#047285' }, { team: 'Posting', pct: 65, color: '#36C2DE' },
          ].map(t => (
            <div key={t.team}>
              <div className="flex justify-between text-[13px] mb-1.5"><span className="font-medium text-content-primary">{t.team}</span><span className="text-content-secondary">{t.pct}%</span></div>
              <div className="h-2 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.pct}%`, background: t.color }} /></div>
            </div>
          ))}</div>
        </div>
        <div className="card p-6">
          <h3 className="text-[15px] font-semibold text-content-primary mb-4">Pending Escalations</h3>
          <div className="space-y-3">{[
            { issue: 'Aetna denial pattern — 3 claims same reason', pri: 'urgent' },
            { issue: 'ERA mismatch — UHC file #2301', pri: 'high' },
            { issue: 'Patient complaint — billing dispute', pri: 'medium' },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-separator last:border-0">
              <StatusBadge status={e.pri} small />
              <span className="text-[13px] text-content-primary">{e.issue}</span>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  )
}

function CoderDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard label="My Queue" value="23" icon={<FileText size={20}/>} />
        <KPICard label="Coded Today" value="47" sub="+12" trend="up" icon={<BrainCircuit size={20}/>} />
        <KPICard label="AI Suggestions Used" value="89%" icon={<Activity size={20}/>} />
        <KPICard label="Accuracy Rate" value="97.1%" icon={<TrendingUp size={20}/>} />
      </div>
      <div className="card p-6">
        <h3 className="text-[15px] font-semibold text-content-primary mb-4">My Stats</h3>
        <div className="grid grid-cols-4 gap-6">{[
          { label: 'Charts Coded MTD', value: '234' }, { label: 'Avg Time/Chart', value: '6.2 min' },
          { label: 'AI Override Rate', value: '11%' }, { label: 'Auditor Returns', value: '2' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-[28px] font-bold text-content-primary">{s.value}</div>
            <div className="text-[12px] text-content-secondary mt-1">{s.label}</div>
          </div>
        ))}</div>
      </div>
    </div>
  )
}

const dashMap: Record<string, React.FC> = {
  admin: ExecutiveDashboard, director: ExecutiveDashboard,
  supervisor: SupervisorDashboard, manager: SupervisorDashboard,
  coder: CoderDashboard, biller: CoderDashboard,
  ar_team: CoderDashboard, posting_team: CoderDashboard,
  provider: ProviderDashboard, client: ClientDashboard,
}

export default function DashboardPage() {
  const { currentUser, selectedClient } = useApp()
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
