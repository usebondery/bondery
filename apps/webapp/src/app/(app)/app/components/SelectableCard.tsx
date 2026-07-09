"use client";

import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

interface SelectableCardProps {
  description?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  selected: boolean;
}

export function SelectableCard({
  label,
  description,
  selected,
  disabled = false,
  onClick,
}: SelectableCardProps) {
  return (
    <UnstyledButton
      aria-pressed={selected}
      className="button-scale-effect"
      disabled={disabled}
      h="100%"
      onClick={onClick}
      style={{ textAlign: "left" }}
      w="100%"
    >
      <Paper
        className="selectable-card"
        h="100%"
        p="xs"
        radius="md"
        style={{
          backgroundColor: selected ? "var(--mantine-primary-color-light-hover)" : undefined,
          borderColor: selected ? "var(--mantine-primary-color-filled)" : undefined,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.75 : 1,
        }}
        withBorder
      >
        <Stack gap={2}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={500} size="sm">
              {label}
            </Text>
            {selected && <IconCheck size={14} />}
          </Group>
          {description && (
            <Text c="dimmed" lineClamp={1} size="xs">
              {description}
            </Text>
          )}
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
