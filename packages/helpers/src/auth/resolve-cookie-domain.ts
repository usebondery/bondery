const PATTERN_5E5C647B312C_RE = /^\d{1,3}(?<group1>\.\d{1,3}){3}$/u;

function isIpHostname(hostname: string): boolean {
  if (hostname.includes(":")) {
    return true;
  }

  return PATTERN_5E5C647B312C_RE.test(hostname);
}

/**
 * Resolves the parent domain for Better Auth `crossSubDomainCookies` from a
 * public webapp URL (e.g. `https://app.usebondery.com` → `usebondery.com`).
 *
 * Returns `undefined` for localhost, IP hosts, and invalid input so cookies
 * stay host-only in local development.
 */
export function resolveCookieDomain(webappUrl: string | undefined): string | undefined {
  if (!webappUrl?.trim()) {
    return undefined;
  }

  let hostname: string;
  try {
    hostname = new URL(webappUrl.trim()).hostname.toLowerCase();
  } catch {
    return undefined;
  }

  if (!hostname || hostname === "localhost" || isIpHostname(hostname)) {
    return undefined;
  }

  const parts = hostname.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  if (parts.length === 2) {
    return hostname;
  }

  return parts.slice(1).join(".");
}
