/**
 * Path segments that classify a route as tier-5 auxiliary in API documentation order.
 * First segment after the resource root (e.g. `/api/contacts/{segment}/…`).
 */
export const AUXILIARY_FIRST_SEGMENTS = ["merge", "merge-recommendations", "enrich-queue"] as const;

export type AuxiliaryFirstSegment = (typeof AUXILIARY_FIRST_SEGMENTS)[number];

/** Canonical sidebar tag order in published API docs. */
export const OPENAPI_TAG_ORDER = [
  "Health",
  "Contacts",
  "Groups",
  "Tags",
  "Interactions",
  "Import",
  "Share",
  "Geocode",
  "Me",
  "Sync",
  "Extension",
  "Chat",
  "Subscriptions",
  "Stats",
  "Webhooks",
  "Internal",
] as const;

export type OpenApiTagName = (typeof OPENAPI_TAG_ORDER)[number];

/** HTTP method rank for same-path ordering (lower = earlier in docs). */
export const HTTP_METHOD_ORDER = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
] as const;

export type HttpMethodName = (typeof HTTP_METHOD_ORDER)[number];

export function getHttpMethodRank(method: string): number {
  const rank = HTTP_METHOD_ORDER.indexOf(method.toLowerCase() as HttpMethodName);
  return rank === -1 ? HTTP_METHOD_ORDER.length : rank;
}

/**
 * Classify an OpenAPI path into a documentation tier (1–5).
 * @param path - Full path e.g. `/api/contacts/{id}/groups`
 */
export function getPathTier(path: string): number {
  const segments = path.split("/").filter(Boolean);
  // Expect at least `api` + resource
  if (segments.length <= 2) {
    return 1;
  }

  const afterResource = segments.slice(2);

  if (afterResource.length === 0) {
    return 1;
  }

  const first = afterResource[0];
  if (!first) {
    return 1;
  }

  if (AUXILIARY_FIRST_SEGMENTS.includes(first as AuxiliaryFirstSegment)) {
    return 5;
  }

  if (first.startsWith("{") && first.endsWith("}")) {
    if (afterResource.length === 1) {
      return 3;
    }
    return 4;
  }

  if (afterResource.some((segment) => segment.startsWith("{") && segment.endsWith("}"))) {
    return 4;
  }

  return 2;
}
