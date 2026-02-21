import { createElement, type ReactNode } from "react";
import { IconCheck } from "@tabler/icons-react";

export interface SuccessNotificationTemplateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  radius?: string | number;
}

/**
 * Builds a consistent success notification payload.
 *
 * Copywriting guidance:
 * - `title` should be short (2-5 words), positive, and outcome-focused (for example: "Event deleted").
 * - `description` should be one clear sentence explaining what happened and, if useful, what the user can do next.
 * - Avoid technical jargon and error codes; write in plain language that confirms user intent.
 */
export function successNotificationTemplate({
  title,
  description,
  radius = "xl",
  icon = createElement(IconCheck, { size: 18 }),
}: SuccessNotificationTemplateProps) {
  return {
    title,
    loading: false,
    radius,
    message: description,
    color: "green",
    icon,
  };
}
