import type { Group } from "@bondery/schemas";
import { StyleSheet, Text, View } from "react-native";
import { Tappable } from "../../../theme/Tappable";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

export type GroupChipGroup = Pick<Group, "id" | "label" | "emoji" | "color"> & {
  contactCount: number;
};

interface GroupChipProps {
  accessibilityLabel?: string;
  group: GroupChipGroup;
  isClickable?: boolean;
  onPress?: () => void;
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
      <View accessibilityLabel={label} accessibilityRole="text" style={chipStyle}>
        {content}
      </View>
    );
  }

  return (
    <Tappable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={chipStyle}
      variant="subtle"
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  groupChip: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupCount: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  groupCountBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  groupEmoji: {
    fontSize: 16,
  },
  groupLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
