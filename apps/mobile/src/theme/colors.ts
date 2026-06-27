export type MobileThemeMode = "light" | "dark";

export interface MobileThemeColors {
  appBackground: string;
  surface: string;
  surfaceMuted: string;
  surfacePressed: string;
  surfaceElevated: string;
  overlay: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  iconPrimary: string;
  iconSecondary: string;
  primary: string;
  primaryHover: string;
  primaryPress: string;
  neutralAccent: string;
  successAccent: string;
  dangerAccent: string;
  selectionBackground: string;
  selectionBackgroundStrong: string;
  successSurface: string;
  warningSurface: string;
  dangerSurface: string;
  dangerText: string;
  inputBackground: string;
  shadow: string;
}

const BRAND_PRIMARY = "#a34bcb";
const BRAND_PRIMARY_HOVER = "#9d3fc9";
const BRAND_PRIMARY_PRESS = "#8931b2";

/** Pure white — text and icons on primary-filled controls. */
export const PRIMARY_BUTTON_TEXT = "#ffffff";

export const MOBILE_THEME_COLORS: Record<MobileThemeMode, MobileThemeColors> = {
  light: {
    appBackground: "#f8fafc",
    surface: "#ffffff",
    surfaceMuted: "#f8fafc",
    surfacePressed: "#f1f5f9",
    surfaceElevated: "#ffffff",
    overlay: "rgba(15,23,42,0.28)",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    textOnPrimary: PRIMARY_BUTTON_TEXT,
    iconPrimary: "#0f172a",
    iconSecondary: "#64748b",
    primary: BRAND_PRIMARY,
    primaryHover: BRAND_PRIMARY_HOVER,
    primaryPress: BRAND_PRIMARY_PRESS,
    neutralAccent: "#64748b",
    successAccent: "#059669",
    dangerAccent: "#dc2626",
    selectionBackground: "#ede9fe",
    selectionBackgroundStrong: "#c4b5fd",
    successSurface: "#dcfce7",
    warningSurface: "#fef3c7",
    dangerSurface: "#fee2e2",
    dangerText: "#b91c1c",
    inputBackground: "#ffffff",
    shadow: "#0f172a",
  },
  dark: {
    appBackground: "#020617",
    surface: "#0f172a",
    surfaceMuted: "#111827",
    surfacePressed: "#1f2937",
    surfaceElevated: "#0b1220",
    overlay: "rgba(2,6,23,0.62)",
    border: "#1f2937",
    borderStrong: "#374151",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    textOnPrimary: PRIMARY_BUTTON_TEXT,
    iconPrimary: "#f8fafc",
    iconSecondary: "#9ca3af",
    primary: BRAND_PRIMARY,
    primaryHover: BRAND_PRIMARY_HOVER,
    primaryPress: BRAND_PRIMARY_PRESS,
    neutralAccent: "#94a3b8",
    successAccent: "#34d399",
    dangerAccent: "#f87171",
    selectionBackground: "#1e293b",
    selectionBackgroundStrong: "#312e81",
    successSurface: "#14532d",
    warningSurface: "#78350f",
    dangerSurface: "#7f1d1d",
    dangerText: "#fca5a5",
    inputBackground: "#111827",
    shadow: "#000000",
  },
};

/**
 * Legacy aliases used by existing components.
 */
export const PRIMARY_BUTTON_BACKGROUND = BRAND_PRIMARY;
export const PRIMARY_BUTTON_BACKGROUND_HOVER = BRAND_PRIMARY_HOVER;
export const PRIMARY_BUTTON_BACKGROUND_PRESS = BRAND_PRIMARY_PRESS;

export const OAUTH_PROVIDER_COLORS = {
  github: {
    background: "#24292f",
    backgroundPress: "#1b1f23",
    text: "#ffffff",
  },
  linkedin: {
    background: "#0a66c2",
    backgroundPress: "#084e96",
    text: "#ffffff",
  },
} as const;

export const SOCIAL_BRAND_COLORS = {
  github: "#111827",
  linkedin: "#0A66C2",
  reddit: "#FF4500",
  x: "#111827",
  discord: "#5865F2",
} as const;

export const AVATAR_COLOR_PALETTE_HEX = [
  "#228be6", // blue
  "#15aabf", // cyan
  "#12b886", // teal
  "#37b24d", // green
  "#74c417", // lime
  "#f59f00", // yellow
  "#f76707", // orange
  "#f03e3e", // red
  "#e64980", // pink
  "#ae3ec9", // grape
  "#7048e8", // violet
  "#4263eb", // indigo
] as const;
