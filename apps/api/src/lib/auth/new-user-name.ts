/**
 * Display-name helpers for first-time Better Auth users.
 *
 * OAuth already supplies `user.name` from the IdP. Magic-link verify often
 * creates the user with an empty name — fall back to the email local-part
 * without changing case.
 */

const WHITESPACE_PATTERN = /\s+/u;
export function firstNameFromEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) {
    return "";
  }

  return trimmed.slice(0, at);
}

export function splitDisplayName(name: string | null | undefined): {
  firstName: string;
  lastName: string | null;
} {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) {
    return { firstName: "", lastName: null };
  }

  const [firstName = "", ...rest] = trimmed.split(WHITESPACE_PATTERN);
  const lastName = rest.join(" ").trim();
  return { firstName, lastName: lastName || null };
}

export function resolveNewUserDisplayName(params: {
  email?: string | null;
  name?: string | null;
}): string {
  const trimmedName = params.name?.trim() ?? "";
  if (trimmedName) {
    return trimmedName;
  }

  return firstNameFromEmail(params.email ?? "");
}
