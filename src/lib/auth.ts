const TOKEN_KEY = 'cosentus_auth_token'

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

export function isTokenExpired(): boolean {
  const token = getAuthToken()
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !payload.exp || Date.now() / 1000 > payload.exp
  } catch {
    return true
  }
}

export async function refreshToken(): Promise<string | null> {
  clearAuthToken()
  return null
}
