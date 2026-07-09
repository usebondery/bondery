export const PRESS_SCALES = {
  default: 0.96,
  strong: 0.93,
  subtle: 0.98,
} as const;

export type PressScaleVariant = keyof typeof PRESS_SCALES;
