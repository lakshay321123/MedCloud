'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoAppointments, demoPatients, getClientName } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { Plus, Calendar, AlertTriangle } from 'lucide-react'

const staffRoles = ['admin','director','supervisor','manager','coder','biller','ar_team','posting_team']

export default function AppointmentsPage() {
  const { currentUser, selectedClient } = useApp()
  const isStaff = staffRoles.includes(currentUser.role)
  const isClinic = currentUser.role === 'client' || currentUser.role === 'provider'
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const clientFilter = isClinic ? 'org-102' : selectedClient?.id
  const apts = demoAppointments.filter(a => {
    if (clientFilter && a.clientId !== clientFilter) return false
    if (statusFilter && a.status !== statusFilter) return false
    return true
  })

  const today = apts.filter(a => a.date === '2026-03-02')
  const stats = {
    total: today.length,
    checkedIn: today.filter(a => ['checked_in','in_progress','completed'].includes(a.status)).length,
    completed: today.filter(a => a.status === 'completed').length,
    noShows: today.filter(a => a.status === 'no_show').length,
    cancelled: today.filter(a => a.status === 'cancelled').length,
  }

  // Check for completed visits missing superbills (for staff)
  const missingDocs = isStaff ? apts.filter(a => a.status === 'completed' && a.date < '2026-03-01') : []

  return (
    <ModuleShell title="Appointments" subtitle={isStaff ? 'View client appointments and visit status' : 'Manage your schedule'}
      actions={isClinic ? <button onClick={()=>setShowAdd(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep"><Plus size={16}/>Book Appointment</button> : undefined}>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="card px-3 py-2 text-center">
          <div className="text-lg font-bold">{stats.total}</div><div className="text-[10px] text-content-secondary">Today</div>
        </div>
        <div className="card px-3 py-2 text-center">
          <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{stats.checkedIn}</div><div className="text-[10px] text-content-secondary">Checked In</div>
        </div>
        <div className="card px-3 py-2 text-center">
          <div className="text-lg font-bold text-emerald-600 text-emerald-600 dark:text-emerald-400">{stats.completed}</div><div className="text-[10px] text-content-secondary">Completed</div>
        </div>
        <div className="card px-3 py-2 text-center">
          <div className="text-lg font-bold text-red-600 text-red-600 dark:text-red-400">{stats.noShows}</div><div className="text-[10px] text-content-secondary">No-Shows</div>
        </div>
        <div className="card px-3 py-2 text-center">
          <div className="text-lg font-bold text-gray-400">{stats.cancelled}</div><div className="text-[10px] text-content-secondary">Cancelled</div>
        </div>
      </div>

      {/* Missing docs alert (staff only) */}
      {missingDocs.length > 0 && isStaff && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-xs text-amber-600 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={14}/> {missingDocs.length} completed visit(s) with no superbill uploaded after 48h
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
          <option value="">All Statuses</option>
          {['booked','confirmed','checked_in','in_progress','completed','no_show','cancelled','rescheduled','walk_in'].map(s=>(
            <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="text-left px-4 py-3">Time</th>
            <th className="text-left px-4 py-3">Patient</th>
            {isStaff && <th className="text-left px-4 py-3">Client</th>}
            <th className="text-left px-4 py-3">Provider</th>
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Duration</th>
            <th className="text-left px-4 py-3">Status</th>
            {isClinic && <th className="text-left px-4 py-3">Actions</th>}
          </tr></thead>
          <tbody>{apts.map(a=>(
            <tr key={a.id} className="border-b border-separator last:border-0 table-row transition-all">
              <td className="px-4 py-3 font-mono text-xs">{a.date === '2026-03-02' ? a.time : <span className="text-content-secondary">{a.date} {a.time}</span>}</td>
              <td className="px-4 py-3 font-medium">{a.patientName}</td>
              {isStaff && <td className="px-4 py-3 text-xs text-content-secondary">{getClientName(a.clientId)}</td>}
              <td className="px-4 py-3 text-content-secondary">{a.provider}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{a.type}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{a.duration}m</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} small/></td>
              {isClinic && (
                <td className="px-4 py-3">
                  {a.status === 'booked' && <button className="text-[10px] text-brand hover:underline">Check In</button>}
                  {a.status === 'confirmed' && <button className="text-[10px] text-brand hover:underline">Check In</button>}
                  {a.status === 'checked_in' && <button className="text-[10px] text-brand hover:underline">Start Visit</button>}
                  {a.status === 'in_progress' && <button className="text-[10px] text-emerald-600 text-emerald-600 dark:text-emerald-400 hover:underline">Complete</button>}
                </td>
              )}
            </tr>
          ))}</tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setShowAdd(false)}>
          <div className="card w-[440px] p-4" onClick={e=>e.stopPropagation()}>
            <h2 className="font-semibold mb-4">Book Appointment</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-content-secondary block mb-1">Patient *</label>
                <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                  <option value="">Search patient...</option>
                  {demoPatients.filter(p=>p.clientId==='org-102').map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-content-secondary block mb-1">Date *</label><input type="date" defaultValue="2026-03-03" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/></div>
                <div><label className="text-xs text-content-secondary block mb-1">Time *</label><input type="time" defaultValue="09:00" className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary"/></div>
              </div>
              <div><label className="text-xs text-content-secondary block mb-1">Provider</label><input className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary" defaultValue="Dr. Martinez"/></div>
              <div><label className="text-xs text-content-secondary block mb-1">Visit Type</label>
                <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary">
                  <option>Follow-up</option><option>New Patient</option><option>Consultation</option><option>Procedure</option><option>Telehealth</option>
                </select>
              </div>
              <div><label className="text-xs text-content-secondary block mb-1">Notes</label><input className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary" placeholder="Optional notes..."/></div>
              <div className="flex gap-2">
                <button onClick={()=>setShowAdd(false)} className="flex-1 bg-surface-elevated border border-separator rounded-lg py-2 text-sm text-content-secondary">Cancel</button>
                <button onClick={()=>setShowAdd(false)} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium">Book</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}
