import type { ReactNode } from "react";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import type { MobileThemeColors } from "../../theme/colors";
import { PRESS_SCALES } from "../../theme/pressFeedback";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { joinClassNames } from "./joinClassNames";
import { Text } from "./Text";

type ButtonVariant = "filled" | "outline" | "subtle";
type ButtonSize = "md" | "lg";
type ButtonTone = "danger" | "neutral" | "primary";

/** Dim for unavailable OAuth/email. Presses still run. */
const INACTIVE_OPACITY = 0.72;

/** Webapp `--transition-time` on `.button-scale-effect`. */
const BUTTON_SCALE_MS = 200;
const BUTTON_SCALE_TIMING = {
  duration: BUTTON_SCALE_MS,
  easing: Easing.inOut(Easing.ease),
} as const;

const SIZE_CLASS: Record<ButtonSize, string> = {
  lg: "min-h-[44px] px-3.5 py-3",
  md: "min-h-[44px] px-3 py-2.5",
};

function isButtonTone(color: string | undefined): color is ButtonTone {
  return color === "danger" || color === "neutral" || color === "primary";
}

function toneAccent(tone: ButtonTone, colors: MobileThemeColors): string {
  if (tone === "danger") {
    return colors.dangerAccent;
  }
  if (tone === "neutral") {
    return colors.neutralAccent;
  }
  return colors.primary;
}

type ButtonPropsBase = {
  accessibilityHint?: string;
  children: ReactNode;
  className?: string;
  color?: ButtonTone | string;
  cornerLabel?: string;
  /**
   * Dims the control and blocks press. Ignored for paint when `loading` is true.
   */
  disabled?: boolean;
  fullWidth?: boolean;
  inactive?: boolean;
  leftSection?: ReactNode;
  onPress: () => void;
  pressedColor?: string;
  rightSection?: ReactNode;
  size?: ButtonSize;
  textColor?: string;
  variant?: ButtonVariant;
  /**
   * `center` — label and sections as one centered group.
   * `spread` — label left, `rightSection` on the trailing edge.
   */
  align?: "center" | "spread";
};

/** When `loading` is set, `loadingText` is required and shown instead of `children`. */
export type ButtonLoadingProps =
  | { loading?: undefined }
  | { loading: boolean; loadingText: string };

export type ButtonProps = ButtonPropsBase & ButtonLoadingProps;

type ButtonRuntimeProps = ButtonPropsBase & {
  loading?: boolean;
  loadingText?: string;
};

export function Button(props: ButtonProps) {
  const {
    accessibilityHint,
    children,
    className,
    color,
    cornerLabel,
    disabled = false,
    fullWidth = true,
    inactive = false,
    leftSection,
    loading = false,
    loadingText,
    onPress,
    pressedColor,
    rightSection,
    size = "md",
    textColor,
    variant = "filled",
    align = "center",
  } = props as ButtonRuntimeProps;
  const colors = useMobileThemeColors();
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);
  const isSubtle = variant === "subtle";
  const isOutline = variant === "outline";
  const tone = isButtonTone(color) ? color : undefined;
  const accent = tone ? toneAccent(tone, colors) : (color ?? colors.primary);
  const fillColor = accent;
  const fillPressedColor =
    pressedColor ?? (tone && tone !== "primary" ? accent : colors.primaryPress);
  const outlineBorderColor = tone === "neutral" ? colors.borderStrong : accent;
  const labelColor =
    textColor ??
    (isSubtle
      ? colors.primary
      : isOutline
        ? tone === "neutral"
          ? colors.textSecondary
          : accent
        : colors.textOnPrimary);
  const isDimmed = inactive && !loading;
  const isPressLocked = disabled || loading;
  const showLeftSlot = loading && rightSection == null ? true : leftSection != null;
  const showRightSlot = rightSection != null;
  const isSpread = align === "spread" && !isSubtle;
  const isContentCentered = align === "center" && !isSubtle;
  const labelContent = loading && loadingText ? loadingText : children;
  const squeezeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = () => {
    if (isPressLocked) {
      return;
    }

    setIsPressed(true);
    scale.value = withTiming(PRESS_SCALES.subtle, BUTTON_SCALE_TIMING);
  };

  const pressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, BUTTON_SCALE_TIMING);
  };

  const pressable = (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      className={joinClassNames(
        "rounded-[10px] disabled:opacity-[0.38]",
        isSubtle
          ? "items-center justify-center bg-transparent"
          : joinClassNames(
              "flex-row items-center",
              isSpread ? "justify-between" : undefined,
              isContentCentered ? "justify-center" : undefined,
            ),
        isOutline ? "border" : undefined,
        SIZE_CLASS[size],
        fullWidth ? "w-full" : undefined,
        className,
      )}
      data-disabled={isPressLocked ? "true" : undefined}
      data-pressed={isPressed ? "true" : undefined}
      disabled={disabled && !loading}
      onPress={() => {
        if (isPressLocked) {
          return;
        }

        onPress();
      }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={({ pressed }) => {
        if (isOutline) {
          return {
            backgroundColor: pressed && !isPressLocked ? colors.surfacePressed : colors.surface,
            borderColor: outlineBorderColor,
            ...(isDimmed ? { opacity: INACTIVE_OPACITY } : {}),
          };
        }

        const isFilledPress = !isSubtle && pressed && !isPressLocked;

        return {
          backgroundColor: isSubtle ? undefined : isFilledPress ? fillPressedColor : fillColor,
          ...(isDimmed ? { opacity: INACTIVE_OPACITY } : {}),
        };
      }}
    >
      {showLeftSlot ? (
        <View className="mr-2.5 w-5 items-center justify-center">
          {loading && rightSection == null ? (
            <ActivityIndicator color={labelColor} size="small" />
          ) : (
            leftSection
          )}
        </View>
      ) : null}
      <Text
        className={
          isSpread ? "min-w-0 flex-1" : isSubtle || isContentCentered ? undefined : "flex-1"
        }
        fw={600}
        size={size === "lg" ? "lg" : "md"}
        style={{ color: labelColor }}
        ta={isSpread ? "left" : undefined}
      >
        {labelContent}
      </Text>
      {showRightSlot ? (
        <View
          className={joinClassNames(
            "w-5 flex-shrink-0 items-center justify-center",
            isSpread ? undefined : "ml-2.5",
          )}
        >
          {loading ? <ActivityIndicator color={labelColor} size="small" /> : rightSection}
        </View>
      ) : null}
    </Pressable>
  );

  const squeezeWrapStyle = [{ width: fullWidth ? "100%" : undefined }, squeezeStyle];

  if (!cornerLabel) {
    return <Animated.View style={squeezeWrapStyle}>{pressable}</Animated.View>;
  }

  return (
    <Animated.View style={squeezeWrapStyle}>
      <View className="relative overflow-visible">
        {pressable}
        <View
          className="absolute right-3 -top-2 z-[1] rounded-full px-2 py-0.5"
          pointerEvents="none"
          style={{ backgroundColor: colors.primary }}
        >
          <Text c="onPrimary" fw={600} size="xs">
            {cornerLabel}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
