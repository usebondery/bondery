import { ActionIcon, Group, Paper, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCommonTranslations } from "@/lib/i18n/useWebTranslations";

interface StatsCardProps {
  color?: string;
  href?: string;
  icon: ReactNode;
  title: string;
  tooltip: string;
  value: string | number;
}

export function StatsCard({ title, value, tooltip, icon, color = "blue", href }: StatsCardProps) {
  const tCommon = useCommonTranslations();

  return (
    <Paper
      className="card-scale-effect"
      component={href ? "a" : "div"}
      href={href}
      p="md"
      shadow="none"
      withBorder
    >
      <Group justify="space-between">
        <div>
          <Group align="center" gap={4} wrap="nowrap">
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              {title}
            </Text>
            <Tooltip label={tooltip} maw={220} multiline withArrow>
              <ActionIcon
                aria-label={tCommon("a11y.info")}
                color="gray"
                size="xs"
                variant="transparent"
              >
                <IconInfoCircle size={13} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text fw={700} mt="xs" size="xl">
            {value}
          </Text>
        </div>
        <ThemeIcon color={color} radius="md" size={60} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
