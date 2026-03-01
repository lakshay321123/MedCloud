'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { BarChart3 } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Analytics"
      subtitle="Financial and operational analytics"
      sprint="Sprint 5"
      icon={<BarChart3 size={20} />}
    />
  )
}
