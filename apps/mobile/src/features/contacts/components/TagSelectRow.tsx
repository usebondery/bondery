import { IconCheck } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import type { TagWithCount } from "@bondery/schemas";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { TagChip } from "./TagChip";

interface TagSelectRowProps {
  tag: TagWithCount;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function TagSelectRow({
  tag,
  isSelected,
  onToggle,
  disabled = false,
}: TagSelectRowProps) {
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
      <TagChip tag={tag} isClickable={false} />
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
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkSpacer: {
    width: 14,
  },
});
