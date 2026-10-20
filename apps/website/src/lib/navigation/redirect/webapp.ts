import { webappUrl } from "@/lib/webapp-url";
import { permanentRedirectExternal, redirectExternal } from "./external";

function buildWebappRedirectTarget(
  pathname: string,
  segments: string[] = [],
  search?: string,
): string {
  let target = webappUrl(pathname, segments);
  if (search) {
    target += search.startsWith("?") ? search : `?${search}`;
  }
  return target;
}

/**
 * Cross-origin redirect to the webapp. Intentionally outside the website `Route` union.
 */
export function redirectWebapp(pathname: string, segments: string[] = [], search?: string): never {
  redirectExternal(buildWebappRedirectTarget(pathname, segments, search));
}

export function permanentRedirectWebapp(pathname: string, segments: string[] = []): never {
  permanentRedirectExternal(webappUrl(pathname, segments));
}
