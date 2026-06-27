import type { Tag, TagWithCount } from "@bondery/schemas";
import type { TagSortOrder } from "../../lib/preferences/useMobilePreferences";

function compareTagLabels(left: Tag, right: Tag): number {
  return (left.label ?? "").localeCompare(right.label ?? "");
}

export function sortTags(tags: TagWithCount[], sortOrder: TagSortOrder): TagWithCount[] {
  const sorted = [...tags];

  switch (sortOrder) {
    case "count-desc":
      return sorted.sort((left, right) => {
        const countDiff = right.contactCount - left.contactCount;
        return countDiff !== 0 ? countDiff : compareTagLabels(left, right);
      });
    case "count-asc":
      return sorted.sort((left, right) => {
        const countDiff = left.contactCount - right.contactCount;
        return countDiff !== 0 ? countDiff : compareTagLabels(left, right);
      });
    case "alpha-asc":
      return sorted.sort(compareTagLabels);
    case "alpha-desc":
      return sorted.sort((left, right) => right.label.localeCompare(left.label ?? ""));
    default:
      return sorted;
  }
}

export function sortTagsByLabel<T extends Tag>(tags: T[]): T[] {
  return sortTags(tags as TagWithCount[], "alpha-asc") as T[];
}
