import type { FontSubset } from "@takumi-rs/helpers";
import { googleFonts } from "@takumi-rs/helpers";
import { OG_FONT_FAMILY } from "#og/constants.js";

let fontsPromise: Promise<FontSubset[]> | undefined;

/**
 * Lexend font subsets for Takumi ImageResponse (matches the website body font).
 */
export function ogFonts(): Promise<FontSubset[]> {
  fontsPromise ??= googleFonts([{ name: OG_FONT_FAMILY, weight: [400, 500, 600, 700] }]);
  return fontsPromise;
}
