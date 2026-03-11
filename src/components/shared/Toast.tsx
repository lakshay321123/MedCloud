'use client'
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
  }
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const defaultDuration: Record<ToastType, number> = {
  success: 3000,
  warning: 5000,
  error: 8000,
  info: 4000,
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; bar: string }> = {
  success: {
    bg: 'bg-surface-secondary',
    border: 'border-l-4 border-l-emerald-500 border border-separator',
    icon: <CheckCircle2 size={18} className="text-brand-dark shrink-0" />,
    bar: 'bg-brand',
  },
  error: {
    bg: 'bg-surface-secondary',
    border: 'border-l-4 border-l-[#065E76] border border-separator',
    icon: <XCircle size={18} className="text-[#065E76] shrink-0" />,
    bar: 'bg-[#065E76]',
  },
  warning: {
    bg: 'bg-surface-secondary',
    border: 'border-l-4 border-l-amber-500 border border-separator',
    icon: <AlertTriangle size={18} className="text-brand-deep shrink-0" />,
    bar: 'bg-brand-pale',
  },
  info: {
    bg: 'bg-surface-secondary',
    border: 'border-l-4 border-l-brand border border-separator',
    icon: <Info size={18} className="text-brand shrink-0" />,
    bar: 'bg-brand',
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const style = toastStyles[toast.type]
  const elapsed = Date.now() - toast.createdAt
  const remaining = Math.max(0, toast.duration - elapsed)

  useEffect(() => {
    const step = 50
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev - (step / remaining) * 100
        if (next <= 0) {
          onDismiss(toast.id)
          return 0
        }
        return next
      })
    }, step)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [remaining, onDismiss, toast.id])

  return (
    <div className={`flex flex-col rounded-lg shadow-lg min-w-[300px] max-w-[420px] overflow-hidden ${style.bg} ${style.border}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {style.icon}
        <span className="text-[13px] text-content-primary flex-1">{toast.message}</span>
        <button onClick={() => onDismiss(toast.id)} className="text-content-tertiary hover:text-content-secondary transition-colors ml-1">
          <X size={14} />
        </button>
      </div>
      <div className="h-0.5 bg-separator">
        <div
          className={`h-full transition-none ${style.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const ctx = useContext(ToastContext)
  if (!ctx) return null
  return null // ToastContainer is rendered inside ToastProvider
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).slice(2)
    const dur = duration ?? defaultDuration[type]
    setToasts(prev => [...prev, { id, type, message, duration: dur, createdAt: Date.now() }])
  }, [])

  const toast = {
    success: (msg: string, dur?: number) => addToast('success', msg, dur),
    error: (msg: string, dur?: number) => addToast('error', msg, dur),
    warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
    info: (msg: string, dur?: number) => addToast('info', msg, dur),
  }

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto animate-fade-in">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
