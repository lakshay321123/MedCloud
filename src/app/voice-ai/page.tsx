'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Phone } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Voice AI"
      subtitle="AI-powered voice agents for payer and patient calls"
      sprint="Sprint 2"
      icon={<Phone size={20} />}
    />
  )
}
