"use client";

import { useEffect } from "react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { getState, setPendingQueueStatus } from "./enrichBatchStore";

/**
 * Invisible client component that runs once on mount to detect an interrupted
 * enrichment run from a previous session.
 *
 * If the queue has pending rows and enrichment is not currently running
 * (i.e. the page was reloaded mid-run), it sets `pendingQueueStatus` in the
 * store, which triggers the global resume notification in
 * `EnrichStatusNotificationManager`.
 *
 * Mount once in the authenticated app layout alongside
 * `EnrichStatusNotificationManager`.
 */
export function EnrichResumeDetector() {
  useEffect(() => {
    // Skip if enrichment is already running in this session.
    if (getState().isRunning) return;

    void (async () => {
      try {
        const res = await fetch(`${API_ROUTES.CONTACTS}/enrich-queue/status`);
        if (!res.ok) return;

        const data = (await res.json()) as {
          pending: number;
          completed: number;
          failed: number;
        };

        if (data.pending > 0) {
          setPendingQueueStatus(data);
        }
      } catch {
        // Network error — silently ignore, not critical.
      }
    })();
  }, []);

  return null;
}
