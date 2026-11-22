import { IconLoader2 } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";

type LoadingNotificationPayload = {
  color: "blue";
  icon: ReactNode;
  loading: true;
  message: string;
  radius: string | number;
  title: string;
};

export interface LoadingNotificationTemplateProps {
  description: string;
  icon?: ReactNode;
  radius?: string | number;
  title: string;
}

/** Builds a consistent loading notification payload. */
export function loadingNotificationTemplate({
  title,
  description,
  radius = "xl",
  icon = createElement(IconLoader2, { className: "animate-spin", size: 18 }),
}: LoadingNotificationTemplateProps): LoadingNotificationPayload {
  return {
    color: "blue",
    icon,
    loading: true,
    message: description,
    radius,
    title,
  };
}
