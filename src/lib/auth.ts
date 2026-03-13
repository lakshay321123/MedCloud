const TOKEN_KEY = 'cosentus_auth_token'

// All localStorage keys set during login — must be cleared on logout
const SESSION_KEYS = [
  TOKEN_KEY,
  'cosentus_region',
  'cosentus_portal_type',
  'cosentus_role',
  'cosentus_user_name',
  'cosentus_user_email',
  'cosentus_org_id',
  'cosentus_client_id',
  'cosentus_selected_client',
  'cosentus_theme',
]

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

/** Clear all session/auth data from localStorage — used on logout and token expiry */
export function clearAllSession(): void {
  if (typeof window === 'undefined') return
  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key)
  }
}

export function isTokenExpired(): boolean {
  const token = getAuthToken()
  if (!token) return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('[auth] Malformed JWT — expected 3 parts, got', parts.length)
      return true
    }
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !payload.exp || Date.now() / 1000 > payload.exp
  } catch (err) {
    console.error('[auth] Failed to parse auth token payload', err)
    return true
  }
}

export async function refreshToken(): Promise<string | null> {
  // No refresh token flow yet — clear session and redirect to login
  clearAllSession()
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
  return null
}
