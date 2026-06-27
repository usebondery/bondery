export const PRESS_SCALES = {
  subtle: 0.98,
  default: 0.96,
  strong: 0.93,
} as const;

export type PressScaleVariant = keyof typeof PRESS_SCALES;
