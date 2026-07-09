import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface SettingsSectionCardProps {
  children: ReactNode;
  title?: string;
}

export function SettingsSectionCard({ title, children }: SettingsSectionCardProps) {
  const colors = useMobileThemeColors();

  return (
    <View style={styles.wrapper}>
      {title ? (
        <Text style={[MOBILE_TEXT_STYLES.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      ) : null}
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  wrapper: {
    gap: 8,
  },
});
