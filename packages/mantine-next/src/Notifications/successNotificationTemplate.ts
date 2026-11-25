import { IconCheck } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";
import {
  buildNotificationPayload,
  type NotificationPayload,
  type NotificationTemplateProps,
} from "#Notifications/buildNotificationPayload.js";

export type { NotificationAction } from "#Notifications/buildNotificationPayload.js";

export interface SuccessNotificationTemplateProps extends NotificationTemplateProps {
  icon?: ReactNode;
}
/**
 * Builds a consistent success notification payload.
 *
 * Copywriting guidance:
 * - `title` should be short (2-5 words), positive, and outcome-focused (for example: "Event deleted").
 * - `description` should be one clear sentence explaining what happened and, if useful, what the user can do next.
 * - Avoid technical jargon and error codes; write in plain language that confirms user intent.
 * - Pass `action` when the result is not visible on screen, so the user can open it.
 */
export function successNotificationTemplate({
  action,
  title,
  description,
  radius = "xl",
  icon = createElement(IconCheck, { size: 18 }),
}: SuccessNotificationTemplateProps): NotificationPayload {
  return buildNotificationPayload({
    action,
    color: "green",
    description,
    icon,
    radius,
    title,
  });
}
