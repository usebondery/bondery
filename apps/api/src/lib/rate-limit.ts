import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppFastifyInstance } from "./fastify-types.js";
import type { FastifyRateLimitOptions } from "@fastify/rate-limit";
import fastifyRateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";

const DEFAULT_MAX_REQUESTS = 300;
const DEFAULT_WINDOW = "60 seconds";

export const AI_TIER = {
  max: 20,
  timeWindow: "60 seconds",
} as const;

export const IMPORT_TIER = {
  max: 10,
  timeWindow: "10 minutes",
} as const;

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

function buildRedisClient(redisUrl: string) {
  const trimmed = redisUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  return new Redis(trimmed, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
}

function buildErrorResponse(
  _request: FastifyRequest,
  context: { ttl: number },
) {
  const retryAfterSeconds = Math.ceil(context.ttl / 1000);
  return Object.assign(
    new Error(`Rate limit exceeded. Retry in ${retryAfterSeconds} seconds.`),
    {
      statusCode: 429,
      retryAfter: retryAfterSeconds,
    },
  );
}

export async function registerRateLimit(fastify: AppFastifyInstance): Promise<void> {
  const redisUrl = fastify.config.PRIVATE_REDIS_URL;
  if (process.env.NODE_ENV === "production" && !redisUrl.trim()) {
    throw new Error(
      "PRIVATE_REDIS_URL must be set in production. In-memory rate limiting is per-instance and ineffective on serverless deployments.",
    );
  }

  const redis = buildRedisClient(redisUrl);

  const options: FastifyRateLimitOptions = {
    global: true,
    hook: "preHandler",
    max: DEFAULT_MAX_REQUESTS,
    timeWindow: DEFAULT_WINDOW,
    redis,
    skipOnError: true,
    keyGenerator: (request: FastifyRequest) => {
      if (request.authApiKey?.id) {
        return `apikey:${request.authApiKey.id}`;
      }
      return request.authUser?.id ? `user:${request.authUser.id}` : `ip:${request.ip}`;
    },
    allowList: (request: FastifyRequest) => request.method === "OPTIONS",
    errorResponseBuilder: buildErrorResponse,
    onExceeded: (request: FastifyRequest, key: string) => {
      request.log.warn(
        { key, method: request.method, url: request.url, ip: request.ip },
        "rate-limit: limit exceeded",
      );
    },
    onBanReach: (request: FastifyRequest, key: string) => {
      request.log.warn(
        { key, method: request.method, url: request.url, ip: request.ip },
        "rate-limit: ban reached",
      );
    },
  };

  await fastify.register(fastifyRateLimit, options);
}

export function registerNotFoundRateLimit(fastify: AppFastifyInstance): void {
  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit(NOT_FOUND_TIER),
    },
    (_request, reply) => {
      reply.status(404).send({ error: "Not found" });
    },
  );
}
