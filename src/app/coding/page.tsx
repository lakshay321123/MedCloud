'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { BrainCircuit } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="AI Coding"
      subtitle="AI-assisted medical coding workspace"
      sprint="Sprint 2"
      icon={<BrainCircuit size={20} />}
    />
  )
}
