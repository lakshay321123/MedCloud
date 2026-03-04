'use client'
import React from 'react'

const styles: Record<string, { bg: string; text: string }> = {
  // Greens
  completed: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
  paid: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
  active: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
  resolved: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
  signed: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
  healthy: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
  // Blues
  confirmed: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 text-blue-600 dark:text-blue-400' },
  submitted: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 text-blue-600 dark:text-blue-400' },
  open: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 text-blue-600 dark:text-blue-400' },
  received: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 text-blue-600 dark:text-blue-400' },
  onboarding: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 text-blue-600 dark:text-blue-400' },
  // Cyan / Brand
  checked_in: { bg: 'bg-brand/10', text: 'text-brand-dark dark:text-brand-light' },
  ready: { bg: 'bg-brand/10', text: 'text-brand-dark dark:text-brand-light' },
  accepted: { bg: 'bg-brand/10', text: 'text-brand-dark dark:text-brand-light' },
  claim_submitted: { bg: 'bg-brand/10', text: 'text-brand-dark dark:text-brand-light' },
  walk_in: { bg: 'bg-brand/10', text: 'text-brand-dark dark:text-brand-light' },
  // Amber
  in_progress: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  scrubbing: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  in_process: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  pending_signoff: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  in_coding: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  medium: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  expiring: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  warning: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  blocked: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 text-amber-600 dark:text-amber-400' },
  late: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400' },
  partial_pay: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400' },
  // Red
  denied: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 text-red-600 dark:text-red-400' },
  no_show: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 text-red-600 dark:text-red-400' },
  scrub_failed: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 text-red-600 dark:text-red-400' },
  urgent: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 text-red-600 dark:text-red-400' },
  high: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400' },
  // Purple
  appealed: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-600 text-purple-600 dark:text-purple-400' },
  rescheduled: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-600 text-purple-600 dark:text-purple-400' },
  // Gray / Neutral
  booked: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400' },
  draft: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400' },
  cancelled: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-500 dark:text-gray-500' },
  inactive: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-500 dark:text-gray-500' },
  corrected: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400' },
  write_off: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-500 dark:text-gray-500' },
  low: { bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400' },
  // EDI-specific
  sent: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  parsed: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  error: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400' },
  rejected: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400' },
}

export default function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const s = styles[status] || styles.booked
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`inline-flex items-center rounded-pill font-semibold whitespace-nowrap ${s.bg} ${s.text} ${small ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}>
      {label}
    </span>
  )
}
