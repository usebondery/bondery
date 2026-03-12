"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Notifications, notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { statusNotificationTemplate } from "@bondery/mantine-next";
import { defaultState, getState, subscribe } from "./enrichBatchStore";
import { statusNotificationsStore } from "@/lib/statusNotificationsStore";
import { EnrichStatusNotificationContent } from "./EnrichStatusNotificationContent";
import { EnrichResumeNotificationContent } from "./EnrichResumeNotificationContent";

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
  const t = useTranslations("EnrichFromLinkedIn");
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
          title: t("EnrichingTitle"),
          message: <EnrichStatusNotificationContent />,
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
          title: t("ResumeNotificationTitle"),
          message: <EnrichResumeNotificationContent />,
        }),
        statusNotificationsStore,
      );
    } else {
      notifications.hide(ENRICH_RESUME_ID, statusNotificationsStore);
    }
  }, [isRunning, pendingQueueStatus, t]);

  return (
    <Notifications
      store={statusNotificationsStore}
      position="bottom-right"
      limit={1}
      autoClose={false}
    />
  );
}
