'use client'
import React from 'react'
import { useApp } from '@/lib/context'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { DollarSign, FileText, AlertTriangle, Clock, Users, Brain, Phone, Activity, Calendar, Mic, ClipboardList, TrendingUp } from 'lucide-react'

function ExecutiveDashboard() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Revenue (MTD)" value="$2.4M" sub="+8.2% vs last month" trend="up" icon={<DollarSign size={20}/>}/>
        <KPICard label="Claims Submitted" value="3,847" sub="+124 today" trend="up" icon={<FileText size={20}/>}/>
        <KPICard label="Denial Rate" value="4.2%" sub="-0.3% vs last month" trend="up" icon={<AlertTriangle size={20}/>}/>
        <KPICard label="Avg Days in A/R" value="28.5" sub="-2.1 days" trend="up" icon={<Clock size={20}/>}/>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Collection Rate" value="96.8%" sub="+0.4%" trend="up"/>
        <KPICard label="Active Patients" value="12,450" icon={<Users size={20}/>}/>
        <KPICard label="AI Calls Today" value="127" icon={<Phone size={20}/>}/>
        <KPICard label="AI Coding Accuracy" value="94.2%" icon={<Brain size={20}/>}/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Revenue Trend (6 Months)</h3>
          <div className="h-48 flex items-end gap-2 px-4">{[1.8,2.0,2.1,2.2,2.3,2.4].map((v,i)=>(
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-brand/20 rounded-t" style={{height:`${(v/2.5)*180}px`}}><div className="w-full bg-brand rounded-t h-2"/></div>
              <span className="text-[10px] text-muted">{['Oct','Nov','Dec','Jan','Feb','Mar'][i]}</span>
            </div>
          ))}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2 text-xs">{[
            {t:'Claim #CLM-4501 paid — $250', c:'text-emerald-400', ago:'2h'},
            {t:'ERA posted — 23 claims from UHC', c:'text-blue-400', ago:'3h'},
            {t:'Denial pattern alert: Aetna no-auth', c:'text-red-400', ago:'4h'},
            {t:'Voice AI completed 12 calls', c:'text-purple-400', ago:'5h'},
            {t:'New provider credentialing started', c:'text-amber-400', ago:'6h'},
          ].map((a,i)=>(
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
              <span className={a.c}>{a.t}</span><span className="text-muted">{a.ago} ago</span>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  )
}

function SupervisorDashboard() {
  const teams = [{name:'Coding',used:85,cap:100},{name:'Billing',used:72,cap:100},{name:'A/R',used:91,cap:100},{name:'Posting',used:65,cap:100}]
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Team Productivity" value="94%" sub="+2% today" trend="up"/>
        <KPICard label="Open Tasks" value="247" icon={<ClipboardList size={20}/>}/>
        <KPICard label="Claims in Queue" value="182"/>
        <KPICard label="Escalations" value="8" sub="3 urgent" trend="down"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Team Workload</h3>
          {teams.map(t=>(
            <div key={t.name} className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span>{t.name}</span><span className="text-muted">{t.used}%</span></div>
              <div className="h-2 bg-white/5 rounded-full"><div className={`h-full rounded-full ${t.used>90?'bg-red-500':t.used>75?'bg-amber-500':'bg-brand'}`} style={{width:`${t.used}%`}}/></div>
            </div>
          ))}
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Pending Escalations</h3>
          <div className="space-y-2 text-xs">{[
            {t:'High-dollar claim aging 95 days — P. Chen',p:'urgent'},{t:'Timely filing risk — K. Ibrahim',p:'high'},{t:'Repeated denials from Aetna',p:'high'},
          ].map((e,i)=>(
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
              <span>{e.t}</span><StatusBadge status={e.p} small/>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  )
}

function CoderDashboard() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="My Queue" value="23" icon={<ClipboardList size={20}/>}/>
        <KPICard label="Coded Today" value="47" sub="+12 vs yesterday" trend="up"/>
        <KPICard label="AI Suggestions Used" value="89%"/>
        <KPICard label="Accuracy Rate" value="97.1%"/>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">My Stats</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div><span className="text-muted block">Charts Coded (MTD)</span><span className="text-lg font-bold">234</span></div>
          <div><span className="text-muted block">Avg Time/Chart</span><span className="text-lg font-bold">6.2 min</span></div>
          <div><span className="text-muted block">AI Override Rate</span><span className="text-lg font-bold">11%</span></div>
          <div><span className="text-muted block">Auditor Returns</span><span className="text-lg font-bold">2</span></div>
        </div>
      </div>
    </div>
  )
}

function BillerDashboard() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Claims to Submit" value="34"/>
        <KPICard label="Submitted Today" value="62" trend="up" sub="+15 vs yesterday"/>
        <KPICard label="Rejections (24h)" value="3" trend="down"/>
        <KPICard label="First Pass Rate" value="93.1%"/>
      </div>
    </div>
  )
}

function ARDashboard() {
  const buckets = [{l:'0-30',v:45000,c:'bg-emerald-500'},{l:'31-60',v:32000,c:'bg-cyan-500'},{l:'61-90',v:18000,c:'bg-amber-500'},{l:'91-120',v:8500,c:'bg-orange-500'},{l:'120+',v:4200,c:'bg-red-500'}]
  const max = Math.max(...buckets.map(b=>b.v))
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="My A/R Accounts" value="156" icon={<TrendingUp size={20}/>}/>
        <KPICard label="Worked Today" value="28"/>
        <KPICard label="Follow-ups Due" value="42"/>
        <KPICard label="Avg Days Outstanding" value="34.2"/>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">My Aging Buckets</h3>
        <div className="flex items-end gap-4 h-32 px-4">{buckets.map(b=>(
          <div key={b.l} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted">${(b.v/1000).toFixed(0)}K</span>
            <div className={`w-full ${b.c} rounded-t`} style={{height:`${(b.v/max)*100}px`}}/>
            <span className="text-[10px] text-muted">{b.l}</span>
          </div>
        ))}</div>
      </div>
    </div>
  )
}

function PostingDashboard() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="ERAs to Process" value="12"/>
        <KPICard label="Posted Today" value="89" trend="up" sub="+23"/>
        <KPICard label="Unmatched Payments" value="4"/>
        <KPICard label="Auto-Posted (AI)" value="76%"/>
      </div>
    </div>
  )
}

function ProviderDashboard() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Today's Patients" value="14" icon={<Calendar size={20}/>}/>
        <KPICard label="Pending Sign-offs" value="3" icon={<Mic size={20}/>}/>
        <KPICard label="Seen Today" value="5"/>
        <KPICard label="Clinical Alerts" value="1" sub="Drug interaction" trend="down"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Today&apos;s Schedule</h3>
          <div className="space-y-2 text-xs">{[
            {t:'9:00',p:'John Smith',type:'Follow-up',s:'completed'},{t:'9:30',p:'Sarah Johnson',type:'Consultation',s:'checked_in'},
            {t:'10:00',p:'Walk-in TBD',type:'Walk-in',s:'walk_in'},{t:'10:30',p:'Maria Garcia',type:'New Patient',s:'booked'},
          ].map((a,i)=>(
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
              <span className="text-muted w-12">{a.t}</span><span className="flex-1">{a.p}</span><span className="text-muted">{a.type}</span><StatusBadge status={a.s} small/>
            </div>
          ))}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Pending Sign-offs</h3>
          <div className="space-y-2 text-xs">{[
            {p:'Robert Chen',d:'Mar 1',type:'Cardiology Consult'},{p:'Ahmed Al Mansouri',d:'Mar 1',type:'Follow-up'},{p:'Khalid Ibrahim',d:'Feb 28',type:'Check-up'},
          ].map((n,i)=>(
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div><span className="font-medium">{n.p}</span><span className="text-muted ml-2">{n.type}</span></div>
              <span className="text-muted">{n.d}</span>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  )
}

function ClientDashboard() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Claims This Month" value="342" icon={<FileText size={20}/>}/>
        <KPICard label="Pending Claims" value="28"/>
        <KPICard label="Denial Rate" value="3.8%" trend="up" sub="-0.5%"/>
        <KPICard label="Avg Days to Payment" value="22" trend="up" sub="-3 days"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Today&apos;s Appointments</h3>
          <div className="space-y-2 text-xs">{[
            {t:'9:00',p:'John Smith',s:'completed'},{t:'9:30',p:'Sarah Johnson',s:'checked_in'},{t:'10:30',p:'Maria Garcia',s:'booked'},
          ].map((a,i)=>(
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
              <span className="text-muted w-12">{a.t}</span><span className="flex-1">{a.p}</span><StatusBadge status={a.s} small/>
            </div>
          ))}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">{[
            {l:'Upload Documents',h:'/portal/scan-submit'},{l:'Track Claims',h:'/portal/watch-track'},{l:'View Schedule',h:'/portal/appointments'},{l:'Messages',h:'/portal/messages'},
          ].map(a=>(
            <a key={a.l} href={a.h} className="bg-white/5 border border-border rounded-lg px-3 py-2 text-xs text-center hover:border-brand/30 hover:text-brand transition-all">{a.l}</a>
          ))}</div>
        </div>
      </div>
    </div>
  )
}

const dashboardMap: Record<string, React.FC> = {
  admin: ExecutiveDashboard, director: ExecutiveDashboard,
  supervisor: SupervisorDashboard, manager: SupervisorDashboard,
  coder: CoderDashboard, biller: BillerDashboard,
  ar_team: ARDashboard, posting_team: PostingDashboard,
  provider: ProviderDashboard, client: ClientDashboard,
}

export default function DashboardPage() {
  const { currentUser, selectedClient } = useApp()
  const DashComp = dashboardMap[currentUser.role] || ExecutiveDashboard
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted">{selectedClient ? selectedClient.name : 'All Clients'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
      <DashComp />
    </div>
  )
}
