import type { GroupWithCount } from "@bondery/schemas";
import { IconCheck } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface GroupSelectRowProps {
  disabled?: boolean;
  group: GroupWithCount;
  isSelected: boolean;
  onToggle: () => void;
}

export function GroupSelectRow({
  group,
  isSelected,
  onToggle,
  disabled = false,
}: GroupSelectRowProps) {
  const colors = useMobileThemeColors();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: pressed && !disabled ? colors.surfacePressed : colors.surface,
          borderBottomColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {group.emoji ? <Text style={styles.groupEmoji}>{group.emoji}</Text> : null}
      <Text numberOfLines={2} style={[styles.optionLabel, { color: colors.textPrimary }]}>
        {group.label}
      </Text>
      <View style={[styles.groupCountBadge, { backgroundColor: colors.borderStrong }]}>
        <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
          {group.contactCount}
        </Text>
      </View>
      {isSelected ? (
        <IconCheck color={colors.primary} size={14} />
      ) : (
        <View style={styles.checkSpacer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkSpacer: {
    width: 14,
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
    fontSize: 18,
    textAlign: "center",
    width: 24,
  },
  optionLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  optionRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
