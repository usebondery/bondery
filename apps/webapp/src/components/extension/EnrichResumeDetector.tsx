"use client";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useEffect } from "react";
import { clientApiJsonOrNull } from "@/lib/api/client";
import { getState, setPendingQueueStatus } from "@/lib/extension/enrichBatchStore";

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
    if (getState().isRunning) {
      return;
    }

    void (async () => {
      try {
        const data = await clientApiJsonOrNull<{
          pending: number;
          completed: number;
          failed: number;
        }>(`${API_ROUTES.CONTACTS}/enrich-queue/status`);

        if (data && data.pending > 0) {
          setPendingQueueStatus(data);
        }
      } catch {
        // Network error — silently ignore, not critical.
      }
    })();
  }, []);

  return null;
}
