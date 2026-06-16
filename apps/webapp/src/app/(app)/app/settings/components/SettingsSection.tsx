"use client";

import { Card, CardSection, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  id?: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

/**
 * Reusable wrapper for settings page cards.
 * Provides consistent Card shell with a titled header section.
 * Must be a client component so that Mantine's Card correctly resolves
 * CardSection children types (RSC children lose their type references).
 */
export function SettingsSection({ id, icon, title, children }: SettingsSectionProps) {
  return (
    <Card id={id} withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group gap="xs">
          {icon}
          <Text size="lg" fw={600}>
            {title}
          </Text>
        </Group>
      </CardSection>
      {children}
    </Card>
  );
}
