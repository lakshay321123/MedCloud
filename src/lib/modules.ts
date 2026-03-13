import { ModuleConfig, UserRole, PortalType } from '@/types'

const staffRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']
const leaderRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager']
const allRoles: UserRole[] = [...staffRoles, 'client', 'provider']

export const modules: ModuleConfig[] = [
  // OPERATIONS
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', section: 'operations', roles: allRoles },
  { id: 'claims', label: 'Claims Center', icon: 'FileText', path: '/claims', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller'] },
  { id: 'edi', label: 'EDI Transactions', icon: 'ArrowLeftRight', path: '/edi', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller'] },
  { id: 'coding', label: 'Ai Coding', icon: 'BrainCircuit', path: '/coding', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'coder'] },
  { id: 'coding-rules', label: 'Coding Rules', icon: 'Zap', path: '/coding-rules', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'coder'] },
  { id: 'eligibility', label: 'Eligibility', icon: 'ShieldCheck', path: '/eligibility', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller', 'client'] },
  { id: 'denials', label: 'Denials & Appeals', icon: 'ShieldAlert', path: '/denials', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'biller', 'ar_team'] },
  { id: 'ar', label: 'A/R Management', icon: 'TrendingUp', path: '/ar-management', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'ar_team'] },
  { id: 'posting', label: 'Payment Posting', icon: 'Receipt', path: '/payment-posting', section: 'operations', roles: ['admin', 'director', 'supervisor', 'manager', 'posting_team'] },
  { id: 'contracts', label: 'Contract Manager', icon: 'Scale', path: '/contracts', section: 'operations', roles: leaderRoles },

  // Ai & AUTOMATION
  { id: 'voice', label: 'Voice Ai', icon: 'Phone', path: '/voice-ai', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'ar_team'] },
  { id: 'scribe', label: 'Ai Scribe', icon: 'Mic', path: '/ai-scribe', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'provider'] },
  { id: 'tasks', label: 'Tasks & Workflows', icon: 'ListChecks', path: '/tasks', section: 'ai', roles: staffRoles },

  // MANAGEMENT — 'client' added so front-office (facility) can see Documents
  { id: 'documents', label: 'Documents', icon: 'FolderOpen', path: '/documents', section: 'management', roles: [...staffRoles, 'provider', 'client'] },
  { id: 'credentialing', label: 'Credentialing', icon: 'BadgeCheck', path: '/credentialing', section: 'management', roles: leaderRoles },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics', section: 'management', roles: [...leaderRoles, 'provider'] },
  { id: 'admin', label: 'Admin & Settings', icon: 'Settings', path: '/admin', section: 'system', roles: ['admin', 'director'] },
  { id: 'integrations', label: 'Integration Hub', icon: 'Plug', path: '/integrations', section: 'system', roles: ['admin', 'director'] },

  // CLIENT PORTAL
  { id: 'appointments', label: 'Appointments', icon: 'CalendarDays', path: '/portal/appointments', section: 'portal', roles: ['admin', 'director', 'supervisor', 'manager', 'biller', 'client', 'provider'] },
  { id: 'scan', label: 'Scan & Submit', icon: 'ScanLine', path: '/portal/scan-submit', section: 'portal', roles: ['client'] },
  { id: 'watch', label: 'Watch & Track', icon: 'Eye', path: '/portal/watch-track', section: 'portal', roles: ['client'] },
  { id: 'messages', label: 'Messages', icon: 'MessageCircle', path: '/portal/messages', section: 'portal', roles: allRoles },
  { id: 'portal-patients', label: 'Patients', icon: 'Users', path: '/portal/patients', section: 'portal', roles: ['client', 'provider', 'biller', 'manager', 'supervisor', 'admin', 'director'] },
]

// Facility portal shows this curated module set (role-filtered on top)
const facilityModuleIds = ['dashboard', 'scribe', 'documents', 'appointments', 'messages', 'portal-patients', 'scan', 'eligibility']

export const sectionLabels: Record<string, Record<string, string>> = {
  facility: { operations: 'OVERVIEW', ai: 'Ai TOOLS', management: 'FILES', portal: 'CLINICAL' },
  provider: { operations: 'OVERVIEW', ai: 'Ai TOOLS', management: 'FILES', portal: 'CLINICAL' },
  client: { portal: 'MY PRACTICE' },
  default: { operations: 'OPERATIONS', ai: 'Ai & AUTOMATION', management: 'MANAGEMENT', portal: 'CLIENT PORTAL', system: 'SYSTEM' },
}

export function getSectionLabel(role: UserRole, section: string, portalType?: PortalType | null): string {
  if (portalType === 'facility') {
    return sectionLabels.facility[section] || sectionLabels.default[section] || section.toUpperCase()
  }
  const roleLabels = sectionLabels[role] || {}
  return roleLabels[section] || sectionLabels.default[section] || section.toUpperCase()
}

export function getModulesForRole(role: UserRole): ModuleConfig[] {
  return modules.filter(m => m.roles.includes(role))
}

export function getModulesForPortal(role: UserRole, portalType: PortalType | null): ModuleConfig[] {
  if (portalType === 'facility') {
    return modules.filter(m => facilityModuleIds.includes(m.id) && m.roles.includes(role))
  }
  return getModulesForRole(role)
}

export function getModulesBySection(role: UserRole, portalType?: PortalType | null) {
  const available = portalType ? getModulesForPortal(role, portalType) : getModulesForRole(role)
  const sections: Record<string, ModuleConfig[]> = {}
  available.forEach(m => {
    if (!sections[m.section]) sections[m.section] = []
    sections[m.section].push(m)
  })
  return sections
}
