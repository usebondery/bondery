/**
 * `GET /sync/pull` tells a client to bootstrap again when its cursor is below
 * `sync_user_sequence.bootstrap_floor`, and also when the cursor is above the head.
 *
 * Needs a migrated Postgres. It mounts the pull route on a bare Fastify instance with a fixed
 * session user, so no auth server runs.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import {
  SQLITE_SCHEMA_HEADER,
  SQLITE_SCHEMA_VERSION,
  SYNC_PROTOCOL_HEADER,
  SYNC_PROTOCOL_VERSION,
} from "@bondery/schemas/sync";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-zod-openapi";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

describe("the pull route bootstrap floor", () => {
  const userId = randomUUID();
  let app: FastifyInstance;

  before(async () => {
    // The route pulls in the auth stack, which reads the env at import time.
    const { syncPullRoutes } = await import("../routes/sync/pull.js");
    await prisma.user.create({ data: { email: `floor-${userId}@example.test`, id: userId } });
    // Raw SQL: the Prisma client adds an `id` to every create, and this table has none.
    await prisma.$executeRaw`
      INSERT INTO sync_user_sequence (user_id, last_sequence, bootstrap_floor)
      VALUES (${userId}::uuid, 9, 5)
    `;

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorateRequest("authUser", null);
    app.addHook("onRequest", async (request) => {
      request.authUser = { email: "floor@example.test", id: userId };
    });
    await app.register(syncPullRoutes);
    await app.ready();
  });

  after(async () => {
    await app.close();
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  async function pull(since: number) {
    const response = await app.inject({
      headers: {
        [SQLITE_SCHEMA_HEADER]: String(SQLITE_SCHEMA_VERSION),
        [SYNC_PROTOCOL_HEADER]: String(SYNC_PROTOCOL_VERSION),
      },
      method: "GET",
      url: `/pull?since=${since}`,
    });
    assert.equal(response.statusCode, 200);
    return response.json<{ nextServerSequence: number; requiresBootstrap?: boolean }>();
  }

  it("asks for a bootstrap when the cursor is below the floor", async () => {
    const body = await pull(4);
    assert.equal(body.requiresBootstrap, true);
    assert.equal(body.nextServerSequence, 9, "the client continues from the head after it loads");
  });

  it("answers normally at the floor and above it", async () => {
    assert.equal((await pull(5)).requiresBootstrap, undefined);
    assert.equal((await pull(9)).requiresBootstrap, undefined);
  });

  it("still asks for a bootstrap when the cursor is above the head", async () => {
    assert.equal((await pull(10)).requiresBootstrap, true);
  });
});
