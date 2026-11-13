/**
 * True when the magic-link JSON asks this browser to open `url`.
 * The auth client returns that JSON body. It keeps `redirect` and `url`.
 */
export function magicLinkResultNavigates(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const body = data as { redirect?: unknown; url?: unknown };
  return body.redirect === true && typeof body.url === "string" && body.url.length > 0;
}
