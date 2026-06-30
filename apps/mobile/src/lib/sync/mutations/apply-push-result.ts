import type { SyncPushResult } from "@bondery/schemas/sync";
import {
  syncContactWriteDataSchema,
  syncGroupWriteDataSchema,
  syncTagWriteDataSchema,
} from "@bondery/schemas/sync";
import {
  upsertContactFromServer,
  upsertGroupFromServer,
  upsertTagFromServer,
} from "../repositories/apply-server-write";

export function applyPushResultToLocal(result: SyncPushResult): void {
  if (result.status === "conflict") {
    const server = result.server;
    if (server && typeof server === "object" && "contact" in server) {
      const parsed = syncContactWriteDataSchema.safeParse(server);
      if (parsed.success) {
        upsertContactFromServer(parsed.data.contact);
      }
    }
    return;
  }

  if (result.status !== "applied" && result.status !== "duplicate") {
    return;
  }

  if (!result.data || typeof result.data !== "object") {
    return;
  }

  const data = result.data as Record<string, unknown>;

  if ("contact" in data) {
    const parsed = syncContactWriteDataSchema.safeParse(data);
    if (parsed.success) {
      upsertContactFromServer(parsed.data.contact);
    }
    return;
  }

  if ("group" in data) {
    const parsed = syncGroupWriteDataSchema.safeParse(data);
    if (parsed.success) {
      upsertGroupFromServer(parsed.data.group);
    }
    return;
  }

  if ("tag" in data) {
    const parsed = syncTagWriteDataSchema.safeParse(data);
    if (parsed.success) {
      upsertTagFromServer(parsed.data.tag);
    }
  }
}
