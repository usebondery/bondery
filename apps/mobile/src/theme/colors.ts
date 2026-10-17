import {
  BRAND_PRIMARY_COLOR,
  BRAND_PRIMARY_HOVER,
  BRAND_PRIMARY_PRESS,
  BRAND_PRIMARY_TEXT,
  BRAND_SURFACES,
} from "@bondery/branding/colors";

export { BRAND_SURFACES };

export type MobileThemeMode = "light" | "dark";

export interface MobileThemeColors {
  appBackground: string;
  border: string;
  borderStrong: string;
  dangerAccent: string;
  dangerSurface: string;
  dangerText: string;
  iconPrimary: string;
  iconSecondary: string;
  inputBackground: string;
  neutralAccent: string;
  overlay: string;
  primary: string;
  primaryHover: string;
  primaryPress: string;
  selectionBackground: string;
  selectionBackgroundStrong: string;
  shadow: string;
  successAccent: string;
  successSurface: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  surfacePressed: string;
  /** Mantine Title `--mantine-color-default-color` (black / white). */
  textDefault: string;
  textMuted: string;
  textOnPrimary: string;
  textPrimary: string;
  textSecondary: string;
  warningSurface: string;
}

export const BRAND_PRIMARY = BRAND_PRIMARY_COLOR;

/** Pure white — text and icons on primary-filled controls. */
export const PRIMARY_BUTTON_TEXT = BRAND_PRIMARY_TEXT;

function hexToRgba(hex: string, alpha: number): string {
  const digits = hex.startsWith("#") ? hex.slice(1) : hex;
  const normalized =
    digits.length === 3
      ? `${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
      : digits;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const dark = BRAND_SURFACES.dark;
const light = BRAND_SURFACES.light;

export const MOBILE_THEME_COLORS: Record<MobileThemeMode, MobileThemeColors> = {
  dark: {
    appBackground: dark.body,
    border: dark.border,
    borderStrong: "#696969", // Mantine dark.3 — stronger than default-border
    dangerAccent: "#f87171",
    dangerSurface: "#7f1d1d",
    dangerText: "#fca5a5",
    iconPrimary: dark.text,
    iconSecondary: dark.dimmed,
    inputBackground: dark.hover,
    neutralAccent: dark.dimmed,
    overlay: hexToRgba(dark.body, 0.62),
    primary: BRAND_PRIMARY,
    primaryHover: BRAND_PRIMARY_HOVER,
    primaryPress: BRAND_PRIMARY_PRESS,
    selectionBackground: "#1e293b",
    selectionBackgroundStrong: "#312e81",
    shadow: "#000",
    successAccent: "#34d399",
    successSurface: "#14532d",
    surface: dark.surface,
    surfaceElevated: dark.surface,
    surfaceMuted: dark.hover,
    surfacePressed: dark.hover,
    textDefault: "#ffffff",
    textMuted: dark.dimmed,
    textOnPrimary: PRIMARY_BUTTON_TEXT,
    textPrimary: dark.text,
    textSecondary: "#b8b8b8", // Mantine dark.1 — between text and dimmed
    warningSurface: "#78350f",
  },
  light: {
    appBackground: light.mutedCanvas,
    border: light.border,
    borderStrong: "#adb5bd", // Mantine gray.5 — stronger than default-border
    dangerAccent: "#dc2626",
    dangerSurface: "#fee2e2",
    dangerText: "#b91c1c",
    iconPrimary: light.text,
    iconSecondary: light.dimmed,
    inputBackground: light.surface,
    neutralAccent: light.dimmed,
    overlay: hexToRgba(light.text, 0.28),
    primary: BRAND_PRIMARY,
    primaryHover: BRAND_PRIMARY_HOVER,
    primaryPress: BRAND_PRIMARY_PRESS,
    selectionBackground: "#ede9fe",
    selectionBackgroundStrong: "#c4b5fd",
    shadow: "#000",
    successAccent: "#059669",
    successSurface: "#dcfce7",
    surface: light.surface,
    surfaceElevated: light.surface,
    surfaceMuted: light.mutedCanvas,
    surfacePressed: light.hover,
    textDefault: "#000000",
    textMuted: light.dimmed,
    textOnPrimary: PRIMARY_BUTTON_TEXT,
    textPrimary: light.text,
    textSecondary: "#495057", // Mantine gray.7 — between text and dimmed
    warningSurface: "#fef3c7",
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
  passkey: {
    background: "#4b5563",
    backgroundPress: "#374151",
    text: "#ffffff",
  },
} as const;

export const SOCIAL_BRAND_COLORS = {
  discord: "#5865F2",
  github: "#111827",
  linkedin: "#0A66C2",
  reddit: "#FF4500",
  x: "#111827",
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
