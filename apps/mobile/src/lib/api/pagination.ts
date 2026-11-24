import type { PaginationMeta } from "@bondery/schemas";

type PaginatedListPayload = {
  pagination?: PaginationMeta;
  totalCount?: unknown;
} & Record<string, unknown>;

function normalizePaginatedList<T, K extends string>(
  raw: PaginatedListPayload,
  key: K,
  fallbackLimit = 50,
): { items: T[]; pagination: PaginationMeta } {
  const items = (raw[key] as T[] | undefined) ?? [];
  const { pagination } = raw;

  if (pagination) {
    return { items, pagination };
  }

  const legacyTotalCount = raw.totalCount;
  const totalCount =
    typeof legacyTotalCount === "number" && Number.isFinite(legacyTotalCount)
      ? legacyTotalCount
      : items.length;

  return {
    items,
    pagination: {
      hasMore: false,
      limit: fallbackLimit,
      offset: 0,
      search: null,
      sort: null,
      totalCount,
    },
  };
}

export type { PaginationMeta };
export { normalizePaginatedList };
