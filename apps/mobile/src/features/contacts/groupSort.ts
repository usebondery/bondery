import type { GroupWithCount } from "@bondery/schemas";
import type { GroupSortOrder } from "../../lib/preferences/useMobilePreferences";

function compareByLabel(left: GroupWithCount, right: GroupWithCount): number {
  return left.label.localeCompare(right.label);
}

export function sortGroups(
  groups: GroupWithCount[],
  sortOrder: GroupSortOrder,
  groupLastOpenedAt: Record<string, number>,
): GroupWithCount[] {
  const sorted = [...groups];

  switch (sortOrder) {
    case "count-desc":
      return sorted.sort((left, right) => {
        const countDiff = right.contactCount - left.contactCount;
        return countDiff !== 0 ? countDiff : compareByLabel(left, right);
      });
    case "count-asc":
      return sorted.sort((left, right) => {
        const countDiff = left.contactCount - right.contactCount;
        return countDiff !== 0 ? countDiff : compareByLabel(left, right);
      });
    case "alpha-asc":
      return sorted.sort(compareByLabel);
    case "alpha-desc":
      return sorted.sort((left, right) => right.label.localeCompare(left.label));
    case "recent-opened":
      return sorted.sort((left, right) => {
        const leftOpenedAt = groupLastOpenedAt[left.id] ?? 0;
        const rightOpenedAt = groupLastOpenedAt[right.id] ?? 0;
        const openedDiff = rightOpenedAt - leftOpenedAt;
        return openedDiff !== 0 ? openedDiff : compareByLabel(left, right);
      });
    default:
      return sorted;
  }
}
