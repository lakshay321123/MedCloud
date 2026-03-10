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
  const w = sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'

  return (
    <aside className={`${w} h-screen bg-white border-r border-separator flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}>
      {/* Top area — hamburger + role/region label */}
      <div className="h-16 flex items-center px-4 gap-3 border-b border-separator bg-brand/5">
        <button onClick={toggleSidebar} className="p-1.5 rounded-btn hover:bg-brand/10 text-brand transition-colors">
          <Icons.Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <span className="font-bold text-black text-[14px] tracking-tight truncate">
            {currentUser.name.split(' ')[0]}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {Object.entries(sections).map(([section, mods]) => (
          <div key={section} className="mb-2">
            {!sidebarCollapsed && (
              <div className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider px-3 pt-5 pb-2">
                {(section in {operations:1,ai:1,management:1,portal:1,system:1,clinical:1,myportal:1}
                  ? t('sections', section as 'operations'|'ai'|'management'|'portal'|'system'|'clinical'|'myportal')
                  : getSectionLabel(currentUser.role, section, portalType))}
              </div>
            )}
            {mods.map(mod => {
              const isActive = pathname === mod.path || pathname.startsWith(mod.path + '/')
              const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[mod.icon] || Icons.Circle
              return (
                <Link key={mod.id} href={mod.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-[13px] font-medium transition-all
                    ${isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-black hover:text-brand hover:bg-brand/8'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? mod.label : undefined}>
                  <IconComp size={17} />
                  {!sidebarCollapsed && <span className="truncate">{mod.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User strip at bottom */}
      <div className={`border-t border-separator px-3 py-3 flex items-center gap-3 bg-brand/5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-xs shrink-0">
          {currentUser.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[13px] font-bold text-black truncate">{currentUser.name}</span>
            <span className="text-[10px] text-content-tertiary capitalize">{currentUser.role.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
