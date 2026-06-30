import type { FastifyInstance } from "fastify";
import type { AppFastifyInstance } from "../fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  CHROME_EXTENSION_URL,
  MIN_EXTENSION_VERSION,
} from "@bondery/helpers";
import { HEALTH_TIER } from "../rate-limit.js";
import { getHealthReport } from "./check.js";
import { healthReportSchema, livenessStatusSchema } from "./schemas.js";

const LIVENESS_DESCRIPTION =
  "Liveness probe. Returns 200 when the API process is running. " +
  "Does not check external dependencies. " +
  "Use `GET /health` for a readiness probe that checks Supabase, Redis, and other configured integrations.";

const READINESS_DESCRIPTION =
  "Readiness probe. Checks configured dependencies and returns per-service status. " +
  "Results are cached in memory for one minute. Rate limited to one request per minute per client. " +
  "Returns HTTP 503 when critical dependencies are unavailable (`status: unhealthy`). " +
  "Returns HTTP 200 when all critical dependencies are healthy (`status: ok` or `status: degraded`). " +
  "Supabase auth is checked via `GET /auth/v1/health`; " +
  "Supabase database (PostgREST) via `GET /rest-admin/v1/ready`; " +
  "Supabase storage via `GET /storage/v1/health`.";

export function registerHealthRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/status",
    {
      schema: {
        tags: ["Health"],
        description: LIVENESS_DESCRIPTION,
        response: {
          200: livenessStatusSchema,
        },
      } satisfies FastifyZodOpenApiSchema,
      config: { rateLimit: false },
    },
    async () => {
      return {
        status: "ok" as const,
        timestamp: new Date().toISOString(),
        extension: {
          minVersion: MIN_EXTENSION_VERSION,
          storeUrl: CHROME_EXTENSION_URL,
        },
      };
    },
  );

  fastify.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        description: READINESS_DESCRIPTION,
        response: {
          200: healthReportSchema,
          503: healthReportSchema,
        },
      } satisfies FastifyZodOpenApiSchema,
      config: { rateLimit: HEALTH_TIER },
    },
    async (_request, reply) => {
      const report = await getHealthReport({
        supabaseUrl: fastify.config.NEXT_PUBLIC_SUPABASE_URL,
        supabasePublishableKey: fastify.config.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        redisUrl: fastify.config.PRIVATE_REDIS_URL,
        smtpHost: fastify.config.PRIVATE_EMAIL_HOST,
        smtpUser: fastify.config.PRIVATE_EMAIL_USER,
        smtpPass: fastify.config.PRIVATE_EMAIL_PASS,
        smtpAddress: fastify.config.PRIVATE_EMAIL_ADDRESS,
        smtpPort: fastify.config.PRIVATE_EMAIL_PORT,
        anthropicApiKey: fastify.config.PRIVATE_ANTHROPIC_API_KEY,
        polarAccessToken: fastify.config.POLAR_ACCESS_TOKEN,
        polarProductId: fastify.config.POLAR_PRODUCT_ID,
        polarWebhookSecret: fastify.config.POLAR_WEBHOOK_SECRET,
        mapsApiKey: fastify.config.NEXT_PRIVATE_MAPS_KEY,
        posthogApiSecret: fastify.config.POSTHOG_API_SECRET,
        posthogProjectId: fastify.config.POSTHOG_PROJECT_ID,
      });

      const statusCode = report.status === "unhealthy" ? 503 : 200;
      return reply.status(statusCode).send(report);
    },
  );
}
