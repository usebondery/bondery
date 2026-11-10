import { z } from "zod";
import type { StepUpTokenResponse } from "./types.js";

export const stepUpTokenResponseSchema = z.object({
  token: z.string().min(1).describe("Short-lived step-up token"),
}) satisfies z.ZodType<StepUpTokenResponse>;
