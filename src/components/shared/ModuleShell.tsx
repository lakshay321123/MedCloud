'use client'
import React from 'react'

interface ModuleShellProps {
  title: string; subtitle?: string; sprint?: number; children: React.ReactNode
  actions?: React.ReactNode
}

export default function ModuleShell({ title, subtitle, sprint, children, actions }: ModuleShellProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {sprint && <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full border border-brand/20">Sprint {sprint}</span>}
          </div>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
