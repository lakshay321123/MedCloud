'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { ScanLine } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Scan & Submit"
      subtitle="Upload superbills, insurance cards, and documents"
      sprint="Sprint 2"
      icon={<ScanLine size={20} />}
    />
  )
}
