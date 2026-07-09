import type { SyncWakeEvent } from "@bondery/schemas/sync";
import type { FastifyBaseLogger } from "fastify";

import { getRedisCommands, getRedisSubscriber } from "../../data/redis.js";
import { SyncConnectionHub } from "./hub.js";

import { InMemorySyncWakeBus } from "./in-memory-bus.js";

import { RedisSyncWakeBus } from "./redis-bus.js";
import { createSyncWsTicketStore, type SyncWsTicketStore } from "./tickets.js";
import type { SyncWakeBus } from "./types.js";

export type SyncWakeRuntime = {
  hub: SyncConnectionHub;
  bus: SyncWakeBus;
  tickets: SyncWsTicketStore;
  redisWakeBus: RedisSyncWakeBus | null;
  enabled: boolean;
};

let runtime: SyncWakeRuntime | null = null;

function isWakeEnabled(): boolean {
  const flag = process.env.SYNC_WAKE_ENABLED;
  if (flag === undefined) {
    return true;
  }
  return flag !== "0" && flag.toLowerCase() !== "false";
}

export function createSyncWakeRuntime(log?: FastifyBaseLogger): SyncWakeRuntime {
  const redisUrl = process.env.PRIVATE_REDIS_URL?.trim() ?? "";
  const hub = new SyncConnectionHub(log);
  const commands = getRedisCommands(redisUrl || undefined);
  const subscriber = getRedisSubscriber(redisUrl || undefined);
  const tickets = createSyncWsTicketStore(commands);

  let bus: SyncWakeBus;
  let redisWakeBus: RedisSyncWakeBus | null = null;

  if (commands && subscriber) {
    redisWakeBus = new RedisSyncWakeBus(commands, subscriber);
    bus = redisWakeBus;
  } else {
    bus = new InMemorySyncWakeBus();
  }

  return {
    bus,
    enabled: isWakeEnabled(),
    hub,
    redisWakeBus,
    tickets,
  };
}

export async function initSyncWakeRuntime(log?: FastifyBaseLogger): Promise<SyncWakeRuntime> {
  if (runtime) {
    return runtime;
  }

  runtime = createSyncWakeRuntime(log);
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
  if (!runtime) {
    return;
  }
  await runtime.bus.stop();
  runtime = null;
}

export function getSyncWakeRuntime(): SyncWakeRuntime | null {
  return runtime;
}

export async function notifySyncWake(
  userId: string,
  event: SyncWakeEvent,
  log?: FastifyBaseLogger,
): Promise<void> {
  const rt = runtime ?? (await initSyncWakeRuntime(log));
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
