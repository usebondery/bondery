/**
 * Attaches draft rate-limit headers on limited success responses and HTTP 429.
 *
 * fastify-zod-openapi drops a headers field when the response has no content.
 * This patch restores RateLimit and RateLimit-Policy on those responses.
 * It also fills a success response that a route builds outside the shared helpers.
 * Routes with `rateLimit: false` stay without these headers.
 *
 * Header objects are defined once in `@bondery/schemas/http/responses`.
 * This patch stores them in `components.headers` and references them.
 */

import {
  rateLimitHeader,
  rateLimitPolicyHeader,
  retryAfterHeader,
} from "@bondery/schemas/http/responses";

const RATE_LIMIT_REF = "#/components/headers/RateLimit";
const RATE_LIMIT_POLICY_REF = "#/components/headers/RateLimitPolicy";
const RETRY_AFTER_REF = "#/components/headers/RetryAfter";

/**
 * OpenAPI paths for routes that set `config.rateLimit: false`.
 * Hidden docs redirects are listed so a future publish does not gain the headers.
 */
const UNMETERED_PATHS = new Set([
  "/api-reference",
  "/docs/api",
  "/extension/manifest",
  "/health/live",
  "/mobile/manifest",
  "/sync/ws",
  "/sync/ws-ticket",
  "/webhooks/stripe",
]);

type SpecResponse = {
  headers?: Record<string, unknown>;
};

type OpenApiSpec = {
  components?: {
    headers?: Record<string, unknown>;
  };
  paths?: Record<string, Record<string, { responses?: Record<string, SpecResponse> } | undefined>>;
};

function statusCode(status: string): number | undefined {
  if (!/^\d{3}$/.test(status)) {
    return undefined;
  }
  return Number(status);
}

function isLimitedSuccessStatus(status: string): boolean {
  const code = statusCode(status);
  return code !== undefined && code >= 200 && code < 400;
}

function rateLimitHeaderRefs(includeRetryAfter: boolean): Record<string, { $ref: string }> {
  return {
    RateLimit: { $ref: RATE_LIMIT_REF },
    "RateLimit-Policy": { $ref: RATE_LIMIT_POLICY_REF },
    ...(includeRetryAfter ? { "Retry-After": { $ref: RETRY_AFTER_REF } } : {}),
  };
}

function applyRateLimitHeaderRefs(response: SpecResponse, includeRetryAfter: boolean): void {
  response.headers = {
    ...(response.headers ?? {}),
    ...rateLimitHeaderRefs(includeRetryAfter),
  };
}

export function patchOpenApiRateLimitHeaders(spec: OpenApiSpec): void {
  spec.components ??= {};
  spec.components.headers = {
    ...(spec.components.headers ?? {}),
    RateLimit: structuredClone(rateLimitHeader),
    RateLimitPolicy: structuredClone(rateLimitPolicyHeader),
    RetryAfter: structuredClone(retryAfterHeader),
  };

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    if (UNMETERED_PATHS.has(path)) {
      continue;
    }

    for (const operation of Object.values(methods)) {
      if (!operation?.responses) {
        continue;
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        if (!response || "$ref" in response) {
          continue;
        }

        if (status === "429") {
          applyRateLimitHeaderRefs(response, true);
          continue;
        }

        if (isLimitedSuccessStatus(status)) {
          applyRateLimitHeaderRefs(response, false);
        }
      }
    }
  }
}
