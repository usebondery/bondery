import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "auto";

interface ThemePickerLabels {
  light: string;
  dark: string;
  system: string;
  title: ReactNode;
}

interface ThemePickerProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  labels?: Partial<ThemePickerLabels>;
  className?: string;
}

const defaultLabels: ThemePickerLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
  title: "Theme",
};

export function ThemePicker({ value, onChange, labels, className }: ThemePickerProps) {
  const resolvedLabels = {
    ...defaultLabels,
    ...labels,
  };

  return (
    <Stack gap={4} className={className}>
      <Text size="sm" fw={500}>
        {resolvedLabels.title}
      </Text>
      <SegmentedControl
        w="full"
        value={value}
        onChange={(nextValue) => {
          if (nextValue === "light" || nextValue === "dark" || nextValue === "auto") {
            onChange(nextValue);
          }
        }}
        data={[
          {
            label: (
              <Group gap={6} wrap="nowrap" justify="center">
                <IconSun size={14} />
                <Text size="sm">{resolvedLabels.light}</Text>
              </Group>
            ),
            value: "light",
          },
          {
            label: (
              <Group gap={6} wrap="nowrap" justify="center">
                <IconMoon size={14} />
                <Text size="sm">{resolvedLabels.dark}</Text>
              </Group>
            ),
            value: "dark",
          },
          {
            label: (
              <Group gap={6} wrap="nowrap" justify="center">
                <IconSettings size={14} />
                <Text size="sm">{resolvedLabels.system}</Text>
              </Group>
            ),
            value: "auto",
          },
        ]}
      />
    </Stack>
  );
}
