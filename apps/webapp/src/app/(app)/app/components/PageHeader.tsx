"use client";

import { Group, Title, ActionIcon, Anchor } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import Link from "next/link";

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
          <Anchor component={Link} href={backHref}>
            <ActionIcon variant="default" size="xl">
              <IconArrowLeft size={20} />
            </ActionIcon>
          </Anchor>
        )}
        <Icon size={32} stroke={1.5} />
        <Title order={1}>{title}</Title>
      </Group>
      {action}
    </Group>
  );
}
