import { StyleSheet, Text, View } from "react-native";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";

/** Static placeholder chip matching {@link CreateTagChip} styling — not tappable. */
export function EmptyTagsChip() {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const label = t("MobileApp.Tags.NoTagsYet");

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderStrong,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
