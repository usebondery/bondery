import { createElement, type ReactNode } from "react";
import { IconX } from "@tabler/icons-react";

export interface ErrorNotificationTemplateProps {
  title: string;
  radius?: string | number;
  description: string;
  icon?: ReactNode;
}

export function errorNotificationTemplate({
  title,
  description,
  icon = createElement(IconX, { size: 18 }),
  radius = "xl",
}: ErrorNotificationTemplateProps) {
  return {
    title,
    radius,
    message: description,
    color: "red",
    loading: false,
    icon,
  };
}
