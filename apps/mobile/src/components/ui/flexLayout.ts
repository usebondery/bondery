import type { BrandSpacingSize } from "@bondery/branding";

export type FlexAlign = "center" | "end" | "start" | "stretch";
export type FlexJustify = "around" | "between" | "center" | "end" | "start";
export type SpacingSize = BrandSpacingSize;

export const FLEX_ALIGN_CLASS: Record<FlexAlign, string> = {
  center: "items-center",
  end: "items-end",
  start: "items-start",
  stretch: "items-stretch",
};

export const FLEX_JUSTIFY_CLASS: Record<FlexJustify, string> = {
  around: "justify-around",
  between: "justify-between",
  center: "justify-center",
  end: "justify-end",
  start: "justify-start",
};

const GAP_CLASS: Record<SpacingSize, string> = {
  lg: "gap-lg",
  md: "gap-md",
  sm: "gap-sm",
};

/** Uniwind `@theme --spacing-*` class. Default matches Mantine Stack/Group (`md`). */
export function gapClassName(gap: SpacingSize = "md"): string {
  return GAP_CLASS[gap];
}
