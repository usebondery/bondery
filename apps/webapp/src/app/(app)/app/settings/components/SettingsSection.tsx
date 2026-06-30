"use client";

import { Card, CardSection, Group, Text, Tooltip } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ActionIconLink } from "@bondery/mantine-next";

interface SettingsSectionProps {
  id?: string;
  icon: ReactNode;
  title: string;
  helpHref?: string;
  helpLabel?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable wrapper for settings page cards.
 * Provides consistent Card shell with a titled header section.
 * Must be a client component so that Mantine's Card correctly resolves
 * CardSection children types (RSC children lose their type references).
 */
export function SettingsSection({
  id,
  icon,
  title,
  helpHref,
  helpLabel,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <Card id={id} withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {icon}
            <Text size="lg" fw={600}>
              {title}
            </Text>
            {helpHref && helpLabel ? (
              <Tooltip label={helpLabel} multiline maw={320}>
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
          {action}
        </Group>
      </CardSection>
      {children}
    </Card>
  );
}
