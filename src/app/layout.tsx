import type { Metadata } from 'next'
import './globals.css'
import { Reddit_Sans } from 'next/font/google'
import { AppProvider } from '@/lib/context'
import AppShell from '@/components/layout/AppShell'

const redditSans = Reddit_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-reddit-sans',
})

export const metadata: Metadata = { title: 'MedCloud by Cosentus.ai', description: 'AI-Powered Revenue Cycle Management' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${redditSans.variable} font-sans`}>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  )
}
