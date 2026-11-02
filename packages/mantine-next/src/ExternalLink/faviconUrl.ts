/** Returns the hostname of an `http(s)` or protocol-relative URL, or `null` for any other input. */
export function linkHostname(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  return url.hostname || null;
}

/** DuckDuckGo favicon URL for a host. The page CSP must allow `icons.duckduckgo.com`. */
export function faviconUrlForHost(host: string): string {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return `https://icons.duckduckgo.com/ip3/${normalized}.ico`;
}
