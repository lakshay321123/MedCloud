'use client'
import React, { useState } from 'react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('cosentus_region', data.country)
        localStorage.setItem('cosentus_portal_type', data.portalType)
        localStorage.setItem('cosentus_role', data.role)
        window.location.href = '/dashboard'
      } else {
        setError(data.error || 'Invalid email or password')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-black flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #00B5D6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #00B5D6 0%, transparent 50%)' }}
        />
        <div className="relative z-10 text-center">
          <div className="mb-8 flex justify-center">
            <Image src="/Medcloud_logo_1_WHITE_1_1.png" alt="MedCloud" width={180} height={48} priority className="h-12 w-auto" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Revenue Cycle Intelligence</h2>
          <p className="text-[#CCCCCC] text-base max-w-sm leading-relaxed">
            AI-powered RCM platform. Faster claims, fewer denials, smarter collections.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            {[['98%', 'Clean Claim Rate'], ['< 2 days', 'Avg Posting Time'], ['40%', 'Denial Reduction']].map(([val, label]) => (
              <div key={label}>
                <div className="text-2xl font-bold text-[#00B5D6]">{val}</div>
                <div className="text-xs text-[#CCCCCC] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-surface-primary">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand mb-3">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold text-content-primary">MedCloud</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-content-primary">Welcome back</h2>
            <p className="text-sm text-content-secondary mt-1">Sign in to your Cosentus account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-content-secondary block mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all"
                placeholder="you@cosentus.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-content-secondary block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-primary outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#36C2DE] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-content-tertiary mt-8">
            Cosentus AI · MedCloud Platform · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
