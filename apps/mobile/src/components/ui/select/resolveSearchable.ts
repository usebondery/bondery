import type { SelectSearchable } from "./types";

/** Enable sheet search when `searchable` is `"auto"` and the list is at least this long. */
export const SELECT_SEARCH_AUTO_THRESHOLD = 8;

export function resolveSelectSearchable(
  searchable: SelectSearchable | undefined,
  dataLength: number,
): boolean {
  if (searchable === "auto") {
    return dataLength >= SELECT_SEARCH_AUTO_THRESHOLD;
  }

  return searchable ?? false;
}
