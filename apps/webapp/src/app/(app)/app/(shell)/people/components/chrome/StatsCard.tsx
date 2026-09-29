import { ActionIconButton } from "@bondery/mantine-next";
import { Group, Paper, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";

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
            <Tooltip label={tooltip}>
              <ActionIconButton
                aria-label={tCommon("a11y.info")}
                color="gray"
                icon={<IconInfoCircle />}
                size="xs"
                variant="transparent"
              />
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
