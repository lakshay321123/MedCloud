'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Receipt } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Payment Posting"
      subtitle="ERA/EOB processing and payment reconciliation"
      sprint="Sprint 3"
      icon={<Receipt size={20} />}
    />
  )
}
