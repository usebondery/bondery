import type { PaginationMeta } from "@bondery/schemas";

export type { PaginationMeta };

export function normalizePaginatedList<T, K extends string>(
  raw: Record<string, unknown>,
  key: K,
  fallbackLimit = 50,
): { items: T[]; pagination: PaginationMeta } {
  const items = (raw[key] as T[] | undefined) ?? [];
  const pagination = raw.pagination as PaginationMeta | undefined;

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
      limit: fallbackLimit,
      offset: 0,
      totalCount,
      hasMore: false,
      sort: null,
      search: null,
    },
  };
}
