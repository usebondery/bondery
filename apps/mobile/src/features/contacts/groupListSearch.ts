import type { GroupWithCount } from "@bondery/schemas";

export function filterGroups(groups: GroupWithCount[], query: string): GroupWithCount[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return groups;
  }

  return groups.filter((group) => {
    const haystack = `${group.label} ${group.emoji ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
