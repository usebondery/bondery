import { AssertionError } from "node:assert";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PrismaClient } from "@bondery/db";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import {
  type FastifyZodOpenApiTypeProvider,
  fastifyZodOpenApiPlugin,
  serializerCompiler,
  validatorCompiler,
} from "fastify-zod-openapi";
import { mapErrorToResponse } from "../lib/platform/errors/map-to-response.js";
import { registerIdempotency } from "../lib/platform/idempotency.js";
import {
  IDEMPOTENCY_EXEMPT_ROUTES,
  IDEMPOTENCY_REPLAYED_HEADER,
} from "../lib/platform/idempotency-policy.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { prisma } = await import("@bondery/db");

const USER_ID = "018f5c3a-7b2e-7c1a-8d4e-000000000001";

type StoredRow = {
  body: unknown;
  hash: string;
  omitted: boolean;
  status: "complete" | "processing";
  statusCode: number | null;
};

const store = new Map<string, StoredRow>();
let originalQueryRaw: PrismaClient["$queryRaw"] | undefined;

function realQueryRaw(): PrismaClient["$queryRaw"] {
  if (!originalQueryRaw) {
    originalQueryRaw = prisma.$queryRaw;
  }
  return originalQueryRaw;
}

function installMemoryStore(): void {
  realQueryRaw();
  prisma.$queryRaw = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join(" ");
    if (sql.includes("claim_idempotency_key")) {
      const [userId, key, hash] = values as [string, string, string];
      const id = `${userId}\u0000${key}`;
      const existing = store.get(id);
      if (!existing) {
        store.set(id, {
          body: null,
          hash,
          omitted: false,
          status: "processing",
          statusCode: null,
        });
        return [
          {
            outcome: "claimed",
            response_body: null,
            response_omitted: false,
            status_code: null,
          },
        ];
      }
      if (existing.status === "complete") {
        if (existing.hash !== hash) {
          return [
            {
              outcome: "mismatch",
              response_body: null,
              response_omitted: false,
              status_code: null,
            },
          ];
        }
        return [
          {
            outcome: "replay",
            response_body: existing.body,
            response_omitted: existing.omitted,
            status_code: existing.statusCode,
          },
        ];
      }
      return [
        {
          outcome: "in_progress",
          response_body: null,
          response_omitted: false,
          status_code: null,
        },
      ];
    }
    if (sql.includes("complete_idempotency_key")) {
      const [userId, key, statusCode, bodyJson, omitted] = values as [
        string,
        string,
        number,
        string | null,
        boolean,
      ];
      const row = store.get(`${userId}\u0000${key}`);
      if (row?.status === "processing") {
        row.status = "complete";
        row.statusCode = statusCode;
        row.omitted = omitted;
        row.body = bodyJson === null ? null : (JSON.parse(bodyJson) as unknown);
      }
      return [{ ok: true }];
    }
    if (sql.includes("release_idempotency_key")) {
      const [userId, key] = values as [string, string];
      const id = `${userId}\u0000${key}`;
      const row = store.get(id);
      if (row?.status === "processing") {
        store.delete(id);
      }
      return [{ ok: true }];
    }
    if (sql.includes("refresh_idempotency_lease")) {
      return [{ ok: true }];
    }
    throw new Error(`unexpected idempotency sql: ${sql}`);
  }) as PrismaClient["$queryRaw"];
}

function restoreQueryRaw(): void {
  prisma.$queryRaw = realQueryRaw();
}

describe("idempotency hook", { concurrency: false }, () => {
  before(() => {
    installMemoryStore();
  });

  after(() => {
    restoreQueryRaw();
  });

  beforeEach(() => {
    store.clear();
  });

  it("replays the stored JSON body and does not run the write twice", async () => {
    const { app, writes } = await createApp();
    const payload = '{"name":"Ada","city":"Prague"}';
    const headers = jsonHeaders("key-replay");

    const first = await app.inject({ headers, method: "POST", payload, url: "/notes" });
    const second = await app.inject({ headers, method: "POST", payload, url: "/notes" });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(second.headers[IDEMPOTENCY_REPLAYED_HEADER.toLowerCase()], "true");
    assert.equal(first.headers[IDEMPOTENCY_REPLAYED_HEADER.toLowerCase()], undefined);
    assert.deepEqual(JSON.parse(second.body), JSON.parse(first.body));
    assert.equal(writes.count, 1);

    const mismatch = await app.inject({
      headers,
      method: "POST",
      payload: '{"city":"Prague","name":"Ada"}',
      url: "/notes",
    });
    assert.equal(mismatch.statusCode, 422, mismatch.body);
    assert.equal(JSON.parse(mismatch.body).error.code, "idempotency_key_mismatch");
    assert.equal(writes.count, 1);
    await app.close();
  });

  it("releases a 500 so the same key can run again", async () => {
    let calls = 0;
    const { app } = await createApp({
      configure(instance) {
        instance.post("/notes", async () => {
          calls += 1;
          if (calls === 1) {
            throw new Error("boom");
          }
          return { note: { id: "n1" } };
        });
      },
    });
    const headers = jsonHeaders("key-500");
    const payload = '{"name":"Ada"}';

    const first = await app.inject({ headers, method: "POST", payload, url: "/notes" });
    const second = await app.inject({ headers, method: "POST", payload, url: "/notes" });

    assert.equal(first.statusCode, 500, first.body);
    assert.equal(second.statusCode, 200, second.body);
    assert.equal(JSON.parse(second.body).note.id, "n1");
    assert.equal(calls, 2);
    await app.close();
  });

  it("returns 409 while another claim is open", async () => {
    let release = () => {};
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = 0;
    const { app } = await createApp({
      configure(instance) {
        instance.post("/notes", async () => {
          started += 1;
          if (started === 1) {
            await hold;
          }
          return { note: { id: "n1" } };
        });
      },
    });
    const headers = jsonHeaders("key-open");
    const payload = '{"name":"Ada"}';
    const first = app.inject({ headers, method: "POST", payload, url: "/notes" });
    await waitFor(() => started === 1);
    const second = await app.inject({ headers, method: "POST", payload, url: "/notes" });
    release();
    const winner = await first;

    assert.equal(second.statusCode, 409, second.body);
    assert.equal(JSON.parse(second.body).error.code, "idempotency_key_in_progress");
    assert.equal(Number(second.headers["retry-after"]) >= 1, true);
    assert.equal(winner.statusCode, 200, winner.body);
    assert.equal(started, 1);
    await app.close();
  });

  it("rejects an invalid key and ignores the header without an auth user", async () => {
    const authed = await createApp();
    const invalid = await authed.app.inject({
      headers: jsonHeaders("bad key"),
      method: "POST",
      payload: "{}",
      url: "/notes",
    });
    assert.equal(invalid.statusCode, 400, invalid.body);
    assert.equal(JSON.parse(invalid.body).error.code, "idempotency_key_invalid");
    assert.equal(authed.writes.count, 0);
    await authed.app.close();

    const open = await createApp({ auth: false });
    const headers = jsonHeaders("ignored-key");
    await open.app.inject({ headers, method: "POST", payload: "{}", url: "/notes" });
    await open.app.inject({ headers, method: "POST", payload: "{}", url: "/notes" });
    assert.equal(open.writes.count, 2);
    await open.app.close();
  });

  it("rejects the key on a route that opts out", async () => {
    let started = false;
    const { app } = await createApp({
      configure(instance) {
        instance.post("/stream", { config: { idempotency: false } }, async () => {
          started = true;
          return { ok: true };
        });
      },
    });
    const response = await app.inject({
      headers: jsonHeaders("chat-key"),
      method: "POST",
      payload: "{}",
      url: "/stream",
    });
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(JSON.parse(response.body).error.code, "idempotency_key_unsupported");
    assert.equal(started, false);
    await app.close();
  });

  it("ignores the header on GET and under the Better Auth path", async () => {
    let reads = 0;
    let authPosts = 0;
    const { app } = await createApp({
      configure(instance) {
        instance.get("/notes", async () => {
          reads += 1;
          return { notes: [] };
        });
        instance.post("/auth/sign-in", async () => {
          authPosts += 1;
          return { ok: true };
        });
      },
    });
    const headers = jsonHeaders("key-ignore");
    await app.inject({ headers, method: "GET", url: "/notes" });
    await app.inject({ headers, method: "GET", url: "/notes" });
    await app.inject({ headers, method: "POST", payload: "{}", url: "/auth/sign-in" });
    await app.inject({ headers, method: "POST", payload: "{}", url: "/auth/sign-in" });
    assert.equal(reads, 2);
    assert.equal(authPosts, 2);
    assert.equal(store.size, 0);
    await app.close();
  });
});

describe("idempotency route allowlist", { concurrency: false }, () => {
  it("POST /chat opts out and is the only exempt route on that plugin", async () => {
    const { chatRoutes } = await import("../routes/chat/index.js");
    const seen: { idempotency?: boolean; method: string; url: string }[] = [];
    const app = Fastify({ logger: false }).withTypeProvider<FastifyZodOpenApiTypeProvider>();
    await app.register(fastifyZodOpenApiPlugin, { documentOpts: { openapi: "3.0.3" } });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.addHook("onRoute", (routeOptions) => {
      const methods = Array.isArray(routeOptions.method)
        ? routeOptions.method
        : [routeOptions.method];
      for (const method of methods) {
        seen.push({
          idempotency: routeOptions.config?.idempotency,
          method: String(method).toUpperCase(),
          url: routeOptions.url,
        });
      }
    });
    await app.register(chatRoutes, { prefix: API_ROUTES.CHAT });
    await app.ready();

    const exempt = seen.filter((route) => route.idempotency === false);
    assert.equal(exempt.length, 1, JSON.stringify(seen));
    assert.deepEqual(
      exempt.map((route) => ({ method: route.method, url: route.url.replace(/\/$/, "") })),
      [...IDEMPOTENCY_EXEMPT_ROUTES],
    );
    await app.close();
  });

  it("returns idempotency_key_unsupported for POST /chat and does not start the stream", async () => {
    const { chatRoutes } = await import("../routes/chat/index.js");
    const app = Fastify({
      logger: false,
      routerOptions: { ignoreTrailingSlash: true },
    }).withTypeProvider<FastifyZodOpenApiTypeProvider>();
    await app.register(fastifyZodOpenApiPlugin, { documentOpts: { openapi: "3.0.3" } });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorateRequest("authUser", null);
    app.addHook("onRequest", async (request) => {
      request.authUser = { email: "ada@example.com", id: USER_ID };
    });
    app.setErrorHandler((error, request, reply) => {
      const mapped = mapErrorToResponse(error as Parameters<typeof mapErrorToResponse>[0], request);
      return reply.status(mapped.statusCode).send(mapped.body);
    });
    registerIdempotency(app);
    await app.register(chatRoutes, { prefix: API_ROUTES.CHAT });
    await app.ready();

    const response = await app.inject({
      headers: {
        ...jsonHeaders("chat-stream-key"),
      },
      method: "POST",
      payload: JSON.stringify({
        messages: [{ role: "user" }],
        sessionId: "session-1",
      }),
      url: API_ROUTES.CHAT,
    });

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(JSON.parse(response.body).error.code, "idempotency_key_unsupported");
    assert.equal(
      String(response.headers["content-type"] ?? "").includes("text/event-stream"),
      false,
    );
    await app.close();
  });
});

describe("idempotency concurrent claims", { concurrency: false }, () => {
  before(() => {
    restoreQueryRaw();
  });

  it("lets one claim win and returns 409 for the other", async () => {
    try {
      await runConcurrentClaims();
    } catch (error) {
      if (error instanceof AssertionError) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await runConcurrentClaims();
    }
  });
});

async function runConcurrentClaims(): Promise<void> {
  const user = await prisma.user.findFirst({ select: { email: true, id: true } });
  if (!user?.email) {
    throw new Error("idempotency concurrent test needs one user row");
  }

  const key = `conc-${Date.now()}`;
  let release = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = 0;
  const app = Fastify({ logger: false });
  app.decorateRequest("authUser", null);
  app.addHook("onRequest", async (request) => {
    request.authUser = { email: user.email, id: user.id };
  });
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapErrorToResponse(error as Parameters<typeof mapErrorToResponse>[0], request);
    return reply.status(mapped.statusCode).send(mapped.body);
  });
  registerIdempotency(app);
  app.post("/notes", async () => {
    started += 1;
    if (started === 1) {
      await hold;
    }
    return { note: { id: "n1" } };
  });
  await app.ready();

  const headers = jsonHeaders(key);
  const payload = '{"name":"Ada"}';
  const first = app.inject({ headers, method: "POST", payload, url: "/notes" });
  try {
    const early = await Promise.race([waitFor(() => started === 1).then(() => null), first]);
    if (early) {
      throw new Error(`winner finished before the handler: ${early.statusCode} ${early.body}`);
    }
    const second = await app.inject({ headers, method: "POST", payload, url: "/notes" });
    release();
    const winner = await first;
    assert.equal(winner.statusCode, 200, winner.body);
    assert.equal(second.statusCode, 409, second.body);
    assert.equal(JSON.parse(second.body).error.code, "idempotency_key_in_progress");
    assert.equal(started, 1);
  } finally {
    release();
    await app.close();
    try {
      await prisma.$executeRaw`
        DELETE FROM idempotency_keys
        WHERE user_id = ${user.id}::uuid AND key = ${key}
      `;
    } catch (error) {
      void error;
    }
  }
}

function jsonHeaders(key: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "idempotency-key": key,
  };
}

async function createApp(options?: {
  auth?: boolean;
  configure?: (app: FastifyInstance) => void;
}): Promise<{ app: FastifyInstance; writes: { count: number } }> {
  const writes = { count: 0 };
  const app = Fastify({ logger: false });
  app.decorateRequest("authUser", null);
  if (options?.auth !== false) {
    app.addHook("onRequest", async (request) => {
      request.authUser = { email: "ada@example.com", id: USER_ID };
    });
  }
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapErrorToResponse(error as Parameters<typeof mapErrorToResponse>[0], request);
    return reply.status(mapped.statusCode).send(mapped.body);
  });
  registerIdempotency(app);
  if (options?.configure) {
    options.configure(app);
  } else {
    app.post("/notes", async () => {
      writes.count += 1;
      return { note: { id: "n1", writes: writes.count } };
    });
  }
  await app.ready();
  return { app, writes };
}

async function waitFor(ready: () => boolean): Promise<void> {
  const start = Date.now();
  while (!ready()) {
    if (Date.now() - start > 4000) {
      throw new Error("timed out waiting for the idempotency claim");
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}
