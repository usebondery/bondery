/**
 * Path segments that classify a route as tier-5 auxiliary in API documentation order.
 * First segment after the resource root (e.g. `/api/contacts/{segment}/…`).
 */
export const AUXILIARY_FIRST_SEGMENTS = [
  "merge",
  "merge-recommendations",
  "enrich-queue",
  "keep-in-touch",
  "mcp-consents",
] as const;

export type AuxiliaryFirstSegment = (typeof AUXILIARY_FIRST_SEGMENTS)[number];

/** Canonical sidebar tag order in published API docs. */
export const OPENAPI_TAG_ORDER = [
  "Health",
  "Auth",
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
  "Mobile",
  "Chat",
  "Subscriptions",
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

export type OpenApiPathTier = 1 | 2 | 3 | 4 | 5;

const TIER_RESOURCE_ROOT: OpenApiPathTier = 1;
/** A fixed sub-path such as `/contacts/search`. */
const TIER_STATIC_SUBPATH: OpenApiPathTier = 2;
/** One item by id, such as `/contacts/{id}`. */
const TIER_SINGLE_ITEM: OpenApiPathTier = 3;
/** A path below an item, such as `/contacts/{id}/groups`. */
const TIER_ITEM_SUBRESOURCE: OpenApiPathTier = 4;
const TIER_AUXILIARY: OpenApiPathTier = 5;

/**
 * Classify an OpenAPI path into a documentation tier (1–5).
 * @param path - Full path e.g. `/api/contacts/{id}/groups`
 */
export function getPathTier(path: string): OpenApiPathTier {
  const segments = path.split("/").filter(Boolean);
  // OpenAPI paths omit the `/api` prefix; strip it when present.
  const start = segments[0] === "api" ? 1 : 0;
  const resourceSegments = segments.slice(start);

  if (resourceSegments.length <= 1) {
    return TIER_RESOURCE_ROOT;
  }

  const afterResource = resourceSegments.slice(1);

  if (afterResource.length === 0) {
    return TIER_RESOURCE_ROOT;
  }

  const first = afterResource[0];
  if (!first) {
    return TIER_RESOURCE_ROOT;
  }

  if (AUXILIARY_FIRST_SEGMENTS.includes(first as AuxiliaryFirstSegment)) {
    return TIER_AUXILIARY;
  }

  if (first.startsWith("{") && first.endsWith("}")) {
    if (afterResource.length === 1) {
      return TIER_SINGLE_ITEM;
    }
    return TIER_ITEM_SUBRESOURCE;
  }

  if (afterResource.some((segment) => segment.startsWith("{") && segment.endsWith("}"))) {
    return TIER_ITEM_SUBRESOURCE;
  }

  return TIER_STATIC_SUBPATH;
}
