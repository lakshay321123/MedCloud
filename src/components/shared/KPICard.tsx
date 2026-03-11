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
        {/* Label — black, not gray. Title Case applied. */}
        <p className="text-[12px] font-semibold text-black tracking-[0.04em] leading-none">
          {label}
        </p>
        {icon && (
          <div className="text-content-tertiary group-hover:text-brand transition-colors duration-200">
            {icon}
          </div>
        )}
      </div>

      {/* Value — brand blue (#00B5D6), large, tight, confident */}
      <p className="text-[30px] font-bold tracking-tight text-[#00B5D6] leading-none tabular-nums">
        {value === null ? '—' : value}
      </p>

      {/* Sub — trend indicator. NO RED — use #065E76 for down trends */}
      {sub && (
        <p className={`text-[12px] font-medium mt-2.5 flex items-center gap-1 ${
          trend === 'up'   ? 'text-[#00B5D6]'  :
          trend === 'down' ? 'text-[#065E76]'   :
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
