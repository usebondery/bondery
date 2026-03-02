import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface ModalTitleProps {
  text: ReactNode;
  icon: ReactNode;
  isDangerous?: boolean;
  rightContent?: ReactNode;
}

export function ModalTitle({ text, icon, isDangerous = false, rightContent }: ModalTitleProps) {
  const color = isDangerous ? "red" : undefined;

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="xs" c={color} wrap="nowrap">
        <Box c={color}>{icon}</Box>
        <Text fw={600} size="lg" c={color}>
          {text}
        </Text>
      </Group>
      {rightContent ? <Box>{rightContent}</Box> : null}
    </Group>
  );
}
