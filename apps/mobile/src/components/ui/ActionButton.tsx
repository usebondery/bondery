import type { ReactNode } from "react";
import { useState } from "react";
import {
  type AccessibilityRole,
  type AccessibilityState,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { UI_TIMING_MS } from "../../lib/config";
import { MOBILE_HIT_SLOP } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import {
  type ActionButtonColor,
  type ActionButtonVariant,
  resolveActionButtonShell,
} from "./actionButtonStyles";
import { type ActionButtonSize, getActionButtonSizePx } from "./actionButtonTokens";
import { usePressSqueeze } from "./usePressSqueeze";

export type ActionButtonProps = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  /** Overrides computed background (e.g. selection highlight). */
  backgroundColor?: string;
  children: ReactNode;
  color?: ActionButtonColor;
  dashed?: boolean;
  disabled?: boolean;
  indicatorColor?: string;
  loading?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  size?: ActionButtonSize;
  testID?: string;
  variant?: ActionButtonVariant;
};

function AnimatedShell({
  children,
  style,
}: {
  children: ReactNode;
  style: AnimatedStyle<ViewStyle>;
}) {
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function ActionButton({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
  backgroundColor: backgroundColorOverride,
  children,
  color = "primary",
  dashed = false,
  disabled = false,
  indicatorColor,
  loading = false,
  onLongPress,
  onPress,
  size = "md",
  testID,
  variant = "filled",
}: ActionButtonProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = disabled || loading;
  const dimension = getActionButtonSizePx(size);
  const spinnerColor = indicatorColor ?? colors.iconSecondary;

  const shell = resolveActionButtonShell({
    backgroundColorOverride,
    color,
    colors,
    dashed,
    pressed: isPressed,
    variant,
  });

  const sharedStyle: ViewStyle = {
    alignItems: "center",
    backgroundColor: shell.backgroundColor,
    borderColor: shell.borderColor,
    borderRadius: dimension / 2,
    borderStyle: shell.borderStyle,
    borderWidth: shell.borderWidth,
    height: dimension,
    justifyContent: "center",
    opacity: isDisabled ? 0.38 : 1,
    width: dimension,
  };

  return (
    <AnimatedShell style={squeezeStyle}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={{
          ...accessibilityState,
          disabled: isDisabled,
        }}
        delayLongPress={UI_TIMING_MS.longPressDelay}
        disabled={isDisabled}
        hitSlop={MOBILE_HIT_SLOP.icon}
        onLongPress={onLongPress}
        onPress={() => {
          if (isDisabled) {
            return;
          }

          onPress?.();
        }}
        onPressIn={() => {
          if (isDisabled) {
            return;
          }

          setIsPressed(true);
          pressIn();
        }}
        onPressOut={() => {
          setIsPressed(false);
          pressOut();
        }}
        style={sharedStyle}
        testID={testID}
      >
        {loading ? <ActivityIndicator color={spinnerColor} size="small" /> : children}
      </Pressable>
    </AnimatedShell>
  );
}
