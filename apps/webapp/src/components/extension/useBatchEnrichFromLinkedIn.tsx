"use client";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  informationNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { LinkedInDataResponse } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import { useCallback, useSyncExternalStore } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { applyTransportResponsePolicy, clientApiFetch } from "@/lib/api/client";
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
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { getQueryClient } from "@/lib/query/client";
import { useDiscardEnrichQueueMutation } from "@/lib/query/hooks/useMergeRecommendations";
import { contactKeys } from "@/lib/query/keys";
import { deleteEnrichQueue, getResponseErrorDescription } from "./batch-enrich-api";
import { useEnrichLoop } from "./useEnrichLoop";

function showCompletionNotification(
  t: ReturnType<typeof useWebTranslations>,
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

function finalizeEnrichRun(abortReason: "circuit_breaker" | null) {
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

  if (!abortReason) {
    void deleteEnrichQueue();
  }
}

/**
 * Hook for batch-enriching contacts from LinkedIn via the Chrome extension.
 */
export function useBatchEnrichFromLinkedIn() {
  const t = useWebTranslations("EnrichFromLinkedIn");
  const discardEnrichQueueMutation = useDiscardEnrichQueueMutation();

  const storeState = useSyncExternalStore(subscribe, getState, () => defaultState);

  const runEnrichLoop = useEnrichLoop({
    errorDescription: t("ErrorDescription"),
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

    const initRes = await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue/init`, {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!initRes.ok) {
      applyTransportResponsePolicy(initRes);
      const description = await getResponseErrorDescription(initRes, t("ErrorDescription"));
      setState({ isLoading: false });
      notifications.show(
        errorNotificationTemplate({
          description,
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    const { totalEligible } = (await initRes.json()) as { totalEligible: number };

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

    captureEvent("batch_enrich_started", { eligible_count: totalEligible });

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

    finalizeEnrichRun(abortReason);

    if (abortReason === "circuit_breaker") {
      notifications.show(
        errorNotificationTemplate({
          description: t("ExtensionNotRespondingDescription"),
          title: t("ExtensionNotRespondingTitle"),
        }),
      );
    } else if (!isCancelled() && completedCount > 0) {
      captureEvent("batch_enrich_completed", { total_enriched: completedCount });
      showCompletionNotification(t, completedCount);
    }
  }, [t, runEnrichLoop]);

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

      const initRes = await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue/init`, {
        body: JSON.stringify({ personId: contactId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!initRes.ok) {
        applyTransportResponsePolicy(initRes);
        const description = await getResponseErrorDescription(initRes, t("ErrorDescription"));
        setState({ isLoading: false });
        notifications.show(
          errorNotificationTemplate({
            description,
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
        totalEligible: 1,
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

      finalizeEnrichRun(abortReason);

      if (abortReason === "circuit_breaker") {
        notifications.show(
          errorNotificationTemplate({
            description: t("ExtensionNotRespondingDescription"),
            title: t("ExtensionNotRespondingTitle"),
          }),
        );
      } else if (!isCancelled() && completedCount > 0) {
        captureEvent("contact_enriched_linkedin");
        notifications.show(
          successNotificationTemplate({
            description: t("AllDoneDescriptionSingle"),
            title: t("AllDoneTitle"),
          }),
        );
      }
    },
    [t, runEnrichLoop],
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

      finalizeEnrichRun(abortReason);

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
