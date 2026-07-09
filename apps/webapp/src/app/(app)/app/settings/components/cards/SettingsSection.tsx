"use client";

import type { DocId } from "@bondery/helpers";
import { HelpButton } from "@bondery/mantine-next";
import { Card, CardSection, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  action?: ReactNode;
  children: ReactNode;
  helpDoc?: DocId;
  helpLabel?: string;
  icon: ReactNode;
  id?: string;
  title: string;
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
      shadow="sm"
      style={id ? { scrollMarginTop: "var(--mantine-spacing-md)" } : undefined}
      withBorder
    >
      <CardSection inheritPadding py="md" withBorder>
        <Group gap="sm" justify="space-between" wrap="nowrap">
          <Group gap="xs" style={{ minWidth: 0 }} wrap="nowrap">
            {icon}
            <Text fw={600} size="lg">
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
