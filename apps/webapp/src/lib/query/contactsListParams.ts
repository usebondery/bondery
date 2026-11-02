import type { SortOrder } from "@/lib/api/resources/contacts";

export const DEFAULT_CONTACTS_SORT: SortOrder = "nameAsc";

const SORT_ORDERS = new Set<SortOrder>([
  "nameAsc",
  "nameDesc",
  "surnameAsc",
  "surnameDesc",
  "interactionAsc",
  "interactionDesc",
  "createdAtAsc",
  "createdAtDesc",
]);

function isSortOrder(value: string | undefined): value is SortOrder {
  return value !== undefined && SORT_ORDERS.has(value as SortOrder);
}

/** Normalized search + sort + tag ids used for contacts list query keys, API calls, and table UI. */
export type ContactsListFilterParams = {
  search?: string;
  sort: SortOrder;
  /** Contact matches any listed tag id (OR). Sorted so the React Query key is stable. */
  tagIds?: string[];
};

/**
 * Parses URL/searchParams into canonical contacts list filter params.
 * Use at every RSC → client boundary so prefetch keys match client hooks.
 */
export function parseContactsListParams(input: {
  search?: string;
  sort?: string;
  tagIds?: Array<string | null | undefined>;
}): ContactsListFilterParams {
  const search = input.search?.trim() || undefined;
  const sort = isSortOrder(input.sort) ? input.sort : DEFAULT_CONTACTS_SORT;
  const tagIds = input.tagIds
    ?.map((id) => id?.trim() ?? "")
    .filter((id) => id.length > 0)
    .sort();
  return {
    search,
    sort,
    ...(tagIds && tagIds.length > 0 ? { tagIds } : {}),
  };
}
