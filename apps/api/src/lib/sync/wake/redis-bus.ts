import type { Redis } from "ioredis";
import type { SyncWakeBus, SyncWakeEvent } from "./types.js";

const WAKE_BROADCAST_CHANNEL = "sync:wake";

type WakeBusEnvelope = {
  userId: string;
  event: SyncWakeEvent;
};

export class RedisSyncWakeBus implements SyncWakeBus {
  private handler: ((userId: string, event: SyncWakeEvent) => void) | null = null;
  private readonly onMessage = (channel: string, message: string): void => {
    if (channel !== WAKE_BROADCAST_CHANNEL) {
      return;
    }
    try {
      const envelope = JSON.parse(message) as WakeBusEnvelope;
      if (!envelope?.userId || !envelope?.event) {
        return;
      }
      this.handler?.(envelope.userId, envelope.event);
    } catch {
      // Ignore malformed messages
    }
  };

  constructor(
    private readonly publisher: Redis,
    private readonly subscriber: Redis,
  ) {}

  async publish(userId: string, event: SyncWakeEvent): Promise<void> {
    const envelope: WakeBusEnvelope = { event, userId };
    await this.publisher.publish(WAKE_BROADCAST_CHANNEL, JSON.stringify(envelope));
  }

  async start(onMessage: (userId: string, event: SyncWakeEvent) => void): Promise<void> {
    this.handler = onMessage;
    await this.connectIfNeeded(this.subscriber);
    await this.connectIfNeeded(this.publisher);
    this.subscriber.on("message", this.onMessage);
    await this.subscriber.subscribe(WAKE_BROADCAST_CHANNEL);
  }

  async stop(): Promise<void> {
    this.handler = null;
    this.subscriber.removeListener("message", this.onMessage);
    if (this.subscriber.status === "ready") {
      await this.subscriber.unsubscribe(WAKE_BROADCAST_CHANNEL);
    }
  }

  isSubscriberConnected(): boolean {
    return this.subscriber.status === "ready";
  }

  private async connectIfNeeded(client: Redis): Promise<void> {
    if (client.status === "ready" || client.status === "connecting") {
      return;
    }
    await client.connect();
  }
}
