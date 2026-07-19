/**
 * Process-scoped Redis connections for the API server.
 *
 * - commands: rate limit, WS tickets, wake PUBLISH
 * - subscriber: wake SUBSCRIBE only (Redis pub/sub constraint)
 *
 * Container note: on SIGTERM, prefer graceful quit via Fastify onClose when the process
 * receives a shutdown signal. In-memory-only deployments may still lose connections abruptly.
 */

import { Redis } from "ioredis";

let configuredUrl: string | null = null;
let commandsClient: Redis | null = null;
let subscriberClient: Redis | null = null;

function trimRedisUrl(redisUrl?: string): string {
  return (redisUrl ?? process.env.BONDERY_PRIVATE_REDIS_URL ?? "").trim();
}

function createRedisClient(url: string): Redis {
  return new Redis(url, {
    connectTimeout: 500,
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

function ensureUrl(redisUrl?: string): string | undefined {
  const trimmed = trimRedisUrl(redisUrl);
  if (!trimmed) {
    return undefined;
  }
  if (configuredUrl && configuredUrl !== trimmed) {
    throw new Error(
      "BONDERY_PRIVATE_REDIS_URL changed after Redis clients were created; restart the process",
    );
  }
  configuredUrl = trimmed;
  return trimmed;
}

/** Process-scoped command connection. Undefined when URL empty. */
export function getRedisCommands(redisUrl?: string): Redis | undefined {
  const url = ensureUrl(redisUrl);
  if (!url) {
    return undefined;
  }
  if (!commandsClient) {
    commandsClient = createRedisClient(url);
  }
  return commandsClient;
}

/** Process-scoped subscriber connection. Undefined when URL empty. */
export function getRedisSubscriber(redisUrl?: string): Redis | undefined {
  const url = ensureUrl(redisUrl);
  if (!url) {
    return undefined;
  }
  if (!subscriberClient) {
    subscriberClient = createRedisClient(url);
  }
  return subscriberClient;
}

async function quitClient(client: Redis | null): Promise<void> {
  if (!client) {
    return;
  }
  const status = client.status;
  if (status === "end" || status === "close") {
    return;
  }
  try {
    await client.quit();
  } catch {
    // Already closed — idempotent shutdown
  }
}

/** Unsubscribe paths must run first (via shutdownSyncWakeRuntime). Idempotent. */
export async function shutdownRedis(): Promise<void> {
  const subscriber = subscriberClient;
  const commands = commandsClient;
  subscriberClient = null;
  commandsClient = null;
  configuredUrl = null;

  await quitClient(subscriber);
  await quitClient(commands);
}

/** @internal Test-only reset without open connections. */
export function resetRedisClientsForTests(): void {
  commandsClient = null;
  subscriberClient = null;
  configuredUrl = null;
}
