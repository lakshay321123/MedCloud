'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Country = 'uae' | 'usa'
type PortalType = 'facility' | 'backoffice'

export default function LoginPage() {
  const router = useRouter()
  const [portalType, setPortalType] = useState<PortalType | null>(null)
  const [country, setCountry] = useState<Country | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!portalType) { setError('Please select a portal type'); return }
    if (!country) { setError('Please select your region'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, country, portalType }),
      })
      if (res.ok) {
        localStorage.setItem('cosentus_region', country)
        localStorage.setItem('cosentus_portal_type', portalType)
        router.push('/dashboard')
      } else {
        setError('Invalid username or password')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  const selectorBtn = (active: boolean) =>
    `flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
      active ? 'border-brand bg-brand/5 text-content-primary' : 'border-separator bg-surface-elevated text-content-secondary hover:border-brand/30'
    }`

  const regionBtn = (active: boolean) =>
    `flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
      active ? 'border-brand bg-brand/5 text-content-primary' : 'border-separator bg-surface-elevated text-content-secondary hover:border-brand/30'
    }`

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-content-primary">Cosentus</h1>
          <p className="text-sm text-content-secondary mt-1">Revenue Cycle Intelligence</p>
        </div>

        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          {/* Step 1: Portal Type */}
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-2">Portal Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPortalType('facility')} className={selectorBtn(portalType === 'facility')}>
                <span className="text-base">🏥</span>
                <span className="text-xs font-semibold">Facility</span>
                <span className="text-[10px] text-content-tertiary leading-tight">Doctors, Front Office, Clinic Staff</span>
              </button>
              <button type="button" onClick={() => setPortalType('backoffice')} className={selectorBtn(portalType === 'backoffice')}>
                <span className="text-base">🏢</span>
                <span className="text-xs font-semibold">Back Office</span>
                <span className="text-[10px] text-content-tertiary leading-tight">Cosentus RCM Staff</span>
              </button>
            </div>
          </div>

          {/* Step 2: Region */}
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-2">Select Your Region</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCountry('uae')} className={regionBtn(country === 'uae')}>
                <span className="text-2xl">🇦🇪</span>
                <span className="text-xs font-medium">UAE</span>
              </button>
              <button type="button" onClick={() => setCountry('usa')} className={regionBtn(country === 'usa')}>
                <span className="text-2xl">🇺🇸</span>
                <span className="text-xs font-medium">USA</span>
              </button>
            </div>
          </div>

          {/* Credentials */}
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand/40 transition-colors"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-content-tertiary mt-4">
          Cosentus AI Platform · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
