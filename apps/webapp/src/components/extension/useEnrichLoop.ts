"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { EnrichQueueNextBatchItem } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import { useCallback } from "react";
import { fetchNextEnrichBatch, patchEnrichQueueItem } from "@/lib/api/domains/enrichQueue";
import { isCancelled, setState } from "@/lib/extension/enrichBatchStore";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { enrichSinglePersonViaExtension, MAX_CONSECUTIVE_TIMEOUTS } from "./batch-enrich-api";

interface UseEnrichLoopParams {
  errorTitle: string;
}

export function useEnrichLoop({ errorTitle }: UseEnrichLoopParams) {
  const tCommon = useCommonTranslations();

  const runEnrichLoop = useCallback(
    async (initialCompleted: number, initialFailed: number) => {
      let completedCount = initialCompleted;
      let failedCount = initialFailed;
      let consecutiveTimeouts = 0;
      let abortReason: "circuit_breaker" | null = null;

      const processItem = async (item: EnrichQueueNextBatchItem) => {
        setState({
          currentPerson: {
            avatar: null,
            firstName: item.firstName ?? "",
            id: item.personId,
            lastName: item.lastName,
          },
        });

        if (!item.linkedinHandle) {
          await patchEnrichQueueItem(item.queueItemId, {
            errorMessage: "Missing LinkedIn handle",
            status: "failed",
          });
          failedCount++;
          consecutiveTimeouts = 0;
          setState({ currentPerson: null, failed: failedCount });
          return;
        }

        const result = await enrichSinglePersonViaExtension(item.personId, item.linkedinHandle);

        if (result.success) {
          await patchEnrichQueueItem(item.queueItemId, { status: "completed" });
          completedCount++;
          consecutiveTimeouts = 0;
          setState({ completed: completedCount, currentPerson: null });
          return;
        }

        await patchEnrichQueueItem(item.queueItemId, {
          errorMessage: result.error,
          status: "failed",
        });
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

        let items: EnrichQueueNextBatchItem[];
        try {
          items = await fetchNextEnrichBatch();
        } catch (error) {
          notifications.show(
            errorNotificationTemplate({
              description: getUserFacingError(error, tCommon),
              title: errorTitle,
            }),
          );
          break;
        }

        if (items.length === 0) {
          break;
        }

        let stoppedForHttpError = false;
        for (const item of items) {
          if (isCancelled()) {
            break;
          }

          try {
            await processItem(item);
          } catch (error) {
            notifications.show(
              errorNotificationTemplate({
                description: getUserFacingError(error, tCommon),
                title: errorTitle,
              }),
            );
            stoppedForHttpError = true;
            break;
          }

          if (abortReason) {
            break;
          }
        }

        if (isCancelled() || abortReason || stoppedForHttpError) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }

      return { abortReason, completedCount, failedCount };
    },
    [errorTitle, tCommon],
  );

  return runEnrichLoop;
}
