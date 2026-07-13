import { StyleSheet, Text, View } from "react-native";
import { useCommonTranslations, useMobileTagsTranslations } from "@/lib/i18n/generated/hooks";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

/** Static placeholder chip matching {@link CreateTagChip} styling — not tappable. */
export function EmptyTagsChip() {
  const tMobileTags = useMobileTagsTranslations();
  const _t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const label = tMobileTags("NoTagsYet");

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
