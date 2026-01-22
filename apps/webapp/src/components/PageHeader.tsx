import { Group, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";

interface PageHeaderProps {
  icon: Icon;
  title: string;
}

export function PageHeader({ icon: Icon, title }: PageHeaderProps) {
  return (
    <Group gap="sm">
      <Icon size={32} stroke={1.5} />
      <Title order={1}>{title}</Title>
    </Group>
  );
}
