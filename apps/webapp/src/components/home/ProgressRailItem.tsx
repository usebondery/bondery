"use client";

import { Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconCircle, IconCircleCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface ProgressRailItemProps {
  children?: ReactNode;
  isComplete: boolean;
  isExpanded: boolean;
  label: string;
  onToggle: () => void;
}

export function ProgressRailItem({
  label,
  isComplete,
  isExpanded,
  onToggle,
  children,
}: ProgressRailItemProps) {
  return (
    <Stack gap="xs">
      <UnstyledButton
        onClick={isComplete ? undefined : onToggle}
        style={{
          borderRadius: "var(--mantine-radius-sm)",
          cursor: isComplete ? "default" : "pointer",
          padding: "6px 8px",
          width: "100%",
        }}
      >
        <Group align="flex-start" gap="sm" wrap="nowrap">
          {isComplete ? (
            <ThemeIcon color="teal" radius="xl" size={22} variant="light">
              <IconCircleCheck size={14} stroke={2} />
            </ThemeIcon>
          ) : (
            <ThemeIcon color="gray" radius="xl" size={22} variant="light">
              <IconCircle size={14} stroke={1.5} />
            </ThemeIcon>
          )}
          <Text
            c={isComplete ? "dimmed" : undefined}
            fw={500}
            size="sm"
            style={{ flex: 1, textAlign: "left" }}
            td={isComplete ? "line-through" : undefined}
          >
            {label}
          </Text>
        </Group>
      </UnstyledButton>
      {!isComplete && isExpanded ? children : null}
    </Stack>
  );
}
