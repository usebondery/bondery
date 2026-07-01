import { z } from "zod";
import {
  EXAMPLE_HEALTH_OK_RESPONSE,
  EXAMPLE_LIVENESS_STATUS_RESPONSE,
} from "@bondery/schemas";

export const serviceProbeResultSchema = z.object({
  ok: z.boolean(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
  configured: z.boolean().optional(),
});

export const supabaseServiceStatusSchema = z.object({
  auth: serviceProbeResultSchema,
  database: serviceProbeResultSchema,
  storage: serviceProbeResultSchema,
});

export const healthServicesSchema = z.object({
  supabase: supabaseServiceStatusSchema,
  redis: serviceProbeResultSchema,
  smtp: serviceProbeResultSchema,
  anthropic: serviceProbeResultSchema,
  polar: serviceProbeResultSchema,
  mapy: serviceProbeResultSchema,
  posthog: serviceProbeResultSchema,
});

export const healthReportSchema = z
  .object({
    status: z.enum(["ok", "degraded", "unhealthy"]),
    timestamp: z.string().datetime(),
    cached: z.boolean(),
    cacheExpiresAt: z.string().datetime(),
    services: healthServicesSchema,
  })
  .meta({ example: EXAMPLE_HEALTH_OK_RESPONSE });

export const livenessStatusSchema = z
  .object({
    status: z.literal("ok"),
    timestamp: z.string().datetime(),
    extension: z.object({
      minVersion: z.string(),
      storeUrl: z.string(),
    }),
  })
  .meta({ example: EXAMPLE_LIVENESS_STATUS_RESPONSE });
