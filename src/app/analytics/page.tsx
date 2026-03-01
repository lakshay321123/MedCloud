'use client'
import React from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { BarChart3, DollarSign, TrendingUp, Brain } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <ModuleShell title="Analytics" subtitle="Financial and operational reporting">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Revenue (MTD)" value="$2.4M" sub="+8.2%" trend="up" icon={<DollarSign size={20}/>}/>
        <KPICard label="Collection Rate" value="96.8%" sub="+0.4%" trend="up" icon={<TrendingUp size={20}/>}/>
        <KPICard label="Clean Claim Rate" value="91.3%" icon={<BarChart3 size={20}/>}/>
        <KPICard label="AI Accuracy" value="94.2%" icon={<Brain size={20}/>}/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Revenue Trend</h3>
          <div className="h-48 flex items-end gap-2 px-4">{[1.8,2.0,2.1,2.2,2.3,2.4].map((v,i)=>(
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-content-secondary">${v}M</span>
              <div className="w-full bg-brand/20 rounded-t" style={{height:`${(v/2.5)*160}px`}}><div className="w-full bg-brand rounded-t h-1.5"/></div>
              <span className="text-[10px] text-content-secondary">{['Oct','Nov','Dec','Jan','Feb','Mar'][i]}</span>
            </div>
          ))}</div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Claims by Status</h3>
          <div className="space-y-2">{[
            {s:'Paid',v:68,c:'bg-emerald-500'},{s:'In Process',v:15,c:'bg-amber-500'},{s:'Denied',v:8,c:'bg-red-500'},{s:'Submitted',v:6,c:'bg-blue-500'},{s:'Other',v:3,c:'bg-gray-500'},
          ].map(r=>(
            <div key={r.s}>
              <div className="flex justify-between text-xs mb-0.5"><span>{r.s}</span><span className="text-content-secondary">{r.v}%</span></div>
              <div className="h-2 bg-surface-elevated rounded-full"><div className={`h-full rounded-full ${r.c}`} style={{width:`${r.v}%`}}/></div>
            </div>
          ))}</div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Top Denial Reasons</h3>
          <div className="space-y-2 text-xs">{[
            {r:'Prior auth required',c:12},{r:'Not medically necessary',c:8},{r:'Timely filing',c:5},{r:'Duplicate claim',c:3},{r:'Patient not eligible',c:2},
          ].map(d=>(
            <div key={d.r} className="flex justify-between py-1 border-b border-separator last:border-0"><span>{d.r}</span><span className="text-red-600 text-red-600 dark:text-red-400">{d.c}</span></div>
          ))}</div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Client Performance</h3>
          <div className="space-y-2 text-xs">{[
            {n:'Irvine Family Practice',rev:'$820K',rate:'97.1%'},{n:'Patel Cardiology',rev:'$680K',rate:'95.8%'},{n:'Gulf Medical Center',rev:'$540K',rate:'96.2%'},{n:'Dubai Wellness Clinic',rev:'$360K',rate:'94.5%'},
          ].map(c=>(
            <div key={c.n} className="flex justify-between py-1.5 border-b border-separator last:border-0"><span>{c.n}</span><span className="text-content-secondary">{c.rev}</span><span className="text-emerald-600 text-emerald-600 dark:text-emerald-400">{c.rate}</span></div>
          ))}</div>
        </div>
      </div>
    </ModuleShell>
  )
}
