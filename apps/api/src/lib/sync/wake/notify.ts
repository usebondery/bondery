import type { FastifyBaseLogger } from "fastify";
import type { SyncWakeEvent } from "@bondery/schemas/sync";
import type { SyncWakeBus } from "./types.js";
import { InMemorySyncWakeBus } from "./in-memory-bus.js";
import { RedisSyncWakeBus } from "./redis-bus.js";
import { SyncConnectionHub } from "./hub.js";
import {
  createSyncWsTicketStore,
  type SyncWsTicketStore,
} from "./tickets.js";

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
  if (flag === undefined) return true;
  return flag !== "0" && flag.toLowerCase() !== "false";
}

export function createSyncWakeRuntime(log?: FastifyBaseLogger): SyncWakeRuntime {
  const redisUrl = process.env.PRIVATE_REDIS_URL?.trim() ?? "";
  const hub = new SyncConnectionHub(log);
  const tickets = createSyncWsTicketStore(redisUrl || undefined);

  let bus: SyncWakeBus;
  let redisWakeBus: RedisSyncWakeBus | null = null;

  if (redisUrl) {
    redisWakeBus = new RedisSyncWakeBus(redisUrl);
    bus = redisWakeBus;
  } else {
    bus = new InMemorySyncWakeBus();
  }

  return {
    hub,
    bus,
    tickets,
    redisWakeBus,
    enabled: isWakeEnabled(),
  };
}

export async function initSyncWakeRuntime(log?: FastifyBaseLogger): Promise<SyncWakeRuntime> {
  if (runtime) return runtime;

  runtime = createSyncWakeRuntime(log);
  await runtime.bus.start((userId, event) => {
    runtime?.hub.broadcastWake(userId, event);
  });

  log?.info(
    {
      event: "sync.wake.init",
      redis: Boolean(process.env.PRIVATE_REDIS_URL?.trim()),
      enabled: runtime.enabled,
    },
    "sync wake runtime initialized",
  );

  return runtime;
}

export async function shutdownSyncWakeRuntime(): Promise<void> {
  if (!runtime) return;
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
  if (!rt.enabled) return;

  try {
    await rt.bus.publish(userId, event);
    log?.info(
      {
        event: "sync.wake.publish",
        userId,
        serverSequence: event.serverSequence,
        affectedTables: event.affectedTables,
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
