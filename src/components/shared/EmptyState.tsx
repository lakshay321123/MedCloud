'use client'
import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Icon size={48} className="text-content-primary opacity-20 mb-4" />
      <h3 className="text-[15px] font-semibold text-content-secondary mb-1">{title}</h3>
      {description && <p className="text-[13px] text-content-tertiary max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 bg-brand text-white rounded-btn px-4 py-2 text-[13px] font-medium hover:bg-brand-deep transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
