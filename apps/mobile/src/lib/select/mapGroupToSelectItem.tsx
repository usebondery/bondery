import type { GroupWithCount } from "@bondery/schemas";
import type { SelectDataItem } from "../../components/ui/select/index";
import { Text } from "../../components/ui/Text";
import { nonEmpty } from "../text";

export function mapGroupToSelectItem(
  group: GroupWithCount,
  fallbackBadgeColor: string,
): SelectDataItem<string> {
  const leftSection = group.emoji
    ? {
        backgroundColor: nonEmpty(group.color) ?? fallbackBadgeColor,
        emoji: group.emoji,
        type: "emojiBadge" as const,
      }
    : undefined;

  return {
    label: group.label,
    leftSection,
    rightSection: (
      <Text c="secondary" size="sm">
        {group.contactCount}
      </Text>
    ),
    searchText: group.label,
    value: group.id,
  };
}
