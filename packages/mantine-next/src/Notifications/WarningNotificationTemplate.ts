import { IconAlertTriangle } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";
import {
  buildNotificationPayload,
  type NotificationPayload,
  type NotificationTemplateProps,
} from "#Notifications/buildNotificationPayload.js";

export type { NotificationAction } from "#Notifications/buildNotificationPayload.js";

export interface WarningNotificationTemplateProps extends NotificationTemplateProps {
  icon?: ReactNode;
}

/** Builds a consistent warning notification payload. */
export function warningNotificationTemplate({
  action,
  title,
  description,
  radius = "xl",
  icon = createElement(IconAlertTriangle, { size: 18 }),
}: WarningNotificationTemplateProps): NotificationPayload {
  return buildNotificationPayload({
    action,
    color: "yellow",
    description,
    icon,
    radius,
    title,
  });
}
