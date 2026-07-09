import type { SyncMutation, SyncMutationInput } from "@bondery/schemas/sync";
import { generateUuid } from "./ids";
import { applyOptimisticMutation } from "./mutations/optimistic";
import { enqueuePendingMutation, nextClientSequence } from "./outbox/pending-mutations";
import { scheduleSyncDrain } from "./outbox/sync-worker";
import { notifySyncSubscribers } from "./pull-manager";
import { logSyncMutationEnqueued } from "./sync-logger";

export function submitSyncMutation(mutation: SyncMutationInput): SyncMutation {
  const full = {
    ...mutation,
    clientSequence: nextClientSequence(),
    id: mutation.id ?? generateUuid(),
  } as SyncMutation;

  applyOptimisticMutation(full);
  enqueuePendingMutation(full);
  logSyncMutationEnqueued(full);
  scheduleSyncDrain();
  notifySyncSubscribers();

  return full;
}
