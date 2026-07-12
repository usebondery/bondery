import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMobileSettingsTranslations } from "@/lib/i18n/generated/hooks";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { SettingsFieldLabel } from "./SettingsFieldLabel";

interface SettingsPreviewSectionProps {
  caption: string;
  children: ReactNode;
}

export function SettingsPreviewSection({ caption, children }: SettingsPreviewSectionProps) {
  const tMobileSettings = useMobileSettingsTranslations();
  const colors = useMobileThemeColors();

  return (
    <View style={styles.wrap}>
      <SettingsFieldLabel>{tMobileSettings("Preview")}</SettingsFieldLabel>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{caption}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
    marginTop: -4,
  },
  wrap: {
    gap: 12,
  },
});
