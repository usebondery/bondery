import { createHash } from "node:crypto";
import { IMPORT_COMMIT_RATE_LIMIT } from "@bondery/schemas/constants";
import { buildAgentMessage, getErrorDocUrl } from "@bondery/schemas/errors";
import type { FastifyRateLimitOptions } from "@fastify/rate-limit";
import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
import { URLS } from "./config.js";
import type { AppFastifyInstance } from "./fastify-types.js";

const DEFAULT_MAX_REQUESTS = 300;
const DEFAULT_WINDOW = "60 seconds";
const DEFAULT_WINDOW_SECONDS = 60;

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

/**
 * CSP violation reports. Browsers send these unauthenticated, so the tier is
 * its own bucket keyed per IP and generous enough for a broken page that
 * reports on every interaction.
 */
export const CSP_REPORT_TIER = {
  max: 60,
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

/**
 * Policy names follow the tier object.
 * `csp_report` and `not_found` share quota 60 and window 60.
 */
const POLICY_NAME_BY_TIER = new WeakMap<object, string>([
  [AI_TIER, "ai"],
  [CSP_REPORT_TIER, "csp_report"],
  [ENRICH_TIER, "enrich"],
  [EXPORT_TIER, "export"],
  [GEOCODE_TIER, "geocode"],
  [HEALTH_TIER, "health"],
  [IMPORT_TIER, "import"],
  [MCP_TIER, "mcp"],
  [NOT_FOUND_TIER, "not_found"],
]);

function timeWindowToSeconds(timeWindow: unknown): number {
  if (typeof timeWindow === "number" && Number.isFinite(timeWindow) && timeWindow >= 0) {
    return Math.trunc(timeWindow / 1000);
  }
  if (typeof timeWindow !== "string") {
    return DEFAULT_WINDOW_SECONDS;
  }

  const match = /^(\d+) (second|seconds|minute|minutes)$/.exec(timeWindow);
  if (!match?.[1] || !match[2]) {
    return DEFAULT_WINDOW_SECONDS;
  }

  const amount = Number(match[1]);
  if (match[2] === "minute" || match[2] === "minutes") {
    return amount * 60;
  }
  return amount;
}

function quoteStructuredString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatDraftRateLimitHeaders(input: {
  limit: number;
  name: string;
  remaining: number;
  resetSeconds: number;
  windowSeconds: number;
}): { policy: string; rateLimit: string } {
  const quotedName = quoteStructuredString(input.name);
  return {
    policy: `${quotedName};q=${input.limit};w=${input.windowSeconds}`,
    rateLimit: `${quotedName};r=${input.remaining};t=${input.resetSeconds}`,
  };
}

function readNonNegativeIntegerHeader(reply: FastifyReply, name: string): number | undefined {
  const raw = reply.getHeader(name);
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

function resolveDraftPolicy(request: FastifyRequest): { name: string; windowSeconds: number } {
  const rateLimit = request.routeOptions.config?.rateLimit;
  if (typeof rateLimit !== "object" || rateLimit === null) {
    return { name: "default", windowSeconds: DEFAULT_WINDOW_SECONDS };
  }

  const timeWindow = "timeWindow" in rateLimit ? rateLimit.timeWindow : undefined;
  return {
    name: POLICY_NAME_BY_TIER.get(rateLimit) ?? "default",
    windowSeconds: timeWindowToSeconds(timeWindow),
  };
}

function applyDraftRateLimitHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const limit = readNonNegativeIntegerHeader(reply, "x-ratelimit-limit");
  if (limit === undefined) {
    return;
  }

  const remaining = readNonNegativeIntegerHeader(reply, "x-ratelimit-remaining");
  const resetSeconds = readNonNegativeIntegerHeader(reply, "x-ratelimit-reset");
  if (remaining === undefined || resetSeconds === undefined) {
    return;
  }

  const policy = resolveDraftPolicy(request);
  const headers = formatDraftRateLimitHeaders({
    limit,
    name: policy.name,
    remaining: reply.statusCode === 429 ? 0 : remaining,
    resetSeconds,
    windowSeconds: policy.windowSeconds,
  });
  reply.header("RateLimit", headers.rateLimit);
  reply.header("RateLimit-Policy", headers.policy);
}

/**
 * Adds draft-ietf-httpapi-ratelimit-headers-11 fields from the plugin headers.
 * Do not set `enableDraftSpec`. That option emits the 2021 header names.
 */
export function registerDraftRateLimitHeaders(fastify: FastifyInstance): void {
  fastify.addHook("onSend", async (request, reply, payload) => {
    applyDraftRateLimitHeaders(request, reply);
    return payload;
  });
}

export function buildRateLimitErrorResponse(_request: FastifyRequest, context: { ttl: number }) {
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
    errorResponseBuilder: buildRateLimitErrorResponse,
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
  registerDraftRateLimitHeaders(fastify);
}

function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  const website = (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
  reply.status(404).send({
    error: {
      agent_message: buildAgentMessage("not_found", "Not found"),
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

export function registerNotFoundRateLimit(fastify: FastifyInstance): void {
  // `config.rateLimit` names the draft policy. The preHandler applies that same tier.
  const notFoundOptions = {
    config: { rateLimit: NOT_FOUND_TIER },
    preHandler: fastify.rateLimit(NOT_FOUND_TIER),
  };
  fastify.setNotFoundHandler(notFoundOptions, notFoundHandler);
}
