import { IconChevronRight, IconExternalLink } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

type RowDestination = "internal" | "external";

interface SettingsNavigationRowProps {
  destination?: RowDestination;
  disabled?: boolean;
  externalLabel?: string;
  icon: ReactNode;
  label: string;
  labelColor?: string;
  onPress: () => void;
  showDivider?: boolean;
  showTrailing?: boolean;
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
      accessibilityLabel={
        destination === "external" && externalLabel ? `${label}. ${externalLabel}` : label
      }
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          opacity: disabled ? 0.45 : 1,
        },
        showDivider && styles.rowDivider,
        showDivider && { borderBottomColor: colors.border },
      ]}
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
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
  label: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  trailingWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 22,
  },
});
