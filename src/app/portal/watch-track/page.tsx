'use client'

import ModuleShell from '@/components/shared/ModuleShell'
import { Eye } from 'lucide-react'

export default function Page() {
  return (
    <ModuleShell
      title="Watch & Track"
      subtitle="Track claims, revenue, and collections"
      sprint="Sprint 3"
      icon={<Eye size={20} />}
    />
  )
}
