import { API_URL } from "@/lib/config";

/** Build an API URL for outbound redirects and catalog entries from the marketing site. */
export function apiUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${API_URL}${path}`;
}
