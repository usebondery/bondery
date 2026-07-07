"use client";

import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  affectedTablesTouchContacts,
  affectedTablesTouchGroups,
  affectedTablesTouchTags,
} from "@/lib/sync/sync-wake-tables";
import {
  startSyncWakeWebClient,
  stopSyncWakeWebClient,
} from "@/lib/sync/sync-wake-client";
import { getQueryClient } from "./client";
import {
  invalidateContactDomain,
  invalidateGroupDomain,
  invalidateTagDomain,
} from "./invalidation";

async function invalidateForAffectedTables(
  queryClient: QueryClient,
  affectedTables: Parameters<typeof affectedTablesTouchContacts>[0],
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (affectedTablesTouchContacts(affectedTables)) {
    tasks.push(invalidateContactDomain(queryClient));
  }
  if (affectedTablesTouchGroups(affectedTables)) {
    tasks.push(invalidateGroupDomain(queryClient));
    if (!affectedTablesTouchContacts(affectedTables)) {
      tasks.push(invalidateContactDomain(queryClient));
    }
  }
  if (affectedTablesTouchTags(affectedTables)) {
    tasks.push(invalidateTagDomain(queryClient));
    if (!affectedTablesTouchContacts(affectedTables)) {
      tasks.push(invalidateContactDomain(queryClient));
    }
  }

  if (tasks.length === 0) {
    await invalidateContactDomain(queryClient);
    return;
  }

  await Promise.all(tasks);
}

/**
 * Subscribes to sync wake WebSocket events and invalidates TanStack Query caches
 * when remote clients change tier-1 data.
 */
export function useSyncWakeInvalidation(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const client = startSyncWakeWebClient((message) => {
      void invalidateForAffectedTables(getQueryClient(), message.affectedTables);
    });

    return () => {
      client.stop();
      stopSyncWakeWebClient();
    };
  }, [enabled]);
}
