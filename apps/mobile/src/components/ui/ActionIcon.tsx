import type { ReactNode } from "react";
import { useState } from "react";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { MOBILE_HIT_SLOP } from "../../theme/tokens";
import { joinClassNames } from "./joinClassNames";
import { usePressSqueeze } from "./usePressSqueeze";

type ActionIconSize = "md" | "sm";

export type ActionIconProps = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onPress: () => void;
  size?: ActionIconSize;
};

const SIZE_CLASS: Record<ActionIconSize, string> = {
  md: "h-11 w-11",
  sm: "h-8 w-8",
};

export function ActionIcon({
  accessibilityHint,
  accessibilityLabel,
  children,
  className,
  disabled = false,
  onPress,
  size = "md",
}: ActionIconProps) {
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className={joinClassNames("items-center justify-center", SIZE_CLASS[size], className)}
        data-disabled={disabled ? "true" : undefined}
        data-pressed={isPressed ? "true" : undefined}
        disabled={disabled}
        hitSlop={MOBILE_HIT_SLOP.icon}
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
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
