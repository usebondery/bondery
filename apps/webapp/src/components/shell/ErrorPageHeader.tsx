"use client";

import { IconMessageCircle, IconSettings, IconUser } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

interface ErrorPageHeaderProps {
  action?: ReactNode;
  backHref?: string;
  iconType: "user" | "message-circle" | "settings";
  title: string;
}

const iconMap = {
  "message-circle": IconMessageCircle,
  settings: IconSettings,
  user: IconUser,
} as const;

export function ErrorPageHeader({ iconType, title, action, backHref }: ErrorPageHeaderProps) {
  const Icon = iconMap[iconType];
  return <PageHeader action={action} backHref={backHref} icon={Icon} title={title} />;
}
