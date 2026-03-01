'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { FolderOpen } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Documents"
      subtitle="Document vault, search, and fax center"
      sprint="Sprint 4"
      icon={<FolderOpen size={20} />}
    />
  )
}
