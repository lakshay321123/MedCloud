'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Scale } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Contract Manager"
      subtitle="Payer contract rates and underpayment detection"
      sprint="Sprint 3"
      icon={<Scale size={20} />}
    />
  )
}
