"use client";

import { successNotificationTemplate } from "@bondery/mantine-next";
import { notifications } from "@mantine/notifications";

interface ShowMergeSuccessNotificationProps {
  /** Label for the follow-up action, such as "View merged contact". */
  actionLabel: string;
  description: string;
  /**
   * Opens the surviving contact. Pass the app router's `push` so the merge
   * notification navigates client-side and keeps the shell state.
   */
  navigate: (personId: string) => void;
  /** The surviving contact, which the action opens. */
  personId: string;
  title: string;
}

/**
 * Announces a completed merge and offers a way to open the survivor.
 *
 * The merge happens while the user stays on the same screen: a card leaves a
 * list, or a modal closes over it. Without a link the result is only findable
 * by searching for it, so the notification carries the way there. When the
 * caller already navigates to the result, skip this and let the destination be
 * the confirmation.
 */
export function showMergeSuccessNotification({
  actionLabel,
  description,
  navigate,
  personId,
  title,
}: ShowMergeSuccessNotificationProps): void {
  notifications.show(
    successNotificationTemplate({
      action: {
        label: actionLabel,
        onClick: () => navigate(personId),
      },
      description,
      title,
    }),
  );
}
