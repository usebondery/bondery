import { IconInfoCircle } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";
import {
  buildNotificationPayload,
  type NotificationPayload,
  type NotificationTemplateProps,
} from "#Notifications/buildNotificationPayload.js";

export type { NotificationAction } from "#Notifications/buildNotificationPayload.js";

export interface InformationNotificationTemplateProps extends NotificationTemplateProps {
  icon?: ReactNode;
}

/** Builds a consistent information notification payload. */
export function informationNotificationTemplate({
  action,
  title,
  description,
  radius = "xl",
  icon = createElement(IconInfoCircle, { size: 18 }),
}: InformationNotificationTemplateProps): NotificationPayload {
  return buildNotificationPayload({
    action,
    color: "blue",
    description,
    icon,
    radius,
    title,
  });
}
