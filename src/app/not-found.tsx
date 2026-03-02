import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="text-[13px] font-bold tracking-widest text-brand uppercase">MedCloud</div>
      <div className="text-[96px] font-black text-brand leading-none">404</div>
      <h1 className="text-[24px] font-bold text-content-primary">Page not found</h1>
      <p className="text-[14px] text-content-secondary max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved to a different location.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-btn text-[14px] font-semibold hover:bg-brand-dark transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
