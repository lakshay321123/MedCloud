'use client'
import React from 'react'

/*
 * StatusBadge — uses the 6-color Pantone palette ONLY:
 *   Submitted:    #000000  (black)
 *   Denied:       #065E76  (dark teal)
 *   Appealed:     #00B5D6  (brand cyan)
 *   In Process:   #616161  (gray)
 *   Partial Paid: outline  (white bg, border)
 *   Paid:         #D6EBF2  (brand ghost)
 *
 * NO RED ANYWHERE.
 */

const styles: Record<string, { bg: string; text: string }> = {
  // ── Paid / Completed (#D6EBF2 bg, #065E76 text) ──────────────────────
  paid:            { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  completed:       { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  active:          { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  resolved:        { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  signed:          { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  healthy:         { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  parsed:          { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  accepted:        { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  ready:           { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  checked_in:      { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  confirmed:       { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  walk_in:         { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  approved:        { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  posted:          { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  connected:       { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },
  operational:     { bg: 'bg-[#D6EBF2]', text: 'text-[#065E76]' },

  // ── Partial Paid / Outline (white bg, border) ────────────────────────
  partial_pay:     { bg: 'bg-white border border-[#CCCCCC]', text: 'text-[#616161]' },
  corrected:       { bg: 'bg-white border border-[#CCCCCC]', text: 'text-[#616161]' },
  write_off:       { bg: 'bg-white border border-[#CCCCCC]', text: 'text-[#616161]' },

  // ── In Process / Neutral (#616161) ───────────────────────────────────
  draft:           { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  booked:          { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  open:            { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  received:        { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  pending:         { bg: 'bg-black', text: 'text-white' },
  medium:          { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  low:             { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  cancelled:       { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  inactive:        { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  degraded:        { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },
  pending_review:  { bg: 'bg-[#616161]/10', text: 'text-[#616161]' },

  // ── Appealed / Active (#00B5D6) ──────────────────────────────────────
  appealed:        { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  in_progress:     { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  scrubbing:       { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  in_process:      { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  in_coding:       { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  pending_signoff: { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  rescheduled:     { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  expiring:        { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  warning:         { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  blocked:         { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  late:            { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  in_review:       { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  recredentialing: { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },
  processing:      { bg: 'bg-[#00B5D6]/10', text: 'text-[#00B5D6]' },

  // ── Submitted / Sent (#000000) ───────────────────────────────────────
  submitted:       { bg: 'bg-black/8', text: 'text-black' },
  sent:            { bg: 'bg-black/8', text: 'text-black' },
  claim_submitted: { bg: 'bg-black/8', text: 'text-black' },
  onboarding:      { bg: 'bg-black/8', text: 'text-black' },

  // ── Denied / Error (#065E76) ─────────────────────────────────────────
  denied:          { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  rejected:        { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  scrub_failed:    { bg: 'bg-[#065E76]/10 border-l-[3px] border-l-[#065E76]', text: 'text-[#065E76] font-semibold' },
  error:           { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  urgent:          { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  high:            { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  no_show:         { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  failed:          { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
  expired:         { bg: 'bg-[#065E76]/10', text: 'text-[#065E76] font-semibold' },
}

export default function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const s = styles[status] || styles.draft
  const label = status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center rounded-lg font-medium whitespace-nowrap tracking-wide ${s.bg} ${s.text} ${small ? 'text-[11px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}>
      {label}
    </span>
  )
}
