"use client";

import { errorNotificationTemplate } from "@bondery/mantine-next";
import { notifications } from "@mantine/notifications";
import { useCallback } from "react";
import { applyTransportResponsePolicy } from "@/lib/api/client";
import { isCancelled, setState } from "@/lib/extension/enrichBatchStore";
import {
  enrichSinglePersonViaExtension,
  fetchNextEnrichBatch,
  getResponseErrorDescription,
  MAX_CONSECUTIVE_TIMEOUTS,
  patchEnrichQueueItem,
  type QueueItem,
} from "./batch-enrich-api";

interface UseEnrichLoopParams {
  errorDescription: string;
  errorTitle: string;
}

export function useEnrichLoop({ errorDescription, errorTitle }: UseEnrichLoopParams) {
  const runEnrichLoop = useCallback(
    async (initialCompleted: number, initialFailed: number) => {
      let completedCount = initialCompleted;
      let failedCount = initialFailed;
      let consecutiveTimeouts = 0;
      let abortReason: "circuit_breaker" | null = null;

      const processItem = async (item: QueueItem) => {
        setState({
          currentPerson: {
            avatar: null,
            firstName: item.firstName ?? "",
            id: item.personId,
            lastName: item.lastName,
          },
        });

        if (!item.linkedinHandle) {
          await patchEnrichQueueItem(item.queueItemId, "failed", "Missing LinkedIn handle");
          failedCount++;
          consecutiveTimeouts = 0;
          setState({ currentPerson: null, failed: failedCount });
          return;
        }

        const result = await enrichSinglePersonViaExtension(item.personId, item.linkedinHandle);

        if (result.success) {
          await patchEnrichQueueItem(item.queueItemId, "completed");
          completedCount++;
          consecutiveTimeouts = 0;
          setState({ completed: completedCount, currentPerson: null });
          return;
        }

        await patchEnrichQueueItem(item.queueItemId, "failed", result.error);
        failedCount++;
        if (result.error === "timeout") {
          consecutiveTimeouts++;
          if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
            abortReason = "circuit_breaker";
            setState({ currentPerson: null });
            return;
          }
        } else {
          consecutiveTimeouts = 0;
        }
        setState({ currentPerson: null, failed: failedCount });
      };

      while (true) {
        if (isCancelled()) {
          break;
        }

        const batchResult = await fetchNextEnrichBatch();

        if (!batchResult.ok) {
          applyTransportResponsePolicy(batchResult.response);
          const description = await getResponseErrorDescription(
            batchResult.response,
            errorDescription,
          );
          notifications.show(
            errorNotificationTemplate({
              description,
              title: errorTitle,
            }),
          );
          break;
        }

        if (batchResult.items.length === 0) {
          break;
        }

        for (const item of batchResult.items) {
          if (isCancelled()) {
            break;
          }

          await processItem(item);

          if (abortReason) {
            break;
          }
        }

        if (isCancelled() || abortReason) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }

      return { abortReason, completedCount, failedCount };
    },
    [errorDescription, errorTitle],
  );

  return runEnrichLoop;
}
