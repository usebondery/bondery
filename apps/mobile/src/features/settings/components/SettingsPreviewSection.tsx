import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { SettingsFieldLabel } from "./SettingsFieldLabel";

interface SettingsPreviewSectionProps {
  caption: string;
  children: ReactNode;
}

export function SettingsPreviewSection({ caption, children }: SettingsPreviewSectionProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  return (
    <View style={styles.wrap}>
      <SettingsFieldLabel>{t("MobileApp.Settings.Preview")}</SettingsFieldLabel>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{caption}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  caption: {
    marginTop: -4,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
  },
});
