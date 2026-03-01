'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { CalendarDays } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Scheduling"
      subtitle="Appointment calendar and scheduling"
      sprint="Sprint 2"
      icon={<CalendarDays size={20} />}
    />
  )
}
