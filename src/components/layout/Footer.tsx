'use client'
import React from 'react'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="shrink-0 h-10 bg-white border-t border-separator flex items-center justify-end px-6 gap-2">
      <span className="text-[11px] text-content-tertiary font-medium tracking-wide">A</span>
      <Image
        src="/assets/logo-main.png"
        alt="Cosentus"
        width={72}
        height={18}
        className="object-contain opacity-60"
        style={{ mixBlendMode: 'multiply' }}
      />
      <span className="text-[11px] text-content-tertiary font-medium tracking-wide">Division</span>
    </footer>
  )
}
