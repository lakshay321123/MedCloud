'use client'

import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { Users, Plus, Search, X, ChevronDown, Edit, Phone, Mail } from 'lucide-react'

interface Patient {
  id: string
  firstName: string
  lastName: string
  dob: string
  gender: string
  phone: string
  email: string
  emiratesId?: string
  ssn?: string
  address: string
  city: string
  state: string
  zip: string
  insurancePrimary: string
  policyNumber: string
  groupNumber: string
  memberId: string
  status: 'active' | 'inactive'
  createdAt: string
}

const demoPatients: Patient[] = [
  { id: 'P-001', firstName: 'John', lastName: 'Smith', dob: '1985-03-15', gender: 'Male', phone: '+1 555-0101', email: 'john.smith@email.com', ssn: '***-**-4521', address: '123 Oak St', city: 'Irvine', state: 'CA', zip: '92618', insurancePrimary: 'UnitedHealthcare', policyNumber: 'UHC-88421', groupNumber: 'GRP-100', memberId: 'MEM-44521', status: 'active', createdAt: '2025-11-20' },
  { id: 'P-002', firstName: 'Sarah', lastName: 'Johnson', dob: '1972-08-22', gender: 'Female', phone: '+1 555-0102', email: 'sarah.j@email.com', ssn: '***-**-7832', address: '456 Pine Ave', city: 'Tustin', state: 'CA', zip: '92780', insurancePrimary: 'Aetna', policyNumber: 'AET-55123', groupNumber: 'GRP-200', memberId: 'MEM-77231', status: 'active', createdAt: '2025-12-05' },
  { id: 'P-003', firstName: 'Ahmed', lastName: 'Al Rashid', dob: '1990-01-10', gender: 'Male', phone: '+971 50-123-4567', email: 'ahmed.r@email.com', emiratesId: '784-1990-1234567-1', address: 'Villa 12, Al Nahda', city: 'Dubai', state: 'Dubai', zip: '00000', insurancePrimary: 'Daman (NAS)', policyNumber: 'NAS-99812', groupNumber: 'DHA-500', memberId: 'EID-784199012345671', status: 'active', createdAt: '2026-01-15' },
  { id: 'P-004', firstName: 'Maria', lastName: 'Garcia', dob: '1995-06-30', gender: 'Female', phone: '+1 555-0104', email: 'maria.g@email.com', ssn: '***-**-9923', address: '789 Elm Blvd', city: 'Anaheim', state: 'CA', zip: '92801', insurancePrimary: 'BCBS', policyNumber: 'BCBS-33210', groupNumber: 'GRP-300', memberId: 'MEM-11892', status: 'inactive', createdAt: '2025-10-01' },
]

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>(demoPatients)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', gender: 'Male', phone: '', email: '',
    emiratesId: '', ssn: '', address: '', city: '', state: '', zip: '',
    insurancePrimary: '', policyNumber: '', groupNumber: '', memberId: '',
  })

  const filtered = patients.filter(p =>
    `${p.firstName} ${p.lastName} ${p.id} ${p.memberId} ${p.policyNumber}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    const newPatient: Patient = {
      id: `P-${String(patients.length + 1).padStart(3, '0')}`,
      ...form,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    }
    setPatients([newPatient, ...patients])
    setShowForm(false)
    setForm({ firstName: '', lastName: '', dob: '', gender: 'Male', phone: '', email: '', emiratesId: '', ssn: '', address: '', city: '', state: '', zip: '', insurancePrimary: '', policyNumber: '', groupNumber: '', memberId: '' })
  }

  const InputField = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        type={type}
        value={(form as any)[field]}
        onChange={e => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-brand/50"
      />
    </div>
  )

  return (
    <ModuleShell
      title="Patients"
      subtitle="Patient registration, profiles, and insurance management"
      sprint="Sprint 2"
      icon={<Users size={20} />}
      actions={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          <Plus size={16} /> Add Patient
        </button>
      }
    >
      {/* Create Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Patient Registration</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-xs font-semibold text-brand uppercase tracking-wider mb-2">Demographics</div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="First Name *" field="firstName" placeholder="John" />
                <InputField label="Last Name *" field="lastName" placeholder="Smith" />
                <InputField label="Date of Birth *" field="dob" type="date" />
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Gender *</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <InputField label="Phone *" field="phone" placeholder="+1 555-0100" />
                <InputField label="Email" field="email" type="email" placeholder="john@email.com" />
              </div>

              <div className="text-xs font-semibold text-brand uppercase tracking-wider mt-4 mb-2">Identification</div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Emirates ID (UAE)" field="emiratesId" placeholder="784-YYYY-NNNNNNN-N" />
                <InputField label="SSN (US)" field="ssn" placeholder="XXX-XX-XXXX" />
              </div>

              <div className="text-xs font-semibold text-brand uppercase tracking-wider mt-4 mb-2">Address</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><InputField label="Address" field="address" placeholder="123 Main St" /></div>
                <InputField label="City" field="city" placeholder="Irvine" />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="State" field="state" placeholder="CA" />
                  <InputField label="ZIP" field="zip" placeholder="92618" />
                </div>
              </div>

              <div className="text-xs font-semibold text-brand uppercase tracking-wider mt-4 mb-2">Primary Insurance</div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Insurance Company *" field="insurancePrimary" placeholder="UnitedHealthcare" />
                <InputField label="Policy Number *" field="policyNumber" placeholder="UHC-XXXXX" />
                <InputField label="Group Number" field="groupNumber" placeholder="GRP-XXX" />
                <InputField label="Member ID *" field="memberId" placeholder="MEM-XXXXX" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[var(--border-color)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
              <button onClick={handleCreate} disabled={!form.firstName || !form.lastName || !form.dob} className="px-6 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors">
                Create Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selected.firstName} {selected.lastName}</h2>
              <button onClick={() => setSelected(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-[var(--text-secondary)]">Patient ID</span><span className="font-mono text-brand">{selected.id}</span>
                <span className="text-[var(--text-secondary)]">DOB</span><span>{selected.dob}</span>
                <span className="text-[var(--text-secondary)]">Gender</span><span>{selected.gender}</span>
                <span className="text-[var(--text-secondary)]">Phone</span><span>{selected.phone}</span>
                <span className="text-[var(--text-secondary)]">Email</span><span>{selected.email}</span>
                <span className="text-[var(--text-secondary)]">Address</span><span>{selected.address}, {selected.city}, {selected.state} {selected.zip}</span>
                {selected.emiratesId && <><span className="text-[var(--text-secondary)]">Emirates ID</span><span className="font-mono">{selected.emiratesId}</span></>}
              </div>
              <div className="border-t border-[var(--border-color)] pt-3">
                <div className="text-xs font-semibold text-brand uppercase mb-2">Insurance</div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-[var(--text-secondary)]">Payer</span><span>{selected.insurancePrimary}</span>
                  <span className="text-[var(--text-secondary)]">Policy #</span><span className="font-mono">{selected.policyNumber}</span>
                  <span className="text-[var(--text-secondary)]">Group #</span><span className="font-mono">{selected.groupNumber}</span>
                  <span className="text-[var(--text-secondary)]">Member ID</span><span className="font-mono">{selected.memberId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search patients by name, ID, member ID..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-brand/50"
        />
      </div>

      {/* Patient Table */}
      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              {['Patient ID', 'Name', 'DOB', 'Phone', 'Insurance', 'Member ID', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-brand">{p.id}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{p.lastName}, {p.firstName}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{p.dob}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{p.phone}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{p.insurancePrimary}</td>
                <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{p.memberId}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  )
}
