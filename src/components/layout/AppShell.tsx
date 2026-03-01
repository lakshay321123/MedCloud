'use client'

import React from 'react'
import { AppProvider, useApp } from '@/lib/context'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { cn } from '@/lib/utils'

function ShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp()

  return (
    <>
      <Sidebar />
      <Topbar />
      <main className={cn(
        'transition-all duration-300 mt-14 p-6 grid-bg min-h-[calc(100vh-56px)]',
        sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]',
      )}>
        {children}
      </main>
    </>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ShellInner>{children}</ShellInner>
    </AppProvider>
  )
}
