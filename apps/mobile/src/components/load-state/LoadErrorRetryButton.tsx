import { Pressable, StyleSheet, Text } from "react-native";
import { IconReload } from "@tabler/icons-react-native";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { PRIMARY_BUTTON_TEXT } from "../../theme/colors";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

interface LoadErrorRetryButtonProps {
  onPress: () => void;
}

export function LoadErrorRetryButton({ onPress }: LoadErrorRetryButtonProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("MobileApp.Common.Retry")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.primaryPress : colors.primary,
        },
      ]}
    >
      <IconReload size={14} color={PRIMARY_BUTTON_TEXT} stroke={PRIMARY_BUTTON_TEXT} />
      <Text style={[styles.label, { color: PRIMARY_BUTTON_TEXT }]}>
        {t("MobileApp.Common.Retry")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
