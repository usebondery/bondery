import type { SyncWakeEvent } from "@bondery/schemas/sync";
import type { FastifyBaseLogger } from "fastify";

import type { RedisClients } from "../../data/redis.js";
import { SyncConnectionHub } from "./hub.js";
import { RedisSyncWakeBus } from "./redis-bus.js";
import { createSyncWsTicketStore, type SyncWsTicketStore } from "./tickets.js";
import type { SyncWakeBus } from "./types.js";

type SyncWakeRuntime = {
  hub: SyncConnectionHub;
  bus: SyncWakeBus;
  tickets: SyncWsTicketStore;
  redisWakeBus: RedisSyncWakeBus | null;
  enabled: boolean;
};

let runtime: SyncWakeRuntime | null = null;

function isWakeEnabled(): boolean {
  const flag = process.env["SYNC_WAKE_ENABLED"];
  if (flag === undefined) {
    return true;
  }
  return flag !== "0" && flag.toLowerCase() !== "false";
}

export type { SyncWakeRuntime };

export function createSyncWakeRuntime(
  redis: RedisClients,
  log?: FastifyBaseLogger,
): SyncWakeRuntime {
  const hub = new SyncConnectionHub(log);
  const tickets = createSyncWsTicketStore(redis.commands);
  const redisWakeBus = new RedisSyncWakeBus(redis.commands, redis.subscriber);

  return {
    bus: redisWakeBus,
    enabled: isWakeEnabled(),
    hub,
    redisWakeBus,
    tickets,
  };
}

export async function initSyncWakeRuntime(
  log?: FastifyBaseLogger,
  redis?: RedisClients,
): Promise<SyncWakeRuntime> {
  if (runtime) {
    return runtime;
  }

  if (!redis) {
    throw new Error("initSyncWakeRuntime requires injected Redis clients");
  }

  runtime = createSyncWakeRuntime(redis, log);
  await runtime.bus.start((userId, event) => {
    runtime?.hub.broadcastWake(userId, event);
  });

  log?.info(
    {
      enabled: runtime.enabled,
      event: "sync.wake.init",
      redis: Boolean(runtime.redisWakeBus),
    },
    "sync wake runtime initialized",
  );

  return runtime;
}

export async function shutdownSyncWakeRuntime(): Promise<void> {
  const current = runtime;
  runtime = null;
  if (!current) {
    return;
  }
  await current.bus.stop();
}

export function getSyncWakeRuntime(): SyncWakeRuntime | null {
  return runtime;
}

export function requireSyncWakeRuntime(): SyncWakeRuntime {
  if (!runtime) {
    throw new Error("Sync wake runtime is not initialized");
  }
  return runtime;
}

export async function notifySyncWake(
  userId: string,
  event: SyncWakeEvent,
  log?: FastifyBaseLogger,
): Promise<void> {
  const rt = runtime;
  if (!rt) {
    throw new Error("Sync wake runtime is not initialized");
  }
  if (!rt.enabled) {
    return;
  }

  try {
    await rt.bus.publish(userId, event);
    log?.info(
      {
        affectedTables: event.affectedTables,
        event: "sync.wake.publish",
        serverSequence: event.serverSequence,
        userId,
      },
      "sync wake published",
    );
  } catch (error) {
    log?.error(
      { err: error, event: "sync.wake.publish_error", userId },
      "sync wake publish failed",
    );
  }
}
