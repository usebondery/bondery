/**
 * Bondery-owned paint tokens.
 *
 * Neutrals are pinned from installed `@mantine/core` 9.6.3 `DEFAULT_THEME` colors
 * and `defaultCssVariablesResolver`. This module must not import `@mantine/core`.
 */

export const BRAND_PRIMARY_SHADES = [
  "#faedff",
  "#edd9f7",
  "#d8b1ea",
  "#c186dd",
  "#ae62d2",
  "#a34bcb",
  "#9d3fc9",
  "#8931b2",
  "#7a2aa0",
  "#6b218d",
] as const;

export const BRAND_PRIMARY_COLOR = BRAND_PRIMARY_SHADES[5];
export const BRAND_PRIMARY_HOVER = BRAND_PRIMARY_SHADES[6];
export const BRAND_PRIMARY_PRESS = BRAND_PRIMARY_SHADES[7];
export const BRAND_PRIMARY_TEXT = "#ffffff";

export interface BrandSurfaceColors {
  /** `--mantine-color-body` */
  body: string;
  /** `--mantine-color-default-border` */
  border: string;
  /** `--mantine-color-dimmed` */
  dimmed: string;
  /** `--mantine-color-default-hover` */
  hover: string;
  /** Mantine `gray.0` (light) / `dark.8` (dark) */
  mutedCanvas: string;
  /** `--mantine-color-default` */
  surface: string;
  /** `--mantine-color-text` */
  text: string;
}

export const BRAND_SURFACES: Record<"dark" | "light", BrandSurfaceColors> = {
  dark: {
    /** `--mantine-color-body` (`dark.7`) */
    body: "#242424",
    /** `--mantine-color-default-border` (`dark.4`) */
    border: "#424242",
    /** `--mantine-color-dimmed` (`dark.2`) */
    dimmed: "#828282",
    /** `--mantine-color-default-hover` (`dark.5`) */
    hover: "#3b3b3b",
    /** Mantine `dark.8` */
    mutedCanvas: "#1f1f1f",
    /** `--mantine-color-default` (`dark.6`) */
    surface: "#2e2e2e",
    /** `--mantine-color-text` (`dark.0`) */
    text: "#C9C9C9",
  },
  light: {
    /** `--mantine-color-body` (`theme.white`) */
    body: "#fff",
    /** `--mantine-color-default-border` (`gray.4`) */
    border: "#ced4da",
    /** `--mantine-color-dimmed` (`gray.6`) */
    dimmed: "#868e96",
    /** `--mantine-color-default-hover` (`gray.0`) */
    hover: "#f8f9fa",
    /** Mantine `gray.0` */
    mutedCanvas: "#f8f9fa",
    /** `--mantine-color-default` (`theme.white`) */
    surface: "#fff",
    /** `--mantine-color-text` (`theme.black`) */
    text: "#000",
  },
};
