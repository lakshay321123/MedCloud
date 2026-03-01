'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { ShieldAlert } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Denials & Appeals"
      subtitle="Denial management and appeal workflows"
      sprint="Sprint 3"
      icon={<ShieldAlert size={20} />}
    />
  )
}
