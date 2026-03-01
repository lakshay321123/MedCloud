'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ModuleShellProps {
  title: string
  subtitle?: string
  sprint?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
}

export default function ModuleShell({ title, subtitle, sprint, icon, actions, children }: ModuleShellProps) {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
            {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
          </div>
          {sprint && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
              {sprint}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Content */}
      {children || (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="w-16 h-16 rounded-2xl bg-brand/5 flex items-center justify-center mb-4">
            {icon || <div className="w-6 h-6 rounded-full bg-brand/20" />}
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</p>
          <p className="text-xs text-[var(--text-secondary)]">Module shell ready — {sprint || 'Sprint 1'} build</p>
        </div>
      )}
    </div>
  )
}
