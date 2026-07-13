import type { SyncWakeEvent } from "@bondery/schemas/sync";

export type { SyncWakeEvent };

export interface SyncWakeBus {
  publish(userId: string, event: SyncWakeEvent): Promise<void>;
  start(onMessage: (userId: string, event: SyncWakeEvent) => void): Promise<void>;
  stop(): Promise<void>;
}

export interface SyncWakeSocket {
  close(code?: number, reason?: string): void;
  readonly readyState: number;
  send(data: string): void;
}

export const WS_OPEN = 1;
