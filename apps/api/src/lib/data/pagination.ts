export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;

export interface PaginationMeta {
  hasMore: boolean;
  limit: number;
  offset: number;
  search: string | null;
  sort: string | null;
  totalCount: number;
}

export interface PaginationInput {
  limit?: number | string;
  offset?: number | string;
}

function toInt(value: number | string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parsePagination(query: PaginationInput = {}): {
  limit: number;
  offset: number;
} {
  const rawLimit = toInt(query.limit, DEFAULT_PAGE_LIMIT);
  const limit = Math.min(Math.max(rawLimit, 1), MAX_PAGE_LIMIT);
  const offset = Math.max(toInt(query.offset, 0), 0);
  return { limit, offset };
}

export function normalizeSearch(value?: string): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveSort(
  requested: string | undefined,
  defaultSort: string | null,
): string | null {
  if (typeof requested === "string" && requested.length > 0) {
    return requested;
  }
  return defaultSort;
}

export function buildPaginationMeta(options: {
  limit: number;
  offset: number;
  totalCount: number;
  itemCount: number;
  sort?: string | null;
  search?: string | null;
}): PaginationMeta {
  const { limit, offset, totalCount, itemCount } = options;
  return {
    hasMore: offset + itemCount < totalCount,
    limit,
    offset,
    search: options.search ?? null,
    sort: options.sort ?? null,
    totalCount,
  };
}

export function buildPaginatedResponse<T, K extends string>(
  key: K,
  items: T[],
  meta: PaginationMeta,
): Record<K, T[]> & { pagination: PaginationMeta } {
  return {
    [key]: items,
    pagination: meta,
  } as Record<K, T[]> & { pagination: PaginationMeta };
}
