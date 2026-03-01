'use client'
import React from 'react'

const colors: Record<string, string> = {
  booked: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checked_in: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  no_show: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  rescheduled: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  walk_in: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  late: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  scrubbing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  scrub_failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  ready: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  accepted: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  in_process: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  partial_pay: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  denied: 'bg-red-500/10 text-red-400 border-red-500/20',
  appealed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  corrected: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  write_off: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  blocked: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  received: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_coding: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  claim_submitted: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const c = colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`inline-flex items-center border rounded-full font-medium whitespace-nowrap ${c} ${small ? 'text-[10px] px-1.5 py-0' : 'text-[11px] px-2 py-0.5'}`}>
      {label}
    </span>
  )
}
