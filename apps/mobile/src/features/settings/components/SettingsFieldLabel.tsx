import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface SettingsFieldLabelProps {
  children: ReactNode;
}

export function SettingsFieldLabel({ children }: SettingsFieldLabelProps) {
  const colors = useMobileThemeColors();

  return (
    <Text style={[styles.label, { color: colors.textSecondary }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 4,
    marginBottom: -8,
    ...MOBILE_TEXT_STYLES.fieldLabel,
  },
});
