'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  className?: string
}

export default function KPICard({ title, value, change, changeLabel, icon, className }: KPICardProps) {
  const trend = change === undefined ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'

  return (
    <div className={cn(
      'p-4 rounded-xl border glow-border corner-accents transition-all duration-200',
      'bg-[var(--bg-card)] border-[var(--border-color)]',
      className,
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{title}</span>
        {icon && <div className="text-brand opacity-60">{icon}</div>}
      </div>
      <div className="text-2xl font-semibold text-[var(--text-primary)] font-mono">{value}</div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' && <TrendingUp size={13} className="text-emerald-400" />}
          {trend === 'down' && <TrendingDown size={13} className="text-red-400" />}
          {trend === 'neutral' && <Minus size={13} className="text-[var(--text-secondary)]" />}
          <span className={cn(
            'text-xs font-mono',
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-[var(--text-secondary)]'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-xs text-[var(--text-secondary)]">{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}
