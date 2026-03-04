'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
        window.location.href = '/dashboard'
      } else {
        setError('Invalid username or password')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  const portalBtn = (active: boolean) =>
    `flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
      active
        ? 'border-[#00B5D6] bg-[#00B5D6]/8 text-[#000]'
        : 'border-[#A1DEED] bg-white text-[#616161] hover:border-[#00B5D6]/50 hover:bg-[#D6EBF2]/40'
    }`

  const regionBtn = (active: boolean) =>
    `flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 transition-all cursor-pointer ${
      active
        ? 'border-[#00B5D6] bg-[#00B5D6]/8 text-[#000]'
        : 'border-[#A1DEED] bg-white text-[#616161] hover:border-[#00B5D6]/50 hover:bg-[#D6EBF2]/40'
    }`

  return (
    <div className="min-h-screen flex" style={{ background: '#D6EBF2' }}>

      {/* ── LEFT BRAND PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12"
        style={{ background: '#000000' }}
      >
        {/* Logo */}
        <div>
          <Image
            src="/logo-white.png"
            alt="MedCloud"
            width={200}
            height={44}
            className="object-contain"
            priority
          />
        </div>

        {/* Hero text */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: '#00B5D6' }}>
              AI-Powered Revenue Cycle
            </p>
            <h2 className="text-4xl font-bold leading-tight text-white">
              Intelligent RCM<br />
              for modern<br />
              <span style={{ color: '#00B5D6' }}>healthcare.</span>
            </h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#CCCCCC' }}>
            Auto-coding, claim scrubbing, denial prediction and real-time analytics — all on one platform built by Cosentus AI.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: 'rgba(0,181,214,0.2)' }}>
            {[
              { val: '98%', label: 'Collection Rate' },
              { val: '100%', label: 'Clean Claims' },
              { val: '25+', label: 'Years Experience' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold" style={{ color: '#00B5D6' }}>{s.val}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#68D1E6' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px]" style={{ color: '#616161' }}>
          © {new Date().getFullYear()} Cosentus AI · All rights reserved
        </p>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logo-color.png"
              alt="MedCloud"
              width={160}
              height={36}
              className="object-contain mx-auto"
              priority
            />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-6" style={{ borderColor: '#A1DEED' }}>

            <div>
              <h1 className="text-xl font-bold" style={{ color: '#000000' }}>Sign in to MedCloud</h1>
              <p className="text-sm mt-1" style={{ color: '#616161' }}>
                Welcome back — select your portal to continue
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Portal Type */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-2.5" style={{ color: '#616161' }}>
                  Portal Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPortalType('facility')} className={portalBtn(portalType === 'facility')}>
                    <span className="text-lg">🏥</span>
                    <span className="text-sm font-semibold" style={{ color: '#000' }}>Facility</span>
                    <span className="text-[11px] leading-tight" style={{ color: '#616161' }}>Doctors, Front Office, Clinic Staff</span>
                  </button>
                  <button type="button" onClick={() => setPortalType('backoffice')} className={portalBtn(portalType === 'backoffice')}>
                    <span className="text-lg">🏢</span>
                    <span className="text-sm font-semibold" style={{ color: '#000' }}>Back Office</span>
                    <span className="text-[11px] leading-tight" style={{ color: '#616161' }}>Cosentus RCM Staff</span>
                  </button>
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-2.5" style={{ color: '#616161' }}>
                  Region
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setCountry('usa')} className={regionBtn(country === 'usa')}>
                    <span className="text-2xl">🇺🇸</span>
                    <span className="text-sm font-semibold" style={{ color: '#000' }}>USA</span>
                  </button>
                  <button type="button" onClick={() => setCountry('uae')} className={regionBtn(country === 'uae')}>
                    <span className="text-2xl">🇦🇪</span>
                    <span className="text-sm font-semibold" style={{ color: '#000' }}>UAE</span>
                  </button>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#616161' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your username"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: '#D6EBF2',
                    border: '1.5px solid #A1DEED',
                    color: '#000000',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#00B5D6')}
                  onBlur={e => (e.target.style.borderColor = '#A1DEED')}
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#616161' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: '#D6EBF2',
                    border: '1.5px solid #A1DEED',
                    color: '#000000',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#00B5D6')}
                  onBlur={e => (e.target.style.borderColor = '#A1DEED')}
                />
              </div>

              {error && (
                <div className="text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: '#00B5D6' }}
                onMouseEnter={e => !loading && ((e.target as HTMLButtonElement).style.background = '#36C2DE')}
                onMouseLeave={e => !loading && ((e.target as HTMLButtonElement).style.background = '#00B5D6')}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

            </form>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: '#616161' }}>
            Cosentus AI Platform · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
