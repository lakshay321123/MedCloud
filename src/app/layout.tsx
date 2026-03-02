import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/context'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = { title: 'MedCloud by Cosentus.ai', description: 'AI-Powered Revenue Cycle Management' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  )
}
