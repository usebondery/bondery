import type { ReactNode } from "react";

export interface StatusNotificationTemplateProps {
  id: string;
  message: ReactNode;
  title: string;
}

type StatusNotificationPayload = {
  autoClose: false;
  color: "blue";
  id: string;
  loading: false;
  message: ReactNode;
  radius: "md";
  title: string;
  withCloseButton: false;
};

/**
 * Builds a notification payload for persistent status/progress indicators.
 *
 * Unlike other notification templates, this one:
 * - Never auto-closes (controlled programmatically via show/hide)
 * - Hides the close button
 * - Accepts a ReactNode as `message`, enabling live-updating content components
 *   that re-render themselves via store subscriptions without needing `update()`
 *
 * @param id - Stable identifier used to show/update/hide the same notification
 * @param title - Short heading shown above the message content
 * @param message - ReactNode rendered as the notification body
 */
export function statusNotificationTemplate({
  id,
  title,
  message,
}: StatusNotificationTemplateProps): StatusNotificationPayload {
  return {
    autoClose: false as const,
    color: "blue",
    id,
    loading: false,
    message,
    radius: "md" as const,
    title,
    withCloseButton: false,
  };
}
