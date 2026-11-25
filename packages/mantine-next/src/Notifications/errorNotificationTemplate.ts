import { IconX } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";
import {
  buildNotificationPayload,
  type NotificationPayload,
  type NotificationTemplateProps,
} from "#Notifications/buildNotificationPayload.js";

export type { NotificationAction } from "#Notifications/buildNotificationPayload.js";

export interface ErrorNotificationTemplateProps extends NotificationTemplateProps {
  icon?: ReactNode;
}

/**
 * Builds a consistent error notification payload.
 *
 * Pass `action` when the user can recover, such as "Retry" or "Open settings".
 */
export function errorNotificationTemplate({
  action,
  title,
  description,
  radius = "xl",
  icon = createElement(IconX, { size: 18 }),
}: ErrorNotificationTemplateProps): NotificationPayload {
  return buildNotificationPayload({
    action,
    color: "red",
    description,
    icon,
    radius,
    title,
  });
}
