import type { Href } from "expo-router";

/**
 * Stable string key for deduping navigation requests (pathname + sorted params).
 */
export function serializeHref(href: Href): string {
  if (typeof href === "string") {
    return href;
  }

  if (typeof href === "object" && href !== null && "pathname" in href) {
    const record = href as { params?: Record<string, unknown>; pathname: string };
    const params = record.params ?? {};
    const keys = Object.keys(params).sort();
    if (keys.length === 0) {
      return record.pathname;
    }

    const query = keys.map((key) => `${key}=${String(params[key] ?? "")}`).join("&");
    return `${record.pathname}?${query}`;
  }

  return String(href);
}
