/**
 * Process-scoped Redis connections for the API server.
 *
 * - commands: rate limit, WS tickets, wake PUBLISH
 * - subscriber: wake SUBSCRIBE only (Redis pub/sub constraint)
 *
 * Eager verify via initRedis() during initializeRuntime() (before sync wake).
 * Container note: on SIGTERM, prefer graceful quit via Fastify onClose when the process
 * receives a shutdown signal. In-memory-only deployments may still lose connections abruptly.
 */

import type { FastifyBaseLogger } from "fastify";
import { Redis } from "ioredis";

import { classifyProbeError } from "../health/errors.js";
import {
  assertRuntimeDependencyConfigured,
  shouldSkipLiveRuntimeVerify,
} from "../platform/runtime-env.js";
import {
  describeRedisSecurity,
  resolveRedisConnectionOptions,
} from "./redis-connection-options.js";

export type RedisReadiness = {
  configured: boolean;
  error?: string;
  latencyMs?: number;
  ok: boolean;
  verifiedAt: string;
};

export type RedisClients = {
  commands: Redis;
  subscriber: Redis;
};

export type InitRedisResult = {
  readiness: RedisReadiness;
  clients: RedisClients | null;
};

const UNCONFIGURED_READINESS: RedisReadiness = {
  configured: false,
  ok: true,
  verifiedAt: new Date(0).toISOString(),
};

let configuredUrl: string | null = null;
let commandsClient: Redis | null = null;
let subscriberClient: Redis | null = null;
let redisReadiness: RedisReadiness | null = null;

function trimRedisUrl(redisUrl?: string): string {
  return (redisUrl ?? process.env.BONDERY_PRIVATE_REDIS_URL ?? "").trim();
}

function createRedisClient(url: string): Redis {
  return new Redis(url, {
    ...resolveRedisConnectionOptions(url),
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

/** Command connection — throws when Redis URL is unset (required in all environments). */
export function requireRedisCommands(redisUrl?: string): Redis {
  const client = getRedisCommands(redisUrl);
  if (!client) {
    throw new Error(
      "BONDERY_PRIVATE_REDIS_URL must be set. Start local Redis with: pnpm run start:redis",
    );
  }
  return client;
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

/** Subscriber connection — throws when Redis URL is unset (required in all environments). */
export function requireRedisSubscriber(redisUrl?: string): Redis {
  const client = getRedisSubscriber(redisUrl);
  if (!client) {
    throw new Error(
      "BONDERY_PRIVATE_REDIS_URL must be set. Start local Redis with: pnpm run start:redis",
    );
  }
  return client;
}

function setUnconfiguredReadiness(): RedisReadiness {
  redisReadiness = { ...UNCONFIGURED_READINESS, verifiedAt: new Date().toISOString() };
  return redisReadiness;
}

function setMissingReadiness(): RedisReadiness {
  redisReadiness = {
    configured: false,
    error: "not_configured",
    ok: false,
    verifiedAt: new Date().toISOString(),
  };
  return redisReadiness;
}

async function connectIfNeeded(client: Redis): Promise<void> {
  if (client.status === "wait" || client.status === "end") {
    await client.connect();
  }
}

async function pingClient(client: Redis): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectIfNeeded(client);
  const pong = await client.ping();
  if (pong !== "PONG") {
    return { error: "unexpected_response", ok: false };
  }
  return { ok: true };
}

async function verifySubscriberForReadiness(
  client: Redis,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectIfNeeded(client);
  if (client.status === "ready") {
    return { ok: true };
  }

  return { error: client.status || "not_ready", ok: false };
}

type RedisVerifyOptions = {
  /** Pub/sub subscribers cannot answer PING after SUBSCRIBE; readiness uses connection status. */
  subscriberCheck?: "ping" | "status";
};

async function runRedisVerify(
  redisUrl: string,
  options: RedisVerifyOptions = {},
): Promise<RedisReadiness> {
  const started = Date.now();
  const verifiedAt = new Date().toISOString();

  try {
    const commands = requireRedisCommands(redisUrl);
    const subscriber = requireRedisSubscriber(redisUrl);

    const commandsPing = await pingClient(commands);
    if (!commandsPing.ok) {
      redisReadiness = {
        configured: true,
        error: commandsPing.error,
        latencyMs: Date.now() - started,
        ok: false,
        verifiedAt,
      };
      return redisReadiness;
    }

    const subscriberPing =
      options.subscriberCheck === "status"
        ? await verifySubscriberForReadiness(subscriber)
        : await pingClient(subscriber);
    if (!subscriberPing.ok) {
      redisReadiness = {
        configured: true,
        error: subscriberPing.error,
        latencyMs: Date.now() - started,
        ok: false,
        verifiedAt,
      };
      return redisReadiness;
    }

    redisReadiness = {
      configured: true,
      latencyMs: Date.now() - started,
      ok: true,
      verifiedAt,
    };
    return redisReadiness;
  } catch (error) {
    redisReadiness = {
      configured: true,
      error: classifyProbeError(error),
      latencyMs: Date.now() - started,
      ok: false,
      verifiedAt,
    };
    return redisReadiness;
  }
}

export function getRedisReadiness(): RedisReadiness {
  return redisReadiness ?? UNCONFIGURED_READINESS;
}

/**
 * Production Redis must use TLS and a password (see the bondery-security skill).
 * The API still starts so that an upgrade never takes down an external Redis setup,
 * but the operator sees what to fix on every boot.
 */
function warnOnInsecureProductionRedis(log: FastifyBaseLogger | undefined, redisUrl: string): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const posture = describeRedisSecurity(redisUrl);
  if (posture.tls && posture.authenticated) {
    return;
  }
  log?.warn(
    { redisAuthenticated: posture.authenticated, redisTls: posture.tls },
    "Redis connection is not protected: production Redis must use TLS (rediss://) and a password. See https://docs.usebondery.com/deploy/configuration#redis",
  );
}

/**
 * Eager Redis verify on startup. Required in development and production; skipped in test.
 */
export async function initRedis(
  log: FastifyBaseLogger | undefined,
  redisUrl: string,
): Promise<InitRedisResult> {
  const trimmed = redisUrl.trim();
  if (!trimmed) {
    assertRuntimeDependencyConfigured(
      false,
      "BONDERY_PRIVATE_REDIS_URL must be set. Start local Redis with: pnpm run start:redis",
    );
    log?.info("Redis not configured — skipping verify in test");
    return { clients: null, readiness: setUnconfiguredReadiness() };
  }

  warnOnInsecureProductionRedis(log, trimmed);

  if (shouldSkipLiveRuntimeVerify()) {
    log?.info("Redis verify skipped in test environment");
    const readiness = {
      configured: true,
      ok: true,
      verifiedAt: new Date().toISOString(),
    };
    redisReadiness = readiness;
    return {
      clients: {
        commands: requireRedisCommands(trimmed),
        subscriber: requireRedisSubscriber(trimmed),
      },
      readiness,
    };
  }

  const readiness = await runRedisVerify(trimmed);
  if (readiness.ok) {
    log?.info({ latencyMs: readiness.latencyMs }, "Redis verified");
  } else {
    log?.error({ error: readiness.error, latencyMs: readiness.latencyMs }, "Redis verify failed");
    throw new Error(`Redis verify failed: ${readiness.error ?? "unknown"}`);
  }

  return {
    clients: {
      commands: requireRedisCommands(trimmed),
      subscriber: requireRedisSubscriber(trimmed),
    },
    readiness,
  };
}

/** Re-verify Redis (used by /health/ready when cache is cold). */
export async function verifyRedis(redisUrl: string): Promise<RedisReadiness> {
  const trimmed = redisUrl.trim();
  if (!trimmed) {
    if (shouldSkipLiveRuntimeVerify()) {
      return setUnconfiguredReadiness();
    }

    return setMissingReadiness();
  }

  if (shouldSkipLiveRuntimeVerify()) {
    redisReadiness = {
      configured: true,
      ok: true,
      verifiedAt: new Date().toISOString(),
    };
    return redisReadiness;
  }

  return runRedisVerify(trimmed, { subscriberCheck: "status" });
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
  redisReadiness = null;

  await quitClient(subscriber);
  await quitClient(commands);
}

/** @internal Test-only reset without open connections. */
export function resetRedisClientsForTests(): void {
  commandsClient = null;
  subscriberClient = null;
  configuredUrl = null;
  redisReadiness = null;
}

/** @internal Test-only reset for readiness cache. */
export function resetRedisReadinessForTests(): void {
  redisReadiness = null;
}
