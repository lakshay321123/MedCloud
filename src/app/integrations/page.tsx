'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Plug } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Integration Hub"
      subtitle="EHR, clearinghouse, and API connections"
      sprint="Sprint 5"
      icon={<Plug size={20} />}
    />
  )
}
