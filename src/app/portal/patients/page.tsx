'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Users } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Patients"
      subtitle="Patient records and billing"
      sprint="Sprint 2"
      icon={<Users size={20} />}
    />
  )
}
