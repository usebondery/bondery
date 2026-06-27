import { StyleSheet, Text } from "react-native";
import { IconPlus } from "@tabler/icons-react-native";
import { Tappable } from "../../../theme/Tappable";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";

interface CreateTagChipProps {
  onPress: () => void;
  disabled?: boolean;
}

export function CreateTagChip({
  onPress,
  disabled = false,
}: CreateTagChipProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const label = t("MobileApp.Tags.CreateTag");

  return (
    <Tappable
      variant="subtle"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.chip,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderStrong,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <IconPlus size={16} stroke={colors.textMuted} />
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
    </Tappable>
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
