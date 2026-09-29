/**
 * `localhost` and `127.0.0.1` are different RFC 8707 resource identifiers.
 * Local env uses `localhost`; Chrome identity and Node IPv4 fetches use
 * `127.0.0.1`. Register both so authorize + JWT `aud` checks agree.
 * Non-loopback URLs are returned unchanged.
 *
 * Pathname is preserved so MCP (`…/mcp`) aliases stay on `/mcp`. Origin-only
 * REST identifiers (`pathname` `/` after trim) stay origin-only.
 */
export function withLoopbackUrlAlias(canonical: string): string[] {
  const trimmed = canonical.replace(/\/+$/, "");
  if (!trimmed) {
    return [];
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return [trimmed];
  }

  const port = url.port ? `:${url.port}` : "";
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  if (url.hostname === "localhost") {
    return [trimmed, `${url.protocol}//127.0.0.1${port}${pathname}`];
  }
  if (url.hostname === "127.0.0.1") {
    return [trimmed, `${url.protocol}//localhost${port}${pathname}`];
  }

  return [trimmed];
}
