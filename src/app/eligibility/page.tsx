'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { ShieldCheck } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Eligibility Verification"
      subtitle="Real-time eligibility checks"
      sprint="Sprint 2"
      icon={<ShieldCheck size={20} />}
    />
  )
}
