import { buildLivenessStatus } from "@bondery/helpers/infra/build-metadata";
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
  "Use `GET /health/ready` for a readiness probe that checks Postgres, storage, Redis, and other configured integrations.";

const READINESS_DESCRIPTION =
  "Readiness probe. Checks configured dependencies and returns per-service status. " +
  "Results are cached in memory for one minute. Rate limited to five requests per minute per client. " +
  "Returns HTTP 503 when critical dependencies are unavailable (`status: unhealthy`). " +
  "Returns HTTP 200 when all critical dependencies are healthy (`status: ok` or `status: degraded`). " +
  "Postgres via Prisma `SELECT 1`; object storage via required-bucket `HeadBucket` checks; " +
  "Redis via shared process clients `PING`; SMTP via live verify on the shared Nodemailer transporter pool. " +
  "API boot runs the same live checks for Postgres, storage, Redis, and SMTP before accepting traffic.";

export function registerHealthRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/health/live",
    {
      config: { rateLimit: false },
      schema: {
        description: LIVENESS_DESCRIPTION,
        response: withOkResponse(livenessStatusSchema, "Liveness status"),
        tags: ["Health"],
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => buildLivenessStatus(),
  );

  fastify.get(
    "/health/ready",
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
        redisUrl: fastify.config.BONDERY_PRIVATE_REDIS_URL,
        storageS3AccessKeyId: fastify.config.BONDERY_PRIVATE_S3_ACCESS_KEY_ID,
        storageS3Endpoint: fastify.config.BONDERY_PRIVATE_S3_ENDPOINT,
        storageS3Region: fastify.config.BONDERY_PRIVATE_S3_REGION,
        storageS3SecretAccessKey: fastify.config.BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY,
        stripePriceIdAnnual: fastify.config.BONDERY_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
        stripePriceIdMonthly: fastify.config.BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
        stripeSecretKey: fastify.config.BONDERY_PRIVATE_STRIPE_SECRET_KEY,
        stripeWebhookSecret: fastify.config.BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET,
      });

      const statusCode = report.status === "unhealthy" ? 503 : 200;
      return reply.status(statusCode).send(report);
    },
  );
}
