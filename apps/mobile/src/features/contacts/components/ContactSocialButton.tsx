import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { UI_TIMING_MS } from "../../../lib/config";
import { Tappable } from "../../../theme/Tappable";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface ContactSocialButtonProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  color: string;
  dashed?: boolean;
  icon: ReactNode;
  onLongPress?: () => void;
  onPress: () => void;
}

/**
 * Circular brand-colored social link button (Settings "Follow us" pattern).
 */
export function ContactSocialButton({
  color,
  icon,
  accessibilityLabel,
  accessibilityHint,
  dashed = false,
  onPress,
  onLongPress,
}: ContactSocialButtonProps) {
  const colors = useMobileThemeColors();

  return (
    <Tappable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      delayLongPress={UI_TIMING_MS.longPressDelay}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: dashed ? colors.borderStrong : color,
          borderStyle: dashed ? "dashed" : "solid",
        },
      ]}
      variant="subtle"
    >
      {icon}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    height: MOBILE_LAYOUT.touchTarget,
    justifyContent: "center",
    width: MOBILE_LAYOUT.touchTarget,
  },
});
