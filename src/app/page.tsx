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

  const stats = [
    { value: '99.3%', label: 'Coding Accuracy' },
    { value: '25+',   label: 'Years in RCM' },
    { value: '1,000+', label: 'RCM Experts' },
    { value: '< 35',  label: 'Avg AR Days' },
  ]

  return (
    <div className="min-h-screen flex flex-row-reverse">

      {/* ══════════════════════════════════
          RIGHT — Login form (white panel)
          Logos live HERE only
      ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-between p-10 bg-white min-h-screen">

        {/* TOP-RIGHT: MedCloud logo — black bg removed via mix-blend-mode multiply */}
        <div className="flex justify-end">
          <Image
            src="/assets/logo-main-login.png"
            alt="MedCloud"
            width={160}
            height={40}
            priority
            className="h-10 w-auto object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>

        {/* CENTER: Form */}
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-black tracking-tight">Welcome back</h2>
            <p className="text-[14px] text-gray-500 mt-1.5">Sign in to your MedCloud account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full bg-[#F5FBFD] border border-[#A1DEED] rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-400"
                placeholder="you@cosentus.com"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#F5FBFD] border border-[#A1DEED] rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-400"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white rounded-xl py-3 text-[14px] font-bold hover:bg-brand-mid active:bg-brand-dark transition-colors disabled:opacity-50 mt-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* BOTTOM-RIGHT: A Cosentus Division logo */}
        <div className="flex justify-end">
          <Image
            src="/assets/cosentus-division.png"
            alt="A Cosentus Division"
            width={160}
            height={24}
            className="object-contain"
          />
        </div>
      </div>

      {/* ══════════════════════════════════
          LEFT — Brand blue panel
          NO logos — just content
      ══════════════════════════════════ */}
      <div className="hidden lg:flex w-[46%] bg-brand flex-col justify-between p-12 relative overflow-hidden shrink-0">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.03] pointer-events-none" />

        {/* TOP spacer — keep visual balance */}
        <div />

        {/* CENTER: headline + tagline + stats */}
        <div className="relative z-10">
          <h1 className="text-[42px] font-bold text-white leading-tight tracking-tight">
            Revenue Cycle<br />Intelligence
          </h1>
          <p className="text-white/70 text-[16px] mt-4 leading-relaxed max-w-xs">
            AI-powered RCM built on 25+ years of healthcare expertise. Faster claims, fewer denials, smarter collections.
          </p>

          {/* Stats grid */}
          <div className="mt-10 grid grid-cols-2 gap-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
                <div className="text-[28px] font-bold text-white leading-none">{value}</div>
                <div className="text-[12px] text-white/60 mt-1.5 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM: INC 5000 badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">Inc</span>
          </div>
          <p className="text-white/50 text-[12px] leading-snug">
            INC 5000 Fastest Growing Company · 3 consecutive years<br />
            Great Places to Work® Certified
          </p>
        </div>
      </div>
    </div>
  )
}
