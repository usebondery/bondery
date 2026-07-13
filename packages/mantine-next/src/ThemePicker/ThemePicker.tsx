import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "auto";

interface ThemePickerLabels {
  dark: string;
  light: string;
  system: string;
  title: ReactNode;
}

export interface ThemePickerProps {
  className?: string;
  labels?: Partial<ThemePickerLabels>;
  onChange: (value: ThemePreference) => void;
  value: ThemePreference;
}

const defaultLabels: ThemePickerLabels = {
  dark: "Dark",
  light: "Light",
  system: "System",
  title: "Theme",
};

/**
 * Shared theme preference picker UI (light, dark, system).
 *
 * This is a controlled component: parent owns value and side effects.
 */
export function ThemePicker({ value, onChange, labels, className }: ThemePickerProps) {
  const resolvedLabels = {
    ...defaultLabels,
    ...labels,
  };

  return (
    <Stack className={className} gap={4}>
      <Text fw={500} size="sm">
        {resolvedLabels.title}
      </Text>
      <SegmentedControl
        data={[
          {
            label: (
              <Group gap={6} justify="center" wrap="nowrap">
                <IconSun size={14} />
                <Text size="sm">{resolvedLabels.light}</Text>
              </Group>
            ),
            value: "light",
          },
          {
            label: (
              <Group gap={6} justify="center" wrap="nowrap">
                <IconMoon size={14} />
                <Text size="sm">{resolvedLabels.dark}</Text>
              </Group>
            ),
            value: "dark",
          },
          {
            label: (
              <Group gap={6} justify="center" wrap="nowrap">
                <IconSettings size={14} />
                <Text size="sm">{resolvedLabels.system}</Text>
              </Group>
            ),
            value: "auto",
          },
        ]}
        onChange={(nextValue) => {
          if (nextValue === "light" || nextValue === "dark" || nextValue === "auto") {
            onChange(nextValue);
          }
        }}
        value={value}
      />
    </Stack>
  );
}
