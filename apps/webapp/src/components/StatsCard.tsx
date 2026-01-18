import { Paper, Group, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  color?: string;
}

export function StatsCard({ title, value, description, icon, color = "blue" }: StatsCardProps) {
  return (
    <Paper withBorder p="md" shadow="sm" className="card-scale-effect">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl" mt="xs">
            {value}
          </Text>
          <Text c="dimmed" size="xs" mt="xs">
            {description}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size={60} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
