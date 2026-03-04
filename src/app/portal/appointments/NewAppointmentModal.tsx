'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { X, ChevronDown } from 'lucide-react'

type PatientMode = 'existing' | 'new'

export default function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const { currentUser, selectedClient } = useApp()
  const [mode, setMode] = useState<PatientMode>('existing')
  const [showInsurance, setShowInsurance] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [search, setSearch] = useState('')
  const [newPatient, setNewPatient] = useState({
    firstName: '', lastName: '', phone: '', dob: '',
    insuranceProvider: '', memberId: '', policyNo: '',
  })

  // In demo mode, show patients from all clients (or use selectedClient from context)
  const patients = selectedClient
    ? ([] as any[]) // patients loaded from API
    : ([] as any[])

  void currentUser

  const filteredPatients = search.length > 0
    ? patients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()))
    : []

  function handleSubmit() {
    // In production: POST to appointments API
    // For demo: close modal (data would be persisted via API)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-[480px] max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-content-primary">Book Appointment</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated text-content-secondary">
            <X size={16} />
          </button>
        </div>

        {/* Patient Mode Toggle */}
        <div className="flex rounded-btn bg-surface-elevated p-1 mb-4">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-[10px] transition-all ${
              mode === 'existing' ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'
            }`}
          >
            Existing Patient
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-[10px] transition-all ${
              mode === 'new' ? 'bg-surface-secondary text-content-primary shadow-sm' : 'text-content-secondary'
            }`}
          >
            New Patient
          </button>
        </div>

        <div className="space-y-3">

          {/* EXISTING PATIENT — searchable input */}
          {mode === 'existing' && (
            <div>
              <label className="text-xs text-content-secondary block mb-1">Patient <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="Type name to search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedPatient('') }}
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
              />
              {search.length > 0 && !selectedPatient && (
                <div className="mt-1 bg-surface-elevated border border-separator rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-content-secondary">No patients found</div>
                  ) : (
                    filteredPatients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p.id); setSearch(`${p.firstName} ${p.lastName}`) }}
                        className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-primary transition-colors"
                      >
                        {p.firstName} {p.lastName}
                        <span className="text-xs text-content-secondary ml-2">{p.dob}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* NEW PATIENT — controlled inputs */}
          {mode === 'new' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-content-secondary block mb-1">First Name <span className="text-red-400">*</span></label>
                  <input
                    value={newPatient.firstName}
                    onChange={e => setNewPatient(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Last Name <span className="text-red-400">*</span></label>
                  <input
                    value={newPatient.lastName}
                    onChange={e => setNewPatient(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Phone <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={e => setNewPatient(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                    placeholder="+1 or +971..."
                  />
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatient.dob}
                    onChange={e => setNewPatient(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                  />
                </div>
              </div>

              {/* Insurance — collapsible, optional */}
              <button
                onClick={() => setShowInsurance(!showInsurance)}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated rounded-lg text-xs text-content-secondary hover:text-content-primary transition-colors"
              >
                <span>Insurance Details <span className="text-content-tertiary">(optional — can add at check-in)</span></span>
                <ChevronDown size={14} className={`transition-transform ${showInsurance ? 'rotate-180' : ''}`} />
              </button>

              {showInsurance && (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-xs text-content-secondary block mb-1">Insurance Provider</label>
                    <input
                      value={newPatient.insuranceProvider}
                      onChange={e => setNewPatient(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                      placeholder="e.g. Daman, Aetna, ADNIC..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-content-secondary block mb-1">Member ID</label>
                      <input
                        value={newPatient.memberId}
                        onChange={e => setNewPatient(prev => ({ ...prev, memberId: e.target.value }))}
                        className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-content-secondary block mb-1">Policy Number</label>
                      <input
                        value={newPatient.policyNo}
                        onChange={e => setNewPatient(prev => ({ ...prev, policyNo: e.target.value }))}
                        className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-content-secondary block mb-1">Date <span className="text-red-400">*</span></label>
              <input type="date" defaultValue="2026-03-03" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Time <span className="text-red-400">*</span></label>
              <input type="time" defaultValue="09:00" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" />
            </div>
          </div>

          {/* Visit Type */}
          <div>
            <label className="text-xs text-content-secondary block mb-1">Visit Type</label>
            <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors">
              <option>Follow-up</option>
              <option>Initial Visit</option>
              <option>Consultation</option>
              <option>Procedure</option>
              <option>Telehealth</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-content-secondary block mb-1">Notes</label>
            <input className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors" placeholder="Optional..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 bg-surface-elevated border border-separator rounded-lg py-2 text-sm text-content-secondary">
              Cancel
            </button>
            <button onClick={handleSubmit} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-mid transition-colors">
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
