import { z } from "zod";
import type { StepUpTokenResponse } from "./types.js";

export const stepUpTokenResponseSchema = z
  .object({
    token: z.string().min(1),
  })
  .meta({
    example: { token: "step-up-nonce" },
  }) satisfies z.ZodType<StepUpTokenResponse>;
