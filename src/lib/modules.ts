import { ModuleConfig, UserRole } from '@/types'

const allRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team', 'client']
const staffRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']
const clientRoles: UserRole[] = ['client']

export const modules: ModuleConfig[] = [
  // === OPERATIONS (Core RCM) ===
  { id: 'dashboard', label: 'mod.dashboard', icon: 'LayoutDashboard', path: '/dashboard', section: 'operations', roles: staffRoles },
  { id: 'claims', label: 'mod.claims', icon: 'FileText', path: '/claims', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller'] },
  { id: 'coding', label: 'mod.coding', icon: 'BrainCircuit', path: '/coding', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'coder'] },
  { id: 'eligibility', label: 'mod.eligibility', icon: 'ShieldCheck', path: '/eligibility', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller'] },
  { id: 'denials', label: 'mod.denials', icon: 'ShieldAlert', path: '/denials', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller', 'ar_team'] },
  { id: 'ar', label: 'mod.ar', icon: 'TrendingUp', path: '/ar-management', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'ar_team'] },
  { id: 'posting', label: 'mod.posting', icon: 'Receipt', path: '/payment-posting', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'posting_team'] },
  { id: 'contracts', label: 'mod.contracts', icon: 'Scale', path: '/contracts', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager'] },
  { id: 'scheduling', label: 'mod.scheduling', icon: 'CalendarDays', path: '/scheduling', section: 'operations', roles: staffRoles },

  // === AI & AUTOMATION ===
  { id: 'voice', label: 'mod.voice', icon: 'Phone', path: '/voice-ai', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'ar_team'] },
  { id: 'scribe', label: 'mod.scribe', icon: 'Mic', path: '/ai-scribe', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'coder'] },
  { id: 'tasks', label: 'mod.tasks', icon: 'ListChecks', path: '/tasks', section: 'ai', roles: staffRoles },

  // === MANAGEMENT ===
  { id: 'documents', label: 'mod.documents', icon: 'FolderOpen', path: '/documents', section: 'management', roles: staffRoles },
  { id: 'credentialing', label: 'mod.credentialing', icon: 'BadgeCheck', path: '/credentialing', section: 'management', roles: ['admin', 'director', 'supervisor', 'manager'] },
  { id: 'analytics', label: 'mod.analytics', icon: 'BarChart3', path: '/analytics', section: 'management', roles: ['admin', 'director', 'supervisor', 'manager'] },
  { id: 'admin', label: 'mod.admin', icon: 'Settings', path: '/admin', section: 'system', roles: ['admin'] },
  { id: 'integrations', label: 'mod.integrations', icon: 'Plug', path: '/integrations', section: 'system', roles: ['admin', 'director'] },

  // === CLIENT PORTAL ===
  { id: 'scan', label: 'mod.scan', icon: 'ScanLine', path: '/portal/scan-submit', section: 'portal', roles: clientRoles },
  { id: 'watch', label: 'mod.watch', icon: 'Eye', path: '/portal/watch-track', section: 'portal', roles: clientRoles },
  { id: 'talk', label: 'mod.talk', icon: 'MessageSquare', path: '/portal/talk-to-us', section: 'portal', roles: clientRoles },
  { id: 'portal-patients', label: 'mod.patients', icon: 'Users', path: '/portal/patients', section: 'portal', roles: clientRoles },
]

export const sectionLabels: Record<string, string> = {
  operations: 'nav.operations',
  ai: 'nav.ai',
  management: 'nav.management',
  portal: 'nav.portal',
  system: 'nav.system',
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
