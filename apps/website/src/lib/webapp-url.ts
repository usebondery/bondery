import { WEBAPP_URL } from "@/lib/config";

/** Build a webapp URL for outbound redirects from the marketing site. */
export function webappUrl(pathname: string, segments: string[] = []) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const suffix = segments.length > 0 ? `/${segments.join("/")}` : "";
  return `${WEBAPP_URL}${path}${suffix}`;
}
