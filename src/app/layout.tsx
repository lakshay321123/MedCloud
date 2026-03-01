import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'MedCloud | Cosentus.ai',
  description: 'AI-Powered Revenue Cycle Management Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" dir="ltr">
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
