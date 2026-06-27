import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconChevronRight, IconExternalLink } from "@tabler/icons-react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

type RowDestination = "internal" | "external";

interface SettingsNavigationRowProps {
  icon: ReactNode;
  label: string;
  destination?: RowDestination;
  externalLabel?: string;
  showDivider?: boolean;
  showTrailing?: boolean;
  labelColor?: string;
  disabled?: boolean;
  onPress: () => void;
}

export function SettingsNavigationRow({
  icon,
  label,
  destination = "internal",
  externalLabel,
  showDivider = true,
  showTrailing = true,
  labelColor,
  disabled = false,
  onPress,
}: SettingsNavigationRowProps) {
  const colors = useMobileThemeColors();
  const resolvedLabelColor = labelColor ?? colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          opacity: disabled ? 0.45 : 1,
        },
        showDivider && styles.rowDivider,
        showDivider && { borderBottomColor: colors.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={destination === "external" && externalLabel ? `${label}. ${externalLabel}` : label}
    >
      <View style={styles.iconWrap}>{icon}</View>

      <Text style={[styles.label, { color: resolvedLabelColor }]}>{label}</Text>

      {showTrailing ? (
        <View style={styles.trailingWrap}>
          {destination === "external" ? (
            <IconExternalLink size={16} stroke={colors.iconSecondary} />
          ) : (
            <IconChevronRight size={18} stroke={colors.iconSecondary} />
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  trailingWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
