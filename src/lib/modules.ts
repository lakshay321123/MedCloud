import { ModuleConfig, UserRole } from '@/types'

const staffRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']
const leaderRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager']
const allRoles: UserRole[] = [...staffRoles, 'client', 'provider']

export const modules: ModuleConfig[] = [
  // OPERATIONS (staff only)
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', section: 'operations', roles: allRoles },
  { id: 'claims', label: 'Claims Center', icon: 'FileText', path: '/claims', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller'] },
  { id: 'coding', label: 'AI Coding', icon: 'BrainCircuit', path: '/coding', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'coder'] },
  { id: 'eligibility', label: 'Eligibility', icon: 'ShieldCheck', path: '/eligibility', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller'] },
  { id: 'denials', label: 'Denials & Appeals', icon: 'ShieldAlert', path: '/denials', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller', 'ar_team'] },
  { id: 'ar', label: 'A/R Management', icon: 'TrendingUp', path: '/ar-management', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'ar_team'] },
  { id: 'posting', label: 'Payment Posting', icon: 'Receipt', path: '/payment-posting', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'posting_team'] },
  { id: 'contracts', label: 'Contract Manager', icon: 'Scale', path: '/contracts', section: 'operations', roles: leaderRoles },

  // AI & AUTOMATION
  { id: 'voice', label: 'Voice AI', icon: 'Phone', path: '/voice-ai', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'ar_team'] },
  { id: 'scribe', label: 'AI Scribe', icon: 'Mic', path: '/ai-scribe', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'coder', 'provider'] },
  { id: 'tasks', label: 'Tasks & Workflows', icon: 'ListChecks', path: '/tasks', section: 'ai', roles: staffRoles },

  // MANAGEMENT
  { id: 'documents', label: 'Documents', icon: 'FolderOpen', path: '/documents', section: 'management', roles: [...staffRoles, 'provider'] },
  { id: 'credentialing', label: 'Credentialing', icon: 'BadgeCheck', path: '/credentialing', section: 'management', roles: leaderRoles },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics', section: 'management', roles: leaderRoles },
  { id: 'admin', label: 'Admin & Settings', icon: 'Settings', path: '/admin', section: 'system', roles: ['admin'] },
  { id: 'integrations', label: 'Integration Hub', icon: 'Plug', path: '/integrations', section: 'system', roles: ['admin', 'director'] },

  // PORTAL — client gets full portal, provider gets limited
  { id: 'appointments', label: 'Appointments', icon: 'CalendarDays', path: '/portal/appointments', section: 'portal', roles: [...staffRoles, 'client', 'provider'] },
  { id: 'scan', label: 'Scan & Submit', icon: 'ScanLine', path: '/portal/scan-submit', section: 'portal', roles: ['client'] },
  { id: 'watch', label: 'Watch & Track', icon: 'Eye', path: '/portal/watch-track', section: 'portal', roles: ['client'] },
  { id: 'messages', label: 'Messages', icon: 'MessageCircle', path: '/portal/messages', section: 'portal', roles: allRoles },
  { id: 'portal-patients', label: 'Patients', icon: 'Users', path: '/portal/patients', section: 'portal', roles: ['client', 'provider'] },
]

export const sectionLabels: Record<string, Record<string, string>> = {
  provider: { operations: 'OVERVIEW', ai: 'AI TOOLS', management: 'FILES', portal: 'CLINICAL' },
  client: { portal: 'MY PRACTICE' },
  default: { operations: 'OPERATIONS', ai: 'AI & AUTOMATION', management: 'MANAGEMENT', portal: 'CLIENT PORTAL', system: 'SYSTEM' },
}

export function getSectionLabel(role: UserRole, section: string): string {
  const roleLabels = sectionLabels[role] || sectionLabels.default
  return roleLabels[section] || sectionLabels.default[section] || section.toUpperCase()
}

export function getModulesForRole(role: UserRole): ModuleConfig[] {
  return modules.filter(m => m.roles.includes(role))
}

export function getModulesBySection(role: UserRole) {
  const available = getModulesForRole(role)
  const sections: Record<string, ModuleConfig[]> = {}
  available.forEach(m => {
    if (!sections[m.section]) sections[m.section] = []
    sections[m.section].push(m)
  })
  return sections
}
