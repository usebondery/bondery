import { createElement, type ReactNode } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface WarningNotificationTemplateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  radius?: string | number;
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
    title,
    radius,
    message: description,
    color: "yellow",
    loading: false,
    icon,
  };
}
