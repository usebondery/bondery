"use client";

import { PageHeader } from "./PageHeader";
import { IconUser, IconMessageCircle, IconSettings } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface ErrorPageHeaderProps {
  iconType: "user" | "message-circle" | "settings";
  title: string;
  action?: ReactNode;
  backHref?: string;
}

const iconMap = {
  user: IconUser,
  "message-circle": IconMessageCircle,
  settings: IconSettings,
} as const;

export function ErrorPageHeader({ iconType, title, action, backHref }: ErrorPageHeaderProps) {
  const Icon = iconMap[iconType];
  return <PageHeader icon={Icon} title={title} action={action} backHref={backHref} />;
}
