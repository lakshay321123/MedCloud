'use client'
import { useT } from '@/lib/i18n'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { getModulesBySection, getSectionLabel } from '@/lib/modules'
import * as Icons from 'lucide-react'

export default function Sidebar() {
  const { t } = useT()
  const { sidebarCollapsed, currentUser, toggleSidebar, portalType } = useApp()
  const pathname = usePathname()
  const sections = getModulesBySection(currentUser.role, portalType)
  const w = sidebarCollapsed ? 'w-[72px]' : 'w-[220px]'

  return (
    <aside className={`${w} h-screen bg-white border-r border-separator flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}>

      {/* Top — hamburger only, no text clutter */}
      <div className="h-16 flex items-center px-4 border-b border-separator">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-[10px] hover:bg-brand/8 text-content-tertiary hover:text-brand transition-colors"
        >
          <Icons.Menu size={19} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {Object.entries(sections).map(([section, mods]) => (
          <div key={section} className="mb-1">
            {!sidebarCollapsed && (
              <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-[0.08em] px-3 pt-5 pb-1.5">
                {(section in {operations:1,ai:1,management:1,portal:1,system:1,clinical:1,myportal:1}
                  ? t('sections', section as 'operations'|'ai'|'management'|'portal'|'system'|'clinical'|'myportal')
                  : getSectionLabel(currentUser.role, section, portalType))}
              </div>
            )}
            {mods.map(mod => {
              const isActive = pathname === mod.path || pathname.startsWith(mod.path + '/')
              const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[mod.icon] || Icons.Circle
              return (
                <Link
                  key={mod.id}
                  href={mod.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? mod.label : undefined}
                >
                  <IconComp size={16} />
                  {!sidebarCollapsed && <span className="truncate">{mod.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom user strip — h-10 matches footer */}
      <div className={`h-10 border-t border-separator px-3 flex items-center gap-2.5 bg-surface-elevated shrink-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white font-bold text-[10px] shrink-0">
          {currentUser.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[12px] font-semibold text-content-primary truncate">{currentUser.name}</span>
            <span className="text-[10px] text-content-tertiary capitalize">{currentUser.role.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
