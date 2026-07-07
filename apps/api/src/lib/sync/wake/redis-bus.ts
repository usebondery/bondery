import { Redis } from "ioredis";
import type { SyncWakeBus, SyncWakeEvent } from "./types.js";

const WAKE_BROADCAST_CHANNEL = "sync:wake";

type WakeBusEnvelope = {
  userId: string;
  event: SyncWakeEvent;
};

export class RedisSyncWakeBus implements SyncWakeBus {
  private publisher: Redis;
  private subscriber: Redis;
  private handler: ((userId: string, event: SyncWakeEvent) => void) | null = null;

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl, {
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    this.subscriber = new Redis(redisUrl, {
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  async publish(userId: string, event: SyncWakeEvent): Promise<void> {
    const envelope: WakeBusEnvelope = { userId, event };
    await this.publisher.publish(WAKE_BROADCAST_CHANNEL, JSON.stringify(envelope));
  }

  async start(onMessage: (userId: string, event: SyncWakeEvent) => void): Promise<void> {
    this.handler = onMessage;
    await this.subscriber.connect();
    await this.publisher.connect();
    await this.subscriber.subscribe(WAKE_BROADCAST_CHANNEL);
    this.subscriber.on("message", (channel, message) => {
      if (channel !== WAKE_BROADCAST_CHANNEL) return;
      try {
        const envelope = JSON.parse(message) as WakeBusEnvelope;
        if (!envelope?.userId || !envelope?.event) return;
        this.handler?.(envelope.userId, envelope.event);
      } catch {
        // Ignore malformed messages
      }
    });
  }

  async stop(): Promise<void> {
    this.handler = null;
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  isSubscriberConnected(): boolean {
    return this.subscriber.status === "ready";
  }
}
