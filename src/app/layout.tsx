import type { Metadata, Viewport } from 'next'
import React from 'react'
import './globals.css'
import { AppProvider } from '@/lib/context'
import AppShell from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/shared/Toast'

export const metadata: Metadata = { title: 'MedCloud by Cosentus.ai', description: 'AI-Powered Revenue Cycle Management' }

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <AppProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  )
}
