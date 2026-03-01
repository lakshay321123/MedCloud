'use client'
import React from 'react'

interface KPICardProps {
  label: string; value: string | number; sub?: string; trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode; color?: string
}

export default function KPICard({ label, value, sub, trend, icon, color = 'brand' }: KPICardProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-brand/30 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-1">{label}</p>
          <p className={`text-2xl font-bold text-foreground`}>{value}</p>
          {sub && (
            <p className={`text-xs mt-1 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted'}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {sub}
            </p>
          )}
        </div>
        {icon && <div className="text-brand opacity-60">{icon}</div>}
      </div>
    </div>
  )
}
