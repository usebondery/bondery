import { z } from "zod";
import type { HexColor } from "./types.js";

const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;

export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN, { error: "Color must be a valid 6-digit hex value" })
  .transform((value) => {
    const normalized = value.startsWith("#") ? value : `#${value}`;
    return normalized.toLowerCase();
  }) satisfies z.ZodType<HexColor>;
