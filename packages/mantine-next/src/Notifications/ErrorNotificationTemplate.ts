import { IconX } from "@tabler/icons-react";
import { createElement, type ReactNode } from "react";

export interface ErrorNotificationTemplateProps {
  description: string;
  icon?: ReactNode;
  radius?: string | number;
  title: string;
}

type ErrorNotificationPayload = {
  color: "red";
  icon: ReactNode;
  loading: false;
  message: string;
  radius: string | number;
  title: string;
};

export function errorNotificationTemplate({
  title,
  description,
  icon = createElement(IconX, { size: 18 }),
  radius = "xl",
}: ErrorNotificationTemplateProps): ErrorNotificationPayload {
  return {
    color: "red",
    icon,
    loading: false,
    message: description,
    radius,
    title,
  };
}
