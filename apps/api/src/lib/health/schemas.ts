import { createdAtSchema } from "@bondery/schemas/entities/_shared";
import { livenessStatusSchema } from "@bondery/schemas/health";
import { EXAMPLE_HEALTH_OK_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { z } from "zod";

export { livenessStatusSchema };

export const serviceProbeResultSchema = z.object({
  configured: z.boolean().optional().describe("True when this dependency has configuration"),
  error: z.string().optional().describe("Failure message, when the probe did not succeed"),
  latencyMs: z.number().optional().describe("Probe latency in milliseconds"),
  ok: z.boolean().describe("True when this dependency responded"),
});

export const healthServicesSchema = z.object({
  anthropic: serviceProbeResultSchema.describe("Anthropic API probe"),
  mapy: serviceProbeResultSchema.describe("Mapy.com geocode probe"),
  postgres: serviceProbeResultSchema.describe("Postgres probe"),
  redis: serviceProbeResultSchema.describe("Redis probe"),
  smtp: serviceProbeResultSchema.describe("SMTP probe"),
  storage: serviceProbeResultSchema.describe("Object storage probe"),
  stripe: serviceProbeResultSchema.describe("Stripe API probe"),
});

export const healthReportSchema = z
  .object({
    cached: z.boolean().describe("True when this report came from cache"),
    cacheExpiresAt: createdAtSchema.describe("When the cached report expires"),
    services: healthServicesSchema.describe("Dependency probe results"),
    status: z.enum(["ok", "degraded", "unhealthy"]).describe("Overall readiness status"),
    timestamp: createdAtSchema.describe("Time this status was produced"),
  })
  .meta({ example: EXAMPLE_HEALTH_OK_RESPONSE });
