const PRODUCTION_WEBAPP_MATCH = "https://app.usebondery.com/*";
const LOCALHOST_MATCH = "http://localhost/*";
const LOOPBACK_IPV4_MATCH = "http://127.0.0.1/*";

function originMatch(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) {
      return null;
    }
    // Chrome match patterns cannot include a port.
    return `${parsed.protocol}//${parsed.hostname}/*`;
  } catch {
    return null;
  }
}

/**
 * CWS production flavor never adds extra hosts, so a mis-baked beta URL cannot
 * ship in the store listing. Staging/local may add the baked webapp origin.
 */
export function webappContentMatches(
  flavor = import.meta.env.BONDERY_EXTENSION_FLAVOR,
  webappUrl = import.meta.env.BONDERY_PUBLIC_WEBAPP_URL,
): string[] {
  const matches = [PRODUCTION_WEBAPP_MATCH, LOCALHOST_MATCH, LOOPBACK_IPV4_MATCH];
  if (flavor === "production") {
    return matches;
  }
  const extra = originMatch(webappUrl);
  if (extra && !matches.includes(extra)) {
    matches.push(extra);
  }
  return matches;
}
