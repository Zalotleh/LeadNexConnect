/**
 * Patterns that signal prompt injection, extraction, or jailbreak attempts.
 * All patterns are case-insensitive. Add new patterns without changing the interface.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|prior|above|all)\s+instructions?/i,
  /repeat\s+(your|the)\s+(system\s+)?prompt/i,
  /what\s+(were|are)\s+you\s+told\s+to/i,
  /print\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+me\s+your\s+(system\s+)?prompt/i,
  /forget\s+(everything|all)\s+(above|previous|prior)/i,
  /you\s+are\s+now\s+a\s+(different|new|better|unrestricted)/i,
  /start\s+acting\s+as/i,
  /pretend\s+to\s+be\s+(?!a\s+(spa|gym|clinic|salon|studio|restaurant))/i,
  /jailbreak/i,
  /\bDAN\s+mode\b/i,
  /override\s+(your|all)\s+(instructions?|directives?|rules?)/i,
  /disregard\s+(your|all)\s+(instructions?|rules?|guidelines?)/i,
  /access\s+(the\s+)?(database|db|other\s+users?|admin)/i,
  /SELECT\s+\*\s+FROM/i,   // raw SQL injection
  /DROP\s+TABLE/i,
  /exec\s*\(/i,
];

export interface SanitizeResult {
  safe: boolean;
  reason?: string; // only populated when safe = false; log server-side, never return to client
}

/**
 * Returns { safe: true } for clean messages, or { safe: false, reason } for blocked ones.
 * Log blocked messages server-side for monitoring; never expose `reason` to the user.
 */
export function sanitizeMessage(message: string): SanitizeResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        safe: false,
        reason: `Matched injection pattern: ${pattern.toString()}`,
      };
    }
  }
  return { safe: true };
}
