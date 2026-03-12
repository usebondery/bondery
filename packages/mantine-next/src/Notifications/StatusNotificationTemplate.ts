import type { ReactNode } from "react";

export interface StatusNotificationTemplateProps {
  id: string;
  title: string;
  message: ReactNode;
}

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
}: StatusNotificationTemplateProps) {
  return {
    id,
    title,
    message,
    autoClose: false as const,
    withCloseButton: false,
    radius: "md" as const,
    color: "blue",
    loading: false,
  };
}
