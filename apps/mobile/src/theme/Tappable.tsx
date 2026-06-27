import { forwardRef, type ComponentProps } from "react";
import type { View as RNView } from "react-native";
import { View } from "@tamagui/core";
import { TAMAGUI_TRANSITION } from "./animations";
import { PRESS_SCALES, type PressScaleVariant } from "./pressFeedback";

type ViewProps = ComponentProps<typeof View>;

export type TappableProps = ViewProps & {
  variant?: PressScaleVariant;
  squeezeScale?: number;
};

/**
 * Tamagui-based pressable with consistent squeeze feedback via `transition` tokens.
 * Prefer this over raw Pressable for tappable controls.
 */
export const Tappable = forwardRef<RNView, TappableProps>(function Tappable(
  {
    variant = "default",
    squeezeScale,
    transition = TAMAGUI_TRANSITION.quick,
    pressStyle,
    scale = 1,
    animateOnly = ["scale"],
    ...props
  },
  ref,
) {
  const pressedScale = squeezeScale ?? PRESS_SCALES[variant];
  const mergedPressStyle =
    typeof pressStyle === "object" && pressStyle !== null && !Array.isArray(pressStyle)
      ? { scale: pressedScale, transition: TAMAGUI_TRANSITION.quick, ...pressStyle }
      : { scale: pressedScale, transition: TAMAGUI_TRANSITION.quick };

  return (
    <View
      ref={ref}
      scale={scale}
      transition={transition}
      animateOnly={animateOnly}
      pressStyle={mergedPressStyle}
      {...props}
    />
  );
});
