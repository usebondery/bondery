import { IconCheck } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GroupWithCount } from "@bondery/schemas";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

interface GroupSelectRowProps {
  group: GroupWithCount;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
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
      <Text style={[styles.optionLabel, { color: colors.textPrimary }]} numberOfLines={2}>
        {group.label}
      </Text>
      <View style={[styles.groupCountBadge, { backgroundColor: colors.borderStrong }]}>
        <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
          {group.contactCount}
        </Text>
      </View>
      {isSelected ? (
        <IconCheck size={14} color={colors.primary} />
      ) : (
        <View style={styles.checkSpacer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  groupEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
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
  checkSpacer: {
    width: 14,
  },
});
