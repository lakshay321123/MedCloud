'use client'
import React, { useState } from 'react'

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
    <div className="min-h-screen flex">

      {/* ═══════════════════════════════
          LEFT — Brand blue hero panel
      ═══════════════════════════════ */}
      <div
        className="hidden lg:flex w-[52%] shrink-0 flex-col justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #36C2DE 0%, #00B5D6 40%, #0095B8 100%)',
        }}
      >
        {/* Atmospheric depth — layered radial glows */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 20% 20%, rgba(255,255,255,0.12) 0%, transparent 60%), ' +
              'radial-gradient(ellipse 50% 50% at 80% 80%, rgba(0,80,120,0.25) 0%, transparent 60%)',
          }}
        />
        {/* Subtle geometric rings */}
        <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-[340px] h-[340px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full border border-white/8" />

        {/* Top spacer */}
        <div />

        {/* Main content */}
        <div className="relative z-10 px-16 pb-2">
          {/* Headline */}
          <div className="mb-12">
            <p className="text-white/60 text-[13px] font-semibold tracking-[0.18em] uppercase mb-4 letter-spacing">
              MedCloud by Cosentus
            </p>
            <h1
              className="text-white leading-[1.05] font-bold tracking-tight"
              style={{ fontSize: 'clamp(36px, 3.5vw, 52px)' }}
            >
              Revenue Cycle<br />Intelligence
            </h1>
            <p className="text-white/65 mt-5 text-[16px] leading-relaxed max-w-[340px]">
              AI-powered RCM built on 25+ years of healthcare expertise. Faster claims, fewer denials.
            </p>
          </div>

          {/* Stats — Apple-style: clean numbers, thin dividers */}
          <div className="grid grid-cols-2 gap-px bg-white/15 rounded-2xl overflow-hidden">
            {stats.map(({ value, label }, i) => (
              <div
                key={label}
                className="bg-white/10 backdrop-blur-sm px-7 py-6 flex flex-col gap-1.5"
                style={{
                  borderRadius:
                    i === 0 ? '16px 0 0 0' :
                    i === 1 ? '0 16px 0 0' :
                    i === 2 ? '0 0 0 16px' :
                    '0 0 16px 0',
                }}
              >
                <span className="text-white font-bold leading-none" style={{ fontSize: 'clamp(24px, 2.5vw, 32px)' }}>
                  {value}
                </span>
                <span className="text-white/55 text-[12px] font-medium tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — INC badge */}
        <div className="relative z-10 px-16 pb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <span className="text-white text-[11px] font-bold">Inc</span>
            </div>
            <p className="text-white/45 text-[12px] leading-snug">
              INC 5000 Fastest Growing · 3 consecutive years<br />
              Great Places to Work® Certified
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════
          RIGHT — Login form (white)
          Both logos live here
      ═══════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-white">

        {/* TOP-RIGHT: MedCloud logo */}
        <div className="flex justify-end px-10 pt-9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/medcloud-color.png"
            alt="MedCloud"
            className="h-9 w-auto object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>

        {/* CENTER: Form — vertically + horizontally centered */}
        <div className="flex-1 flex items-center justify-center px-10 py-12">
          <div className="w-full max-w-[360px]">

            {/* Heading */}
            <div className="mb-9">
              <h2
                className="font-bold text-black tracking-tight leading-tight"
                style={{ fontSize: '28px', letterSpacing: '-0.02em' }}
              >
                Welcome back
              </h2>
              <p className="text-[14px] text-[#888] mt-2 font-normal">
                Sign in to your MedCloud account
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#999] uppercase tracking-[0.08em] block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@cosentus.com"
                  className="w-full rounded-[14px] px-4 py-[13px] text-[14px] text-black outline-none transition-all placeholder:text-[#C5C5C5]"
                  style={{
                    background: '#F7FBFD',
                    border: '1.5px solid #E2F0F5',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = '1.5px solid #00B5D6'
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0,181,214,0.1), inset 0 1px 2px rgba(0,0,0,0.02)'
                    e.currentTarget.style.background = '#fff'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1.5px solid #E2F0F5'
                    e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.03)'
                    e.currentTarget.style.background = '#F7FBFD'
                  }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#999] uppercase tracking-[0.08em] block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="w-full rounded-[14px] px-4 py-[13px] text-[14px] text-black outline-none transition-all placeholder:text-[#C5C5C5]"
                  style={{
                    background: '#F7FBFD',
                    border: '1.5px solid #E2F0F5',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = '1.5px solid #00B5D6'
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0,181,214,0.1), inset 0 1px 2px rgba(0,0,0,0.02)'
                    e.currentTarget.style.background = '#fff'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1.5px solid #E2F0F5'
                    e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.03)'
                    e.currentTarget.style.background = '#F7FBFD'
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-[12px] px-4 py-3">
                  {error}
                </div>
              )}

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white rounded-[14px] py-[14px] text-[14px] font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
                style={{
                  background: loading ? '#00B5D6' : 'linear-gradient(180deg, #17C2E0 0%, #00B5D6 100%)',
                  boxShadow: '0 1px 2px rgba(0,181,214,0.2), 0 4px 12px rgba(0,181,214,0.25)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  if (!loading) (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,181,214,0.25), 0 6px 20px rgba(0,181,214,0.35)')
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,181,214,0.2), 0 4px 12px rgba(0,181,214,0.25)'
                }}
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
        </div>

        {/* BOTTOM-RIGHT: A Cosentus Division */}
        <div className="flex justify-end px-10 pb-9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/cosentus-division.png"
            alt="A Cosentus Division"
            className="h-[13px] w-auto object-contain opacity-55"
          />
        </div>
      </div>
    </div>
  )
}
