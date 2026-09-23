import { createdAtSchema } from "@bondery/schemas/entities/_shared";
import { livenessStatusSchema } from "@bondery/schemas/health";
import { EXAMPLE_HEALTH_OK_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { z } from "zod";

export { livenessStatusSchema };

export const serviceProbeResultSchema = z.object({
  configured: z.boolean().optional(),
  error: z.string().optional(),
  latencyMs: z.number().optional(),
  ok: z.boolean(),
});

export const healthServicesSchema = z.object({
  anthropic: serviceProbeResultSchema,
  mapy: serviceProbeResultSchema,
  postgres: serviceProbeResultSchema,
  redis: serviceProbeResultSchema,
  smtp: serviceProbeResultSchema,
  storage: serviceProbeResultSchema,
  stripe: serviceProbeResultSchema,
});

export const healthReportSchema = z
  .object({
    cached: z.boolean(),
    cacheExpiresAt: createdAtSchema,
    services: healthServicesSchema,
    status: z.enum(["ok", "degraded", "unhealthy"]),
    timestamp: createdAtSchema,
  })
  .meta({ example: EXAMPLE_HEALTH_OK_RESPONSE });
