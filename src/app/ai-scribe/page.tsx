'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Mic } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="AI Scribe"
      subtitle="Real-time clinical documentation"
      sprint="Sprint 4"
      icon={<Mic size={20} />}
    />
  )
}
