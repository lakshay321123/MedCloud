'use client'
import React from 'react'

interface KPICardProps {
  label: string; value: string | number | null; sub?: string; trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode; accent?: string
}

export default function KPICard({ label, value, sub, trend, icon, accent }: KPICardProps) {
  return (
    <div className="card kpi-card p-5 group cursor-default">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[13px] font-medium text-content-secondary">{label}</p>
        {icon && <div className="text-content-tertiary group-hover:text-brand transition-colors">{icon}</div>}
      </div>
      <p className="text-[32px] font-bold tracking-tight text-content-primary leading-none">{value === null ? '—' : value}</p>
      {sub && (
        <p className={`text-[13px] font-medium mt-2 ${trend === 'up' ? 'text-brand-dark' : trend === 'down' ? 'text-red-500' : 'text-content-tertiary'}`}>
          {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{sub}
        </p>
      )}
    </div>
  )
}
