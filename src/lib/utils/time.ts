export function getSLAStatus(receivedAt: string): { label: string; color: string; urgent: boolean } {
  const hours = (Date.now() - new Date(receivedAt).getTime()) / 3600000
  if (hours < 24) return { label: `${Math.round(hours)}h`, color: 'text-brand', urgent: false }
  if (hours < 48) return { label: `${Math.round(hours)}h ⚠`, color: 'text-brand-dark', urgent: false }
  return { label: `${Math.round(hours)}h`, color: 'text-content-secondary font-bold', urgent: true }
}

export function tfDaysRemaining(dos: string, payer: string, tfDeadlines: Record<string, number>): number {
  const tfDays = tfDeadlines[payer] || 180
  const deadline = new Date(dos)
  deadline.setDate(deadline.getDate() + tfDays)
  return Math.ceil((deadline.getTime() - Date.now()) / 86400000)
}
