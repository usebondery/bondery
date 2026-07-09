import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Tappable } from "../theme/Tappable";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

type MobileIconButtonTone = "default" | "danger" | "primary";

interface MobileIconButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ReactNode;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  tone?: MobileIconButtonTone;
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

  const borderColor = tone === "danger" ? colors.dangerAccent : colors.borderStrong;

  return (
    <Tappable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      alignItems="center"
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      borderRadius={MOBILE_LAYOUT.borderRadius.pill}
      borderWidth={1}
      disabled={disabled}
      height={size}
      hitSlop={MOBILE_HIT_SLOP.compact}
      justifyContent="center"
      onPress={onPress}
      opacity={disabled ? 0.5 : 1}
      style={style}
      variant="subtle"
      width={size}
    >
      {icon}
    </Tappable>
  );
}
