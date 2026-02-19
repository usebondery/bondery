"use client";

import { Group, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ActionIconLink } from "@bondery/mantine-next";

interface PageHeaderProps {
  icon: Icon;
  title: string;
  action?: ReactNode;
  backHref?: string;
}

export function PageHeader({ icon: Icon, title, action, backHref }: PageHeaderProps) {
  return (
    <Group justify={action ? "space-between" : "flex-start"} gap="sm" mb={"xl"}>
      <Group gap="sm">
        {backHref && (
          <ActionIconLink href={backHref} ariaLabel="Back" variant="default" size="xl">
            <IconArrowLeft size={20} />
          </ActionIconLink>
        )}
        <Icon size={32} stroke={1.5} />
        <Title order={1}>{title}</Title>
      </Group>
      {action}
    </Group>
  );
}
