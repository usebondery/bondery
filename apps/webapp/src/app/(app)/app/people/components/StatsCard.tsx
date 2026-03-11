import { ActionIcon, Group, Paper, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  tooltip: string;
  icon: ReactNode;
  color?: string;
  href?: string;
}

export function StatsCard({ title, value, tooltip, icon, color = "blue", href }: StatsCardProps) {
  return (
    <Paper
      component={href ? "a" : "div"}
      href={href}
      withBorder
      p="md"
      shadow="none"
      className="card-scale-effect"
    >
      <Group justify="space-between">
        <div>
          <Group gap={4} align="center" wrap="nowrap">
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
              {title}
            </Text>
            <Tooltip label={tooltip} multiline maw={220} withArrow>
              <ActionIcon variant="transparent" color="gray" size="xs" aria-label="Info">
                <IconInfoCircle size={13} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text fw={700} size="xl" mt="xs">
            {value}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size={60} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
