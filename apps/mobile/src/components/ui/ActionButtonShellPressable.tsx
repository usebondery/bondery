import type { ReactNode } from "react";
import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import {
  type ActionButtonColor,
  type ActionButtonVariant,
  resolveActionButtonShell,
} from "./actionButtonStyles";
import {
  type ActionButtonSize,
  getActionButtonSizePx,
  getControlHeightPx,
} from "./actionButtonTokens";
import { joinClassNames } from "./joinClassNames";
import { usePressSqueeze } from "./usePressSqueeze";

export type ActionButtonShellPressableProps = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  color?: ActionButtonColor;
  dashed?: boolean;
  disabled?: boolean;
  layout?: "square" | "stretch";
  onPress: () => void;
  size?: ActionButtonSize;
  style?: StyleProp<ViewStyle>;
  /** Match `TextInput` / sheet search field radius and border (10px, neutral outline). */
  matchInputChrome?: boolean;
  variant?: ActionButtonVariant;
};

/** Pressable using the same shell as `ActionButton` (outline picker triggers, dice, etc.). */
export function ActionButtonShellPressable({
  accessibilityHint,
  accessibilityLabel,
  children,
  className,
  color = "neutral",
  dashed = false,
  disabled = false,
  layout = "square",
  onPress,
  size = "md",
  style,
  matchInputChrome = false,
  variant = "outline",
}: ActionButtonShellPressableProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);
  const dimension = matchInputChrome ? getControlHeightPx("md") : getActionButtonSizePx(size);

  const resolvedColor = matchInputChrome && variant === "outline" ? "neutral" : color;

  const shell = resolveActionButtonShell({
    color: resolvedColor,
    colors,
    dashed,
    pressed: isPressed,
    variant,
  });

  const borderRadius =
    matchInputChrome || layout === "stretch" ? MOBILE_LAYOUT.borderRadius.control : dimension / 2;

  return (
    <Animated.View
      className={joinClassNames(layout === "stretch" ? "min-w-0 flex-1" : undefined, className)}
      style={squeezeStyle}
    >
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          setIsPressed(true);
          pressIn();
        }}
        onPressOut={() => {
          setIsPressed(false);
          pressOut();
        }}
        style={[
          {
            alignItems: "center",
            backgroundColor: shell.backgroundColor,
            borderColor: shell.borderColor,
            borderRadius,
            borderStyle: shell.borderStyle,
            borderWidth: shell.borderWidth,
            justifyContent: "center",
            minHeight: dimension,
            opacity: disabled ? 0.38 : 1,
            ...(layout === "stretch"
              ? { minWidth: dimension, width: "100%" }
              : matchInputChrome
                ? { height: dimension, minHeight: dimension, width: dimension }
                : { height: dimension, width: dimension }),
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
