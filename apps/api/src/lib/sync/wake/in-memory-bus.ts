import type { SyncWakeBus, SyncWakeEvent } from "./types.js";

export class InMemorySyncWakeBus implements SyncWakeBus {
  private handler: ((userId: string, event: SyncWakeEvent) => void) | null = null;

  async publish(userId: string, event: SyncWakeEvent): Promise<void> {
    this.handler?.(userId, event);
  }

  async start(onMessage: (userId: string, event: SyncWakeEvent) => void): Promise<void> {
    this.handler = onMessage;
  }

  async stop(): Promise<void> {
    this.handler = null;
  }
}
