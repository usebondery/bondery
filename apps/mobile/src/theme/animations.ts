import { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { UI_TIMING_MS } from "../lib/config";

/**
 * App toast enter/exit — fixed duration aligned with `UI_TIMING_MS.toastLayoutAnimation`.
 * Slides down from above on enter, up on exit (matches top-of-screen placement).
 */
export const TOAST_MOTION = {
  durationMs: UI_TIMING_MS.toastLayoutAnimation,
} as const;

export const TOAST_ENTER = FadeInDown.duration(TOAST_MOTION.durationMs);
export const TOAST_EXIT = FadeOutUp.duration(TOAST_MOTION.durationMs);
