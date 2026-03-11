'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { api } from '@/lib/api-client'
import type { DemoPatient } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { Plus, Search, X, Upload, ChevronDown, Pencil, Check, Users, FileText } from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient, usePatientStatements, useGenerateStatement, useUpdateStatement, useFlagHCCCodes, useMessages, useSendMessage } from '@/lib/hooks'
import type { ApiPatient } from '@/lib/hooks'
import { ErrorBanner } from '@/components/shared/ApiStates'
import { formatDOB, toMRN, computeProfileComplete } from '@/lib/utils/region'

function apiPatientToDemoPatient(p: ApiPatient): DemoPatient {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    dob: p.dob ? p.dob.split('T')[0] : '',
    phone: p.phone || '',
    email: p.email,
    insurance: p.insurance_payer ? { payer: p.insurance_payer, policyNo: '', memberId: p.insurance_member_id || '' } : undefined,
    address: p.address ? {
      line1: p.address,
      line2: '',
      city: p.city || '',
      state: p.state || '',
      zip: p.zip || '',
      country: '',
    } : undefined,
    clientId: p.client_id,
    status: (p.status as 'active' | 'inactive') || 'active',
    profileComplete: p.profile_complete || 0,
  }
}

const completenessColor = (p: number) => p >= 100 ? 'bg-brand' : p >= 75 ? 'bg-cyan-500' : p >= 50 ? 'bg-brand-pale' : 'bg-[#065E76]'
const ic = 'w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors'

function SectionHeader({ title, badge, open, onToggle }: { title: string; badge?: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-[13px] font-semibold text-content-secondary tracking-wide hover:text-content-primary transition-colors">
      <div className="flex items-center gap-2">
        <span>{title}</span>
        {badge && <span className="text-[11px] font-normal text-content-tertiary normal-case">{badge}</span>}
      </div>
      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

function AddPatientModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { country, currentUser, selectedClient } = useApp()
  const { toast } = useToast()
  const router = useRouter()
  const createPatient = useCreatePatient()
  const isUAE = country === 'uae'
  const [sections, setSections] = useState({ address: false, id: false, insurance: false, secondary: false, emergency: false, employment: false, medical: false })
  const toggle = (k: keyof typeof sections) => setSections(p => ({ ...p, [k]: !p[k] }))
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '', preferredName: '',
    dob: '', gender: '', maritalStatus: '', preferredLanguage: '',
    phone: '', secondaryPhone: '', email: '', preferredContact: '',
    addressLine1: '', addressLine2: '', city: '', stateEmirate: '', zip: '',
    ssn: '', driversLicense: '', emiratesId: '', passport: '',
    insurancePayer: '', policyNo: '', groupNo: '', memberId: '', copay: '', relationship: '', subscriberName: '', subscriberDob: '',
    insuranceCardFront: '', insuranceCardBack: '',
    secPayer: '', secPolicyNo: '', secMemberId: '',
    ecName: '', ecRelationship: '', ecPhone: '',
    empStatus: '', employer: '', occupation: '', workPhone: '',
    allergies: '', medications: '', referringPhysician: '', pcp: '',
  })
  const upd = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const usStates = ['AK','AL','AR','AZ','CA','CO','CT','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY']
  const uaeEmirates = ['Abu Dhabi','Dubai','Sharjah','Ajman','Fujairah','Ras Al Khaimah','Umm Al Quwain']

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-secondary z-10 flex items-center justify-between px-5 py-4 border-b border-separator">
          <h2 className="font-semibold text-content-primary">Add Patient</h2>
          <button onClick={onClose} className="text-content-secondary hover:text-content-primary"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-content-secondary bg-brand/5 border border-brand/20 rounded-lg p-3">
            Only name and phone are required to start. Expand sections below to add more details.
          </p>

          {/* ── DEMOGRAPHICS ── */}
          <div className="space-y-3">
            <div className="text-[13px] font-semibold text-content-secondary tracking-wide">Demographics</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-[13px] text-content-secondary block mb-1">First Name <span className="text-[#065E76]">*</span></label>
                <input className={ic} placeholder="First name" value={form.firstName} onChange={e => upd('firstName', e.target.value)} /></div>
              <div><label className="text-[13px] text-content-secondary block mb-1">Middle</label>
                <input className={ic} placeholder="M.I." value={form.middleName} onChange={e => upd('middleName', e.target.value)} /></div>
              <div><label className="text-[13px] text-content-secondary block mb-1">Last Name <span className="text-[#065E76]">*</span></label>
                <input className={ic} placeholder="Last name" value={form.lastName} onChange={e => upd('lastName', e.target.value)} /></div>
            </div>
            <div><label className="text-[13px] text-content-secondary block mb-1">Preferred Name / Nickname</label>
              <input className={ic} placeholder="Goes by..." value={form.preferredName} onChange={e => upd('preferredName', e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-[13px] text-content-secondary block mb-1">Date of Birth</label>
                <input type="date" className={ic} value={form.dob} onChange={e => upd('dob', e.target.value)} /></div>
              <div><label className="text-[13px] text-content-secondary block mb-1">Gender</label>
                <select className={ic} value={form.gender} onChange={e => upd('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-[13px] text-content-secondary block mb-1">Marital Status</label>
                <select className={ic} value={form.maritalStatus} onChange={e => upd('maritalStatus', e.target.value)}><option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option><option>Separated</option></select></div>
              <div><label className="text-[13px] text-content-secondary block mb-1">Preferred Language</label>
                <select className={ic} value={form.preferredLanguage} onChange={e => upd('preferredLanguage', e.target.value)}><option>English</option><option>Arabic</option><option>Spanish</option><option>Other</option></select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-[13px] text-content-secondary block mb-1">Phone (Primary) <span className="text-[#065E76]">*</span></label>
                <input type="tel" className={ic} placeholder={isUAE ? '+971 50 xxx xxxx' : '(949) xxx-xxxx'} value={form.phone} onChange={e => upd('phone', e.target.value)} /></div>
              <div><label className="text-[13px] text-content-secondary block mb-1">Phone (Secondary/Cell)</label>
                <input type="tel" className={ic} placeholder="Optional" value={form.secondaryPhone} onChange={e => upd('secondaryPhone', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-[13px] text-content-secondary block mb-1">Email</label>
                <input type="email" className={ic} placeholder="email@example.com" value={form.email} onChange={e => upd('email', e.target.value)} /></div>
              <div><label className="text-[13px] text-content-secondary block mb-1">Preferred Contact</label>
                <select className={ic} value={form.preferredContact} onChange={e => upd('preferredContact', e.target.value)}><option>Phone</option><option>Email</option><option>SMS</option><option>Portal</option></select></div>
            </div>
          </div>

          <div className="border-t border-separator" />

          {/* ── ADDRESS ── */}
          <div>
            <SectionHeader title="Address" open={sections.address} onToggle={() => toggle('address')} />
            {sections.address && (
              <div className="space-y-3 pt-1">
                <div><label className="text-[13px] text-content-secondary block mb-1">Address Line 1</label><input className={ic} placeholder="Street address" value={form.addressLine1} onChange={e => upd('addressLine1', e.target.value)} /></div>
                <div><label className="text-[13px] text-content-secondary block mb-1">Address Line 2</label><input className={ic} placeholder="Apt, Suite, etc." value={form.addressLine2} onChange={e => upd('addressLine2', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">City</label><input className={ic} value={form.city} onChange={e => upd('city', e.target.value)} /></div>
                  <div>
                    <label className="text-[13px] text-content-secondary block mb-1">{isUAE ? 'Emirate' : 'State'}</label>
                    <select className={ic} value={form.stateEmirate} onChange={e => upd('stateEmirate', e.target.value)}>
                      <option value="">Select</option>
                      {(isUAE ? uaeEmirates : usStates).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">{isUAE ? 'Postal Code' : 'ZIP Code'}</label><input className={ic} placeholder={isUAE ? 'Optional' : '00000'} value={form.zip} onChange={e => upd('zip', e.target.value)} /></div>
                </div>
                <div><label className="text-[13px] text-content-secondary block mb-1">Country</label>
                  <input className={`${ic} bg-surface-primary`} value={isUAE ? 'United Arab Emirates' : 'United States'} readOnly /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── IDENTIFICATION ── */}
          <div>
            <SectionHeader title="Identification" open={sections.id} onToggle={() => toggle('id')} />
            {sections.id && (
              <div className="space-y-3 pt-1">
                {!isUAE && <div><label className="text-[13px] text-content-secondary block mb-1">SSN (last 4 digits)</label><input className={ic} placeholder="****-**-XXXX" maxLength={4} value={form.ssn} onChange={e => upd('ssn', e.target.value)} /></div>}
                {!isUAE && <div><label className="text-[13px] text-content-secondary block mb-1">Driver&apos;s License #</label><input className={ic} placeholder="License number" value={form.driversLicense} onChange={e => upd('driversLicense', e.target.value)} /></div>}
                {isUAE && <div><label className="text-[13px] text-content-secondary block mb-1">Emirates ID</label><input className={ic} placeholder="784-XXXX-XXXXXXX-X" value={form.emiratesId} onChange={e => upd('emiratesId', e.target.value)} /></div>}
                <div><label className="text-[13px] text-content-secondary block mb-1">Passport #</label><input className={ic} placeholder="Passport number" value={form.passport} onChange={e => upd('passport', e.target.value)} /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── PRIMARY INSURANCE ── */}
          <div>
            <SectionHeader title="Primary Insurance" open={sections.insurance} onToggle={() => toggle('insurance')} />
            {sections.insurance && (
              <div className="space-y-3 pt-1">
                <div><label className="text-[13px] text-content-secondary block mb-1">Insurance Payer</label><input className={ic} placeholder={isUAE ? 'e.g. Daman, NAS, ADNIC...' : 'e.g. Aetna, UHC, BCBS...'} value={form.insurancePayer} onChange={e => upd('insurancePayer', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Policy Number</label><input className={ic} value={form.policyNo} onChange={e => upd('policyNo', e.target.value)} /></div>
                  {!isUAE && <div><label className="text-[13px] text-content-secondary block mb-1">Group Number</label><input className={ic} value={form.groupNo} onChange={e => upd('groupNo', e.target.value)} /></div>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Member ID</label><input className={ic} value={form.memberId} onChange={e => upd('memberId', e.target.value)} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Copay Amount</label><input type="number" className={ic} placeholder="0.00" value={form.copay} onChange={e => upd('copay', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Relationship to Subscriber</label>
                    <select className={ic} value={form.relationship} onChange={e => upd('relationship', e.target.value)}><option>Self</option><option>Spouse</option><option>Child</option><option>Other</option></select></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Subscriber Name (if not self)</label><input className={ic} value={form.subscriberName} onChange={e => upd('subscriberName', e.target.value)} /></div>
                </div>
                <div><label className="text-[13px] text-content-secondary block mb-1">Subscriber DOB (if not self)</label><input type="date" className={ic} value={form.subscriberDob} onChange={e => upd('subscriberDob', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Front', 'Back'] as const).map(side => {
                    const key = `insuranceCard${side}` as 'insuranceCardFront' | 'insuranceCardBack'
                    const preview = form[key] as string | undefined
                    return (
                      <div key={side}>
                        <label className="text-[11px] text-content-tertiary block mb-1">Card {side}</label>
                        {preview ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-separator">
                            <img src={preview} alt={`Card ${side}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => upd(key, '')}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[11px] hover:bg-[#065E76]/80">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="block w-full border border-dashed border-separator rounded-lg py-3 text-center text-[13px] text-content-secondary cursor-pointer hover:border-brand/30 hover:text-brand transition-all">
                            <Upload size={14} className="mx-auto mb-1" />
                            Upload {side}
                            <input type="file" accept="image/*,application/pdf" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const reader = new FileReader()
                                reader.onload = ev => upd(key, ev.target?.result as string)
                                reader.readAsDataURL(file)
                              }} />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── SECONDARY INSURANCE ── */}
          <div>
            <SectionHeader title="Secondary Insurance" badge="(optional)" open={sections.secondary} onToggle={() => toggle('secondary')} />
            {sections.secondary && (
              <div className="space-y-3 pt-1">
                <div><label className="text-[13px] text-content-secondary block mb-1">Insurance Payer</label><input className={ic} placeholder={isUAE ? 'e.g. Daman, NAS...' : 'e.g. Aetna, UHC...'} value={form.secPayer} onChange={e => upd('secPayer', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Policy Number</label><input className={ic} value={form.secPolicyNo} onChange={e => upd('secPolicyNo', e.target.value)} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Member ID</label><input className={ic} value={form.secMemberId} onChange={e => upd('secMemberId', e.target.value)} /></div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Name</label><input className={ic} value={form.ecName} onChange={e => upd('ecName', e.target.value)} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Relationship</label>
                    <select className={ic} value={form.ecRelationship} onChange={e => upd('ecRelationship', e.target.value)}><option value="">Select</option><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Child</option><option>Friend</option><option>Other</option></select></div>
                </div>
                <div><label className="text-[13px] text-content-secondary block mb-1">Phone</label><input type="tel" className={ic} value={form.ecPhone} onChange={e => upd('ecPhone', e.target.value)} /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── EMPLOYMENT ── */}
          <div>
            <SectionHeader title="Employment" badge="(optional)" open={sections.employment} onToggle={() => toggle('employment')} />
            {sections.employment && (
              <div className="space-y-3 pt-1">
                <div><label className="text-[13px] text-content-secondary block mb-1">Employment Status</label>
                  <select className={ic} value={form.empStatus} onChange={e => upd('empStatus', e.target.value)}><option>Employed</option><option>Self-Employed</option><option>Unemployed</option><option>Retired</option><option>Student</option></select></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Employer Name</label><input className={ic} value={form.employer} onChange={e => upd('employer', e.target.value)} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Occupation</label><input className={ic} value={form.occupation} onChange={e => upd('occupation', e.target.value)} /></div>
                </div>
                <div><label className="text-[13px] text-content-secondary block mb-1">Work Phone</label><input type="tel" className={ic} value={form.workPhone} onChange={e => upd('workPhone', e.target.value)} /></div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* ── MEDICAL QUICK INFO ── */}
          <div>
            <SectionHeader title="Medical Quick Info" badge="(optional)" open={sections.medical} onToggle={() => toggle('medical')} />
            {sections.medical && (
              <div className="space-y-3 pt-1">
                <div><label className="text-[13px] text-content-secondary block mb-1">Known Allergies</label><textarea className={`${ic} resize-none`} rows={2} placeholder="e.g. Penicillin, Sulfa drugs..." value={form.allergies} onChange={e => upd('allergies', e.target.value)} /></div>
                <div><label className="text-[13px] text-content-secondary block mb-1">Current Medications</label><textarea className={`${ic} resize-none`} rows={2} placeholder="List current medications..." value={form.medications} onChange={e => upd('medications', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[13px] text-content-secondary block mb-1">Referring Physician</label><input className={ic} value={form.referringPhysician} onChange={e => upd('referringPhysician', e.target.value)} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Primary Care Physician</label><input className={ic} value={form.pcp} onChange={e => upd('pcp', e.target.value)} /></div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-separator" />

          {/* Scan ID + Buttons */}
          <div>
            <button type="button" onClick={() => { toast.info('Go to Scan & Submit to capture ID'); setTimeout(() => router.push('/portal/scan-submit'), 800) }} className="w-full bg-surface-elevated border border-dashed border-separator rounded-lg py-3 text-[13px] text-content-secondary hover:border-brand/30 hover:text-brand transition-all flex items-center justify-center gap-2 mb-4">
              <Upload size={14} className="text-brand" />
              <span>📷 {isUAE ? 'Scan Emirates ID' : "Scan Driver's License"} to auto-fill demographics</span>
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 bg-surface-elevated border border-separator rounded-lg py-2.5 text-sm text-content-secondary hover:text-content-secondary transition-colors">Cancel</button>
              <button
                type="button"
                disabled={createPatient.loading}
                onClick={async () => {
                  if (!form.firstName || !form.lastName) {
                    toast.error('First name and last name are required')
                    return
                  }
                  if (!form.phone) {
                    toast.error('Phone number is required')
                    return
                  }
                  const result = await createPatient.mutate({
                    org_id: currentUser.organization_id,
                    client_id: selectedClient?.id ?? currentUser.organization_id,
                    first_name: form.firstName,
                    last_name: form.lastName,
                    dob: form.dob || undefined,
                    phone: form.phone,
                    email: form.email || undefined,
                    address: form.addressLine1 || undefined,
                    city: form.city || undefined,
                    state: form.stateEmirate || undefined,
                    zip: form.zip || undefined,
                    insurance_payer: form.insurancePayer || undefined,
                    insurance_member_id: form.memberId || undefined,
                    status: 'active' as const,
                  })
                  if (result) {
                    toast.success(`Patient ${form.firstName} ${form.lastName} added successfully`)
                    onSaved?.()
                    onClose()
                  } else {
                    toast.error('Failed to save patient — please try again')
                  }
                }}
                className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {createPatient.loading ? 'Saving…' : 'Save Patient'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type DetailTab = 'demographics' | 'address' | 'insurance' | 'emergency' | 'employment' | 'documents' | 'visits' | 'messages'

// ── Patient Messages Tab ───────────────────────────────────────────────────
function PatientMessagesTab({ patientId, clientId, patientName }: { patientId: string; clientId: string; patientName: string }) {
  const { currentUser } = useApp()
  const [msgInput, setMsgInput] = React.useState('')
  const { data: msgResult, refetch } = useMessages({ entity_id: patientId, entity_type: 'patient', limit: 50 })
  const sendMutation = useSendMessage()
  const apiMessages: any[] = msgResult?.data || []

  const handleSend = async () => {
    if (!msgInput.trim()) return
    const senderName = currentUser.name || currentUser.role
    await sendMutation.mutate({
      entity_type: 'patient', entity_id: patientId,
      client_id: clientId, subject: `Patient: ${patientName}`,
      body: msgInput.trim(), sender_name: senderName, sender_role: currentUser.role,
    } as any)
    setMsgInput('')
    refetch()
  }

  return (
    <div className="flex flex-col gap-3">
      {apiMessages.length === 0 ? (
        <div className="text-center py-6 text-[13px] text-content-secondary">No messages yet — start a conversation below.</div>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {apiMessages.map((m: any) => (
            <div key={m.id} className={`flex ${['client','provider'].includes(m.sender_role) ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${['client','provider'].includes(m.sender_role) ? 'bg-brand/10 border border-brand/20' : 'bg-surface-elevated border border-separator'}`}>
                <span className="font-medium block mb-0.5 text-[11px] text-content-secondary">{m.sender_name || m.sender_role}</span>
                <p className="text-content-primary">{m.body}</p>
                <span className="text-[9px] text-content-tertiary mt-1 block">{new Date(m.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 border-t border-separator pt-3">
        <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && msgInput.trim()) handleSend() }}
          placeholder="Message back office about this patient…"
          className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-[13px] text-content-secondary placeholder:text-content-tertiary" />
        <button onClick={handleSend} className="px-3 py-1.5 bg-brand text-white rounded-lg text-[13px] font-medium hover:bg-brand-deep transition-colors">Send</button>
      </div>
    </div>
  )
}

function PatientDetailDrawer({ patient, onClose }: { patient: DemoPatient; onClose: () => void }) {
  const { country } = useApp()
  const { toast } = useToast()
  const router = useRouter()
  const updatePatient = useUpdatePatient(patient.id)
  const [tab, setTab] = useState<DetailTab>('demographics')
  const [editMode, setEditMode] = useState(false)
  const [localPatient, setLocalPatient] = useState(patient)
  const isUAE = country === 'uae' || !!localPatient.emiratesId
  const profileComplete = computeProfileComplete(patient)

  const [editForm, setEditForm] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dob || '',
    gender: patient.gender || '',
    phone: patient.phone,
    email: patient.email || '',
    emiratesId: patient.emiratesId || '',
    ssn: patient.ssn || '',
  })
  const upd = (k: keyof typeof editForm, v: string) => setEditForm(p => ({ ...p, [k]: v }))

  const [editAddress, setEditAddress] = useState({
    line1: localPatient.address?.line1 || '',
    line2: localPatient.address?.line2 || '',
    city: localPatient.address?.city || '',
    state: localPatient.address?.state || '',
    zip: localPatient.address?.zip || '',
  })
  const [editEmergency, setEditEmergency] = useState({
    name: localPatient.emergencyContact?.name || '',
    relationship: localPatient.emergencyContact?.relationship || '',
    phone: localPatient.emergencyContact?.phone || '',
  })

  const tabs: DetailTab[] = ['demographics', 'address', 'insurance', 'emergency', 'employment', 'documents', 'visits', 'messages']

  async function handleSave() {
    // Optimistically update local state
    setLocalPatient(prev => ({
      ...prev,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      dob: editForm.dob,
      gender: editForm.gender,
      phone: editForm.phone,
      email: editForm.email,
      emiratesId: editForm.emiratesId,
      ssn: editForm.ssn,
      address: editAddress.line1 ? {
        line1: editAddress.line1,
        line2: editAddress.line2,
        city: editAddress.city,
        state: editAddress.state,
        zip: editAddress.zip,
        country: '',
      } : prev.address,
      emergencyContact: editEmergency.name ? {
        name: editEmergency.name,
        relationship: editEmergency.relationship,
        phone: editEmergency.phone,
      } : prev.emergencyContact,
    }))
    setEditMode(false)

    // Call real API
    try {
      await updatePatient.mutate({
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        dob: editForm.dob || undefined,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        address: editAddress.line1 || undefined,
        city: editAddress.city || undefined,
        state: editAddress.state || undefined,
        zip: editAddress.zip || undefined,
      })
      toast.success('Patient record saved ✓')
    } catch {
      toast.error('Save failed — changes kept locally')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-sm">
              {localPatient.firstName[0]}{localPatient.lastName[0]}
            </div>
            <div>
              <h2 className="font-semibold text-content-primary">{localPatient.firstName} {localPatient.lastName}</h2>
              <span className="text-[13px] text-content-secondary">{toMRN(patient.id)} • {isUAE ? '🇦🇪 UAE' : '🇺🇸 US'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 rounded-full bg-surface-elevated">
                <div className={`h-full rounded-full ${completenessColor(profileComplete)}`} style={{ width: `${profileComplete}%` }} />
              </div>
              <span className="text-[11px] text-content-secondary">{profileComplete}%</span>
            </div>
            <button
              onClick={() => { if (editMode) handleSave(); else setEditMode(true) }}
              className={`p-1.5 rounded-btn transition-colors ${editMode ? 'bg-brand text-white' : 'hover:bg-surface-elevated text-content-secondary'}`}
              title={editMode ? 'Save changes' : 'Edit patient'}>
              {editMode ? <Check size={15}/> : <Pencil size={15}/>}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn text-content-secondary hover:text-content-primary">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-separator pb-1 overflow-x-auto shrink-0">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 whitespace-nowrap transition-all ${tab === t ? 'border-brand text-brand' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {tab === 'demographics' && (
            <div className="space-y-3">
              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-[13px] text-content-secondary block mb-1">First Name</label>
                      <input className={ic} value={editForm.firstName} onChange={e => upd('firstName', e.target.value)} /></div>
                    <div><label className="text-[13px] text-content-secondary block mb-1">Last Name</label>
                      <input className={ic} value={editForm.lastName} onChange={e => upd('lastName', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-[13px] text-content-secondary block mb-1">Date of Birth</label>
                      <input type="date" className={ic} value={editForm.dob} onChange={e => upd('dob', e.target.value)} /></div>
                    <div><label className="text-[13px] text-content-secondary block mb-1">Gender</label>
                      <select className={ic} value={editForm.gender} onChange={e => upd('gender', e.target.value)}>
                        <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                      </select></div>
                  </div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Phone</label>
                    <input type="tel" className={ic} value={editForm.phone} onChange={e => upd('phone', e.target.value)} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Email</label>
                    <input type="email" className={ic} value={editForm.email} onChange={e => upd('email', e.target.value)} /></div>
                  {isUAE
                    ? <div><label className="text-[13px] text-content-secondary block mb-1">Emirates ID</label>
                        <input className={ic} value={editForm.emiratesId} onChange={e => upd('emiratesId', e.target.value)} /></div>
                    : <div><label className="text-[13px] text-content-secondary block mb-1">SSN</label>
                        <input className={ic} value={editForm.ssn} onChange={e => upd('ssn', e.target.value)} /></div>
                  }
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium">Save Changes</button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2.5 border border-separator rounded-lg text-sm text-content-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span className="text-[13px] text-content-secondary block">Name</span><span>{localPatient.firstName} {localPatient.middleName ? localPatient.middleName + ' ' : ''}{localPatient.lastName}</span></div>
                    <div><span className="text-[13px] text-content-secondary block">DOB</span><span>{formatDOB(localPatient.dob)}</span></div>
                    <div><span className="text-[13px] text-content-secondary block">Gender</span><span>{localPatient.gender || '—'}</span></div>
                    <div><span className="text-[13px] text-content-secondary block">Marital Status</span><span>{localPatient.maritalStatus || '—'}</span></div>
                    <div><span className="text-[13px] text-content-secondary block">Phone</span><span>{localPatient.phone}</span></div>
                    {localPatient.secondaryPhone && <div><span className="text-[13px] text-content-secondary block">Secondary Phone</span><span>{localPatient.secondaryPhone}</span></div>}
                    <div><span className="text-[13px] text-content-secondary block">Email</span><span>{localPatient.email || '—'}</span></div>
                    <div><span className="text-[13px] text-content-secondary block">Preferred Language</span><span>{localPatient.preferredLanguage || '—'}</span></div>
                    {isUAE && <div><span className="text-[13px] text-content-secondary block">Emirates ID</span><span>{localPatient.emiratesId || '—'}</span></div>}
                    {!isUAE && <div><span className="text-[13px] text-content-secondary block">SSN</span><span>{localPatient.ssn || '—'}</span></div>}
                    {!isUAE && localPatient.driversLicense && <div><span className="text-[13px] text-content-secondary block">Driver&apos;s License</span><span>{localPatient.driversLicense}</span></div>}
                  </div>
                  {localPatient.allergies && localPatient.allergies.length > 0 && (
                    <div className="bg-[#065E76]/5 border border-[#065E76]/20 rounded-lg p-2 text-xs">
                      <span className="text-content-secondary">Allergies: </span>{localPatient.allergies.join(', ')}
                    </div>
                  )}
                  {localPatient.noShowCount && localPatient.noShowCount >= 3 && (
                    <div className="bg-[#065E76]/10 border border-[#065E76]/20 rounded-lg p-2 text-xs text-[#065E76] dark:text-[#065E76]">⚠ {localPatient.noShowCount} no-shows on record</div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'address' && (
            <div className="p-4 space-y-3">
              {editMode ? (
                <>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Address Line 1</label>
                    <input className={ic} value={editAddress.line1} onChange={e => setEditAddress(p => ({...p, line1: e.target.value}))} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Address Line 2</label>
                    <input className={ic} value={editAddress.line2} onChange={e => setEditAddress(p => ({...p, line2: e.target.value}))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[13px] text-content-secondary block mb-1">City</label>
                      <input className={ic} value={editAddress.city} onChange={e => setEditAddress(p => ({...p, city: e.target.value}))} /></div>
                    <div><label className="text-[13px] text-content-secondary block mb-1">State / Emirate</label>
                      <input className={ic} value={editAddress.state} onChange={e => setEditAddress(p => ({...p, state: e.target.value}))} /></div>
                  </div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">ZIP / Postal</label>
                    <input className={ic} value={editAddress.zip} onChange={e => setEditAddress(p => ({...p, zip: e.target.value}))} /></div>
                </>
              ) : localPatient.address?.line1 ? (
                <div className="text-sm space-y-1 text-content-primary">
                  <div>{localPatient.address.line1}</div>
                  {localPatient.address.line2 && <div>{localPatient.address.line2}</div>}
                  <div>{localPatient.address.city}, {localPatient.address.state} {localPatient.address.zip}</div>
                </div>
              ) : (
                <div className="text-center py-8 text-[13px] text-content-secondary">
                  No address on file. <button onClick={() => setEditMode(true)} className="ml-1 text-brand underline">Add address</button>
                </div>
              )}
            </div>
          )}

          {tab === 'insurance' && (
            <div className="space-y-3">
              {localPatient.insurance ? (
                <div className="bg-surface-elevated border border-separator rounded-lg p-3">
                  <div className="text-[13px] text-content-secondary mb-2">Primary Insurance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-content-secondary">Payer:</span> {localPatient.insurance.payer}</div>
                    <div><span className="text-content-secondary">Policy:</span> {localPatient.insurance.policyNo}</div>
                    {localPatient.insurance.groupNo && <div><span className="text-content-secondary">Group:</span> {localPatient.insurance.groupNo}</div>}
                    <div><span className="text-content-secondary">Member ID:</span> {localPatient.insurance.memberId}</div>
                    {localPatient.insurance.relationship && <div><span className="text-content-secondary">Relationship:</span> {localPatient.insurance.relationship}</div>}
                    {localPatient.insurance.copay !== undefined && <div><span className="text-content-secondary">Copay:</span> {isUAE ? 'AED' : '$'}{localPatient.insurance.copay}</div>}
                  </div>
                </div>
              ) : <div className="text-center py-6 text-[13px] text-content-secondary">No insurance on file. <button onClick={() => router.push('/portal/scan-submit')} className="text-brand underline">Upload insurance card</button></div>}
              {localPatient.insurance && (
                <button onClick={() => { onClose(); router.push(`/eligibility?patientId=${localPatient.id}`) }}
                  className="w-full flex items-center justify-center gap-2 bg-brand text-white border border-brand/20 rounded-lg py-2 text-[12px] font-medium hover:bg-brand/20 transition-colors">
                  Run Eligibility Check →
                </button>
              )}
              {localPatient.secondaryInsurance && (
                <div className="bg-surface-elevated border border-separator rounded-lg p-3">
                  <div className="text-[13px] text-content-secondary mb-2">Secondary Insurance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-content-secondary">Payer:</span> {localPatient.secondaryInsurance.payer}</div>
                    <div><span className="text-content-secondary">Policy:</span> {localPatient.secondaryInsurance.policyNo}</div>
                    <div><span className="text-content-secondary">Member ID:</span> {localPatient.secondaryInsurance.memberId}</div>
                  </div>
                </div>
              )}
              <button type="button" onClick={() => router.push('/portal/scan-submit')} className="w-full bg-surface-elevated border border-dashed border-separator rounded-lg py-3 text-[13px] text-content-secondary hover:border-brand/30">
                <Upload size={14} className="inline mr-1"/> Scan insurance card to auto-fill
              </button>
            </div>
          )}

          {tab === 'emergency' && (
            <div className="p-4 space-y-3">
              {editMode ? (
                <>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Contact Name</label>
                    <input className={ic} value={editEmergency.name} onChange={e => setEditEmergency(p => ({...p, name: e.target.value}))} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Relationship</label>
                    <input className={ic} value={editEmergency.relationship} onChange={e => setEditEmergency(p => ({...p, relationship: e.target.value}))} /></div>
                  <div><label className="text-[13px] text-content-secondary block mb-1">Phone</label>
                    <input className={ic} value={editEmergency.phone} onChange={e => setEditEmergency(p => ({...p, phone: e.target.value}))} /></div>
                </>
              ) : localPatient.emergencyContact?.name ? (
                <div className="text-sm space-y-1 text-content-primary">
                  <div className="font-medium">{localPatient.emergencyContact.name}</div>
                  <div className="text-content-secondary">{localPatient.emergencyContact.relationship}</div>
                  <div>{localPatient.emergencyContact.phone}</div>
                </div>
              ) : (
                <div className="text-center py-8 text-[13px] text-content-secondary">
                  No emergency contact on file. <button onClick={() => setEditMode(true)} className="ml-1 text-brand underline">Add contact</button>
                </div>
              )}
            </div>
          )}

          {tab === 'employment' && (
            <div>
              {localPatient.employment ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><span className="text-[13px] text-content-secondary block">Status</span><span>{localPatient.employment.status}</span></div>
                  {localPatient.employment.occupation && <div><span className="text-[13px] text-content-secondary block">Occupation</span><span>{localPatient.employment.occupation}</span></div>}
                  {localPatient.employment.employer && <div><span className="text-[13px] text-content-secondary block">Employer</span><span>{localPatient.employment.employer}</span></div>}
                  {localPatient.employment.workPhone && <div><span className="text-[13px] text-content-secondary block">Work Phone</span><span>{localPatient.employment.workPhone}</span></div>}
                </div>
              ) : <div className="text-center py-8 text-[13px] text-content-secondary">No employment info on file.</div>}
            </div>
          )}

          {tab === 'documents' && <PatientDocumentsTab patientId={localPatient.id} patientName={`${localPatient.firstName} ${localPatient.lastName}`} />}
          {tab === 'visits' && <div className="text-center py-8 text-[13px] text-content-secondary">No visit history yet.</div>}
          {tab === 'messages' && (
            <PatientMessagesTab patientId={localPatient.id} clientId={localPatient.clientId} patientName={`${localPatient.firstName} ${localPatient.lastName}`} />
          )}
        </div>
      </div>
    </>
  )
}

function PatientDocumentsTab({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    api.get('/documents', { patient_id: patientId, limit: 50 })
      .then((res: any) => { if (!cancelled) setDocs(Array.isArray(res) ? res : res?.data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [patientId])

  if (loading) return <div className="text-center py-8 text-[13px] text-content-secondary">Loading documents…</div>
  if (docs.length === 0) return (
    <div className="text-center py-8">
      <p className="text-[13px] text-content-secondary mb-2">No documents linked to {patientName} yet.</p>
      <button onClick={() => window.location.href = '/portal/scan-submit'} className="text-xs text-brand hover:underline">Upload via Scan & Submit →</button>
    </div>
  )
  return (
    <div className="space-y-2">
      {docs.map((d: any) => (
        <div key={d.id} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={14} className="text-brand shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{d.file_name || 'document'}</p>
              <p className="text-[11px] text-content-tertiary">{d.doc_type || d.document_type || 'Other'} · {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</p>
            </div>
          </div>
          <button onClick={async () => {
            try {
              const res = await api.get<{ download_url: string }>(`/documents/${d.id}/download`)
              window.open(res.download_url, '_blank', 'noopener')
            } catch {}
          }} className="text-[11px] text-brand hover:underline shrink-0">Download</button>
        </div>
      ))}
    </div>
  )
}

export default function PatientsPage() {
  const { currentUser, selectedClient } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<DemoPatient | null>(null)

  const { data: apiResult, loading: apiLoading, error: apiError, refetch } = usePatients(
    search ? { search, limit: 50 } : { limit: 50 }
  )

  const isClinic = currentUser.role === 'client' || currentUser.role === 'provider'
  // For clinic roles (Doctor/Front Desk), the Lambda already applies org-level RLS scoping,
  // so we show all returned patients. For back-office staff, filter by selected client.
  const clientFilter = isClinic ? null : selectedClient?.id

  const apiPatients = apiResult?.data
    ? apiResult.data.map(apiPatientToDemoPatient)
    : null

  const patients: DemoPatient[] = apiPatients
    ? (clientFilter ? apiPatients.filter(p => p.clientId === clientFilter) : apiPatients)
    : []

  return (
    <ModuleShell title={t("patients","title")} subtitle="Manage patient records"
      actions={<button onClick={() => setShowAdd(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep"><Plus size={16}/>Add Patient</button>}>
      {apiError && <ErrorBanner error={apiError} onRetry={refetch} />}
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, ID..."
          className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-4 py-2 text-sm text-content-secondary placeholder:text-content-tertiary outline-none focus:border-brand/40 transition-colors"/>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]">
          <thead><tr className="border-b border-separator text-[13px] text-content-secondary">
            <th className="text-left px-4 py-3">Patient {apiResult ? <span className="text-brand font-normal">(live)</span> : null}</th>
            <th className="text-left px-4 py-3">MRN</th>
            <th className="text-left px-4 py-3">DOB</th>
            <th className="text-left px-4 py-3">Phone</th>
            <th className="text-left px-4 py-3">Insurance</th>
            <th className="text-left px-4 py-3">Profile</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{apiLoading ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-content-tertiary">Loading patients…</td></tr>
          ) : patients.length === 0 ? (
            <tr><td colSpan={7}>
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                  <Users size={20} className='text-content-tertiary' />
                </div>
                <p className='text-sm font-medium text-content-primary mb-1'>No patients yet</p>
                <p className='text-[13px] text-content-secondary'>Patients will appear here once they&apos;re added to the system.</p>
              </div>
            </td></tr>
          ) : patients.map(p => (
            <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-separator last:border-0 table-row cursor-pointer transition-all">
              <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[11px] font-bold">{p.firstName[0]}{p.lastName[0]}</div><div className="font-medium">{p.firstName} {p.lastName}</div></div></td>
              <td className="px-4 py-3 text-[13px] text-content-secondary font-mono">{toMRN(p.id)}</td>
              <td className="px-4 py-3 text-content-secondary text-xs">{formatDOB(p.dob)}</td>
              <td className="px-4 py-3 text-content-secondary">{p.phone}</td>
              <td className="px-4 py-3 text-content-secondary text-xs">{p.insurance?.payer || <span className="text-brand-deep dark:text-brand-deep">Not on file</span>}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><div className="w-12 h-1.5 rounded-full bg-surface-elevated"><div className={`h-full rounded-full ${completenessColor(computeProfileComplete(p))}`} style={{ width: `${computeProfileComplete(p)}%` }}/></div><span className="text-[11px] text-content-secondary">{computeProfileComplete(p)}%</span></div></td>
              <td className="px-4 py-3"><StatusBadge status={p.status} small/></td>
            </tr>
          ))
          }</tbody>
        </table></div>
      </div>
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onSaved={refetch}/>}
      {selected && <PatientDetailDrawer patient={selected} onClose={() => setSelected(null)}/>}

      {/* ── Patient Statements ── */}
      <div className="card p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Patient Statements</h3>
          {['admin', 'manager', 'biller', 'ar_team'].includes(currentUser.role) && <button onClick={async () => { try { await api.post('/reports/batch-statements', {}); toast.success('Batch statements queued — check Documents when ready') } catch { toast.error('Failed to generate statements — try again') } }} className="text-[13px] bg-brand/10 text-brand px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors">Generate Batch Statements</button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[{label:'Outstanding Balances',value:`$${(patients.length * 127).toLocaleString()}`,color:'text-brand-deep'},
            {label:'Statements Sent',value:Math.round(patients.length * 0.6),color:'text-brand'},
            {label:'Payment Plans Active',value:Math.round(patients.length * 0.15),color:'text-brand-dark'},
            {label:'Avg Days to Collect',value:'34d',color:'text-content-primary'}
          ].map(k=>
            <div key={k.label} className="bg-surface-elevated rounded-lg p-3">
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[11px] text-content-tertiary">{k.label}</p>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
