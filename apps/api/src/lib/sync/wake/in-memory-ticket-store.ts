import { randomUUID } from "node:crypto";
import type { SyncWsTicketStore } from "./tickets.js";

const TICKET_TTL_SECONDS = 60;

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
