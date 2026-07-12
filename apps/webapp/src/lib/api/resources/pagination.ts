import type { PaginationMeta } from "@bondery/schemas";

export type { PaginationMeta };

export function normalizePaginatedList<T, K extends string>(
  raw: object,
  key: K,
  fallbackLimit = 50,
): { items: T[]; pagination: PaginationMeta } {
  const record = raw as Record<string, unknown>;
  const items = (record[key] as T[] | undefined) ?? [];
  const pagination = record.pagination as PaginationMeta | undefined;

  if (pagination) {
    return { items, pagination };
  }

  const legacyTotalCount = record.totalCount;
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
