/**
 * Canonical Tamagui animation tokens. Keep names in sync with `tamagui.config.ts`.
 *
 * Enter/exit: https://tamagui.dev/docs/core/animations#enterexit-transitions
 */
import { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { UI_TIMING_MS } from "../lib/config";

export const TAMAGUI_TRANSITION = {
  /** Fast spring — press/release, popovers, opacity feedback */
  quick: "quick",
  /** Softer spring — larger enter/exit motion */
  medium: "medium",
  /** Fixed duration — aligns with `UI_TIMING_MS` 200ms surfaces */
  timing200: "timing200",
} as const;

export type TamaguiTransitionName = (typeof TAMAGUI_TRANSITION)[keyof typeof TAMAGUI_TRANSITION];

/**
 * Shared Tamagui enter/exit props for portaled overlays (overflow popovers, etc.).
 * Spread onto `Popover.Content` or any Tamagui view inside `AnimatePresence` / `Animate`.
 */
export const POPOVER_MOTION = {
  transition: {
    enter: TAMAGUI_TRANSITION.quick,
    exit: TAMAGUI_TRANSITION.quick,
  },
  enterStyle: { opacity: 0, scale: 0.96, y: -4 },
  exitStyle: { opacity: 0, scale: 0.96, y: -4 },
  animateOnly: ["opacity", "scale", "y"],
} as const;

/**
 * Enter/exit props for FAB speed-dial menu items (fan upward from the plus anchor).
 */
export const FAB_MENU_MOTION = {
  transition: {
    enter: TAMAGUI_TRANSITION.quick,
    exit: TAMAGUI_TRANSITION.quick,
  },
  enterStyle: { opacity: 0, scale: 0.96, y: 8 },
  exitStyle: { opacity: 0, scale: 0.96, y: 8 },
  animateOnly: ["opacity", "scale", "y"],
} as const;

/** Reanimated spring matching Tamagui `quick` (see `tamagui.config.ts`). */
export const REANIMATED_SPRING = {
  quick: {
    damping: 20,
    mass: 1.2,
    stiffness: 250,
    overshootClamping: true,
  },
} as const;

/** FAB speed-dial grow/scrim motion — open uses quick spring; close uses fixed timing. */
export const FAB_SPEED_DIAL_MOTION = {
  openSpring: REANIMATED_SPRING.quick,
  closeDurationMs: UI_TIMING_MS.fabMenuCloseMs,
  /** Scrim tap guard while the chrome animation is still settling. */
  openGuardMs: 120,
} as const;

/**
 * App toast enter/exit — fixed duration aligned with `UI_TIMING_MS.toastLayoutAnimation`.
 * Slides down from above on enter, up on exit (matches top-of-screen placement).
 */
export const TOAST_MOTION = {
  durationMs: UI_TIMING_MS.toastLayoutAnimation,
} as const;

export const TOAST_ENTER = FadeInDown.duration(TOAST_MOTION.durationMs);
export const TOAST_EXIT = FadeOutUp.duration(TOAST_MOTION.durationMs);
