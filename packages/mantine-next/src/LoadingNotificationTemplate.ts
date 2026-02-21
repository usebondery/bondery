import { createElement, type ReactNode } from "react";
import { IconLoader2 } from "@tabler/icons-react";

export interface LoadingNotificationTemplateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  radius?: string | number;
}

/**
 * Builds a consistent loading notification payload.
 */
export function loadingNotificationTemplate({
  title,
  description,
  radius = "xl",
  icon = createElement(IconLoader2, { size: 18, className: "animate-spin" }),
}: LoadingNotificationTemplateProps) {
  return {
    title,
    radius,
    message: description,
    color: "blue",
    icon,
    loading: true,
    autoClose: false,
  };
}
