import { z } from "zod";
import { processContactSocialFieldValue } from "@bondery/helpers";

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

export const socialHandleSchema = socialHandleInputSchema.transform((value, context) => {
  const result = processContactSocialFieldValue(value.platform, value.value);
  if (result.error === "invalid_website") {
    context.addIssue({
      code: "custom",
      message: "Please enter a valid website URL",
      path: ["value"],
    });
    return z.NEVER;
  }

  return {
    platform: value.platform,
    value: result.value,
  };
});

export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
export type SocialHandleInput = z.input<typeof socialHandleSchema>;
export type SocialHandleOutput = z.output<typeof socialHandleSchema>;
