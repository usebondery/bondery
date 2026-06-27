import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../theme/tokens";
import { Tappable } from "../theme/Tappable";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

type MobileIconButtonTone = "default" | "danger" | "primary";

interface MobileIconButtonProps {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: MobileIconButtonTone;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function MobileIconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  tone = "default",
  size = MOBILE_LAYOUT.iconButton,
  style,
}: MobileIconButtonProps) {
  const colors = useMobileThemeColors();

  const backgroundColor =
    tone === "danger"
      ? colors.dangerSurface
      : tone === "primary"
        ? colors.primary
        : colors.surfaceElevated;

  const borderColor =
    tone === "danger" ? colors.dangerAccent : colors.borderStrong;

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={MOBILE_HIT_SLOP.compact}
      onPress={onPress}
      width={size}
      height={size}
      borderRadius={MOBILE_LAYOUT.borderRadius.pill}
      borderWidth={1}
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      alignItems="center"
      justifyContent="center"
      opacity={disabled ? 0.5 : 1}
      style={style}
      variant="subtle"
    >
      {icon}
    </Tappable>
  );
}
