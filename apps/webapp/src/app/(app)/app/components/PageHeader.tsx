"use client";

import { ActionIcon, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconHelpCircle } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ActionIconLink } from "@bondery/mantine-next";

interface PageHeaderProps {
  icon: Icon;
  title: string;
  description?: string;
  helpHref?: string;
  helpLabel?: string;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  backHref?: string;
  backOnClick?: () => void;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  helpHref,
  helpLabel,
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
          <ActionIconLink
            href={backHref}
            ariaLabel="Back"
            variant="default"
            size="xl"
            icon={<IconArrowLeft size={20} />}
          />
        )}
        <Icon size={32} stroke={1.5} />
        <Stack gap={2}>
          <Title order={1}>{title}</Title>
          {description ? (
            <Group gap="xs" align="center" wrap="wrap">
              <Text size="sm" c="dimmed">
                {description}
              </Text>
              {helpHref && helpLabel ? (
                <Tooltip label={helpLabel}>
                  <ActionIconLink
                    href={helpHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    ariaLabel={helpLabel}
                    variant="light"
                    color="gray"
                    radius="xl"
                    size="sm"
                    icon={<IconHelpCircle size={14} />}
                  />
                </Tooltip>
              ) : null}
            </Group>
          ) : null}
        </Stack>
      </Group>
      {resolvedAction}
    </Group>
  );
}
