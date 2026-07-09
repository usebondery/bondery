import { Paragraph } from "@tamagui/text";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

export const OVERFLOW_MENU_RADIUS = MOBILE_LAYOUT.borderRadius.control;

export interface OverflowMenuItemConfig {
  disabled?: boolean;
  hint?: string;
  icon: ReactNode;
  id: string;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
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
      accessibilityHint={hint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
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
        flex={1}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.bodyLarge}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.medium}
        numberOfLines={1}
      >
        {label}
      </Paragraph>
      {hint ? (
        <Text numberOfLines={1} style={[styles.hint, { color: colors.textMuted }]}>
          {hint}
        </Text>
      ) : (
        <View style={styles.hintSpacer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexShrink: 0,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: "400",
    marginLeft: 8,
  },
  hintSpacer: {
    width: 0,
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: 20,
  },
  menuItem: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
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
