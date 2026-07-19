import { CHROME_EXTENSION_URL, MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { EXAMPLE_HEALTH_UNHEALTHY_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppFastifyInstance } from "../platform/fastify-types.js";
import { withOkResponse } from "../platform/openapi/responses.js";
import { HEALTH_TIER } from "../platform/rate-limit.js";
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
    "/health",
    {
      config: { rateLimit: HEALTH_TIER },
      schema: {
        description: READINESS_DESCRIPTION,
        response: {
          ...withOkResponse(
            healthReportSchema,
            "Readiness report when dependencies are healthy or degraded",
          ),
          503: {
            content: {
              "application/json": {
                example: EXAMPLE_HEALTH_UNHEALTHY_RESPONSE,
                schema: healthReportSchema,
              },
            },
            description: "Readiness report when critical dependencies are unavailable",
          },
        },
        tags: ["Health"],
      } satisfies FastifyZodOpenApiSchema,
    },
    async (_request, reply) => {
      const report = await getHealthReport({
        anthropicApiKey: fastify.config.BONDERY_PRIVATE_ANTHROPIC_API_KEY,
        mapsApiKey: fastify.config.BONDERY_PRIVATE_MAPS_KEY,
        polarAccessToken: fastify.config.BONDERY_PRIVATE_POLAR_ACCESS_TOKEN,
        polarProductId: fastify.config.BONDERY_PUBLIC_POLAR_PRODUCT_ID,
        polarWebhookSecret: fastify.config.BONDERY_PRIVATE_POLAR_WEBHOOK_SECRET,
        posthogApiSecret: fastify.config.BONDERY_PRIVATE_POSTHOG_API_SECRET,
        posthogProjectId: fastify.config.BONDERY_PRIVATE_POSTHOG_PROJECT_ID,
        redisUrl: fastify.config.BONDERY_PRIVATE_REDIS_URL,
        smtpAddress: fastify.config.BONDERY_PRIVATE_EMAIL_ADDRESS,
        smtpHost: fastify.config.BONDERY_PRIVATE_EMAIL_HOST,
        smtpPass: fastify.config.BONDERY_PRIVATE_EMAIL_PASS,
        smtpPort: fastify.config.BONDERY_PRIVATE_EMAIL_PORT,
        smtpUser: fastify.config.BONDERY_PRIVATE_EMAIL_USER,
        supabasePublishableKey: fastify.config.BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        supabaseUrl: fastify.config.BONDERY_PUBLIC_SUPABASE_URL,
      });

      const statusCode = report.status === "unhealthy" ? 503 : 200;
      return reply.status(statusCode).send(report);
    },
  );

  fastify.get(
    "/status",
    {
      config: { rateLimit: false },
      schema: {
        description: LIVENESS_DESCRIPTION,
        response: withOkResponse(livenessStatusSchema, "Liveness status"),
        tags: ["Health"],
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => {
      return {
        extension: {
          minVersion: MIN_EXTENSION_VERSION,
          storeUrl: CHROME_EXTENSION_URL,
        },
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      };
    },
  );
}
