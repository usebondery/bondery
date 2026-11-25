/**
 * Strips plaintext magic-link tokens from logged URLs.
 * Better Auth puts the verify token in the query string.
 */

const TOKEN_QUERY_PARAM_PATTERN = /[?&]token=/iu;
export function redactSensitiveAuthQuery(url: string): string {
  if (!TOKEN_QUERY_PARAM_PATTERN.test(url)) {
    return url;
  }

  return url.replace(/(?<group1>[?&]token=)[^&]*/giu, "$1REDACTED");
}

export function isMagicLinkVerifyPath(urlPath: string): boolean {
  const path = urlPath.split("?")[0] ?? urlPath;
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return normalized.endsWith("/magic-link/verify");
}
