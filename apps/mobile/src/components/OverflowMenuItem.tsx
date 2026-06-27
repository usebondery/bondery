import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Paragraph } from "@tamagui/text";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

export const OVERFLOW_MENU_RADIUS = MOBILE_LAYOUT.borderRadius.control;

export interface OverflowMenuItemConfig {
  id: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  onPress: () => void;
}

interface OverflowMenuItemProps extends OverflowMenuItemConfig {
  isFirst?: boolean;
  isLast?: boolean;
}

export function OverflowMenuItem({
  icon,
  label,
  hint,
  tone = "default",
  disabled = false,
  isFirst = false,
  isLast = false,
  onPress,
}: OverflowMenuItemProps) {
  const colors = useMobileThemeColors();
  const labelColor = tone === "danger" ? colors.dangerAccent : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        isFirst && styles.menuItemFirst,
        isLast && styles.menuItemLast,
        pressed && !disabled && { backgroundColor: colors.surfacePressed },
        disabled && styles.menuItemDisabled,
      ]}
    >
      <View style={styles.iconSlot}>{icon}</View>
      <Paragraph
        color={labelColor}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.bodyLarge}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.medium}
        flex={1}
        numberOfLines={1}
      >
        {label}
      </Paragraph>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : (
        <View style={styles.hintSpacer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    width: "100%",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconSlot: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: "400",
    marginLeft: 8,
    flexShrink: 0,
  },
  hintSpacer: {
    width: 0,
  },
  menuItemDisabled: {
    opacity: 0.45,
  },
  menuItemFirst: {
    borderTopLeftRadius: OVERFLOW_MENU_RADIUS,
    borderTopRightRadius: OVERFLOW_MENU_RADIUS,
  },
  menuItemLast: {
    borderBottomLeftRadius: OVERFLOW_MENU_RADIUS,
    borderBottomRightRadius: OVERFLOW_MENU_RADIUS,
  },
});
