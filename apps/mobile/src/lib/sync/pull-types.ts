import type { SyncTableKey } from "@bondery/schemas/sync";

type SyncSubscriber = (tables: readonly SyncTableKey[]) => void;
type SyncPullReason =
  | "wake"
  | "reconnect"
  | "safety"
  | "foreground"
  | "background"
  | "long_poll"
  | "manual";
type SyncPullMode = "long_poll" | "websocket_wake";

const LONG_POLL_WAIT_MS = 25_000;
const SAFETY_PULL_INTERVAL_MS = 300_000;
const PULL_RETRY_DELAY_MS = 5000;

export type { SyncPullMode, SyncPullReason, SyncSubscriber };
export { LONG_POLL_WAIT_MS, PULL_RETRY_DELAY_MS, SAFETY_PULL_INTERVAL_MS };
