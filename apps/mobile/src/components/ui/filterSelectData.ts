export type SelectFilterItem = {
  label: string;
  searchKeywords?: string;
  searchText?: string;
  value: string;
};

/** Filter select rows by label, value, or extra keywords. */
export function filterSelectData<TItem extends SelectFilterItem>(
  data: TItem[],
  query: string,
): TItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return data;
  }

  return data.filter((item) => {
    const haystack =
      `${item.label} ${item.value} ${item.searchKeywords ?? ""} ${item.searchText ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
