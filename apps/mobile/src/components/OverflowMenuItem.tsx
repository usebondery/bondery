import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { MOBILE_LAYOUT } from "../theme/layout";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { Text } from "./ui/Text";

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
      <Text
        c="primary"
        className="flex-1"
        fw={500}
        numberOfLines={1}
        size="lg"
        style={tone === "danger" ? { color: colors.dangerAccent } : undefined}
      >
        {label}
      </Text>
      {hint ? (
        <Text c="muted" className="ml-2 shrink-0" numberOfLines={1} size="xs">
          {hint}
        </Text>
      ) : (
        <View style={styles.hintSpacer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
