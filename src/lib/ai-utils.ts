/**
 * Sanitizes user-controlled strings before interpolation into LLM prompts.
 * Strips patterns that could be used for prompt injection — instruction
 * override attempts, role declarations, system prompt delimiters.
 *
 * This is a defence-in-depth measure. The /api/ai route is the primary
 * enforcement point (server-side, no untrusted tool calls, output is text only).
 */
export function sanitizeForPrompt(value: string | undefined | null, maxLen = 500): string {
  if (!value) return ''
  return value
    .slice(0, maxLen)
    // Strip common injection patterns
    .replace(/\bignore\s+(previous|above|all)\b/gi, '[redacted]')
    .replace(/\bnew\s+instruction[s]?\b/gi, '[redacted]')
    .replace(/\bsystem\s*:\s*/gi, '')
    .replace(/\bassistant\s*:\s*/gi, '')
    .replace(/\buser\s*:\s*/gi, '')
    // Strip angle-bracket tags that could confuse XML-aware models
    .replace(/<[^>]{0,80}>/g, '')
    // Collapse excessive whitespace
    .replace(/\s{3,}/g, '  ')
    .trim()
}
