"use client";

import { ActionIcon, Group, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ActionIconLink } from "@bondery/mantine-next";

interface PageHeaderProps {
  icon: Icon;
  title: string;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  backHref?: string;
  backOnClick?: () => void;
}

export function PageHeader({
  icon: Icon,
  title,
  action,
  primaryAction,
  secondaryAction,
  backHref,
  backOnClick,
}: PageHeaderProps) {
  const resolvedAction =
    action ||
    (primaryAction || secondaryAction ? (
      <Group gap="sm">
        {secondaryAction}
        {primaryAction}
      </Group>
    ) : undefined);

  return (
    <Group justify={resolvedAction ? "space-between" : "flex-start"} gap="sm" mb={"xl"}>
      <Group gap="sm">
        {backOnClick ? (
          <ActionIcon aria-label="Back" variant="default" size="xl" onClick={backOnClick}>
            <IconArrowLeft size={20} />
          </ActionIcon>
        ) : null}
        {!backOnClick && backHref && (
          <ActionIconLink href={backHref} ariaLabel="Back" variant="default" size="xl">
            <IconArrowLeft size={20} />
          </ActionIconLink>
        )}
        <Icon size={32} stroke={1.5} />
        <Title order={1}>{title}</Title>
      </Group>
      {resolvedAction}
    </Group>
  );
}
