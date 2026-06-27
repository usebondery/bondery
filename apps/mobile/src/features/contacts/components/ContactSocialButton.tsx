import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { UI_TIMING_MS } from "../../../lib/config";
import { Tappable } from "../../../theme/Tappable";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface ContactSocialButtonProps {
  color: string;
  icon: ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  dashed?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
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
      variant="subtle"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={UI_TIMING_MS.longPressDelay}
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: dashed ? colors.borderStrong : color,
          borderStyle: dashed ? "dashed" : "solid",
        },
      ]}
    >
      {icon}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MOBILE_LAYOUT.touchTarget,
    height: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
