import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import type { SyncWsTicketStore } from "./tickets.js";

const TICKET_TTL_SECONDS = 60;
const TICKET_KEY_PREFIX = "sync:ws-ticket:";

export class RedisSyncWsTicketStore implements SyncWsTicketStore {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

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
