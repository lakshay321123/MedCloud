'use client'
import React from 'react'

interface ModuleShellProps {
  title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode
}

export default function ModuleShell({ title, subtitle, children, actions }: ModuleShellProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-content-primary">{title}</h1>
          {subtitle && <p className="text-[15px] text-content-secondary mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
