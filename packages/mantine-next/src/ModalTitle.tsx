import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface ModalTitleProps {
  text: ReactNode;
  icon: ReactNode;
  isDangerous?: boolean;
}

export function ModalTitle({ text, icon, isDangerous = false }: ModalTitleProps) {
  const color = isDangerous ? "red" : undefined;

  return (
    <Group gap="xs" c={color}>
      <Box c={color}>{icon}</Box>
      <Text fw={600} size="lg" c={color}>
        {text}
      </Text>
    </Group>
  );
}
