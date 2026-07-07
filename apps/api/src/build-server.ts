/**
 * Production server factory: buildApp + runtime lifecycle (auth verify, sync wake).
 */

import type { AppFastifyInstance } from "./lib/fastify-types.js";
import { verifyAuthAtStartup } from "./lib/auth.js";
import {
  initSyncWakeRuntime,
  shutdownSyncWakeRuntime,
} from "./lib/sync/wake/index.js";
import { buildApp } from "./build-app.js";

export async function buildServer(): Promise<AppFastifyInstance> {
  const fastify = await buildApp();

  fastify.addHook("onReady", async () => {
    await verifyAuthAtStartup(fastify);
    await initSyncWakeRuntime(fastify.log);
  });

  fastify.addHook("onClose", async () => {
    await shutdownSyncWakeRuntime();
  });

  return fastify;
}
