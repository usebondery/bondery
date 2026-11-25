const REDACTED_EMAIL = "[redacted-email]";

/** Keys whose values never leave the server, matched case-insensitively at any depth. */
const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "email",
  "password",
  "secret",
  "set-cookie",
  "token",
]);

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/giu;

const MAX_DEPTH = 6;
/**
 * Redaction for anything sent to PostHog as operational data (logs, exceptions).
 * It may carry a pseudonymous user id, never contact details or secrets.
 */

export const REDACTED = "[redacted]";

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

/**
 * Replaces email addresses inside free text. Error messages are written by databases,
 * mail servers and SDKs, and can quote an address that no key-based rule would catch.
 */
export function scrubEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, REDACTED_EMAIL);
}

/**
 * Returns a copy of `value` with sensitive keys replaced and emails scrubbed from every
 * string. Leaves the input untouched.
 */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return scrubEmails(value);
  }
  if (value === null || typeof value !== "object" || depth >= MAX_DEPTH) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }

  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    copy[key] = isSensitiveKey(key) ? REDACTED : redactSensitive(item, depth + 1);
  }
  return copy;
}
