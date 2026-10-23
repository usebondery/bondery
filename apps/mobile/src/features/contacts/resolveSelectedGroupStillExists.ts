import type { GroupWithCount } from "@bondery/schemas";

export function resolveSelectedGroupStillExists(
  groups: GroupWithCount[],
  selectedGroupId: string | null,
): boolean {
  if (!selectedGroupId) {
    return true;
  }

  return groups.some((group) => group.id === selectedGroupId);
}
