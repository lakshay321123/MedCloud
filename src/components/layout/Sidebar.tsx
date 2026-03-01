'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { getModulesBySection, getSectionLabel } from '@/lib/modules'
import * as Icons from 'lucide-react'

export default function Sidebar() {
  const { sidebarCollapsed, currentUser, toggleSidebar } = useApp()
  const pathname = usePathname()
  const sections = getModulesBySection(currentUser.role)
  const w = sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'

  return (
    <aside className={`${w} h-screen bg-bg-secondary border-r border-border flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}>
      <div className="h-16 flex items-center px-4 border-b border-border gap-3">
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-white/5 text-brand">
          <Icons.Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white text-sm">MedCloud</span>
            <span className="text-[10px] text-muted">by Cosentus.ai</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {Object.entries(sections).map(([section, mods]) => (
          <div key={section}>
            {!sidebarCollapsed && (
              <div className="text-[10px] font-semibold text-muted uppercase tracking-wider px-3 pt-4 pb-1">
                {getSectionLabel(currentUser.role, section)}
              </div>
            )}
            {mods.map(mod => {
              const isActive = pathname === mod.path || pathname.startsWith(mod.path + '/')
              const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[mod.icon] || Icons.Circle
              return (
                <Link key={mod.id} href={mod.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                    ${isActive ? 'bg-brand/10 text-brand border border-brand/20' : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? mod.label : undefined}>
                  <IconComp size={18} />
                  {!sidebarCollapsed && <span className="truncate">{mod.label}</span>}
                  {!sidebarCollapsed && mod.badge && (
                    <span className="ml-auto bg-brand/20 text-brand text-[10px] px-1.5 py-0.5 rounded-full">{mod.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
