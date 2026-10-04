"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  informationNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { LinkedInDataResponse } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import { useCallback, useSyncExternalStore } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { discardEnrichQueue, initEnrichQueue } from "@/lib/api/domains/enrichQueue";
import { checkExtensionAuth } from "@/lib/extension/checkExtensionAuth";
import {
  defaultState,
  getState,
  isCancelled,
  setCancelled,
  setPendingQueueStatus,
  setState,
  subscribe,
} from "@/lib/extension/enrichBatchStore";
import {
  useCommonTranslations,
  useEnrichFromLinkedInTranslations,
} from "@/lib/i18n/generated/hooks";
import { getQueryClient } from "@/lib/query/client";
import { useDiscardEnrichQueueMutation } from "@/lib/query/hooks/useEnrichQueue";
import { invalidateAfterEnrichBatch } from "@/lib/query/invalidation";
import { contactKeys, enrichQueueKeys } from "@/lib/query/keys";
import { useEnrichLoop } from "./useEnrichLoop";

function showCompletionNotification(
  t: ReturnType<typeof useEnrichFromLinkedInTranslations>,
  completedCount: number,
) {
  if (completedCount <= 0) {
    return;
  }

  notifications.show(
    successNotificationTemplate({
      description:
        completedCount === 1
          ? t("AllDoneDescriptionSingle")
          : t("AllDoneDescriptionMultiple", { count: completedCount }),
      title: t("AllDoneTitle"),
    }),
  );
}

async function finalizeEnrichRun(abortReason: "circuit_breaker" | null) {
  setState({
    currentPerson: null,
    isLoading: false,
    isPausing: false,
    isRunning: false,
  });

  if (isCancelled()) {
    const s = getState();
    setPendingQueueStatus({
      completed: s.completed,
      failed: s.failed,
      pending: s.totalEligible - s.completed - s.failed,
    });
    return;
  }

  if (abortReason) {
    return;
  }

  try {
    await discardEnrichQueue();
    const queryClient = getQueryClient();
    await Promise.all([
      invalidateAfterEnrichBatch(queryClient),
      queryClient.invalidateQueries({ queryKey: enrichQueueKeys.status() }),
      queryClient.invalidateQueries({ queryKey: enrichQueueKeys.count() }),
    ]);
  } catch {
    // Best-effort cleanup after a completed run; 401 already ran transport policy.
  }
}

/**
 * Hook for batch-enriching contacts from LinkedIn via the Chrome extension.
 */
export function useBatchEnrichFromLinkedIn() {
  const t = useEnrichFromLinkedInTranslations();
  const tCommon = useCommonTranslations();
  const discardEnrichQueueMutation = useDiscardEnrichQueueMutation();

  const storeState = useSyncExternalStore(subscribe, getState, () => defaultState);

  const runEnrichLoop = useEnrichLoop({
    errorTitle: t("ErrorTitle"),
  });

  const start = useCallback(async () => {
    setState({ isLoading: true });

    const authState = await checkExtensionAuth();

    if (authState === "not_installed") {
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          description: t("ExtensionRequiredMessage"),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    if (authState === "not_authenticated") {
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          description: t("NotAuthenticatedMessage"),
          title: t("NotAuthenticatedTitle"),
        }),
      );
      return;
    }

    let totalEligible: number;
    try {
      const init = await initEnrichQueue({});
      totalEligible = init.totalEligible;
    } catch (error) {
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    if (totalEligible === 0) {
      setState({ isLoading: false });
      notifications.show(
        successNotificationTemplate({
          description: t("AllEnrichedDescription"),
          title: t("AllEnrichedTitle"),
        }),
      );
      return;
    }

    captureEvent("enrichment:batch_start", { eligible_count: totalEligible });

    setCancelled(false);
    setState({
      completed: 0,
      currentPerson: null,
      failed: 0,
      isLoading: false,
      isPausing: false,
      isRunning: true,
      totalEligible,
    });

    const { completedCount, abortReason } = await runEnrichLoop(0, 0);

    await finalizeEnrichRun(abortReason);

    if (abortReason === "circuit_breaker") {
      notifications.show(
        errorNotificationTemplate({
          description: t("ExtensionNotRespondingDescription"),
          title: t("ExtensionNotRespondingTitle"),
        }),
      );
    } else if (!isCancelled() && completedCount > 0) {
      captureEvent("enrichment:batch_end", { total_enriched: completedCount });
      showCompletionNotification(t, completedCount);
    }
  }, [t, tCommon, runEnrichLoop]);

  const startForPerson = useCallback(
    async (contactId: string, linkedinHandle: string | null | undefined) => {
      if (!linkedinHandle) {
        notifications.show(
          errorNotificationTemplate({
            description: t("NoLinkedInHandle"),
            title: t("ErrorTitle"),
          }),
        );
        return;
      }

      setState({ isLoading: true });

      const authState = await checkExtensionAuth();

      if (authState === "not_installed") {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            description: t("ExtensionRequiredMessage"),
            title: t("ErrorTitle"),
          }),
        );
        return;
      }

      if (authState === "not_authenticated") {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            description: t("NotAuthenticatedMessage"),
            title: t("NotAuthenticatedTitle"),
          }),
        );
        return;
      }

      let totalEligible: number;
      try {
        const init = await initEnrichQueue({ personId: contactId });
        totalEligible = init.totalEligible;
      } catch (error) {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: t("ErrorTitle"),
          }),
        );
        return;
      }

      setCancelled(false);
      setState({
        completed: 0,
        currentPerson: null,
        failed: 0,
        isLoading: false,
        isPausing: false,
        isRunning: true,
        totalEligible,
      });

      const { completedCount, abortReason } = await runEnrichLoop(0, 0);

      if (!isCancelled() && !abortReason && completedCount > 0) {
        const queryClient = getQueryClient();
        queryClient.setQueryData(
          contactKeys.linkedin(contactId),
          (prev: LinkedInDataResponse | undefined) => ({
            education: prev?.education ?? [],
            linkedinBio: prev?.linkedinBio ?? null,
            syncedAt: new Date().toISOString(),
            workHistory: prev?.workHistory ?? [],
          }),
        );
      }

      await finalizeEnrichRun(abortReason);

      if (abortReason === "circuit_breaker") {
        notifications.show(
          errorNotificationTemplate({
            description: t("ExtensionNotRespondingDescription"),
            title: t("ExtensionNotRespondingTitle"),
          }),
        );
      } else if (!isCancelled() && completedCount > 0) {
        captureEvent("enrichment:contact_update", { source: "linkedin" });
        notifications.show(
          successNotificationTemplate({
            description: t("AllDoneDescriptionSingle"),
            title: t("AllDoneTitle"),
          }),
        );
      }
    },
    [t, tCommon, runEnrichLoop],
  );

  const resume = useCallback(
    async (queueStatus: { pending: number; completed: number; failed: number }) => {
      setState({ isLoading: true });

      const authState = await checkExtensionAuth();

      if (authState === "not_installed") {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            description: t("ExtensionRequiredMessage"),
            title: t("ErrorTitle"),
          }),
        );
        return;
      }

      if (authState === "not_authenticated") {
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            description: t("NotAuthenticatedMessage"),
            title: t("NotAuthenticatedTitle"),
          }),
        );
        return;
      }

      const totalEligible = queueStatus.pending + queueStatus.completed + queueStatus.failed;

      setPendingQueueStatus(null);
      setCancelled(false);
      setState({
        completed: queueStatus.completed,
        currentPerson: null,
        failed: queueStatus.failed,
        isLoading: false,
        isPausing: false,
        isRunning: true,
        totalEligible,
      });

      const { completedCount, abortReason } = await runEnrichLoop(
        queueStatus.completed,
        queueStatus.failed,
      );

      await finalizeEnrichRun(abortReason);

      if (abortReason === "circuit_breaker") {
        notifications.show(
          errorNotificationTemplate({
            description: t("ExtensionNotRespondingDescription"),
            title: t("ExtensionNotRespondingTitle"),
          }),
        );
      } else if (!isCancelled() && completedCount > 0) {
        showCompletionNotification(t, completedCount);
      }
    },
    [t, runEnrichLoop],
  );

  const pause = useCallback(() => {
    setCancelled(true);
    setState({ isPausing: true });
    notifications.show({
      ...informationNotificationTemplate({
        description: t("PausingDescription"),
        title: t("PausingTitle"),
      }),
      autoClose: 6000,
    });
  }, [t]);

  const discard = useCallback(async () => {
    await discardEnrichQueueMutation.mutateAsync();
    setPendingQueueStatus(null);
  }, [discardEnrichQueueMutation]);

  return {
    completed: storeState.completed,
    currentPerson: storeState.currentPerson,
    discard,
    failed: storeState.failed,
    isLoading: storeState.isLoading,
    isPausing: storeState.isPausing,
    isRunning: storeState.isRunning,
    pause,
    pendingQueueStatus: storeState.pendingQueueStatus,
    resume,
    start,
    startForPerson,
    totalEligible: storeState.totalEligible,
  };
}
