export interface PaginationMeta {
  hasMore: boolean;
  limit: number;
  offset: number;
  search: string | null;
  sort: string | null;
  totalCount: number;
}
