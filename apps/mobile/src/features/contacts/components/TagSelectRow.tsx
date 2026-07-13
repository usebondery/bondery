import type { TagWithCount } from "@bondery/schemas";
import { IconCheck } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { TagChip } from "./TagChip";

interface TagSelectRowProps {
  disabled?: boolean;
  isSelected: boolean;
  onToggle: () => void;
  tag: TagWithCount;
}

export function TagSelectRow({ tag, isSelected, onToggle, disabled = false }: TagSelectRowProps) {
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
      <TagChip isClickable={false} tag={tag} />
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
  optionRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
