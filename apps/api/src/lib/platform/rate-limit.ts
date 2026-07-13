import { IMPORT_COMMIT_RATE_LIMIT } from "@bondery/schemas/constants";
import { getErrorDocUrl } from "@bondery/schemas/errors";
import type { FastifyRateLimitOptions } from "@fastify/rate-limit";
import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";
import { getRedisCommands } from "../data/redis.js";
import { URLS } from "./config.js";
import type { AppFastifyInstance } from "./fastify-types.js";

const DEFAULT_MAX_REQUESTS = 300;
const DEFAULT_WINDOW = "60 seconds";

export const AI_TIER = {
  max: 20,
  timeWindow: "60 seconds",
} as const;

export const IMPORT_TIER = IMPORT_COMMIT_RATE_LIMIT;

export const ENRICH_TIER = {
  max: 100,
  timeWindow: "10 minutes",
} as const;

export const GEOCODE_TIER = {
  max: 120,
  timeWindow: "60 seconds",
} as const;

export const NOT_FOUND_TIER = {
  max: 60,
  timeWindow: "60 seconds",
} as const;

/** Readiness probe — one request per minute per client. */
export const HEALTH_TIER = {
  max: 1,
  timeWindow: "1 minute",
} as const;

function buildErrorResponse(_request: FastifyRequest, context: { ttl: number }) {
  const retryAfterSeconds = Math.ceil(context.ttl / 1000);
  return Object.assign(new Error(`Rate limit exceeded. Retry in ${retryAfterSeconds} seconds.`), {
    code: "rate_limit_exceeded",
    retryAfter: retryAfterSeconds,
    statusCode: 429,
  });
}

export async function registerRateLimit(fastify: AppFastifyInstance): Promise<void> {
  const redisUrl = fastify.config.PRIVATE_REDIS_URL;
  if (process.env.NODE_ENV === "production" && !redisUrl.trim()) {
    throw new Error(
      "PRIVATE_REDIS_URL must be set in production. In-memory rate limiting is per-instance and ineffective on serverless deployments.",
    );
  }

  const redis = getRedisCommands(redisUrl);

  const options: FastifyRateLimitOptions = {
    allowList: (request: FastifyRequest) => request.method === "OPTIONS",
    errorResponseBuilder: buildErrorResponse,
    global: true,
    hook: "preHandler",
    keyGenerator: (request: FastifyRequest) => {
      if (request.authApiKey?.id) {
        return `apikey:${request.authApiKey.id}`;
      }
      return request.authUser?.id ? `user:${request.authUser.id}` : `ip:${request.ip}`;
    },
    max: DEFAULT_MAX_REQUESTS,
    onBanReach: (request: FastifyRequest, key: string) => {
      request.log.warn(
        { ip: request.ip, key, method: request.method, url: request.url },
        "rate-limit: ban reached",
      );
    },
    onExceeded: (request: FastifyRequest, key: string) => {
      request.log.warn(
        { ip: request.ip, key, method: request.method, url: request.url },
        "rate-limit: limit exceeded",
      );
    },
    redis,
    skipOnError: true,
    timeWindow: DEFAULT_WINDOW,
  };

  await fastify.register(fastifyRateLimit, options);
}

export function registerNotFoundRateLimit(fastify: AppFastifyInstance): void {
  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit(NOT_FOUND_TIER),
    },
    (request, reply) => {
      const website = (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
      reply.status(404).send({
        error: {
          code: "not_found",
          doc_url: getErrorDocUrl("not_found", website),
          message: "Not found",
          request_id: request.id,
          type: "not_found_error",
        },
      });
    },
  );
}
