'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoPatients, DemoPatient } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Plus, Search, X, Upload, User } from 'lucide-react'

const completenessColor = (p: number) => p >= 100 ? 'bg-emerald-500' : p >= 75 ? 'bg-cyan-500' : p >= 50 ? 'bg-amber-500' : 'bg-red-500'

function AddPatientModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border border-border rounded-xl w-[480px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Add Patient</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted bg-brand/5 border border-brand/20 rounded-lg p-2">Only name and phone are required to start. Fill in the rest when available.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted block mb-1">First Name *</label><input className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="First name"/></div>
            <div><label className="text-xs text-muted block mb-1">Last Name *</label><input className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="Last name"/></div>
          </div>
          <div><label className="text-xs text-muted block mb-1">Phone *</label><input className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="Phone number"/></div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted mb-2">Optional — add when available</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted block mb-1">Date of Birth</label><input type="date" className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground"/></div>
              <div><label className="text-xs text-muted block mb-1">Gender</label>
                <select className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
              </div>
            </div>
            <div className="mt-3"><label className="text-xs text-muted block mb-1">Email</label><input className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="Email"/></div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={14} className="text-brand"/>
              <span className="text-xs text-brand">Scan ID to auto-fill demographics</span>
            </div>
            <button className="w-full bg-foreground/5 border border-dashed border-border rounded-lg py-3 text-xs text-muted hover:border-brand/30 hover:text-brand transition-all">
              Click to scan Driver&apos;s License / Emirates ID
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-foreground/5 border border-border rounded-lg py-2 text-sm text-muted hover:text-foreground">Cancel</button>
            <button onClick={onClose} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-dark">Save Patient</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PatientDetail({ patient, onClose }: { patient: DemoPatient; onClose: () => void }) {
  const [tab, setTab] = useState<'demographics'|'insurance'|'documents'|'visits'|'messages'>('demographics')
  const region = patient.emiratesId ? 'uae' : 'us'
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border border-border rounded-xl w-[640px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-sm">{patient.firstName[0]}{patient.lastName[0]}</div>
            <div>
              <h2 className="font-semibold">{patient.firstName} {patient.lastName}</h2>
              <span className="text-xs text-muted">{patient.id} • {region === 'uae' ? '🇦🇪 UAE' : '🇺🇸 US'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-16 h-1.5 rounded-full bg-foreground/10`}><div className={`h-full rounded-full ${completenessColor(patient.profileComplete)}`} style={{width:`${patient.profileComplete}%`}}/></div>
              <span className="text-[10px] text-muted">{patient.profileComplete}%</span>
            </div>
            <button onClick={onClose} className="text-muted hover:text-foreground"><X size={18}/></button>
          </div>
        </div>
        <div className="flex border-b border-border">{(['demographics','insurance','documents','visits','messages'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${tab===t?'border-brand text-brand':'border-transparent text-muted hover:text-foreground'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}</div>
        <div className="p-4 text-sm">
          {tab === 'demographics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted block">Name</span><span>{patient.firstName} {patient.lastName}</span></div>
                <div><span className="text-xs text-muted block">DOB</span><span>{patient.dob || '—'}</span></div>
                <div><span className="text-xs text-muted block">Gender</span><span>{patient.gender || '—'}</span></div>
                <div><span className="text-xs text-muted block">Phone</span><span>{patient.phone}</span></div>
                <div><span className="text-xs text-muted block">Email</span><span>{patient.email || '—'}</span></div>
                {region === 'uae' && <div><span className="text-xs text-muted block">Emirates ID</span><span>{patient.emiratesId || '—'}</span></div>}
                {region === 'us' && <div><span className="text-xs text-muted block">SSN</span><span>{patient.ssn || '—'}</span></div>}
              </div>
              {patient.noShowCount && patient.noShowCount >= 3 && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-400">⚠ {patient.noShowCount} no-shows on record</div>}
            </div>
          )}
          {tab === 'insurance' && (
            <div className="space-y-3">
              {patient.insurance ? (
                <div className="bg-foreground/5 border border-border rounded-lg p-3">
                  <div className="text-xs text-muted mb-2">Primary Insurance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">Payer:</span> {patient.insurance.payer}</div>
                    <div><span className="text-muted">Policy:</span> {patient.insurance.policyNo}</div>
                    <div><span className="text-muted">Group:</span> {patient.insurance.groupNo || '—'}</div>
                    <div><span className="text-muted">Member ID:</span> {patient.insurance.memberId}</div>
                  </div>
                </div>
              ) : <div className="text-center py-8 text-muted text-xs">No insurance on file. <button className="text-brand underline">Upload insurance card</button></div>}
              {patient.secondaryInsurance && (
                <div className="bg-foreground/5 border border-border rounded-lg p-3">
                  <div className="text-xs text-muted mb-2">Secondary Insurance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">Payer:</span> {patient.secondaryInsurance.payer}</div>
                    <div><span className="text-muted">Policy:</span> {patient.secondaryInsurance.policyNo}</div>
                    <div><span className="text-muted">Member ID:</span> {patient.secondaryInsurance.memberId}</div>
                  </div>
                </div>
              )}
              <button className="w-full bg-foreground/5 border border-dashed border-border rounded-lg py-3 text-xs text-muted hover:border-brand/30">
                <Upload size={14} className="inline mr-1"/> Scan insurance card to auto-fill
              </button>
            </div>
          )}
          {tab === 'documents' && <div className="text-center py-8 text-xs text-muted">No documents linked yet.</div>}
          {tab === 'visits' && <div className="text-center py-8 text-xs text-muted">No visit history yet.</div>}
          {tab === 'messages' && <div className="text-center py-8 text-xs text-muted">No messages for this patient.</div>}
        </div>
      </div>
    </div>
  )
}

export default function PatientsPage() {
  const { currentUser, selectedClient } = useApp()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<DemoPatient | null>(null)

  const clientFilter = currentUser.role === 'client' || currentUser.role === 'provider' ? 'org-102' : selectedClient?.id
  const patients = demoPatients.filter(p => {
    if (clientFilter && p.clientId !== clientFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) || p.phone.includes(s) || p.id.toLowerCase().includes(s)
    }
    return true
  })

  return (
    <ModuleShell title="Patients" subtitle="Manage patient records" sprint={2}
      actions={<button onClick={()=>setShowAdd(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-dark"><Plus size={16}/>Add Patient</button>}>
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, ID..."
          className="w-full bg-foreground/5 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted"/>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted">
            <th className="text-left px-4 py-3">Patient</th><th className="text-left px-4 py-3">DOB</th><th className="text-left px-4 py-3">Phone</th>
            <th className="text-left px-4 py-3">Insurance</th><th className="text-left px-4 py-3">Profile</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{patients.map(p=>(
            <tr key={p.id} onClick={()=>setSelected(p)} className="border-b border-border last:border-0 hover:bg-foreground/5 cursor-pointer transition-all">
              <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold">{p.firstName[0]}{p.lastName[0]}</div><div><div className="font-medium">{p.firstName} {p.lastName}</div><div className="text-[10px] text-muted">{p.id}</div></div></div></td>
              <td className="px-4 py-3 text-muted">{p.dob || '—'}</td>
              <td className="px-4 py-3 text-muted">{p.phone}</td>
              <td className="px-4 py-3 text-muted text-xs">{p.insurance?.payer || <span className="text-amber-400">Not on file</span>}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><div className="w-12 h-1.5 rounded-full bg-foreground/10"><div className={`h-full rounded-full ${completenessColor(p.profileComplete)}`} style={{width:`${p.profileComplete}%`}}/></div><span className="text-[10px] text-muted">{p.profileComplete}%</span></div></td>
              <td className="px-4 py-3"><StatusBadge status={p.status} small/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showAdd && <AddPatientModal onClose={()=>setShowAdd(false)}/>}
      {selected && <PatientDetail patient={selected} onClose={()=>setSelected(null)}/>}
    </ModuleShell>
  )
}
