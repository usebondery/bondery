import { z } from "zod";
import type { WebappRuntimeConfig } from "./runtime-config.types.js";

export type { WebappRuntimeConfig } from "./runtime-config.types.js";

/**
 * Public runtime configuration for the webapp.
 *
 * This must never contain secrets (no PRIVATE_*).
 * It is safe to expose to browsers and self-host deployments.
 */
export const webappRuntimeConfigSchema = z
  .object({
    apiBaseUrl: z.string().url(),
    gitSha: z.string().min(1).optional(),
    posthogHost: z.string().url().optional(),
    posthogKey: z.string().min(1).optional(),
    runtimeConfigVersion: z.literal(1),
    stripePublishableKey: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    webappUrl: z.string().url(),
    websiteUrl: z.string().url(),
  })
  .strict() satisfies z.ZodType<WebappRuntimeConfig>;
