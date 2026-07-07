"use client";

import type { ReactNode } from "react";
import { Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconCircle, IconCircleCheck } from "@tabler/icons-react";

interface ProgressRailItemProps {
  label: string;
  isComplete: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
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
          width: "100%",
          borderRadius: "var(--mantine-radius-sm)",
          padding: "6px 8px",
          cursor: isComplete ? "default" : "pointer",
        }}
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          {isComplete ? (
            <ThemeIcon size={22} radius="xl" color="teal" variant="light">
              <IconCircleCheck size={14} stroke={2} />
            </ThemeIcon>
          ) : (
            <ThemeIcon size={22} radius="xl" color="gray" variant="light">
              <IconCircle size={14} stroke={1.5} />
            </ThemeIcon>
          )}
          <Text
            size="sm"
            fw={500}
            td={isComplete ? "line-through" : undefined}
            c={isComplete ? "dimmed" : undefined}
            style={{ flex: 1, textAlign: "left" }}
          >
            {label}
          </Text>
        </Group>
      </UnstyledButton>
      {!isComplete && isExpanded ? children : null}
    </Stack>
  );
}
