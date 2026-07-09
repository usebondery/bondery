import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface ModalTitleProps {
  icon: ReactNode;
  isDangerous?: boolean;
  rightContent?: ReactNode;
  text: ReactNode;
}

export function ModalTitle({ text, icon, isDangerous = false, rightContent }: ModalTitleProps) {
  const color = isDangerous ? "red" : undefined;

  return (
    <Group gap="sm" justify="space-between" wrap="nowrap">
      <Group c={color} gap="xs" wrap="nowrap">
        <Box c={color}>{icon}</Box>
        <Text c={color} fw={600} size="lg">
          {text}
        </Text>
      </Group>
      {rightContent ? <Box>{rightContent}</Box> : null}
    </Group>
  );
}
