import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";

const TICKET_TTL_SECONDS = 60;
const TICKET_KEY_PREFIX = "sync:ws-ticket:";

export interface SyncWsTicketStore {
  consume(ticket: string): Promise<string | null>;
  issue(userId: string): Promise<{ ticket: string; expiresAt: number }>;
}

type MemoryTicket = {
  userId: string;
  expiresAt: number;
};

export class InMemorySyncWsTicketStore implements SyncWsTicketStore {
  private readonly tickets = new Map<string, MemoryTicket>();

  async issue(userId: string): Promise<{ ticket: string; expiresAt: number }> {
    this.pruneExpired();
    const ticket = randomUUID();
    const expiresAt = Date.now() + TICKET_TTL_SECONDS * 1000;
    this.tickets.set(ticket, { expiresAt, userId });
    return { expiresAt, ticket };
  }

  async consume(ticket: string): Promise<string | null> {
    this.pruneExpired();
    const entry = this.tickets.get(ticket);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.tickets.delete(ticket);
      return null;
    }
    this.tickets.delete(ticket);
    return entry.userId;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [ticket, entry] of this.tickets) {
      if (entry.expiresAt <= now) {
        this.tickets.delete(ticket);
      }
    }
  }
}

export class RedisSyncWsTicketStore implements SyncWsTicketStore {
  constructor(private readonly redis: Redis) {}

  async issue(userId: string): Promise<{ ticket: string; expiresAt: number }> {
    const ticket = randomUUID();
    const expiresAt = Date.now() + TICKET_TTL_SECONDS * 1000;
    await this.redis.set(`${TICKET_KEY_PREFIX}${ticket}`, userId, "EX", TICKET_TTL_SECONDS);
    return { expiresAt, ticket };
  }

  async consume(ticket: string): Promise<string | null> {
    const key = `${TICKET_KEY_PREFIX}${ticket}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      return null;
    }
    await this.redis.del(key);
    return userId;
  }
}

export function createSyncWsTicketStore(commands?: Redis): SyncWsTicketStore {
  if (!commands) {
    return new InMemorySyncWsTicketStore();
  }
  return new RedisSyncWsTicketStore(commands);
}
