// Simple client-side abuse filter
// Backend validation via AWS Comprehend is a Sprint 2 task (Dev 1)
// This is the frontend guard

const BLOCKED_TERMS: string[] = [
  // Profanity and abusive language — list maintained separately
  'profanity1', 'profanity2',
]

export interface AbuseCheckResult {
  isAbusive: boolean
  matchedTerm?: string
}

export function checkForAbuse(text: string): AbuseCheckResult {
  if (!text || text.trim().length === 0) return { isAbusive: false }
  const lower = text.toLowerCase()
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { isAbusive: true, matchedTerm: term }
    }
  }
  return { isAbusive: false }
}

// Hook for use in form components
export function useAbuseFilter() {
  const validate = (text: string): boolean => {
    const result = checkForAbuse(text)
    return !result.isAbusive
  }

  const getError = (text: string): string | null => {
    const result = checkForAbuse(text)
    if (result.isAbusive) {
      return 'This message contains language that is not permitted on this platform.'
    }
    return null
  }

  return { validate, getError }
}

// Track abuse violations in localStorage; alert supervisor after 3
export function handleAbuseViolation(userId: string): void {
  const key = `abuse_violations_${userId}`
  const count = parseInt(localStorage.getItem(key) || '0') + 1
  localStorage.setItem(key, String(count))
  if (count >= 3) {
    // Sprint 2: POST to /api/violations to create supervisor task
    console.warn(`User ${userId} has reached ${count} abuse violations. Supervisor notified.`)
  }
}
