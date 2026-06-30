import { z } from "zod";

export const socialPlatformSchema = z.enum([
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
]);

export const socialHandleInputSchema = z.object({
  platform: socialPlatformSchema,
  value: z
    .string()
    .trim()
    .min(1, { error: "Value is required" })
    .max(200, { error: "Value must be at most 200 characters" }),
});

export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
export type SocialHandleInput = z.input<typeof socialHandleInputSchema>;
