'use client'
import React from 'react'

export default function Footer() {
  return (
    <footer className="shrink-0 h-10 bg-white border-t border-separator flex items-center justify-end px-6">
      {/*
        cosentus-division.png is a JPEG with a black background + white logo.
        filter: invert(1) flips it to white-bg + black logo.
        mix-blend-mode: multiply then dissolves the white background.
        Result: clean dark "A COSENTUS Division" wordmark on white footer.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/cosentus-division.png"
        alt="A Cosentus Division"
        className="h-[18px] w-auto object-contain"
        style={{ filter: 'invert(1)', mixBlendMode: 'multiply' }}
      />
    </footer>
  )
}
