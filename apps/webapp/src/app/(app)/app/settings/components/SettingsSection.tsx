"use client";

import { Card, CardSection, Group, Text } from "@mantine/core";
import type { DocId } from "@bondery/helpers";
import type { ReactNode } from "react";
import { HelpButton } from "@bondery/mantine-next";

interface SettingsSectionProps {
  id?: string;
  icon: ReactNode;
  title: string;
  helpDoc?: DocId;
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
  helpDoc,
  helpLabel,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <Card
      id={id}
      withBorder
      shadow="sm"
      style={id ? { scrollMarginTop: "var(--mantine-spacing-md)" } : undefined}
    >
      <CardSection withBorder inheritPadding py="md">
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {icon}
            <Text size="lg" fw={600}>
              {title}
            </Text>
            {helpLabel ? <HelpButton doc={helpDoc} label={helpLabel} /> : null}
          </Group>
          {action}
        </Group>
      </CardSection>
      {children}
    </Card>
  );
}
