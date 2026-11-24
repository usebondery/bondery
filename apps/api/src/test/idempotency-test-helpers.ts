/**
 * Shared setup for the idempotency tests: an in-memory stand-in for the claim SQL and a small
 * Fastify app with the idempotency hooks registered.
 */
import type { PrismaClient } from "@bondery/db";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { mapErrorToResponse } from "../lib/platform/errors/map-to-response.js";
import { registerIdempotency } from "../lib/platform/idempotency.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

type StoredRow = {
  body: unknown;
  hash: string;
  omitted: boolean;
  status: "complete" | "processing";
  statusCode: number | null;
};
let originalQueryRaw: PrismaClient["$queryRaw"] | undefined;

function realQueryRaw(): PrismaClient["$queryRaw"] {
  if (!originalQueryRaw) {
    originalQueryRaw = prisma.$queryRaw;
  }
  return originalQueryRaw;
}

export type { StoredRow };

export const { prisma } = await import("@bondery/db");

export const USER_ID = "018f5c3a-7b2e-7c1a-8d4e-000000000001";

export const store = new Map<string, StoredRow>();

export function installMemoryStore(): void {
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

export function restoreQueryRaw(): void {
  prisma.$queryRaw = realQueryRaw();
}

export function jsonHeaders(key: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "idempotency-key": key,
  };
}

export async function createApp(options?: {
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

export async function waitFor(ready: () => boolean): Promise<void> {
  const start = Date.now();
  while (!ready()) {
    if (Date.now() - start > 4000) {
      throw new Error("timed out waiting for the idempotency claim");
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 15);
    });
  }
}
