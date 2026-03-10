'use client'
import React from 'react'

export default function Footer() {
  return (
    <footer className="shrink-0 h-10 bg-white border-t border-separator flex items-center justify-end px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/cosentus-division.png"
        alt="A Cosentus Division"
        className="h-[13px] w-auto object-contain opacity-55"
      />
    </footer>
  )
}
