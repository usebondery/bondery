import { createHash } from "node:crypto";
import { IMPORT_COMMIT_RATE_LIMIT } from "@bondery/schemas/constants";
import { getErrorDocUrl } from "@bondery/schemas/errors";
import type { FastifyRateLimitOptions } from "@fastify/rate-limit";
import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
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

/** CRM data ZIP export and Bondery ZIP import — expensive to generate or apply. */
export const EXPORT_TIER = {
  max: 5,
  timeWindow: "10 minutes",
} as const;

export const NOT_FOUND_TIER = {
  max: 60,
  timeWindow: "60 seconds",
} as const;

/** Readiness probe — five requests per minute per client. */
export const HEALTH_TIER = {
  max: 5,
  timeWindow: "1 minute",
} as const;

/** MCP JSON-RPC — keyed per user/IP and Mcp-Method/Mcp-Name (no body parse). */
export const MCP_TIER = {
  keyGenerator: (request: FastifyRequest) => {
    const methodHeader = request.headers["mcp-method"];
    const nameHeader = request.headers["mcp-name"];
    const mcpMethod = typeof methodHeader === "string" ? methodHeader : "-";
    const mcpName = typeof nameHeader === "string" ? nameHeader : "-";
    const authorization = request.headers.authorization;
    const identity =
      typeof authorization === "string" && authorization.length > 0
        ? `bearer:${createHash("sha256").update(authorization).digest("hex").slice(0, 16)}`
        : `ip:${request.ip}`;
    return `mcp:${identity}:${mcpMethod}:${mcpName}`;
  },
  max: 90,
  timeWindow: "60 seconds",
} as const;

function buildErrorResponse(_request: FastifyRequest, context: { ttl: number }) {
  const retryAfterSeconds = Math.ceil(context.ttl / 1000);
  return Object.assign(new Error(`Rate limit exceeded. Retry in ${retryAfterSeconds} seconds.`), {
    code: "rate_limit_exceeded",
    retryAfter: retryAfterSeconds,
    statusCode: 429,
  });
}

export async function registerRateLimit(fastify: AppFastifyInstance, redis: Redis): Promise<void> {
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

function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
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
}

export function registerDefaultNotFoundHandler(fastify: AppFastifyInstance): void {
  fastify.setNotFoundHandler(notFoundHandler);
}

export function registerNotFoundRateLimit(fastify: AppFastifyInstance): void {
  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit(NOT_FOUND_TIER),
    },
    notFoundHandler,
  );
}
