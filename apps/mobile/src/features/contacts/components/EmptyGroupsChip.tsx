import { StyleSheet, Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

/** Static placeholder chip matching {@link CreateGroupChip} styling — not tappable. */
export function EmptyGroupsChip() {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const label = t("NoGroupsYet", { ns: "MobileContacts" });

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
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
    alignItems: "center",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
