/** Reanimated shared values are mutated from press handlers, not during render. */
// biome-ignore-all lint/nursery/useReactCompiler: Reanimated press feedback

import { useCallback } from "react";
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { PRESS_SCALES, type PressScaleVariant } from "../../theme/pressFeedback";

const PRESS_SCALE_MS = 200;
const PRESS_SCALE_TIMING = {
  duration: PRESS_SCALE_MS,
  easing: Easing.inOut(Easing.ease),
} as const;

/**
 * Squeeze scale for pressable ui/ controls. Do not import this from screens.
 */
export function usePressSqueeze(scaleVariant: PressScaleVariant = "subtle") {
  const scale = useSharedValue(1);
  const squeezeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = useCallback(() => {
    scale.value = withTiming(PRESS_SCALES[scaleVariant], PRESS_SCALE_TIMING);
  }, [scale, scaleVariant]);

  const pressOut = useCallback(() => {
    scale.value = withTiming(1, PRESS_SCALE_TIMING);
  }, [scale]);

  return { pressIn, pressOut, squeezeStyle };
}
