import type { SyncMutation, SyncMutationInput } from "@bondery/schemas/sync";
import { applyOptimisticMutation } from "./mutations/optimistic";
import {
  enqueuePendingMutation,
  nextClientSequence,
} from "./outbox/pending-mutations";
import { scheduleSyncDrain } from "./outbox/sync-worker";
import { notifySyncSubscribers } from "./pull-manager";
import { logSyncMutationEnqueued } from "./sync-logger";

import { generateUuid } from "./uuid";

export function submitSyncMutation(mutation: SyncMutationInput): SyncMutation {
  const full = {
    ...mutation,
    id: mutation.id ?? generateUuid(),
    clientSequence: nextClientSequence(),
  } as SyncMutation;

  applyOptimisticMutation(full);
  enqueuePendingMutation(full);
  logSyncMutationEnqueued(full);
  scheduleSyncDrain();
  notifySyncSubscribers();

  return full;
}
