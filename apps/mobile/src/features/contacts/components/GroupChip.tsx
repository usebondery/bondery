import { StyleSheet, Text, View } from "react-native";
import type { Group } from "@bondery/schemas";
import { Tappable } from "../../../theme/Tappable";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

export type GroupChipGroup = Pick<Group, "id" | "label" | "emoji" | "color"> & {
  contactCount: number;
};

interface GroupChipProps {
  group: GroupChipGroup;
  onPress?: () => void;
  accessibilityLabel?: string;
  isClickable?: boolean;
}

export function GroupChip({
  group,
  onPress,
  accessibilityLabel,
  isClickable = true,
}: GroupChipProps) {
  const colors = useMobileThemeColors();
  const chipStyle = [
    styles.groupChip,
    {
      backgroundColor: colors.surfaceMuted,
      borderColor: group.color || colors.borderStrong,
    },
  ];
  const label = accessibilityLabel ?? group.label;

  const content = (
    <>
      {group.emoji ? <Text style={styles.groupEmoji}>{group.emoji}</Text> : null}
      <Text style={[styles.groupLabel, { color: colors.textPrimary }]}>{group.label}</Text>
      <View style={[styles.groupCountBadge, { backgroundColor: colors.borderStrong }]}>
        <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
          {group.contactCount}
        </Text>
      </View>
    </>
  );

  if (!isClickable) {
    return (
      <View accessibilityRole="text" accessibilityLabel={label} style={chipStyle}>
        {content}
      </View>
    );
  }

  return (
    <Tappable
      variant="subtle"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={chipStyle}
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  groupEmoji: {
    fontSize: 16,
  },
  groupLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  groupCountBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  groupCount: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
});
