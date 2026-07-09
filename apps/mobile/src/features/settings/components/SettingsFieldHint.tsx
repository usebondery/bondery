import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface SettingsFieldHintProps {
  children: ReactNode;
}

export function SettingsFieldHint({ children }: SettingsFieldHintProps) {
  const colors = useMobileThemeColors();

  return <Text style={[styles.hint, { color: colors.textMuted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  hint: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
    marginBottom: -4,
    marginTop: -4,
  },
});
