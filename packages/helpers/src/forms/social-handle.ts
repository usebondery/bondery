import {
  type SocialHandleInput,
  type SocialPlatform,
  socialHandleInputSchema,
} from "@bondery/schemas";
import { z } from "zod";
import { processContactSocialFieldValue } from "#socials/index.js";

export type NormalizedSocialHandle = {
  platform: SocialPlatform;
  value: string;
};

export const normalizedSocialHandleSchema: z.ZodType<NormalizedSocialHandle, SocialHandleInput> =
  socialHandleInputSchema.transform((value, ctx): NormalizedSocialHandle => {
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
