'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { getModulesBySection, sectionLabels } from '@/lib/modules'
import { t } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, BrainCircuit, ShieldCheck, ShieldAlert,
  TrendingUp, Receipt, Scale, CalendarDays, Phone, Mic, ListChecks,
  FolderOpen, BadgeCheck, BarChart3, Settings, Plug, ScanLine, Eye,
  MessageSquare, Users, ChevronLeft, ChevronRight, Zap,
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, BrainCircuit, ShieldCheck, ShieldAlert,
  TrendingUp, Receipt, Scale, CalendarDays, Phone, Mic, ListChecks,
  FolderOpen, BadgeCheck, BarChart3, Settings, Plug, ScanLine, Eye,
  MessageSquare, Users,
}

export default function Sidebar() {
  const { language, currentUser, sidebarCollapsed, toggleSidebar } = useApp()
  const pathname = usePathname()
  const sections = getModulesBySection(currentUser.role)

  const sectionOrder = ['operations', 'ai', 'management', 'portal', 'system']

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 border-r',
      'bg-[var(--bg-secondary)] border-[var(--border-color)]',
      sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
    )}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--border-color)] flex-shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Zap className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in">
              <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">MedCloud</span>
              <span className="text-[10px] font-mono text-brand block -mt-0.5">by Cosentus.ai</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sectionOrder.map(sectionKey => {
          const mods = sections[sectionKey]
          if (!mods?.length) return null

          return (
            <div key={sectionKey} className="mb-4">
              {!sidebarCollapsed && (
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">
                    {t(sectionLabels[sectionKey], language)}
                  </span>
                </div>
              )}
              {mods.map(mod => {
                const Icon = iconMap[mod.icon] || FileText
                const isActive = pathname === mod.path
                return (
                  <Link
                    key={mod.id}
                    href={mod.path}
                    title={sidebarCollapsed ? t(mod.label, language) : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all duration-150 group',
                      isActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                    )}
                  >
                    <Icon size={18} className={cn(
                      'flex-shrink-0 transition-colors',
                      isActive ? 'text-brand' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    )} />
                    {!sidebarCollapsed && (
                      <span className="text-[13px] font-medium truncate animate-fade-in">
                        {t(mod.label, language)}
                      </span>
                    )}
                    {!sidebarCollapsed && mod.badge && (
                      <span className="ml-auto text-[10px] font-mono bg-brand/20 text-brand px-1.5 py-0.5 rounded-full">
                        {mod.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="h-10 flex items-center justify-center border-t border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
