/**
 * chrome.identity and some Node fetches fail when `localhost` resolves to
 * IPv6 `::1`. Pin loopback HTTP to 127.0.0.1. Do not use this for the RFC
 * 8707 `resource` parameter — that identifier must match `BONDERY_PUBLIC_API_URL`.
 */
export function oauthHttpBaseUrl(apiUrl: string): string {
  return apiUrl.replace("http://localhost:", "http://127.0.0.1:").replace(/\/+$/, "");
}

/** Canonical protected-resource identifier (RFC 8707). */
export function oauthResourceIdentifier(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, "");
}

/**
 * Chrome match patterns cannot include a port (`Hostname cannot include a port`).
 * `http://localhost/*` still matches every localhost port. Token/authorize
 * fetches pin loopback HTTP to 127.0.0.1 while env is usually `localhost` —
 * list both hostnames.
 */
export function loopbackHostPermissionPatterns(url: string): string[] {
  try {
    const parsed = new URL(url);
    const patternFor = (hostname: string) => `${parsed.protocol}//${hostname}/*`;
    const patterns = [patternFor(parsed.hostname)];
    if (parsed.hostname === "localhost") {
      patterns.push(patternFor("127.0.0.1"));
    } else if (parsed.hostname === "127.0.0.1") {
      patterns.push(patternFor("localhost"));
    }
    return [...new Set(patterns)];
  } catch {
    return [];
  }
}
