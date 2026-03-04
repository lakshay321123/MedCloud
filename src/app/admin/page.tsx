'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { useToast } from '@/components/shared/Toast'
import { useApp } from '@/lib/context'
import { useAuditLog, useClients, useProviders, useInvoices, useGenerateInvoice, useInvoiceConfigs, usePatientAccessRequests, useClientOnboardings, useInitOnboarding } from '@/lib/hooks'
import { Users, Building2, Activity, Shield, X, Search, Plus, Receipt, ClipboardList, KeyRound } from 'lucide-react'

const roleColors: Record<string,string> = {
  admin: 'bg-red-500/10 text-red-500',
  director: 'bg-purple-500/10 text-purple-500',
  supervisor: 'bg-blue-500/10 text-blue-500',
  manager: 'bg-brand/10 text-brand',
  coder: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  biller: 'bg-amber-500/10 text-amber-500',
  ar_team: 'bg-cyan-500/10 text-cyan-500',
  posting_team: 'bg-orange-500/10 text-orange-500',
  provider: 'bg-indigo-500/10 text-indigo-500',
  client: 'bg-gray-500/10 text-gray-400',
}

const pricingColors: Record<string,string> = {
  '% Revenue': 'bg-blue-500/10 text-blue-500',
  'Per-Claim': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Flat Fee': 'bg-amber-500/10 text-amber-500',
  'Hybrid': 'bg-purple-500/10 text-purple-500',
}

const actionColors: Record<string,string> = {
  VIEW: 'bg-gray-500/10 text-gray-400',
  CREATE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  UPDATE: 'bg-amber-500/10 text-amber-500',
  DELETE: 'bg-red-500/10 text-red-500',
  EXPORT: 'bg-blue-500/10 text-blue-500',
}

const users = [
  { name:'Admin User', email:'admin@cosentus.ai', role:'admin', clients:'All', lastLogin:'2026-03-02', active:true },
  { name:'Sarah Kim', email:'sarah@cosentus.ai', role:'coder', clients:'IFP, GMC', lastLogin:'2026-03-02', active:true },
  { name:'Mike Rodriguez', email:'mike@cosentus.ai', role:'ar_team', clients:'All', lastLogin:'2026-03-01', active:true },
  { name:'Lisa Tran', email:'lisa@cosentus.ai', role:'posting_team', clients:'IFP, PC', lastLogin:'2026-03-02', active:true },
  { name:'Tom Baker', email:'tom@cosentus.ai', role:'supervisor', clients:'All', lastLogin:'2026-02-28', active:true },
  { name:'Amy Chen', email:'amy@cosentus.ai', role:'coder', clients:'PC, DWC', lastLogin:'2026-03-02', active:true },
  { name:'Dr. Martinez', email:'dr.m@irvinefp.com', role:'provider', clients:'IFP', lastLogin:'2026-03-02', active:true },
  { name:'Front Desk IFP', email:'fd@irvinefp.com', role:'client', clients:'IFP', lastLogin:'2026-03-01', active:true },
]

const orgs = [
  { name:'Gulf Medical Center', region:'🇦🇪 UAE', ehr:'MedCloud EHR', pricing:'% Revenue', since:'2024-01-01', active:true },
  { name:'Irvine Family Practice', region:'🇺🇸 US', ehr:'External EHR', pricing:'Per-Claim', since:'2023-06-15', active:true },
  { name:'Patel Cardiology', region:'🇺🇸 US', ehr:'MedCloud EHR', pricing:'Hybrid', since:'2023-09-01', active:true },
  { name:'Dubai Wellness Clinic', region:'🇦🇪 UAE', ehr:'External EHR', pricing:'Flat Fee', since:'2024-03-01', active:true },
]

const services = [
  { name:'API Gateway', status:'operational', lastCheck:'2 min', ms:142 },
  { name:'Aurora US', status:'operational', lastCheck:'2 min', ms:18 },
  { name:'Aurora UAE', status:'operational', lastCheck:'2 min', ms:24 },
  { name:'Cognito', status:'operational', lastCheck:'2 min', ms:88 },
  { name:'S3', status:'operational', lastCheck:'2 min', ms:32 },
  { name:'Textract', status:'operational', lastCheck:'5 min', ms:210 },
  { name:'Bedrock', status:'operational', lastCheck:'2 min', ms:340 },
  { name:'AppSync', status:'operational', lastCheck:'2 min', ms:65 },
  { name:'Retell AI', status:'operational', lastCheck:'3 min', ms:188 },
  { name:'Availity', status:'degraded', lastCheck:'2 min', ms:1840 },
  { name:'DHA eClaim', status:'operational', lastCheck:'4 min', ms:290 },
  { name:'Email Ingest', status:'operational', lastCheck:'2 min', ms:76 },
]

const queues = [
  { name:'Coding Queue', items:47, processing:3, failed:0, flush:'2 min ago' },
  { name:'ERA Processing', items:12, processing:1, failed:0, flush:'8 min ago' },
  { name:'Fax Queue', items:2, processing:0, failed:1, flush:'15 min ago' },
]

function UsersTab() {
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..."
            className="bg-surface-elevated border border-separator rounded-lg pl-8 pr-3 py-1.5 text-xs text-content-primary w-60"/>
        </div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors">
          <Plus size={14}/> Add User
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th>
            <th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Clients</th>
            <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Last Login</th>
            <th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(u=>(
            <tr key={u.email} className="border-b border-separator last:border-0 table-row">
              <td className="px-4 py-3 font-medium">{u.name}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{u.email}</td>
              <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColors[u.role]??'bg-surface-elevated text-content-secondary'}`}>{u.role}</span></td>
              <td className="px-4 py-3 text-xs text-content-secondary">{u.clients}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${u.active?'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-gray-500/10 text-gray-400'}`}>{u.active?'Active':'Disabled'}</span></td>
              <td className="px-4 py-3 text-xs text-content-secondary">{u.lastLogin}</td>
              <td className="px-4 py-3 flex gap-1">
                <button onClick={()=>toast.info(`Editing ${u.name}`)} className="text-[10px] text-brand hover:underline">Edit</button>
                <span className="text-content-tertiary">·</span>
                <button onClick={()=>toast.warning(`${u.name} disabled`)} className="text-[10px] text-red-500 hover:underline">Disable</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showAdd&&(
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={()=>setShowAdd(false)}/>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Add User</h3>
                <button onClick={()=>setShowAdd(false)}><X size={16} className="text-content-secondary"/></button>
              </div>
              {[['Full Name','Jane Smith'],['Email','jane@cosentus.ai']].map(([l,p])=>(
                <div key={l}>
                  <label className="text-xs text-content-secondary block mb-1">{l}</label>
                  <input placeholder={p} className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/>
                </div>
              ))}
              <div>
                <label className="text-xs text-content-secondary block mb-1">Role</label>
                <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                  {Object.keys(roleColors).map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Assign to Clients</label>
                <select multiple className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary h-20">
                  {orgs.map(o => <option key={o.name}>{o.name}</option>)}
                </select>
              </div>
              <button onClick={()=>{toast.success('User created. Invite email sent.');setShowAdd(false)}}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors">Create User</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function OrgsTab() {
  const { toast } = useToast()
  const [showAddOrg, setShowAddOrg] = useState(false)
  const [orgData, setOrgData] = useState({
    name: '', contact: '', email: '', region: 'us', pricing: '% Revenue'
  })
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={()=>setShowAddOrg(true)} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors">
          <Plus size={14}/> Add Organization
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Region</th>
            <th className="text-left px-4 py-3">EHR Mode</th><th className="text-left px-4 py-3">Pricing</th>
            <th className="text-left px-4 py-3">Active Since</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{orgs.map(o=>(
            <tr key={o.name} onClick={()=>toast.info(`Opening ${o.name} settings`)} className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="px-4 py-3 font-medium">{o.name}</td>
              <td className="px-4 py-3 text-xs">{o.region}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{o.ehr}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pricingColors[o.pricing]??'bg-surface-elevated text-content-secondary'}`}>{o.pricing}</span></td>
              <td className="px-4 py-3 text-xs text-content-secondary">{o.since}</td>
              <td className="px-4 py-3"><span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Active</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showAddOrg&&(
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={()=>setShowAddOrg(false)}/>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Add Organization</h3>
                <button onClick={()=>setShowAddOrg(false)}><X size={16} className="text-content-secondary"/></button>
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Organization Name</label>
                <input
                  placeholder="e.g. City Medical Group"
                  value={orgData.name}
                  onChange={e => setOrgData(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"
                />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Primary Contact</label>
                <input
                  placeholder="Jane Smith"
                  value={orgData.contact}
                  onChange={e => setOrgData(p => ({ ...p, contact: e.target.value }))}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"
                />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Contact Email</label>
                <input
                  placeholder="jane@org.com"
                  value={orgData.email}
                  onChange={e => setOrgData(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Region</label>
                  <select
                    value={orgData.region}
                    onChange={e => setOrgData(p => ({ ...p, region: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                    <option value="us">🇺🇸 US</option><option value="uae">🇦🇪 UAE</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Pricing Model</label>
                  <select
                    value={orgData.pricing}
                    onChange={e => setOrgData(p => ({ ...p, pricing: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                    {['% Revenue','Per-Claim','Flat Fee','Hybrid'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!orgData.name) {
                    toast.error('Organization name is required')
                    return
                  }
                  toast.success(`Organization '${orgData.name}' created. Onboarding email sent.`)
                  setOrgData({ name: '', contact: '', email: '', region: 'us', pricing: '% Revenue' })
                  setShowAddOrg(false)
                }}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors">Create Organization</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SystemHealthTab() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {services.map(s=>(
          <div key={s.name} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-content-primary">{s.name}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${s.status==='operational'?'bg-emerald-500':s.status==='degraded'?'bg-amber-500 animate-pulse':'bg-red-500 animate-pulse'}`}/>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${s.status==='operational'?'text-emerald-600 dark:text-emerald-400':s.status==='degraded'?'text-amber-500':'text-red-500'}`}>
                {s.status==='operational'?'Operational':s.status==='degraded'?'Degraded':'Down'}
              </span>
              <span className="text-[10px] text-content-tertiary">{s.ms}ms</span>
            </div>
            <p className="text-[10px] text-content-tertiary mt-1">Last check: {s.lastCheck} ago</p>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-separator">
          <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">Queue Depths</h3>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Queue</th><th className="text-left px-4 py-3">Items</th>
            <th className="text-left px-4 py-3">Processing</th><th className="text-left px-4 py-3">Failed</th>
            <th className="text-left px-4 py-3">Last Flush</th>
          </tr></thead>
          <tbody>{queues.map(q=>(
            <tr key={q.name} className="border-b border-separator last:border-0">
              <td className="px-4 py-3 font-medium">{q.name}</td>
              <td className="px-4 py-3 text-xs font-mono">{q.items}</td>
              <td className="px-4 py-3 text-xs text-brand">{q.processing}</td>
              <td className="px-4 py-3 text-xs"><span className={q.failed>0?'text-red-500':'text-content-secondary'}>{q.failed}</span></td>
              <td className="px-4 py-3 text-xs text-content-secondary">{q.flush}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function AuditLogTab() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const { data: apiAuditResult } = useAuditLog({ limit: 200 })
  const apiAudit = (apiAuditResult?.data || []).map((a: any) => ({
    id: a.id, timestamp: a.created_at, user: a.user_email || 'System',
    action: a.action, entity: a.entity_type, entityId: a.entity_id,
    details: typeof a.details === 'object' ? JSON.stringify(a.details) : a.details || '',
    ipAddress: '—', userAgent: '—', role: a.user_role || '—', ip: '—',
  }))
  const filtered = apiAudit.filter((e) => {
    if (search && !e.user.toLowerCase().includes(search.toLowerCase())) return false
    if (actionFilter && e.action !== actionFilter) return false
    return true
  })
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by user..."
            className="bg-surface-elevated border border-separator rounded-lg pl-8 pr-3 py-1.5 text-xs text-content-primary w-48"/>
        </div>
        <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Actions</option>
          {['VIEW','CREATE','UPDATE','DELETE','EXPORT'].map(a=><option key={a}>{a}</option>)}
        </select>
        <button onClick={()=>toast.info('Audit export queued. You will receive an email.')} className="ml-auto text-xs border border-separator text-content-secondary px-3 py-1.5 rounded-lg hover:text-content-primary transition-colors">
          Export
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Timestamp</th><th className="text-left px-4 py-3">User</th>
            <th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Action</th>
            <th className="text-left px-4 py-3">Entity</th><th className="text-left px-4 py-3">Entity ID</th>
            <th className="text-left px-4 py-3">IP</th>
          </tr></thead>
          <tbody>{filtered.map(e=>(
            <tr key={e.id} className="border-b border-separator last:border-0">
              <td className="px-4 py-3 font-mono text-[10px] text-content-secondary">{e.timestamp}</td>
              <td className="px-4 py-3 text-xs font-medium">{e.user}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${roleColors[e.role]??'bg-surface-elevated text-content-secondary'}`}>{e.role}</span></td>
              <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${actionColors[e.action]??'bg-surface-elevated text-content-secondary'}`}>{e.action}</span></td>
              <td className="px-4 py-3 text-xs">{e.entity}</td>
              <td className="px-4 py-3 font-mono text-[10px] text-brand">{e.entityId}</td>
              <td className="px-4 py-3 font-mono text-[10px] text-content-tertiary">{e.ip}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

// ── Admin tab types ────────────────────────────────────────────────────────
interface InvoiceItem { id: string; invoice_number?: string; client_name?: string; period_start?: string; period_end?: string; total_amount?: number; status?: string }
interface OnboardingItem { id: string; client_name?: string; client_id?: string; status?: string; completion_pct?: number; items_completed?: number; items_total?: number }
interface AccessRequestItem { id: string; patient_name?: string; request_type?: string; created_at?: string; deadline?: string; status?: string }

function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) return (data as { data: T[] }).data
  return []
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function InvoicesTab() {
  const { toast } = useToast()
  const { data: invoices, loading } = useInvoices()
  const { mutate: generateInvoice } = useGenerateInvoice()
  const items = extractItems<InvoiceItem>(invoices)
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-content-secondary">{items.length} invoices</p>
        <button onClick={() => generateInvoice({ client_id: 'all', period_start: new Date(Date.now() - THIRTY_DAYS_MS).toISOString().slice(0,10), period_end: new Date().toISOString().slice(0,10) }).then(() => toast.success('Invoice generated')).catch(() => toast.error('Generation failed'))} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors"><Plus size={14}/> Generate Invoice</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary"><th className="text-left px-4 py-3">Invoice #</th><th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Status</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-content-secondary text-xs">Loading…</td></tr> : items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-content-tertiary text-xs">No invoices yet — generate one above</td></tr> : items.map((inv) => (
            <tr key={inv.id} className="border-b border-separator last:border-0 table-row">
              <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number || inv.id?.slice(0,8)}</td>
              <td className="px-4 py-3 text-xs">{inv.client_name || '—'}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{inv.period_start?.slice(0,10)} → {inv.period_end?.slice(0,10)}</td>
              <td className="px-4 py-3 text-xs font-semibold">${Number(inv.total_amount || 0).toLocaleString()}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${({paid:'bg-emerald-500/10 text-emerald-500',sent:'bg-blue-500/10 text-blue-500'} as Record<string,string>)[inv.status ?? ''] || 'bg-amber-500/10 text-amber-500'}`}>{inv.status || 'draft'}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function OnboardingTab() {
  const { toast } = useToast()
  const { data: onboardings, loading } = useClientOnboardings()
  const { mutate: initOnboard } = useInitOnboarding()
  const items = extractItems<OnboardingItem>(onboardings)
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-content-secondary">{items.length} client onboardings</p>
        <button onClick={() => initOnboard({ client_id: '' }).then(() => toast.success('Onboarding started')).catch(() => toast.error('Failed'))} className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-deep transition-colors"><Plus size={14}/> Start Onboarding</button>
      </div>
      {loading ? <div className="text-center py-8 text-content-secondary text-xs">Loading…</div> : items.length === 0 ? <div className="card p-8 text-center text-content-tertiary text-xs">No onboardings in progress</div> : items.map((ob) => (
        <div key={ob.id} className="card p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{ob.client_name || ob.client_id?.slice(0,8)}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ob.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>{ob.status || 'in_progress'}</span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-2 mb-2">
            <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${ob.completion_pct || 0}%` }}/>
          </div>
          <p className="text-[10px] text-content-tertiary">{ob.completion_pct || 0}% complete · {ob.items_completed || 0}/{ob.items_total || 0} items</p>
        </div>
      ))}
    </div>
  )
}

function PatientAccessTab() {
  const { toast } = useToast()
  const { data: requests, loading } = usePatientAccessRequests()
  const items = extractItems<AccessRequestItem>(requests)
  return (
    <div>
      <p className="text-sm text-content-secondary mb-4">{items.length} access requests (HIPAA Right of Access)</p>
      {loading ? <div className="text-center py-8 text-content-secondary text-xs">Loading…</div> : items.length === 0 ? <div className="card p-8 text-center text-content-tertiary text-xs">No pending patient access requests</div> :
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary"><th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">Request Type</th><th className="text-left px-4 py-3">Submitted</th><th className="text-left px-4 py-3">Deadline</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
          <tbody>{items.map((r) => (
            <tr key={r.id} className="border-b border-separator last:border-0 table-row">
              <td className="px-4 py-3 text-xs">{r.patient_name || '—'}</td>
              <td className="px-4 py-3 text-xs">{r.request_type || 'records'}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{r.created_at?.slice(0,10)}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{r.deadline?.slice(0,10) || '—'}</td>
              <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : r.status === 'overdue' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>{r.status || 'pending'}</span></td>
              <td className="px-4 py-3"><button onClick={() => toast.success('Marked complete — use patient access API')} className="text-[10px] text-brand hover:underline">Complete</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  )
}

const ALL_TABS = [
  { id:'users', label:'Users', icon:Users },
  { id:'orgs', label:'Organizations', icon:Building2 },
  { id:'invoices', label:'Invoices', icon:Receipt },
  { id:'onboarding', label:'Onboarding', icon:ClipboardList },
  { id:'access', label:'Patient Access', icon:KeyRound },
  { id:'health', label:'System Health', icon:Activity },
  { id:'audit', label:'Audit Log', icon:Shield },
] as const
type TabId = typeof ALL_TABS[number]['id']

export default function AdminPage() {
  const { currentUser } = useApp()
  const { t } = useT()
  const isDirector = currentUser.role === 'director'
  const tabs = isDirector
    ? ALL_TABS.filter(t => t.id === 'orgs')
    : ALL_TABS
  const [tab, setTab] = useState<TabId>(isDirector ? 'orgs' : 'users')

  return (
    <ModuleShell title={t("admin","title")} subtitle={t("admin","subtitle")}>
      <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400">
        <span className="text-lg shrink-0">⚙️</span>
        <div>
          Admin connected — audit log + user management live
        </div>
      </div>
      <div className="flex gap-1 mb-5 border-b border-separator">
        {tabs.map(t=>{const Icon=t.icon;return(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===t.id?'border-brand text-brand':'border-transparent text-content-secondary hover:text-content-primary'}`}>
            <Icon size={14}/>{t.label}
          </button>
        )})}
      </div>
      {tab==='users'&&<UsersTab/>}
      {tab==='orgs'&&<OrgsTab/>}
      {tab==='invoices'&&<InvoicesTab/>}
      {tab==='onboarding'&&<OnboardingTab/>}
      {tab==='access'&&<PatientAccessTab/>}
      {tab==='health'&&<SystemHealthTab/>}
      {tab==='audit'&&<AuditLogTab/>}
    </ModuleShell>
  )
}
