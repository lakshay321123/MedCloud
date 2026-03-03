'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoAppointments, demoPatients, getClientName } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, X, Mic, ShieldCheck } from 'lucide-react'
import NewAppointmentModal from './NewAppointmentModal'
import { useAppointments } from '@/lib/hooks'
import type { ApiAppointment } from '@/lib/hooks'
import type { AppointmentStatus } from '@/types'
import { formatDOB } from '@/lib/utils/region'

function apiAppointmentToDemo(a: ApiAppointment) {
  return {
    id: a.id,
    patientId: '',
    patientName: a.patient_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown Patient',
    time: a.appointment_time || '09:00',
    duration: 30,
    provider: a.provider_name || '',
    type: a.appointment_type || 'Office Visit',
    status: (a.status || 'booked') as AppointmentStatus,
    clientId: a.client_id,
    date: a.appointment_date || '',
  }
}

const staffRoles = ['admin','director','supervisor','manager','coder','biller','ar_team','posting_team']

// ─── Mini Calendar ────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect }: { selectedDate: string; onSelect: (d: string) => void }) {
  const [viewDate, setViewDate] = useState(new Date('2026-03-02'))
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const apptDates = new Set(demoAppointments.map(a => a.date))

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-surface-elevated rounded transition-colors"><ChevronLeft size={14}/></button>
        <span className="text-xs font-semibold text-content-primary">{monthName}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-surface-elevated rounded transition-colors"><ChevronRight size={14}/></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-semibold text-content-tertiary py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const hasAppts = apptDates.has(dateStr)
          const isToday = dateStr === '2026-03-02'
          return (
            <button key={day} onClick={() => onSelect(dateStr)}
              className={`relative text-center text-[11px] py-1.5 rounded transition-all ${
                isSelected ? 'bg-brand text-white font-bold' :
                isToday ? 'border border-brand/40 text-brand font-semibold' :
                'hover:bg-surface-elevated text-content-secondary'
              }`}>
              {day}
              {hasAppts && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand rounded-full"/>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const eligibilityConfig = {
  verified: { color: 'bg-emerald-500', label: '✓ Verified' },
  inactive: { color: 'bg-amber-500', label: '⚠ Inactive' },
  not_checked: { color: 'bg-gray-400', label: 'Not Verified' },
}

// ─── Appointment Drawer ───────────────────────────────────────────────────
interface ApptDrawerProps {
  appt: {
    id: string; patientId: string; patientName: string; provider: string;
    time: string; type: string; status: AppointmentStatus; clientId: string; date: string; duration: number;
  }
  onClose: () => void
  currentUserRole: string
}

function AppointmentDrawer({ appt, onClose, currentUserRole }: ApptDrawerProps) {
  const { toast } = useToast()
  const isProvider = currentUserRole === 'provider'
  const isFrontDesk = currentUserRole === 'client'

  const patient = demoPatients.find(p => p.id === appt.patientId)

  const eligMap: Record<string, keyof typeof eligibilityConfig> = {
    'APT-001': 'verified', 'APT-002': 'verified', 'APT-003': 'inactive', 'APT-004': 'not_checked',
    'APT-005': 'verified', 'APT-006': 'not_checked', 'APT-009': 'not_checked',
  }
  const elig = eligMap[appt.id] ?? 'not_checked'
  const ec = eligibilityConfig[elig]

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-separator shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
              {appt.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold text-content-primary">{appt.patientName}</h3>
              <p className="text-xs text-content-secondary">{appt.time} · {appt.type} · {appt.provider}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn">
            <X size={16} className="text-content-secondary" />
          </button>
        </div>

        {/* Eligibility strip */}
        <div className={`px-4 py-2 flex items-center gap-2 text-xs ${
          elig === 'verified' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
          elig === 'inactive' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
          'bg-surface-elevated text-content-secondary'
        }`}>
          <span className={`w-2 h-2 rounded-full ${ec.color}`}/>
          Eligibility: {ec.label}
          {elig !== 'verified' && <button onClick={() => toast.info('Verifying eligibility...')} className="ml-auto text-brand underline text-[10px]">Verify Now</button>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Demographics */}
          {patient && (
            <div className="bg-surface-elevated rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-2">Patient Demographics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-content-tertiary block">DOB</span>{formatDOB(patient.dob)}</div>
                <div><span className="text-content-tertiary block">Gender</span>{patient.gender || '—'}</div>
                <div><span className="text-content-tertiary block">Phone</span>{patient.phone}</div>
                <div><span className="text-content-tertiary block">Insurance</span>{patient.insurance?.payer || '—'}</div>
              </div>
            </div>
          )}

          {/* Provider view: allergies, medications, history */}
          {(isProvider || staffRoles.includes(currentUserRole)) && patient && (
            <>
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-red-600 dark:text-red-400 mb-1">⚠ Allergies</div>
                  <div>{patient.allergies.join(', ')}</div>
                </div>
              )}
              {patient.medications && patient.medications.length > 0 && (
                <div className="bg-surface-elevated rounded-lg p-3 text-xs">
                  <div className="font-semibold text-content-secondary mb-1">Active Medications</div>
                  <ul className="space-y-0.5 text-content-primary">
                    {patient.medications.map((m, i) => <li key={i}>• {m}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* AI Scribe CTA — provider only */}
          {isProvider && (
            <button onClick={() => toast.info('Launching AI Scribe for this visit...')}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-brand-deep transition-colors">
              <Mic size={15}/> Start AI Scribe for this Visit
            </button>
          )}

          {/* Front desk: insurance + verify eligibility */}
          {isFrontDesk && patient?.insurance && (
            <div className="bg-surface-elevated rounded-lg p-3 text-xs space-y-2">
              <div className="font-semibold text-content-secondary mb-1">Insurance Details</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-content-tertiary block">Payer</span>{patient.insurance.payer}</div>
                <div><span className="text-content-tertiary block">Member ID</span>{patient.insurance.memberId}</div>
                <div><span className="text-content-tertiary block">Policy</span>{patient.insurance.policyNo}</div>
                {patient.insurance.copay !== undefined && <div><span className="text-content-tertiary block">Copay</span>${patient.insurance.copay}</div>}
              </div>
              <button onClick={() => toast.info('Eligibility verification initiated...')}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-brand/10 text-brand border border-brand/20 rounded-lg py-2 text-[12px] font-medium hover:bg-brand/20 transition-colors">
                <ShieldCheck size={13}/> Verify Eligibility
              </button>
            </div>
          )}

          {/* Visit history */}
          <div className="bg-surface-elevated rounded-lg p-3 text-xs">
            <div className="font-semibold text-content-secondary mb-2">Recent Visit History</div>
            <div className="space-y-1.5 text-content-secondary">
              <div className="flex justify-between"><span>Feb 25, 2026 — Follow-up</span><StatusBadge status="completed" small/></div>
              <div className="flex justify-between"><span>Jan 15, 2026 — Consultation</span><StatusBadge status="completed" small/></div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-surface-elevated rounded-lg p-3 text-xs">
            <div className="font-semibold text-content-secondary mb-1">Appointment Status</div>
            <StatusBadge status={appt.status}/>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-separator flex gap-2 shrink-0">
          {['booked','confirmed'].includes(appt.status) && (
            <button onClick={() => { toast.success(`${appt.patientName} checked in`); onClose() }}
              className="flex-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-lg py-2.5 text-sm font-medium hover:bg-cyan-500/20 transition-colors">
              Check In
            </button>
          )}
          {['booked','confirmed'].includes(appt.status) && (
            <button onClick={() => { toast.warning(`${appt.patientName} marked no-show`); onClose() }}
              className="flex-1 border border-separator rounded-lg py-2.5 text-sm text-content-secondary hover:text-red-500 hover:border-red-500/30 transition-colors">
              No Show
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 border border-separator rounded-lg text-sm text-content-secondary">
            Close
          </button>
        </div>
      </div>
    </>
  )
}

export default function AppointmentsPage() {
  const { currentUser, selectedClient } = useApp()
  const { toast } = useToast()
  const isStaff = staffRoles.includes(currentUser.role)
  const isClinic = currentUser.role === 'client' || currentUser.role === 'provider'
  const [selectedDate, setSelectedDate] = useState('2026-03-02')
  const [showAdd, setShowAdd] = useState(false)
  const [drawerAppt, setDrawerAppt] = useState<typeof demoAppointments[0] | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AppointmentStatus>>({})

  const { data: apiApptResult } = useAppointments({ limit: 50, sort: 'appointment_date', order: 'asc' })

  const clientFilter = isClinic ? currentUser.organization_id : selectedClient?.id

  const sourceAppointments = apiApptResult?.data
    ? apiApptResult.data.map(apiAppointmentToDemo)
    : demoAppointments

  const dayApts = sourceAppointments.filter(a => {
    if (clientFilter && a.clientId !== clientFilter) return false
    if (a.date !== selectedDate) return false
    return true
  }).map(a => ({ ...a, status: (statusOverrides[a.id] ?? a.status) as AppointmentStatus }))

  const stats = {
    total: apiApptResult?.meta?.total ?? sourceAppointments.filter(a =>
      a.date === selectedDate && (!clientFilter || a.clientId === clientFilter)
    ).length,
    checkedIn: dayApts.filter(a => ['checked_in', 'in_progress', 'completed'].includes(a.status as string)).length,
    completed: dayApts.filter(a => a.status === 'completed').length,
    noShows: dayApts.filter(a => a.status === 'no_show').length,
  }

  const missingDocs = isStaff ? demoAppointments.filter(a =>
    a.status === 'completed' &&
    a.date < '2026-03-01' &&
    (!clientFilter || a.clientId === clientFilter)
  ) : []

  const eligMap: Record<string, keyof typeof eligibilityConfig> = {
    'APT-001': 'verified', 'APT-002': 'verified', 'APT-003': 'inactive', 'APT-004': 'not_checked',
    'APT-005': 'verified', 'APT-006': 'not_checked', 'APT-009': 'not_checked',
  }

  function checkIn(apptId: string, patientName: string) {
    setStatusOverrides(prev => ({ ...prev, [apptId]: 'checked_in' }))
    toast.success(`${patientName} checked in`)
  }

  function markNoShow(apptId: string, patientName: string) {
    setStatusOverrides(prev => ({ ...prev, [apptId]: 'no_show' }))
    toast.warning(`${patientName} marked no-show`)
  }

  return (
    <ModuleShell title="Appointments" subtitle={isStaff ? 'View client appointments and visit status' : 'Manage your schedule'}
      actions={isClinic ? <button onClick={()=>setShowAdd(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep"><Plus size={16}/>Book Appointment</button> : undefined}>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="card px-3 py-2 text-center"><div className="text-lg font-bold">{stats.total}</div><div className="text-[10px] text-content-secondary">Today Total</div></div>
        <div className="card px-3 py-2 text-center"><div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{stats.checkedIn}</div><div className="text-[10px] text-content-secondary">Checked In</div></div>
        <div className="card px-3 py-2 text-center"><div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div><div className="text-[10px] text-content-secondary">Completed</div></div>
        <div className="card px-3 py-2 text-center"><div className="text-lg font-bold text-red-500">{stats.noShows}</div><div className="text-[10px] text-content-secondary">No-Shows</div></div>
      </div>

      {missingDocs.length > 0 && isStaff && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={14}/> {missingDocs.length} completed visit(s) with no superbill uploaded after 48h
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">
        {/* Mini calendar */}
        <div className="col-span-1">
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate}/>
        </div>

        {/* Appointment cards */}
        <div className="col-span-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-content-primary">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </h3>
            <span className="text-xs text-content-secondary">{dayApts.length} appointment{dayApts.length!==1?'s':''}</span>
          </div>

          {dayApts.length === 0 ? (
            <div className="card flex items-center justify-center py-16 text-content-secondary text-sm">
              No appointments for this date
            </div>
          ) : dayApts.map(a => {
            const currentStatus = a.status
            const elig = eligMap[a.id] ?? 'not_checked'
            const ec = eligibilityConfig[elig]
            const isCheckedIn = ['checked_in', 'in_progress', 'completed'].includes(currentStatus)
            const isNoShow = currentStatus === 'no_show'
            return (
              <div key={a.id} className={`card p-4 flex items-center gap-4 transition-all ${
                isCheckedIn ? 'border-cyan-500/30 bg-cyan-500/5' :
                isNoShow ? 'opacity-50 border-red-500/20' : ''
              }`}>
                {/* Time */}
                <div className="shrink-0 w-16 text-center">
                  <div className="text-base font-bold text-content-primary">{a.time}</div>
                  <div className="text-[10px] text-content-secondary">{a.duration}m</div>
                </div>

                <div className="w-px h-10 bg-separator"/>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-[11px] font-bold shrink-0">
                      {a.patientName.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <span className="text-sm font-semibold text-content-primary">{a.patientName}</span>
                    <StatusBadge status={currentStatus} small/>
                  </div>
                  <div className="flex items-center gap-3 ml-9">
                    <span className="text-[11px] text-content-secondary">{a.provider}</span>
                    <span className="text-[10px] bg-surface-elevated px-2 py-0.5 rounded border border-separator">{a.type}</span>
                    {isStaff && <span className="text-[10px] text-content-tertiary">{getClientName(a.clientId)}</span>}
                  </div>
                </div>

                {/* Eligibility */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${ec.color}`}/>
                  <span className="text-[11px] text-content-secondary">{ec.label}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setDrawerAppt(a as typeof demoAppointments[0])}
                    className="text-[10px] px-2.5 py-1.5 border border-separator text-content-secondary rounded hover:text-content-primary transition-colors">View</button>
                  {['booked','confirmed'].includes(currentStatus) && (
                    <button onClick={() => checkIn(a.id, a.patientName)}
                      className="text-[10px] px-2.5 py-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/20 transition-colors">Check In</button>
                  )}
                  {['booked','confirmed'].includes(currentStatus) && (
                    <button onClick={() => markNoShow(a.id, a.patientName)}
                      className="text-[10px] px-2.5 py-1.5 border border-separator text-content-secondary rounded hover:text-red-500 hover:border-red-500/30 transition-colors">No Show</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && <NewAppointmentModal onClose={()=>setShowAdd(false)}/>}
      {drawerAppt && (
        <AppointmentDrawer
          appt={{ ...drawerAppt, status: (statusOverrides[drawerAppt.id] ?? drawerAppt.status) as AppointmentStatus }}
          onClose={() => setDrawerAppt(null)}
          currentUserRole={currentUser.role}
        />
      )}
    </ModuleShell>
  )
}
