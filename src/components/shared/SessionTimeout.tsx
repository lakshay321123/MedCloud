'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 2 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

export default function SessionTimeout() {
  const router = useRouter()
  const lastActivityRef = useRef(Date.now())
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(120)

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
  }, [])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    const handler = () => { lastActivityRef.current = Date.now() }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [])

  useEffect(() => {
    const check = () => {
      const idle = Date.now() - lastActivityRef.current
      if (idle >= IDLE_TIMEOUT_MS) {
        sessionStorage.clear()
        router.push('/login?reason=timeout')
        return
      }
      const isWarningPeriod = idle >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS
      setShowWarning(isWarningPeriod)
      if (isWarningPeriod) {
        setSecondsLeft(Math.ceil((IDLE_TIMEOUT_MS - idle) / 1000))
      }
    }
    const interval = setInterval(check, showWarning ? 1000 : 10000)
    check()
    return () => clearInterval(interval)
  }, [router, showWarning])

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/v1/session/heartbeat', { method: 'POST' }).catch(err => console.warn('[session] Heartbeat failed:', err))
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
      <div className="bg-surface-default rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-separator">
        <h3 className="text-lg font-bold text-content-primary mb-2">Session Expiring</h3>
        <p className="text-sm text-content-secondary mb-4">
          Your session will expire in <span className="font-bold text-red-500">{secondsLeft}s</span> due to inactivity.
          This is required by HIPAA to protect patient data.
        </p>
        <button onClick={resetTimer}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors">
          I&apos;m Still Here — Continue Session
        </button>
      </div>
    </div>
  )
}
