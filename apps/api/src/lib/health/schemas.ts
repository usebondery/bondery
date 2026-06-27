import { Type } from "@sinclair/typebox";

export const ServiceProbeResultSchema = Type.Object({
  ok: Type.Boolean(),
  latencyMs: Type.Optional(Type.Number()),
  error: Type.Optional(Type.String()),
  configured: Type.Optional(Type.Boolean()),
});

export const SupabaseServiceStatusSchema = Type.Object({
  auth: ServiceProbeResultSchema,
  database: ServiceProbeResultSchema,
  storage: ServiceProbeResultSchema,
});

export const HealthServicesSchema = Type.Object({
  supabase: SupabaseServiceStatusSchema,
  redis: ServiceProbeResultSchema,
  smtp: ServiceProbeResultSchema,
  anthropic: ServiceProbeResultSchema,
  polar: ServiceProbeResultSchema,
  mapy: ServiceProbeResultSchema,
  posthog: ServiceProbeResultSchema,
});

export const HealthReportSchema = Type.Object({
  status: Type.Union([
    Type.Literal("ok"),
    Type.Literal("degraded"),
    Type.Literal("unhealthy"),
  ]),
  timestamp: Type.String({ format: "date-time" }),
  cached: Type.Boolean({
    description:
      "True when this response was served from the in-process cache (refreshed at most once per minute).",
  }),
  cacheExpiresAt: Type.String({
    format: "date-time",
    description: "When the cached readiness snapshot expires and the next request will re-probe dependencies.",
  }),
  services: HealthServicesSchema,
});

export const LivenessStatusSchema = Type.Object({
  status: Type.Literal("ok"),
  timestamp: Type.String({ format: "date-time" }),
  extension: Type.Object({
    minVersion: Type.String(),
    storeUrl: Type.String(),
  }),
});
