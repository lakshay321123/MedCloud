'use client'
import React from 'react'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-3 border-b border-separator">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-3 bg-surface-elevated rounded animate-pulse" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-4 py-3 border-b border-separator last:border-0">
          {Array.from({ length: columns }).map((_, col) => (
            <div
              key={col}
              className="flex-1 h-10 bg-surface-elevated rounded animate-pulse"
              style={{ animationDelay: `${(row * columns + col) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card kpi-card p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-surface-elevated rounded animate-pulse" />
            <div className="h-5 w-5 bg-surface-elevated rounded animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-surface-elevated rounded animate-pulse" />
          <div className="h-3 w-16 bg-surface-elevated rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}
