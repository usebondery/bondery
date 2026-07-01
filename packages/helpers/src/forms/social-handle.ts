import { z } from "zod";
import { socialHandleInputSchema } from "@bondery/schemas";
import { processContactSocialFieldValue } from "../socials/index";

export const normalizedSocialHandleSchema = socialHandleInputSchema.transform((value, ctx) => {
  const result = processContactSocialFieldValue(value.platform, value.value);
  if (result.error === "invalid_website") {
    ctx.addIssue({
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

export type NormalizedSocialHandle = z.output<typeof normalizedSocialHandleSchema>;
