import { MOBILE_LAYOUT } from "../../theme/layout";

export type ActionButtonSize = "lg" | "md" | "sm";

/** Outer height for md controls (`TextInput` `min-h-[44px]`, square input-adjacent buttons). */
export const CONTROL_HEIGHT_MD_PX = MOBILE_LAYOUT.touchTarget;

const ACTION_BUTTON_SIZE_PX: Record<ActionButtonSize, number> = {
  lg: MOBILE_LAYOUT.touchTargetLarge,
  md: CONTROL_HEIGHT_MD_PX,
  sm: MOBILE_LAYOUT.iconButton,
};

const ACTION_BUTTON_ICON_SIZE_PX: Record<ActionButtonSize, number> = {
  lg: 22,
  md: 20,
  sm: 16,
};

export function getActionButtonSizePx(size: ActionButtonSize): number {
  return ACTION_BUTTON_SIZE_PX[size];
}

/** Shared control outer height (md matches `MOBILE_LAYOUT.touchTarget`). */
export function getControlHeightPx(size: ActionButtonSize = "md"): number {
  return getActionButtonSizePx(size);
}

export function getActionButtonIconSize(size: ActionButtonSize): number {
  return ACTION_BUTTON_ICON_SIZE_PX[size];
}

/** Default chrome tab / selection action size. */
export const ACTION_BUTTON_SIZE_MD_PX = ACTION_BUTTON_SIZE_PX.md;
