import { createPrismaPool, initializePrisma } from "@bondery/db";
import type { Pool } from "pg";

import { bindDatabaseUrl, requireDatabaseUrl } from "../data/database-url.js";
import { initPostgres } from "../data/postgres.js";
import { reportDatabaseTls } from "../data/postgres-tls.js";
import { initRedis } from "../data/redis.js";
import { startJobs } from "../jobs/index.js";
import { initEmailTransport } from "../notifications/transporter.js";
import { initObjectStorage } from "../storage/init-storage.js";
import { reportObjectStorageTls } from "../storage/storage-tls.js";
import { initSyncWakeRuntime } from "../sync/wake/index.js";
import type { AppFastifyInstance } from "./fastify-types.js";
import type { RuntimeDeps } from "./runtime-deps.js";
import { shouldSkipLiveRuntimeVerify } from "./runtime-env.js";

function registerPoolShutdown(fastify: AppFastifyInstance, pool: Pool): void {
  fastify.addHook("onClose", async () => {
    await pool.end();
  });
}

/**
 * Eager runtime dependency verification before listen.
 * Order: Postgres → storage → SMTP → Redis → sync wake → pg-boss jobs.
 */
export async function initializeRuntime(fastify: AppFastifyInstance): Promise<RuntimeDeps> {
  const log = fastify.log;
  const config = fastify.config;

  bindDatabaseUrl(config.DATABASE_URL);
  const databaseUrl = requireDatabaseUrl();

  const pool = createPrismaPool(databaseUrl);
  initializePrisma(pool);

  await initPostgres(log);
  if (!shouldSkipLiveRuntimeVerify()) {
    await reportDatabaseTls(log, pool, databaseUrl);
  }

  await initObjectStorage(log, {
    accessKeyId: config.BONDERY_PRIVATE_S3_ACCESS_KEY_ID,
    endpoint: config.BONDERY_PRIVATE_S3_ENDPOINT,
    region: config.BONDERY_PRIVATE_S3_REGION,
    secretAccessKey: config.BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY,
  });
  if (!shouldSkipLiveRuntimeVerify()) {
    await reportObjectStorageTls(log, config.BONDERY_PRIVATE_S3_ENDPOINT);
  }

  await initEmailTransport(log);

  const redis = await initRedis(log, config.BONDERY_PRIVATE_REDIS_URL);
  if (!redis.clients) {
    throw new Error("Redis clients unavailable after init");
  }

  await initSyncWakeRuntime(log, redis.clients);
  await startJobs(log, databaseUrl);

  registerPoolShutdown(fastify, pool);

  return {
    databaseUrl,
    pool,
    redis: redis.clients,
  };
}
