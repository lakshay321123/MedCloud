'use client'
import React from 'react'

const styles: Record<string, { bg: string; text: string }> = {
  // ── Positive / Complete → brand teal ──
  completed: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  paid: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  active: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  resolved: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  signed: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  healthy: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  parsed: { bg: 'bg-brand/10', text: 'text-brand-dark' },
  // ── Brand lighter ──
  checked_in: { bg: 'bg-brand/15', text: 'text-brand' },
  ready: { bg: 'bg-brand/15', text: 'text-brand' },
  accepted: { bg: 'bg-brand/15', text: 'text-brand' },
  claim_submitted: { bg: 'bg-brand/15', text: 'text-brand' },
  walk_in: { bg: 'bg-brand/15', text: 'text-brand' },
  // ── Blue ──
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  submitted: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  open: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  received: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  onboarding: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  sent: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  appealed: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  rescheduled: { bg: 'bg-blue-500/10', text: 'text-blue-700' },
  // ── Pending / In-progress → pale brand ──
  in_progress: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  scrubbing: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  in_process: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  pending_signoff: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  in_coding: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  medium: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  expiring: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  warning: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  blocked: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  partial_pay: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  late: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  high: { bg: 'bg-brand-pale/50', text: 'text-brand-deep' },
  // ── Red / Error ──
  denied: { bg: 'bg-red-500/10', text: 'text-red-600' },
  no_show: { bg: 'bg-red-500/10', text: 'text-red-600' },
  scrub_failed: { bg: 'bg-red-500/10', text: 'text-red-600' },
  urgent: { bg: 'bg-red-500/10', text: 'text-red-600' },
  error: { bg: 'bg-red-500/10', text: 'text-red-600' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-600' },
  // ── Grey / Neutral ──
  booked: { bg: 'bg-gray-200/60', text: 'text-gray-600' },
  draft: { bg: 'bg-gray-200/60', text: 'text-gray-600' },
  cancelled: { bg: 'bg-gray-200/60', text: 'text-gray-500' },
  inactive: { bg: 'bg-gray-200/60', text: 'text-gray-500' },
  corrected: { bg: 'bg-gray-200/60', text: 'text-gray-600' },
  write_off: { bg: 'bg-gray-200/60', text: 'text-gray-500' },
  low: { bg: 'bg-gray-200/60', text: 'text-gray-600' },
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
