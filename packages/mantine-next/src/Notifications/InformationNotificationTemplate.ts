import { IconInfoCircle } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";

export interface InformationNotificationTemplateProps {
  description: string;
  icon?: ReactNode;
  radius?: string | number;
  title: string;
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
    color: "blue",
    icon,
    loading: false,
    message: description,
    radius,
    title,
  };
}
