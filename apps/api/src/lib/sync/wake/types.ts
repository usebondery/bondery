import type { SyncWakeEvent } from "@bondery/schemas/sync";

export type { SyncWakeEvent };

export interface SyncWakeBus {
  publish(userId: string, event: SyncWakeEvent): Promise<void>;
  start(onMessage: (userId: string, event: SyncWakeEvent) => void): Promise<void>;
  stop(): Promise<void>;
}

export interface SyncWakeSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

export const WS_OPEN = 1;
