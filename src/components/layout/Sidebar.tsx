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
  const w = sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'

  return (
    <aside className={`${w} h-screen bg-surface-secondary border-r border-separator flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}>
      <div className="h-16 flex items-center px-4 gap-3">
        <button onClick={toggleSidebar} className="p-1.5 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors">
          <Icons.Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-content-primary text-[15px] tracking-tight">MedCloud</span>
            <span className="text-[11px] text-content-tertiary">by Cosentus.ai</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {Object.entries(sections).map(([section, mods]) => (
          <div key={section} className="mb-2">
            {!sidebarCollapsed && (
              <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider px-3 pt-5 pb-2">
                {(section in {operations:1,ai:1,management:1,portal:1,system:1,clinical:1,myportal:1} ? t('sections', section as 'operations'|'ai'|'management'|'portal'|'system'|'clinical'|'myportal') : getSectionLabel(currentUser.role, section, portalType))}
              </div>
            )}
            {mods.map(mod => {
              const isActive = pathname === mod.path || pathname.startsWith(mod.path + '/')
              const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[mod.icon] || Icons.Circle
              return (
                <Link key={mod.id} href={mod.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-[14px] transition-all
                    ${isActive
                      ? 'bg-brand/10 text-brand font-semibold'
                      : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? mod.label : undefined}>
                  <IconComp size={18} />
                  {!sidebarCollapsed && <span className="truncate">{mod.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
