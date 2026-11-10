import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type InjectOptions } from "fastify";
import { mapErrorToResponse } from "../lib/platform/errors/map-to-response.js";
import {
  AI_TIER,
  buildRateLimitErrorResponse,
  CSP_REPORT_TIER,
  NOT_FOUND_TIER,
  registerDraftRateLimitHeaders,
  registerNotFoundRateLimit,
} from "../lib/platform/rate-limit.js";

type HeaderMap = Record<string, number | string | string[] | undefined>;

function headerValue(headers: HeaderMap, name: string): string | undefined {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  if (value === undefined) {
    return undefined;
  }
  return String(value);
}

function requireHeader(headers: HeaderMap, name: string): string {
  const value = headerValue(headers, name);
  assert.ok(value, `missing header ${name}`);
  return value;
}

async function createRateLimitApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(fastifyRateLimit, {
    errorResponseBuilder: buildRateLimitErrorResponse,
    global: true,
    max: 300,
    timeWindow: "60 seconds",
  });
  registerDraftRateLimitHeaders(app);
  registerNotFoundRateLimit(app);
  app.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = mapErrorToResponse(
      error as Parameters<typeof mapErrorToResponse>[0],
      request,
    );
    return reply.status(statusCode).send(body);
  });
  app.get("/", async () => ({ ok: true }));
  app.get("/ai", { config: { rateLimit: AI_TIER } }, async () => ({ ok: true }));
  app.get("/csp", { config: { rateLimit: CSP_REPORT_TIER } }, async () => ({ ok: true }));
  app.get("/not-found-tier", { config: { rateLimit: NOT_FOUND_TIER } }, async () => ({
    ok: true,
  }));
  app.get("/open", { config: { rateLimit: false } }, async () => ({ ok: true }));
  await app.ready();
  return app;
}

async function inject(app: FastifyInstance, url: string, method: InjectOptions["method"] = "GET") {
  return app.inject({ method, url });
}

describe("draft rate-limit headers", () => {
  it("emits draft headers and x-ratelimit-* on 200", async () => {
    const app = await createRateLimitApp();
    try {
      const response = await inject(app, "/");
      assert.equal(response.statusCode, 200);
      assert.equal(requireHeader(response.headers, "x-ratelimit-limit"), "300");
      assert.equal(requireHeader(response.headers, "x-ratelimit-remaining"), "299");
      assert.equal(requireHeader(response.headers, "x-ratelimit-reset"), "60");
      assert.equal(requireHeader(response.headers, "ratelimit-policy"), '"default";q=300;w=60');
      assert.equal(requireHeader(response.headers, "ratelimit"), '"default";r=299;t=60');
      assert.equal(headerValue(response.headers, "retry-after"), undefined);
    } finally {
      await app.close();
    }
  });

  it("reports the ai tier instead of the global bucket", async () => {
    const app = await createRateLimitApp();
    try {
      const response = await inject(app, "/ai");
      assert.equal(response.statusCode, 200);
      assert.equal(requireHeader(response.headers, "ratelimit-policy"), '"ai";q=20;w=60');
      assert.equal(requireHeader(response.headers, "ratelimit"), '"ai";r=19;t=60');
      assert.equal(requireHeader(response.headers, "x-ratelimit-limit"), "20");
    } finally {
      await app.close();
    }
  });

  it("names csp_report and not_found from the tier object", async () => {
    const app = await createRateLimitApp();
    try {
      const csp = await inject(app, "/csp");
      const notFoundTier = await inject(app, "/not-found-tier");
      assert.equal(requireHeader(csp.headers, "ratelimit-policy"), '"csp_report";q=60;w=60');
      assert.equal(requireHeader(csp.headers, "ratelimit"), '"csp_report";r=59;t=60');
      assert.equal(
        requireHeader(notFoundTier.headers, "ratelimit-policy"),
        '"not_found";q=60;w=60',
      );
      assert.equal(requireHeader(notFoundTier.headers, "ratelimit"), '"not_found";r=59;t=60');
    } finally {
      await app.close();
    }
  });

  it("sets r=0, Retry-After, and error.retry_after to the same t on 429", async () => {
    const app = await createRateLimitApp();
    try {
      let response = await inject(app, "/ai");
      for (let attempt = 1; attempt < 21; attempt += 1) {
        response = await inject(app, "/ai");
      }
      assert.equal(response.statusCode, 429);
      const resetSeconds = requireHeader(response.headers, "x-ratelimit-reset");
      assert.equal(requireHeader(response.headers, "ratelimit-policy"), '"ai";q=20;w=60');
      assert.equal(requireHeader(response.headers, "ratelimit"), `"ai";r=0;t=${resetSeconds}`);
      assert.equal(requireHeader(response.headers, "retry-after"), resetSeconds);
      assert.equal(requireHeader(response.headers, "x-ratelimit-remaining"), "0");
      const body = response.json() as { error: { code: string; retry_after: number } };
      assert.equal(body.error.code, "rate_limit_exceeded");
      assert.equal(body.error.retry_after, Number(resetSeconds));
    } finally {
      await app.close();
    }
  });

  it("omits RateLimit when rateLimit is false", async () => {
    const app = await createRateLimitApp();
    try {
      const response = await inject(app, "/open");
      assert.equal(response.statusCode, 200);
      assert.equal(headerValue(response.headers, "ratelimit"), undefined);
      assert.equal(headerValue(response.headers, "ratelimit-policy"), undefined);
      assert.equal(headerValue(response.headers, "x-ratelimit-limit"), undefined);
    } finally {
      await app.close();
    }
  });

  it("names a missing route not_found", async () => {
    const app = await createRateLimitApp();
    try {
      const response = await inject(app, "/missing");
      assert.equal(response.statusCode, 404);
      assert.equal(requireHeader(response.headers, "ratelimit-policy"), '"not_found";q=60;w=60');
      assert.equal(requireHeader(response.headers, "ratelimit"), '"not_found";r=59;t=60');
    } finally {
      await app.close();
    }
  });
});
