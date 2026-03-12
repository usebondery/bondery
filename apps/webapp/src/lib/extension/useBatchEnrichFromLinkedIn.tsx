"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { checkExtensionAuth } from "@/lib/extension/checkExtensionAuth";
import {
  errorNotificationTemplate,
  informationNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  defaultState,
  getState,
  setState,
  subscribe,
  isCancelled,
  setCancelled,
  setPendingQueueStatus,
} from "@/lib/extension/enrichBatchStore";

/** Number of consecutive timeouts before the circuit breaker aborts the loop. */
const MAX_CONSECUTIVE_TIMEOUTS = 5;

const ENRICH_REQUEST_TYPE = "BONDERY_ENRICH_REQUEST";
const ENRICH_RESULT_TYPE = "BONDERY_ENRICH_RESULT";

interface QueueItem {
  queueItemId: string;
  personId: string;
  linkedinHandle: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface NextBatchResponse {
  items: QueueItem[];
}

/**
 * Hook for batch-enriching contacts from LinkedIn via the Chrome extension.
 *
 * Uses a module-level singleton store so enrichment state survives within-app
 * navigation. Multiple instances of this hook share the same live state.
 *
 * The DB queue is the single source of truth for progress. Flow:
 *   1. Auth check
 *   2. POST /enrich-queue/init — populates queue, returns totalEligible
 *   3. Loop: GET /enrich-queue/next-batch → enrich each → PATCH completed/failed
 *   4. Cancel → DELETE /enrich-queue (clears pending rows)
 *
 * Resume flow (after tab close):
 *   - Skips init, restores store state from queue status, enters loop at step 3
 *
 * @returns Controls and state for the batch enrichment process.
 */
export function useBatchEnrichFromLinkedIn() {
  const t = useTranslations("EnrichFromLinkedIn");
  const router = useRouter();

  const storeState = useSyncExternalStore(subscribe, getState, () => defaultState);

  const enrichSinglePerson = useCallback(
    (contactId: string, linkedinHandle: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        const requestId = crypto.randomUUID();

        const timeout = setTimeout(() => {
          cleanup();
          resolve({ success: false, error: "timeout" });
        }, 20_000);

        const onMessage = (event: MessageEvent) => {
          if (event.source !== window) return;
          if (event.data?.type !== ENRICH_RESULT_TYPE) return;
          if (event.data?.payload?.requestId !== requestId) return;

          cleanup();
          resolve({
            success: event.data.payload.success,
            error: event.data.payload.error,
          });
        };

        const cleanup = () => {
          clearTimeout(timeout);
          window.removeEventListener("message", onMessage);
        };

        window.addEventListener("message", onMessage);

        window.postMessage(
          {
            type: ENRICH_REQUEST_TYPE,
            payload: { contactId, linkedinHandle, requestId },
          },
          window.location.origin,
        );
      });
    },
    [],
  );

  const patchQueueItem = useCallback(
    async (queueItemId: string, status: "completed" | "failed", errorMessage?: string) => {
      await fetch(`${API_ROUTES.CONTACTS}/enrich-queue/${queueItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, errorMessage: errorMessage ?? null }),
      });
    },
    [],
  );

  /**
   * Core enrichment loop. Fetches next-batch from the queue repeatedly
   * until all items are processed, the user cancels, or the circuit breaker trips.
   *
   * @param initialCompleted Starting completed count (0 for fresh run, >0 for resume)
   * @param initialFailed Starting failed count (0 for fresh run, >0 for resume)
   */
  const runEnrichLoop = useCallback(
    async (initialCompleted: number, initialFailed: number) => {
      let completedCount = initialCompleted;
      let failedCount = initialFailed;
      let consecutiveTimeouts = 0;
      let abortReason: "circuit_breaker" | null = null;

      while (true) {
        if (isCancelled()) break;

        const batchRes = await fetch(`${API_ROUTES.CONTACTS}/enrich-queue/next-batch`);

        if (!batchRes.ok) {
          notifications.show(
            errorNotificationTemplate({
              title: t("ErrorTitle"),
              description: t("ErrorDescription"),
            }),
          );
          break;
        }

        const { items } = (await batchRes.json()) as NextBatchResponse;

        if (!items || items.length === 0) {
          // All items processed.
          break;
        }

        for (const item of items) {
          if (isCancelled()) break;

          setState({
            currentPerson: {
              id: item.personId,
              firstName: item.firstName ?? "",
              lastName: item.lastName,
              avatar: null,
            },
          });

          if (!item.linkedinHandle) {
            await patchQueueItem(item.queueItemId, "failed", "Missing LinkedIn handle");
            failedCount++;
            consecutiveTimeouts = 0;
            setState({ failed: failedCount, currentPerson: null });
            continue;
          }

          const result = await enrichSinglePerson(item.personId, item.linkedinHandle);

          if (result.success) {
            await patchQueueItem(item.queueItemId, "completed");
            completedCount++;
            consecutiveTimeouts = 0;
            setState({ completed: completedCount, currentPerson: null });
          } else {
            await patchQueueItem(item.queueItemId, "failed", result.error);
            failedCount++;
            if (result.error === "timeout") {
              consecutiveTimeouts++;
              if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
                abortReason = "circuit_breaker";
                setState({ currentPerson: null });
                break;
              }
            } else {
              consecutiveTimeouts = 0;
            }
            setState({ failed: failedCount, currentPerson: null });
          }

          if (abortReason) break;
        }

        if (isCancelled() || abortReason) break;

        // Pause briefly between batches to avoid hammering LinkedIn.
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }

      return { completedCount, failedCount, abortReason };
    },
    [t, enrichSinglePerson, patchQueueItem],
  );

  const start = useCallback(async () => {
    setState({ isLoading: true });

    const authState = await checkExtensionAuth();

    if (authState === "not_installed") {
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("ExtensionRequiredMessage"),
        }),
      );
      return;
    }

    if (authState === "not_authenticated") {
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          title: t("NotAuthenticatedTitle"),
          description: t("NotAuthenticatedMessage"),
        }),
      );
      return;
    }

    // Initialize the queue — clears old rows, populates fresh pending items.
    const initRes = await fetch(`${API_ROUTES.CONTACTS}/enrich-queue/init`, {
      method: "POST",
    });

    if (!initRes.ok) {
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("ErrorDescription"),
        }),
      );
      return;
    }

    const { totalEligible } = (await initRes.json()) as { totalEligible: number };

    if (totalEligible === 0) {
      setState({ isLoading: false });
      notifications.show(
        successNotificationTemplate({
          title: t("AllEnrichedTitle"),
          description: t("AllEnrichedDescription"),
        }),
      );
      return;
    }

    setCancelled(false);
    setState({
      isLoading: false,
      isRunning: true,
      isPausing: false,
      completed: 0,
      failed: 0,
      totalEligible,
      currentPerson: null,
    });

    const { completedCount, abortReason } = await runEnrichLoop(0, 0);

    setState({ isRunning: false, isLoading: false, isPausing: false, currentPerson: null });

    // On pause: leave all rows intact so the run can be resumed.
    // On natural completion: delete all rows (completed contacts have people_linkedin,
    // failed contacts will be re-queued automatically on the next init).
    if (isCancelled()) {
      const s = getState();
      setPendingQueueStatus({
        pending: s.totalEligible - s.completed - s.failed,
        completed: s.completed,
        failed: s.failed,
      });
    } else if (!abortReason) {
      await fetch(`${API_ROUTES.CONTACTS}/enrich-queue`, { method: "DELETE" });
    }

    if (abortReason === "circuit_breaker") {
      notifications.show(
        errorNotificationTemplate({
          title: t("ExtensionNotRespondingTitle"),
          description: t("ExtensionNotRespondingDescription"),
        }),
      );
    } else if (!isCancelled() && completedCount > 0) {
      notifications.show(
        successNotificationTemplate({
          title: t("AllDoneTitle"),
          description: t("AllDoneDescription", { count: completedCount }),
        }),
      );
    }

    if (completedCount > 0) {
      router.refresh();
    }
  }, [t, router, runEnrichLoop]);

  /**
   * Resume an interrupted enrichment run.
   * Called when the page detects pending queue items from a previous session.
   */
  const resume = useCallback(
    async (queueStatus: { pending: number; completed: number; failed: number }) => {
      setState({ isLoading: true });

      const authState = await checkExtensionAuth();

      if (authState === "not_installed") {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            title: t("ErrorTitle"),
            description: t("ExtensionRequiredMessage"),
          }),
        );
        return;
      }

      if (authState === "not_authenticated") {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            title: t("NotAuthenticatedTitle"),
            description: t("NotAuthenticatedMessage"),
          }),
        );
        return;
      }

      const totalEligible = queueStatus.pending + queueStatus.completed + queueStatus.failed;

      setPendingQueueStatus(null);
      setCancelled(false);
      setState({
        isLoading: false,
        isRunning: true,
        isPausing: false,
        completed: queueStatus.completed,
        failed: queueStatus.failed,
        totalEligible,
        currentPerson: null,
      });

      const { completedCount, abortReason } = await runEnrichLoop(
        queueStatus.completed,
        queueStatus.failed,
      );

      setState({ isRunning: false, isLoading: false, isPausing: false, currentPerson: null });

      if (isCancelled()) {
        const s = getState();
        setPendingQueueStatus({
          pending: s.totalEligible - s.completed - s.failed,
          completed: s.completed,
          failed: s.failed,
        });
      } else if (!abortReason) {
        await fetch(`${API_ROUTES.CONTACTS}/enrich-queue`, { method: "DELETE" });
      }

      if (abortReason === "circuit_breaker") {
        notifications.show(
          errorNotificationTemplate({
            title: t("ExtensionNotRespondingTitle"),
            description: t("ExtensionNotRespondingDescription"),
          }),
        );
      } else if (!isCancelled() && completedCount > 0) {
        notifications.show(
          successNotificationTemplate({
            title: t("AllDoneTitle"),
            description: t("AllDoneDescription", { count: completedCount }),
          }),
        );
      }

      if (completedCount > 0) {
        router.refresh();
      }
    },
    [t, router, runEnrichLoop],
  );

  /**
   * Pauses the active enrichment loop. Rows are left intact so the run
   * can be resumed. Sets `pendingQueueStatus` to trigger the resume prompt.
   */
  const pause = useCallback(() => {
    setCancelled(true);
    setState({ isPausing: true });
    notifications.show({
      ...informationNotificationTemplate({
        title: t("PausingTitle"),
        description: t("PausingDescription"),
      }),
      autoClose: 4000,
    });
  }, [t]);

  /**
   * Discard an interrupted enrichment run by deleting remaining pending rows.
   */
  const discard = useCallback(async () => {
    await fetch(`${API_ROUTES.CONTACTS}/enrich-queue`, { method: "DELETE" });
    setPendingQueueStatus(null);
  }, []);

  return {
    start,
    resume,
    pause,
    discard,
    isLoading: storeState.isLoading,
    isRunning: storeState.isRunning,
    isPausing: storeState.isPausing,
    totalEligible: storeState.totalEligible,
    completed: storeState.completed,
    failed: storeState.failed,
    currentPerson: storeState.currentPerson,
    pendingQueueStatus: storeState.pendingQueueStatus,
  };
}
