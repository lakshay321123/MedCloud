'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Settings } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Admin & Settings"
      subtitle="System configuration and user management"
      sprint="Sprint 4"
      icon={<Settings size={20} />}
    />
  )
}
