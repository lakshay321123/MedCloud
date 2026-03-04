import { demoClients } from '@/lib/demo-data'

export type RegionType = 'us' | 'uae'

export const UAE_ORG_IDS: readonly string[] = ['org-101', 'org-104']
export const US_ORG_IDS: readonly string[]  = ['org-102', 'org-103']
export const UAE_CLIENT_NAMES = ['Gulf Medical Center', 'Dubai Wellness Clinic'] as const
export const US_CLIENT_NAMES  = ['Irvine Family Practice', 'Patel Cardiology'] as const

export function getOrgRegion(orgId: string): RegionType {
  return (demoClients.find(c => c.id === orgId)?.region as RegionType) ?? 'us'
}

/**
 * Master filter for ALL region-scoped data across the platform.
 * Every page uses this — never hardcode 'org-102' again.
 */
export function filterByRegion<T extends { clientId?: string; client_id?: string }>(
  data: T[],
  currentUserOrgId: string,
  currentUserRole: string,
  selectedClientId: string | null | undefined,
  country: 'uae' | 'usa' | null
): T[] {
  const clinicRoles = ['provider', 'client', 'doctor', 'frontdesk']
  const isClinicUser = clinicRoles.includes(currentUserRole)

  if (isClinicUser) {
    return data.filter(item => {
      const cid = item.clientId ?? item.client_id
      return cid === currentUserOrgId
    })
  }

  if (selectedClientId) {
    return data.filter(item => {
      const cid = item.clientId ?? item.client_id
      return cid === selectedClientId
    })
  }

  if (country) {
    const region = country === 'uae' ? 'uae' : 'us'
    const regionOrgIds = new Set(demoClients.filter(c => c.region === region).map(c => c.id))
    return data.filter(item => {
      const cid = item.clientId ?? item.client_id
      return !cid || regionOrgIds.has(cid)
    })
  }

  return data
}

/** Format a DOB string to human-readable — never show raw ISO */
export function formatDOB(dob: string | undefined): string {
  if (!dob) return '—'
  try {
    const dateOnly = dob.includes('T') ? dob.split('T')[0] : dob
    return new Date(dateOnly + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
  } catch {
    return dob
  }
}

/** Generate friendly MRN from patient index or id */
export function toMRN(id: string): string {
  const match = id.match(/\d+$/)
  if (match) return `MRN-${match[0].padStart(4, '0')}`
  return `MRN-${id.slice(-4).toUpperCase()}`
}

/** Compute profile completeness % dynamically */
export function computeProfileComplete(patient: {
  firstName?: string; lastName?: string; dob?: string; gender?: string;
  phone?: string; email?: string;
  address?: object | null;
  insurance?: object | null;
  emergencyContact?: object | null;
  ssn?: string; emiratesId?: string;
}): number {
  const checks = [
    !!patient.firstName,
    !!patient.lastName,
    !!patient.dob,
    !!patient.gender,
    !!patient.phone,
    !!patient.email,
    !!patient.address,
    !!patient.insurance,
    !!patient.emergencyContact,
    !!(patient.ssn || patient.emiratesId),
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}
