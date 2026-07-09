"use client";

import { statusNotificationTemplate } from "@bondery/mantine-next";
import { Notifications, notifications } from "@mantine/notifications";
import { useEffect, useSyncExternalStore } from "react";
import { defaultState, getState, subscribe } from "@/lib/extension/enrichBatchStore";
import { statusNotificationsStore } from "@/lib/extension/statusNotificationsStore";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { EnrichResumeNotificationContent } from "./EnrichResumeNotificationContent";
import { EnrichStatusNotificationContent } from "./EnrichStatusNotificationContent";

const ENRICH_RUNNING_ID = "enrich-status";
const ENRICH_RESUME_ID = "enrich-resume";

/**
 * Renders the bottom-right status notifications portal and manages the
 * lifecycle of two persistent notifications:
 *
 * 1. `enrich-status` — shown while `isRunning` is true (live progress content)
 * 2. `enrich-resume` — shown when `pendingQueueStatus` is set and not running
 *    (interrupted run detected on mount, prompts Resume/Discard)
 *
 * The two notifications never overlap — resuming clears pendingQueueStatus and
 * sets isRunning, so the resume notification is hidden before the running one appears.
 *
 * Mount once in the authenticated app layout.
 */
export function EnrichStatusNotificationManager() {
  const t = useWebTranslations("EnrichFromLinkedIn");
  const { isRunning, pendingQueueStatus } = useSyncExternalStore(
    subscribe,
    getState,
    () => defaultState,
  );

  // Running notification.
  useEffect(() => {
    if (isRunning) {
      notifications.hide(ENRICH_RESUME_ID, statusNotificationsStore);
      notifications.show(
        statusNotificationTemplate({
          id: ENRICH_RUNNING_ID,
          message: <EnrichStatusNotificationContent />,
          title: t("EnrichingTitle"),
        }),
        statusNotificationsStore,
      );
    } else {
      notifications.hide(ENRICH_RUNNING_ID, statusNotificationsStore);
    }
  }, [isRunning, t]);

  // Resume notification.
  useEffect(() => {
    if (!isRunning && pendingQueueStatus && pendingQueueStatus.pending > 0) {
      notifications.show(
        statusNotificationTemplate({
          id: ENRICH_RESUME_ID,
          message: <EnrichResumeNotificationContent />,
          title: t("ResumeNotificationTitle"),
        }),
        statusNotificationsStore,
      );
    } else {
      notifications.hide(ENRICH_RESUME_ID, statusNotificationsStore);
    }
  }, [isRunning, pendingQueueStatus, t]);

  return (
    <Notifications
      autoClose={false}
      limit={2}
      position="bottom-right"
      store={statusNotificationsStore}
    />
  );
}
