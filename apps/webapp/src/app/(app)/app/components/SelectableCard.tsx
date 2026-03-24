"use client";

import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

interface SelectableCardProps {
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
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
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="button-scale-effect"
      w="100%"
      h="100%"
      style={{ textAlign: "left" }}
    >
      <Paper
        p="xs"
        radius="md"
        withBorder
        h="100%"
        className="selectable-card"
        style={{
          borderColor: selected ? "var(--mantine-primary-color-filled)" : undefined,
          backgroundColor: selected ? "var(--mantine-primary-color-light-hover)" : undefined,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.75 : 1,
        }}
      >
        <Stack gap={2}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={500}>
              {label}
            </Text>
            {selected && <IconCheck size={14} />}
          </Group>
          {description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {description}
            </Text>
          )}
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
