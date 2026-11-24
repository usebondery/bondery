import type { BrandSpacingSize } from "@bondery/branding";

type FlexAlign = "center" | "end" | "start" | "stretch";
type FlexJustify = "around" | "between" | "center" | "end" | "start";
type SpacingSize = BrandSpacingSize;

const FLEX_ALIGN_CLASS: Record<FlexAlign, string> = {
  center: "items-center",
  end: "items-end",
  start: "items-start",
  stretch: "items-stretch",
};

const FLEX_JUSTIFY_CLASS: Record<FlexJustify, string> = {
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
function gapClassName(gap: SpacingSize = "md"): string {
  return GAP_CLASS[gap];
}

export type { FlexAlign, FlexJustify, SpacingSize };
export { FLEX_ALIGN_CLASS, FLEX_JUSTIFY_CLASS, gapClassName };
