/**
 * Preset hex swatches mirroring the webapp's Mantine DEFAULT_THEME color palette
 * (shades 5–7 for red, pink, grape, violet, indigo, blue, cyan, teal, green,
 * lime, yellow, and orange).
 *
 * Rows pair two hue families (3 shades each) so no family wraps across rows.
 */
export const GROUP_COLOR_SWATCH_ROWS = [
  ["#fa5252", "#e03131", "#c92a2a", "#e64980", "#c2255c", "#a61e4d"],
  ["#cc5de8", "#ae3ec9", "#9c36b5", "#845ef7", "#7048e8", "#6741d9"],
  ["#5c7cfa", "#4263eb", "#3b5bdb", "#339af0", "#1c7ed6", "#1971c2"],
  ["#22b8cf", "#0c8599", "#0b7285", "#20c997", "#0ca678", "#099268"],
  ["#51cf66", "#2f9e44", "#2b8a3e", "#94d82d", "#74b816", "#66a80f"],
  ["#fcc419", "#f59f00", "#e67700", "#ff922b", "#e8590c", "#d9480f"],
] as const;

export const GROUP_COLOR_SWATCHES = GROUP_COLOR_SWATCH_ROWS.flat();

/** Grape shade 6 — matches previous GroupEditSheet default (`COLOR_SWATCHES[15]`). */
export const DEFAULT_GROUP_COLOR = "#ae3ec9";

/** Picks a random preset swatch (same pool as the webapp group/tag color picker). */
export function getRandomGroupColor(): string {
  return GROUP_COLOR_SWATCHES[Math.floor(Math.random() * GROUP_COLOR_SWATCHES.length)];
}

export const COLOR_PICKER_LAYOUT = {
  swatchSize: 28,
  swatchGap: 8,
  wheelMaxSize: 280,
} as const;
