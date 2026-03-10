'use client'
import React from 'react'
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react'
import { CardSkeleton } from './TableSkeleton'
import type { MedCloudApiError } from '@/lib/api-client'

export function LoadingGrid({ cols = 4 }: { cols?: number }) {
  return <CardSkeleton count={cols} />
}

export function ErrorBanner({
  error,
  onRetry,
}: {
  error: MedCloudApiError | null
  onRetry?: () => void
}) {
  if (!error) return null
  return (
    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <AlertTriangle size={18} className="text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">
          Failed to load data
        </p>
        <p className="text-[12px] text-red-500/80 truncate">
          {error.message || 'An unexpected error occurred'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-surface-elevated border border-separator rounded-btn text-content-secondary hover:text-content-secondary transition-colors shrink-0"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  entity,
  action,
}: {
  entity: string
  action?: string
}) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
        <Inbox size={24} />
      </div>
      <p className="text-[15px] font-semibold text-content-primary">No {entity} found</p>
      {action && (
        <p className="text-[13px] text-content-secondary">{action}</p>
      )}
    </div>
  )
}
