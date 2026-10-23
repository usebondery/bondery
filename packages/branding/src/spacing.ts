/**
 * Named layout gaps. Values match Mantine `theme.spacing` sm/md/lg
 * (12px / 16px / 20px at a 16px root). Uniwind `@theme --spacing-*`
 * and web Mantine spacing should keep these rem strings in lockstep.
 */

export const BRAND_SPACING_PX = {
  lg: 20,
  md: 16,
  sm: 12,
} as const;

export const BRAND_SPACING_REM = {
  lg: "1.25rem",
  md: "1rem",
  sm: "0.75rem",
} as const;

export type BrandSpacingSize = keyof typeof BRAND_SPACING_PX;
