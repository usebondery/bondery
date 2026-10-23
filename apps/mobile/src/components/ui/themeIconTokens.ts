/** Shared box size for ThemeIcon and emoji-on-color badges (Mantine ThemeIcon–style). */
export type ThemeIconSize = "sm";

export const THEME_ICON_SIZE_CLASS: Record<ThemeIconSize, string> = {
  sm: "h-7 w-7",
};

export type ThemeIconShape = "circle" | "rounded";

export const THEME_ICON_SHAPE_CLASS: Record<ThemeIconShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-lg",
};
