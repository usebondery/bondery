import { IconPlus } from "@tabler/icons-react-native";
import { StyleSheet, Text } from "react-native";
import { useMobileTagsTranslations } from "@/lib/i18n/generated/hooks";
import { Tappable } from "../../../theme/Tappable";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface CreateTagChipProps {
  disabled?: boolean;
  onPress: () => void;
}

export function CreateTagChip({ onPress, disabled = false }: CreateTagChipProps) {
  const tMobileTags = useMobileTagsTranslations();
  const colors = useMobileThemeColors();
  const label = tMobileTags("CreateTag");

  return (
    <Tappable
      accessibilityLabel={label}
      accessibilityRole="button"
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
      variant="subtle"
    >
      <IconPlus size={16} stroke={colors.textMuted} />
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
    </Tappable>
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
