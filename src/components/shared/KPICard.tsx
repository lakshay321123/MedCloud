'use client'
import React from 'react'

interface KPICardProps {
  label: string
  value: string | number | null
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  accent?: string
}

export default function KPICard({ label, value, sub, trend, icon }: KPICardProps) {
  return (
    <div className="card kpi-card p-5 group cursor-default">
      <div className="flex items-start justify-between mb-3">
        {/* Label — Apple uses 12-13px medium weight for metric labels */}
        <p className="text-[12px] font-semibold text-content-tertiary uppercase tracking-[0.04em] leading-none">
          {label}
        </p>
        {icon && (
          <div className="text-content-tertiary group-hover:text-brand transition-colors duration-200">
            {icon}
          </div>
        )}
      </div>

      {/* Value — large, tight, confident */}
      <p className="text-[30px] font-bold tracking-tight text-content-primary leading-none tabular-nums">
        {value === null ? '—' : value}
      </p>

      {/* Sub — trend indicator */}
      {sub && (
        <p className={`text-[12px] font-medium mt-2.5 flex items-center gap-1 ${
          trend === 'up'   ? 'text-brand-dark' :
          trend === 'down' ? 'text-red-500'    :
          'text-content-tertiary'
        }`}>
          {trend === 'up' && <span className="text-[10px]">↑</span>}
          {trend === 'down' && <span className="text-[10px]">↓</span>}
          {sub}
        </p>
      )}
    </div>
  )
}
