/**
 * Cursor's MCP OAuth client registers as `application_type: "web"` (or omits
 * it, which Better Auth defaults to web) with RFC 8252 loopback HTTP
 * callbacks (`http://localhost:8787/callback`). Web clients cannot use
 * loopback HTTP; native clients can. Rewrite only when every redirect URI is
 * loopback HTTP so public internet HTTP redirects stay rejected.
 */
const LOOPBACK_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNativeLoopbackHttpRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") {
    return false;
  }
  if (url.username || url.password || uri.includes("#")) {
    return false;
  }
  return LOOPBACK_HTTP_HOSTS.has(url.hostname.toLowerCase());
}

export function rewriteDcrRegistrationBody(body: unknown): unknown {
  if (!isJsonRecord(body)) {
    return body;
  }
  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return body;
  }
  if (
    !redirectUris.every((uri) => typeof uri === "string" && isNativeLoopbackHttpRedirectUri(uri))
  ) {
    return body;
  }
  if (body.application_type === "native") {
    return body;
  }
  if (body.application_type !== undefined && body.application_type !== "web") {
    return body;
  }
  return { ...body, application_type: "native" };
}
