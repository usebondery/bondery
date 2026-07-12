import { IconReload } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, Text } from "react-native";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { PRIMARY_BUTTON_TEXT } from "../../theme/colors";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

interface LoadErrorRetryButtonProps {
  onPress: () => void;
}

export function LoadErrorRetryButton({ onPress }: LoadErrorRetryButtonProps) {
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  return (
    <Pressable
      accessibilityLabel={t("actions.retry")}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.primaryPress : colors.primary,
        },
      ]}
    >
      <IconReload color={PRIMARY_BUTTON_TEXT} size={14} stroke={PRIMARY_BUTTON_TEXT} />
      <Text style={[styles.label, { color: PRIMARY_BUTTON_TEXT }]}>{t("actions.retry")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
