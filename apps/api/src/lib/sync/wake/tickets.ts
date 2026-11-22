import type { Redis } from "ioredis";
import { InMemorySyncWsTicketStore } from "./in-memory-ticket-store.js";
import { RedisSyncWsTicketStore } from "./redis-ticket-store.js";

export interface SyncWsTicketStore {
  consume: (ticket: string) => Promise<string | null>;
  issue: (userId: string) => Promise<{ ticket: string; expiresAt: number }>;
}

export { InMemorySyncWsTicketStore, RedisSyncWsTicketStore };

export function createSyncWsTicketStore(commands?: Redis): SyncWsTicketStore {
  if (!commands) {
    return new InMemorySyncWsTicketStore();
  }
  return new RedisSyncWsTicketStore(commands);
}
