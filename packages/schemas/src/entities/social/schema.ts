import { z } from "zod";
import type { SocialHandleInput, SocialPlatform } from "./types.js";

export const socialPlatformSchema = z.enum([
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
]) satisfies z.ZodType<SocialPlatform>;

export const socialHandleInputSchema = z.object({
  platform: socialPlatformSchema.describe("Social network"),
  value: z
    .string()
    .trim()
    .min(1, { error: "Value is required" })
    .max(200, { error: "Value must be at most 200 characters" })
    .describe("Profile URL or handle"),
}) satisfies z.ZodType<SocialHandleInput>;
