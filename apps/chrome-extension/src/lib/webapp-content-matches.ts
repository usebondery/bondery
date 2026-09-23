const PRODUCTION_WEBAPP_MATCH = "https://app.usebondery.com/*";
const LOCALHOST_MATCH = "http://localhost/*";

function originMatch(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const origin = new URL(url).origin;
    if (!origin || origin === "null") {
      return null;
    }
    return `${origin}/*`;
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
  const matches = [PRODUCTION_WEBAPP_MATCH, LOCALHOST_MATCH];
  if (flavor === "production") {
    return matches;
  }
  const extra = originMatch(webappUrl);
  if (extra && !matches.includes(extra)) {
    matches.push(extra);
  }
  return matches;
}
