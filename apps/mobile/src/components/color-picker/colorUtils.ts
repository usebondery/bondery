import { hexColorSchema } from "@bondery/schemas";
import { HEX_RADIX, parseHexChannels } from "../../lib/color";
import { GROUP_COLOR_SWATCHES } from "./constants";

const HEX_PATTERN = /^#?([0-9A-Fa-f]{6})$/;

export function normalizeHex(value: string): string {
  const trimmed = value.trim();
  const candidate = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const match = HEX_PATTERN.exec(candidate);

  const hex = match?.[1];

  if (hex === undefined) {
    return "";
  }

  return `#${hex.toLowerCase()}`;
}

export function isValidHex(value: string): boolean {
  return hexColorSchema.safeParse(value).success;
}

export function isPresetSwatch(
  hex: string,
  swatches: readonly string[] = GROUP_COLOR_SWATCHES,
): boolean {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return false;
  }

  return swatches.some((swatch) => normalizeHex(swatch) === normalized);
}

/** Returns a visible border color when the fill is very light or very dark. */
export function getContrastBorderColor(
  hex: string,
  defaultBorder: string,
  strongBorder: string,
): string {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return defaultBorder;
  }

  const { red, green, blue } = parseHexChannels(normalized.slice(1));
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  if (luminance > 0.88 || luminance < 0.12) {
    return strongBorder;
  }

  return defaultBorder;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return "transparent";
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(clampedAlpha * 255)
    .toString(HEX_RADIX)
    .padStart(2, "0");

  return `${normalized}${alphaHex}`;
}
