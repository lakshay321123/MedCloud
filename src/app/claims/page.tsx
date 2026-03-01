'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { FileText } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Claims Center"
      subtitle="Manage and track all claims"
      sprint="Sprint 2"
      icon={<FileText size={20} />}
    />
  )
}
