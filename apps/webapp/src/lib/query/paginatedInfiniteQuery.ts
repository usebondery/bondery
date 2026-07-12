import type { PaginationMeta } from "@bondery/schemas";

/** Shape shared by paginated list API responses used with `useInfiniteQuery`. */
export type PaginatedListPage = {
  pagination: PaginationMeta;
};

/** Computes the next page offset from a paginated API response page. */
export function nextPaginatedOffset(lastPage: PaginatedListPage): number | undefined {
  if (!lastPage.pagination.hasMore) {
    return undefined;
  }
  return lastPage.pagination.offset + lastPage.pagination.limit;
}
