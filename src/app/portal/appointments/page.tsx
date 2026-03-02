'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoAppointments, getClientName } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { Plus, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import NewAppointmentModal from './NewAppointmentModal'

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
  not_checked: { color: 'bg-gray-400', label: '? Not Checked' },
}

export default function AppointmentsPage() {
  const { currentUser, selectedClient } = useApp()
  const { toast } = useToast()
  const isStaff = staffRoles.includes(currentUser.role)
  const isClinic = currentUser.role === 'client' || currentUser.role === 'provider'
  const [selectedDate, setSelectedDate] = useState('2026-03-02')
  const [showAdd, setShowAdd] = useState(false)

  const clientFilter = isClinic ? 'org-102' : selectedClient?.id
  const dayApts = demoAppointments.filter(a => {
    if (clientFilter && a.clientId !== clientFilter) return false
    if (a.date !== selectedDate) return false
    return true
  })

  const stats = {
    total: demoAppointments.filter(a => a.date === '2026-03-02' && (!clientFilter || a.clientId === clientFilter)).length,
    checkedIn: demoAppointments.filter(a => a.date === '2026-03-02' && ['checked_in','in_progress','completed'].includes(a.status) && (!clientFilter || a.clientId === clientFilter)).length,
    completed: demoAppointments.filter(a => a.date === '2026-03-02' && a.status === 'completed' && (!clientFilter || a.clientId === clientFilter)).length,
    noShows: demoAppointments.filter(a => a.date === '2026-03-02' && a.status === 'no_show' && (!clientFilter || a.clientId === clientFilter)).length,
  }

  const missingDocs = isStaff ? demoAppointments.filter(a =>
    a.status === 'completed' &&
    a.date < '2026-03-01' &&
    (!clientFilter || a.clientId === clientFilter)
  ) : []

  // Assign fake eligibility for demo
  const eligMap: Record<string, keyof typeof eligibilityConfig> = {
    'APT-001': 'verified', 'APT-002': 'verified', 'APT-003': 'inactive', 'APT-004': 'not_checked',
    'APT-005': 'verified', 'APT-006': 'not_checked', 'APT-009': 'not_checked',
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
            const elig = eligMap[a.id] ?? 'not_checked'
            const ec = eligibilityConfig[elig]
            return (
              <div key={a.id} className="card p-4 flex items-center gap-4">
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
                    <StatusBadge status={a.status} small/>
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
                  <button onClick={()=>toast.info(`Viewing ${a.patientName}`)}
                    className="text-[10px] px-2.5 py-1.5 border border-separator text-content-secondary rounded hover:text-content-primary transition-colors">View</button>
                  {['booked','confirmed'].includes(a.status) && (
                    <button onClick={()=>toast.success(`${a.patientName} checked in`)}
                      className="text-[10px] px-2.5 py-1.5 bg-brand/10 text-brand border border-brand/20 rounded hover:bg-brand/20 transition-colors">Check In</button>
                  )}
                  {['booked','confirmed','checked_in'].includes(a.status) && (
                    <button onClick={()=>toast.warning(`${a.patientName} marked no-show`)}
                      className="text-[10px] px-2.5 py-1.5 border border-separator text-content-secondary rounded hover:text-red-500 hover:border-red-500/30 transition-colors">No Show</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && <NewAppointmentModal onClose={()=>setShowAdd(false)}/>}
    </ModuleShell>
  )
}
