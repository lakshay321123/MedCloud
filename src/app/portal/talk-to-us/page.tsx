'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { MessageSquare } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Talk to Us"
      subtitle="Work orders, messaging, and support"
      sprint="Sprint 4"
      icon={<MessageSquare size={20} />}
    />
  )
}
