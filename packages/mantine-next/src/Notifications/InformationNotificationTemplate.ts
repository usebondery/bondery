import { createElement, type ReactNode } from "react";
import { IconInfoCircle } from "@tabler/icons-react";

export interface InformationNotificationTemplateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  radius?: string | number;
}

/**
 * Builds a consistent information notification payload.
 */
export function informationNotificationTemplate({
  title,
  description,
  radius = "xl",
  icon = createElement(IconInfoCircle, { size: 18 }),
}: InformationNotificationTemplateProps) {
  return {
    title,
    radius,
    message: description,
    color: "blue",
    loading: false,
    icon,
  };
}
