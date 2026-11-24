import { IconLoader2 } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";
import {
  buildNotificationPayload,
  type NotificationPayload,
  type NotificationTemplateProps,
} from "#Notifications/buildNotificationPayload.js";

export interface LoadingNotificationTemplateProps
  extends Omit<NotificationTemplateProps, "action"> {
  icon?: ReactNode;
}

/**
 * Builds a consistent loading notification payload.
 *
 * Takes no `action`. A loading notification is replaced by a success or error
 * notification; put the action on that one.
 */
export function loadingNotificationTemplate({
  title,
  description,
  radius = "xl",
  icon = createElement(IconLoader2, { className: "animate-spin", size: 18 }),
}: LoadingNotificationTemplateProps): NotificationPayload {
  return {
    ...buildNotificationPayload({
      color: "blue",
      description,
      icon,
      radius,
      title,
    }),
    loading: true,
  };
}
