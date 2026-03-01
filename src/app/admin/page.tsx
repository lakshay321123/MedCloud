'use client'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Settings, Users, Building2, Activity } from 'lucide-react'

const users = [
  { name: 'Admin User', email: 'admin@cosentus.ai', role: 'admin', clients: 'All', lastLogin: '2026-03-02', active: true },
  { name: 'Sarah Kim', email: 'sarah@cosentus.ai', role: 'coder', clients: 'IFP, GMC', lastLogin: '2026-03-02', active: true },
  { name: 'Mike Rodriguez', email: 'mike@cosentus.ai', role: 'ar_team', clients: 'All', lastLogin: '2026-03-01', active: true },
  { name: 'Lisa Tran', email: 'lisa@cosentus.ai', role: 'posting_team', clients: 'IFP, PC', lastLogin: '2026-03-02', active: true },
  { name: 'Tom Baker', email: 'tom@cosentus.ai', role: 'supervisor', clients: 'All', lastLogin: '2026-02-28', active: true },
  { name: 'Amy Chen', email: 'amy@cosentus.ai', role: 'coder', clients: 'PC, DWC', lastLogin: '2026-03-02', active: true },
  { name: 'Dr. Martinez', email: 'dr.m@irvinefp.com', role: 'provider', clients: 'IFP', lastLogin: '2026-03-02', active: true },
  { name: 'Front Desk IFP', email: 'fd@irvinefp.com', role: 'client', clients: 'IFP', lastLogin: '2026-03-01', active: true },
]

export default function AdminPage() {
  const [tab, setTab] = useState<'users'|'orgs'|'health'>('users')
  return (
    <ModuleShell title="Admin & Settings" subtitle="System administration" sprint={5}>
      <div className="flex gap-2 mb-4">
        {(['users','orgs','health'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-medium ${tab===t?'bg-brand/10 text-brand border border-brand/20':'bg-foreground/5 text-muted border border-border'}`}>
            {t==='users'?'Users':t==='orgs'?'Organizations':'System Health'}
          </button>
        ))}
      </div>
      {tab === 'users' && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted">
              <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Clients</th>
              <th className="text-left px-4 py-3">Last Login</th><th className="text-left px-4 py-3">Status</th>
            </tr></thead>
            <tbody>{users.map(u=>(
              <tr key={u.email} className="border-b border-border last:border-0 hover:bg-foreground/5 cursor-pointer">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-xs text-muted">{u.email}</td>
                <td className="px-4 py-3"><StatusBadge status={u.role === 'admin' ? 'urgent' : u.role === 'provider' ? 'in_progress' : 'active'} small/></td>
                <td className="px-4 py-3 text-xs text-muted">{u.clients}</td>
                <td className="px-4 py-3 text-xs text-muted">{u.lastLogin}</td>
                <td className="px-4 py-3"><StatusBadge status={u.active ? 'active' : 'inactive'} small/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {tab === 'orgs' && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted">
              <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Region</th>
              <th className="text-left px-4 py-3">EHR Mode</th><th className="text-left px-4 py-3">Status</th>
            </tr></thead>
            <tbody>{[
              {n:'Gulf Medical Center',r:'🇦🇪 UAE',e:'MedCloud EHR'},{n:'Irvine Family Practice',r:'🇺🇸 US',e:'External EHR'},
              {n:'Patel Cardiology',r:'🇺🇸 US',e:'MedCloud EHR'},{n:'Dubai Wellness Clinic',r:'🇦🇪 UAE',e:'External EHR'},
            ].map(o=>(
              <tr key={o.n} className="border-b border-border last:border-0 hover:bg-foreground/5 cursor-pointer">
                <td className="px-4 py-3 font-medium">{o.n}</td><td className="px-4 py-3 text-xs">{o.r}</td>
                <td className="px-4 py-3 text-xs text-muted">{o.e}</td><td className="px-4 py-3"><StatusBadge status="active" small/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {tab === 'health' && (
        <div className="grid grid-cols-2 gap-4">{[
          {s:'API Gateway',st:'healthy'},{s:'Database (Aurora)',st:'healthy'},{s:'AI Services (Bedrock)',st:'healthy'},
          {s:'Voice AI (Twilio)',st:'healthy'},{s:'Textract OCR',st:'healthy'},{s:'Email Ingest',st:'warning'},
        ].map(sv=>(
          <div key={sv.s} className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Activity size={16} className="text-muted"/><span className="text-sm">{sv.s}</span></div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${sv.st==='healthy'?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{sv.st}</span>
          </div>
        ))}</div>
      )}
    </ModuleShell>
  )
}
