import type { SyncMutation } from "@bondery/schemas/sync";
import { normalizeSyncDatetime } from "./sync-datetime";
import { isValidUuid } from "./uuid";

export function sanitizePushMutation(mutation: SyncMutation): SyncMutation | null {
  if (!isValidUuid(mutation.id)) {
    return null;
  }

  if ("entityId" in mutation && mutation.entityId && !isValidUuid(mutation.entityId)) {
    return null;
  }

  if (mutation.type === "contact.create") {
    const payloadId = mutation.payload.id;
    if (payloadId && !isValidUuid(payloadId)) {
      return null;
    }
  }

  const { baseUpdatedAt: rawBaseUpdatedAt, ...rest } = mutation;
  const baseUpdatedAt = normalizeSyncDatetime(rawBaseUpdatedAt);

  return {
    ...rest,
    ...(baseUpdatedAt ? { baseUpdatedAt } : {}),
  } as SyncMutation;
}
