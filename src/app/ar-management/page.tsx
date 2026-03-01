'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { TrendingUp } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="A/R Management"
      subtitle="Accounts receivable aging and follow-up"
      sprint="Sprint 3"
      icon={<TrendingUp size={20} />}
    />
  )
}
