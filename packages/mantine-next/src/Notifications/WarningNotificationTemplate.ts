import { IconAlertTriangle } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";

export interface WarningNotificationTemplateProps {
  description: string;
  icon?: ReactNode;
  radius?: string | number;
  title: string;
}

/**
 * Builds a consistent warning notification payload.
 */
export function warningNotificationTemplate({
  title,
  description,
  radius = "xl",
  icon = createElement(IconAlertTriangle, { size: 18 }),
}: WarningNotificationTemplateProps) {
  return {
    color: "yellow",
    icon,
    loading: false,
    message: description,
    radius,
    title,
  };
}
