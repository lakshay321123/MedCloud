'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { ListChecks } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Tasks & Workflows"
      subtitle="Task management and automated workflows"
      sprint="Sprint 4"
      icon={<ListChecks size={20} />}
    />
  )
}
