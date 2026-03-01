'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { BadgeCheck } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Credentialing"
      subtitle="Provider credentialing and enrollment"
      sprint="Sprint 4"
      icon={<BadgeCheck size={20} />}
    />
  )
}
