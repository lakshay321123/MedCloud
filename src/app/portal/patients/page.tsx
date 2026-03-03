'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoPatients, DemoPatient } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { Plus, Search, X, Upload, ChevronDown } from 'lucide-react'
import { usePatients } from '@/lib/hooks'
import type { ApiPatient } from '@/lib/hooks'
import { ErrorBanner } from '@/components/shared/ApiStates'

function apiPatientToDemoPatient(p: ApiPatient): DemoPatient {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    dob: p.dob,
    phone: p.phone || '',
    email: p.email,
    insurance: p.insurance_payer ? { payer: p.insurance_payer, policyNo: '', memberId: p.insurance_member_id || '' } : undefined,
    clientId: p.client_id,
    status: (p.status as 'active' | 'inactive') || 'active',
    profileComplete: p.profile_complete || 0,
  }
}

const completenessColor = (p: number) => p >= 100 ? 'bg-emerald-500' : p >= 75 ? 'bg-cyan-500' : p >= 50 ? 'bg-amber-500' : 'bg-red-500'
const ic = 'w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors'

function SectionHeader({ title, badge, open, onToggle }: { title: string; badge?: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-xs font-semibold text-content-secondary uppercase tracking-wide hover:text-content-primary transition-colors">
      <div className="flex items-center gap-2">
        <span>{title}</span>
        {badge && <span className="text-[10px] font-normal text-content-tertiary normal-case">{badge}</span>}
      </div>
      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

function AddPatientModal({ onClose }: { onClose: () => void }) {
  const { country } = useApp()
  const { toast } = useToast()
  const isUAE = country === 'uae'
  const [sections, setSections] = useState({ address: false, id: false, insurance: false, secondary: false, emergency: false, employment: false, medical: false })
  const toggle = (k: keyof typeof sections) => setSections(p => ({ ...p, [k]: !p[k] }))
  const [patientForm, setPatientForm] = useState({
    firstName: '', lastName: '', dob: '', gender: '',
    phone: '', email: '', address: '',
    insuranceId: '', groupNumber: '', memberId: '',
    emiratesId: '', ssn: '',
  })
  const updateField = (field: string, value: string) =>
    setPatientForm(prev => ({ ...prev, [field]: value }))

  const usStates = ['AK','AL','AR','AZ','CA','CO','CT','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY']
  const uaeEmirates = ['Abu Dhabi','Dubai','Sharjah','Ajman','Fujairah','Ras Al Khaimah','Umm Al Quwain']

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-[680px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="sticky top-0 bg-surface-secondary z-10 flex items-center justify-between px-5 py-4 border-b border-separator">
          <h2 className="font-semibold text-content-primary">Add Patient</h2>
          <button onClick={onClose} className="text-content-secondary hover:text-content-primary"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-content-secondary bg-brand/5 border border-brand/20 rounded-lg p-3">
            Only name and phone are required to start. Expand sections below to add more details.
          </p>

          {/* ── DEMOGRAPHICS ── */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-content-secondary uppercase tracking-wide">Demographics</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs text-content-secondary block mb-1">First Name <span className="text-red-400">*</span></label>
                <input className={ic} placeholder="First name" value={patientForm.firstName} onChange={e => updateField('firstName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Middle</label>
                <input className={ic} placeholder="M.I." />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Last Name <span className="text-red-400">*</span></label>
                <input className={ic} placeholder="Last name" value={patientForm.lastName} onChange={e => updateField('lastName', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Preferred Name / Nickname</label>
              <input className={ic} placeholder="Goes by..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-content-secondary block mb-1">Date of Birth</label>
                <input type="date" className={ic} value={patientForm.dob} onChange={e => updateField('dob', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Gender</label>
                <select className={ic} value={patientForm.gender} onChange={e => updateField('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-content-secondary block mb-1">Marital Status</label>
                <select className={ic}><option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option><option>Separated</option></select>
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Preferred Language</label>
                <select className={ic}><option>English</option><option>Arabic</option><option>Spanish</option><option>Other</option></select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-content-secondary block mb-1">Phone (Primary) <span className="text-red-400">*</span></label>
                <input type="tel" className={ic} placeholder={isUAE ? '+971 50 xxx xxxx' : '(949) xxx-xxxx'} value={patientForm.phone} onChange={e => updateField('phone', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Phone (Secondary/Cell)</label>
                <input type="tel" className={ic} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-content-secondary block mb-1">Email</label>
                <input type="email" className={ic} placeholder="email@example.com" value={patientForm.email} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-content-secondary block mb-1">Preferred Contact</label>
                <select className={ic}><option>Phone</option><option>Email</option><option>SMS</option><option>Portal</option></select>
              </div>
            </div>
          </div>

          <div className="border-t border-separator" />

          {/* ── ADDRESS ── */}
          <div>
            <SectionHeader title="Address" open={sections.address} onToggle={() => toggle('address')} />
            {sections.address && (
              <div className="space-y-3 pt-1">
                <div><label className="text-xs text-content-secondary block mb-1">Address Line 1</label><input className={ic} placeholder="Street address" value={patientForm.address} onChange={e => updateField('address', e.target.value)} /></div>
                <div><label className="text-xs text-content-secondary block mb-1">Address Line 2</label><input className={ic} placeholder="Apt, Suite, etc." /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">City</label><input className={ic} /></div>
                  <div>
                    <label className="text-xs text-content-secondary block mb-1">{isUAE ? 'Emirate' : 'State'}</label>
                    <select className={ic}>
                      <option value="">Select</option>
                      {(isUAE ? uaeEmirates : usStates).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-content-secondary block mb-1">{isUAE ? 'Postal Code' : 'ZIP Code'}</label><input className={ic} placeholder={isUAE ? 'Optional' : '00000'} /></div>
                </div>
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Country</label>
                  <input className={`${ic} bg-surface-primary`} value={isUAE ? 'United Arab Emirates' : 'United States'} readOnly />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── IDENTIFICATION ── */}
          <div>
            <SectionHeader title="Identification" open={sections.id} onToggle={() => toggle('id')} />
            {sections.id && (
              <div className="space-y-3 pt-1">
                {!isUAE && <div><label className="text-xs text-content-secondary block mb-1">SSN (last 4 digits)</label><input className={ic} placeholder="****-**-XXXX" maxLength={4} value={patientForm.ssn} onChange={e => updateField('ssn', e.target.value)} /></div>}
                {!isUAE && <div><label className="text-xs text-content-secondary block mb-1">Driver&apos;s License #</label><input className={ic} placeholder="License number" /></div>}
                {isUAE && <div><label className="text-xs text-content-secondary block mb-1">Emirates ID</label><input className={ic} placeholder="784-XXXX-XXXXXXX-X" value={patientForm.emiratesId} onChange={e => updateField('emiratesId', e.target.value)} /></div>}
                <div><label className="text-xs text-content-secondary block mb-1">Passport #</label><input className={ic} placeholder="Passport number" /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── PRIMARY INSURANCE ── */}
          <div>
            <SectionHeader title="Primary Insurance" open={sections.insurance} onToggle={() => toggle('insurance')} />
            {sections.insurance && (
              <div className="space-y-3 pt-1">
                <div><label className="text-xs text-content-secondary block mb-1">Insurance Payer</label><input className={ic} placeholder={isUAE ? 'e.g. Daman, NAS, ADNIC...' : 'e.g. Aetna, UHC, BCBS...'} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">Policy Number</label><input className={ic} value={patientForm.insuranceId} onChange={e => updateField('insuranceId', e.target.value)} /></div>
                  {!isUAE && <div><label className="text-xs text-content-secondary block mb-1">Group Number</label><input className={ic} value={patientForm.groupNumber} onChange={e => updateField('groupNumber', e.target.value)} /></div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">Member ID</label><input className={ic} value={patientForm.memberId} onChange={e => updateField('memberId', e.target.value)} /></div>
                  <div><label className="text-xs text-content-secondary block mb-1">Copay Amount</label><input type="number" className={ic} placeholder="0.00" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-content-secondary block mb-1">Relationship to Subscriber</label>
                    <select className={ic}><option>Self</option><option>Spouse</option><option>Child</option><option>Other</option></select>
                  </div>
                  <div><label className="text-xs text-content-secondary block mb-1">Subscriber Name (if not self)</label><input className={ic} /></div>
                </div>
                <div><label className="text-xs text-content-secondary block mb-1">Subscriber DOB (if not self)</label><input type="date" className={ic} /></div>
                <button type="button" onClick={() => toast.info('Camera / file picker — attach front and back of insurance card')} className="w-full bg-surface-elevated border border-dashed border-separator rounded-lg py-2.5 text-xs text-content-secondary hover:border-brand/30 hover:text-brand transition-all flex items-center justify-center gap-2">
                  <Upload size={14}/> Scan Insurance Card (Front & Back)
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── SECONDARY INSURANCE ── */}
          <div>
            <SectionHeader title="Secondary Insurance" badge="(optional)" open={sections.secondary} onToggle={() => toggle('secondary')} />
            {sections.secondary && (
              <div className="space-y-3 pt-1">
                <div><label className="text-xs text-content-secondary block mb-1">Insurance Payer</label><input className={ic} placeholder={isUAE ? 'e.g. Daman, NAS...' : 'e.g. Aetna, UHC...'} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">Policy Number</label><input className={ic} /></div>
                  <div><label className="text-xs text-content-secondary block mb-1">Member ID</label><input className={ic} /></div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── EMERGENCY CONTACT ── */}
          <div>
            <SectionHeader title="Emergency Contact" open={sections.emergency} onToggle={() => toggle('emergency')} />
            {sections.emergency && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">Name</label><input className={ic} /></div>
                  <div>
                    <label className="text-xs text-content-secondary block mb-1">Relationship</label>
                    <select className={ic}><option value="">Select</option><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Child</option><option>Friend</option><option>Other</option></select>
                  </div>
                </div>
                <div><label className="text-xs text-content-secondary block mb-1">Phone</label><input type="tel" className={ic} /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── EMPLOYMENT ── */}
          <div>
            <SectionHeader title="Employment" badge="(optional)" open={sections.employment} onToggle={() => toggle('employment')} />
            {sections.employment && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs text-content-secondary block mb-1">Employment Status</label>
                  <select className={ic}><option>Employed</option><option>Self-Employed</option><option>Unemployed</option><option>Retired</option><option>Student</option></select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">Employer Name</label><input className={ic} /></div>
                  <div><label className="text-xs text-content-secondary block mb-1">Occupation</label><input className={ic} /></div>
                </div>
                <div><label className="text-xs text-content-secondary block mb-1">Work Phone</label><input type="tel" className={ic} /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── MEDICAL QUICK INFO ── */}
          <div>
            <SectionHeader title="Medical Quick Info" badge="(optional)" open={sections.medical} onToggle={() => toggle('medical')} />
            {sections.medical && (
              <div className="space-y-3 pt-1">
                <div><label className="text-xs text-content-secondary block mb-1">Known Allergies</label><textarea className={`${ic} resize-none`} rows={2} placeholder="e.g. Penicillin, Sulfa drugs..." /></div>
                <div><label className="text-xs text-content-secondary block mb-1">Current Medications</label><textarea className={`${ic} resize-none`} rows={2} placeholder="List current medications..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-content-secondary block mb-1">Referring Physician</label><input className={ic} /></div>
                  <div><label className="text-xs text-content-secondary block mb-1">Primary Care Physician</label><input className={ic} /></div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* Scan ID + Buttons */}
          <div>
            <button type="button" onClick={() => toast.info('Scanning ID to auto-fill demographics...')} className="w-full bg-surface-elevated border border-dashed border-separator rounded-lg py-3 text-xs text-content-secondary hover:border-brand/30 hover:text-brand transition-all flex items-center justify-center gap-2 mb-4">
              <Upload size={14} className="text-brand" />
              <span>📷 {isUAE ? 'Scan Emirates ID' : 'Scan Driver\'s License'} to auto-fill demographics</span>
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 bg-surface-elevated border border-separator rounded-lg py-2.5 text-sm text-content-secondary hover:text-content-primary transition-colors">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (!patientForm.firstName || !patientForm.lastName) {
                    toast.error('First name and last name are required')
                    return
                  }
                  toast.success(`Patient ${patientForm.firstName} ${patientForm.lastName} saved successfully`)
                  onClose()
                }}
                className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors">Save Patient</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type DetailTab = 'demographics' | 'address' | 'insurance' | 'emergency' | 'employment' | 'documents' | 'visits' | 'messages'

function PatientDetail({ patient, onClose }: { patient: DemoPatient; onClose: () => void }) {
  const { country } = useApp()
  const { toast } = useToast()
  const [tab, setTab] = useState<DetailTab>('demographics')
  // Use app-level country; fall back to patient data signal
  const isUAE = country === 'uae' || !!patient.emiratesId

  const tabs: DetailTab[] = ['demographics', 'address', 'insurance', 'emergency', 'employment', 'documents', 'visits', 'messages']

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-[680px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-separator">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-sm">{patient.firstName[0]}{patient.lastName[0]}</div>
            <div>
              <h2 className="font-semibold">{patient.firstName} {patient.lastName}</h2>
              <span className="text-xs text-content-secondary">{patient.id} • {isUAE ? '🇦🇪 UAE' : '🇺🇸 US'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 rounded-full bg-surface-elevated"><div className={`h-full rounded-full ${completenessColor(patient.profileComplete)}`} style={{ width: `${patient.profileComplete}%` }} /></div>
              <span className="text-[10px] text-content-secondary">{patient.profileComplete}%</span>
            </div>
            <button onClick={onClose} className="text-content-secondary hover:text-content-primary"><X size={18}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-separator overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${tab === t ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4 text-sm">
          {tab === 'demographics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-content-secondary block">Name</span><span>{patient.firstName} {patient.middleName ? patient.middleName + ' ' : ''}{patient.lastName}</span></div>
                <div><span className="text-xs text-content-secondary block">DOB</span><span>{patient.dob || '—'}</span></div>
                <div><span className="text-xs text-content-secondary block">Gender</span><span>{patient.gender || '—'}</span></div>
                <div><span className="text-xs text-content-secondary block">Marital Status</span><span>{patient.maritalStatus || '—'}</span></div>
                <div><span className="text-xs text-content-secondary block">Phone</span><span>{patient.phone}</span></div>
                {patient.secondaryPhone && <div><span className="text-xs text-content-secondary block">Secondary Phone</span><span>{patient.secondaryPhone}</span></div>}
                <div><span className="text-xs text-content-secondary block">Email</span><span>{patient.email || '—'}</span></div>
                <div><span className="text-xs text-content-secondary block">Preferred Language</span><span>{patient.preferredLanguage || '—'}</span></div>
                {isUAE && <div><span className="text-xs text-content-secondary block">Emirates ID</span><span>{patient.emiratesId || '—'}</span></div>}
                {!isUAE && <div><span className="text-xs text-content-secondary block">SSN</span><span>{patient.ssn || '—'}</span></div>}
                {!isUAE && patient.driversLicense && <div><span className="text-xs text-content-secondary block">Driver&apos;s License</span><span>{patient.driversLicense}</span></div>}
              </div>
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 text-xs">
                  <span className="text-content-secondary">Allergies: </span>{patient.allergies.join(', ')}
                </div>
              )}
              {patient.noShowCount && patient.noShowCount >= 3 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-600 dark:text-red-400">⚠ {patient.noShowCount} no-shows on record</div>
              )}
            </div>
          )}

          {tab === 'address' && (
            <div>
              {patient.address ? (
                <div className="space-y-1">
                  <div><span className="text-xs text-content-secondary block">Address</span>
                    <span>{patient.address.line1}</span>
                    {patient.address.line2 && <div>{patient.address.line2}</div>}
                    <div>{patient.address.city}, {patient.address.state} {patient.address.zip}</div>
                    <div>{patient.address.country}</div>
                  </div>
                </div>
              ) : <div className="text-center py-8 text-xs text-content-secondary">No address on file.</div>}
            </div>
          )}

          {tab === 'insurance' && (
            <div className="space-y-3">
              {patient.insurance ? (
                <div className="bg-surface-elevated border border-separator rounded-lg p-3">
                  <div className="text-xs text-content-secondary mb-2">Primary Insurance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-content-secondary">Payer:</span> {patient.insurance.payer}</div>
                    <div><span className="text-content-secondary">Policy:</span> {patient.insurance.policyNo}</div>
                    {patient.insurance.groupNo && <div><span className="text-content-secondary">Group:</span> {patient.insurance.groupNo}</div>}
                    <div><span className="text-content-secondary">Member ID:</span> {patient.insurance.memberId}</div>
                    {patient.insurance.relationship && <div><span className="text-content-secondary">Relationship:</span> {patient.insurance.relationship}</div>}
                    {patient.insurance.copay !== undefined && <div><span className="text-content-secondary">Copay:</span> {isUAE ? 'AED' : '$'}{patient.insurance.copay}</div>}
                  </div>
                </div>
              ) : <div className="text-center py-6 text-xs text-content-secondary">No insurance on file. <button onClick={() => toast.info('Upload insurance card to update coverage details')} className="text-brand underline">Upload insurance card</button></div>}
              {patient.secondaryInsurance && (
                <div className="bg-surface-elevated border border-separator rounded-lg p-3">
                  <div className="text-xs text-content-secondary mb-2">Secondary Insurance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-content-secondary">Payer:</span> {patient.secondaryInsurance.payer}</div>
                    <div><span className="text-content-secondary">Policy:</span> {patient.secondaryInsurance.policyNo}</div>
                    <div><span className="text-content-secondary">Member ID:</span> {patient.secondaryInsurance.memberId}</div>
                  </div>
                </div>
              )}
              <button type="button" onClick={() => toast.info('Camera/file picker — scan front and back of insurance card')} className="w-full bg-surface-elevated border border-dashed border-separator rounded-lg py-3 text-xs text-content-secondary hover:border-brand/30">
                <Upload size={14} className="inline mr-1"/> Scan insurance card to auto-fill
              </button>
            </div>
          )}

          {tab === 'emergency' && (
            <div>
              {patient.emergencyContact ? (
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs text-content-secondary block">Name</span><span>{patient.emergencyContact.name}</span></div>
                  <div><span className="text-xs text-content-secondary block">Relationship</span><span>{patient.emergencyContact.relationship}</span></div>
                  <div><span className="text-xs text-content-secondary block">Phone</span><span>{patient.emergencyContact.phone}</span></div>
                </div>
              ) : <div className="text-center py-8 text-xs text-content-secondary">No emergency contact on file.</div>}
            </div>
          )}

          {tab === 'employment' && (
            <div>
              {patient.employment ? (
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs text-content-secondary block">Status</span><span>{patient.employment.status}</span></div>
                  {patient.employment.occupation && <div><span className="text-xs text-content-secondary block">Occupation</span><span>{patient.employment.occupation}</span></div>}
                  {patient.employment.employer && <div><span className="text-xs text-content-secondary block">Employer</span><span>{patient.employment.employer}</span></div>}
                  {patient.employment.workPhone && <div><span className="text-xs text-content-secondary block">Work Phone</span><span>{patient.employment.workPhone}</span></div>}
                </div>
              ) : <div className="text-center py-8 text-xs text-content-secondary">No employment info on file.</div>}
            </div>
          )}

          {tab === 'documents' && <div className="text-center py-8 text-xs text-content-secondary">No documents linked yet.</div>}
          {tab === 'visits' && <div className="text-center py-8 text-xs text-content-secondary">No visit history yet.</div>}
          {tab === 'messages' && <div className="text-center py-8 text-xs text-content-secondary">No messages for this patient.</div>}
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

  const { data: apiResult, loading: apiLoading, error: apiError, refetch } = usePatients(
    search ? { search, limit: 50 } : { limit: 50 }
  )

  const clientFilter = currentUser.role === 'client' || currentUser.role === 'provider' ? 'org-102' : selectedClient?.id
  const patients: DemoPatient[] = apiResult?.data
    ? apiResult.data.map(apiPatientToDemoPatient)
    : demoPatients.filter(p => {
        if (clientFilter && p.clientId !== clientFilter) return false
        if (search) {
          const s = search.toLowerCase()
          return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) || p.phone.includes(s) || p.id.toLowerCase().includes(s)
        }
        return true
      })

  return (
    <ModuleShell title="Patients" subtitle="Manage patient records"
      actions={<button onClick={() => setShowAdd(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep"><Plus size={16}/>Add Patient</button>}>
      {apiError && <ErrorBanner error={apiError} onRetry={refetch} />}
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, ID..."
          className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-4 py-2 text-sm text-content-primary placeholder:text-content-tertiary outline-none focus:border-brand/40 transition-colors"/>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Patient {apiResult ? <span className="text-brand font-normal">(live)</span> : null}</th>
            <th className="text-left px-4 py-3">DOB</th>
            <th className="text-left px-4 py-3">Phone</th>
            <th className="text-left px-4 py-3">Insurance</th>
            <th className="text-left px-4 py-3">Profile</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{apiLoading ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-content-tertiary">Loading patients…</td></tr>
          ) : patients.map(p => (
            <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-separator last:border-0 table-row cursor-pointer transition-all">
              <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold">{p.firstName[0]}{p.lastName[0]}</div><div><div className="font-medium">{p.firstName} {p.lastName}</div><div className="text-[10px] text-content-secondary">{p.id}</div></div></div></td>
              <td className="px-4 py-3 text-content-secondary">{p.dob || '—'}</td>
              <td className="px-4 py-3 text-content-secondary">{p.phone}</td>
              <td className="px-4 py-3 text-content-secondary text-xs">{p.insurance?.payer || <span className="text-amber-600 dark:text-amber-400">Not on file</span>}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><div className="w-12 h-1.5 rounded-full bg-surface-elevated"><div className={`h-full rounded-full ${completenessColor(p.profileComplete)}`} style={{ width: `${p.profileComplete}%` }}/></div><span className="text-[10px] text-content-secondary">{p.profileComplete}%</span></div></td>
              <td className="px-4 py-3"><StatusBadge status={p.status} small/></td>
            </tr>
          ))
          }</tbody>
        </table>
      </div>
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)}/>}
      {selected && <PatientDetail patient={selected} onClose={() => setSelected(null)}/>}
    </ModuleShell>
  )
}
