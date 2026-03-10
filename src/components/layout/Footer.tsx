'use client'
import React from 'react'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="shrink-0 h-10 bg-white border-t border-separator flex items-center justify-end px-6">
      <Image
        src="/assets/cosentus-division.png"
        alt="A Cosentus Division"
        width={160}
        height={24}
        className="object-contain"
      />
    </footer>
  )
}
