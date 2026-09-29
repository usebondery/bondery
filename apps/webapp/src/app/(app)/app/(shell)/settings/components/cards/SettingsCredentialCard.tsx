"use client";

import { ActionIconButton } from "@bondery/mantine-next";
import { Box, Card, Group, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

const LAST_USED_COLUMN_WIDTH = 180;

type SettingsCredentialCardProps = {
  children?: ReactNode;
  deleteAriaLabel: string;
  deleteTooltip?: string;
  icon: ReactNode;
  iconTooltip?: string;
  label: ReactNode;
  lastUsedLabel: string;
  onDelete: () => void;
};

export function SettingsCredentialCard({
  children,
  deleteAriaLabel,
  deleteTooltip,
  icon,
  iconTooltip,
  label,
  lastUsedLabel,
  onDelete,
}: SettingsCredentialCardProps) {
  const iconNode = (
    <ThemeIcon color="gray" radius="md" size="lg" variant="light">
      {icon}
    </ThemeIcon>
  );

  const deleteButton = (
    <ActionIconButton
      aria-label={deleteAriaLabel}
      color="red"
      icon={<IconTrash />}
      onClick={onDelete}
      size="sm"
      style={{ flexShrink: 0 }}
      variant="subtle"
    />
  );

  return (
    <Card padding="sm" radius="md" withBorder>
      <Group align="center" gap="sm" wrap="nowrap">
        {iconTooltip ? <Tooltip label={iconTooltip}>{iconNode}</Tooltip> : iconNode}

        <Box style={{ flex: 1, minWidth: 120 }}>{label}</Box>

        {children}

        <Text c="dimmed" size="xs" style={{ flexShrink: 0 }} truncate w={LAST_USED_COLUMN_WIDTH}>
          {lastUsedLabel}
        </Text>

        {deleteTooltip ? <Tooltip label={deleteTooltip}>{deleteButton}</Tooltip> : deleteButton}
      </Group>
    </Card>
  );
}
