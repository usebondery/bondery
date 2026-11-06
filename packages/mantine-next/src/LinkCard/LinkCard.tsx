import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { PressableCard } from "#PressableCard/PressableCard.js";

export interface LinkCardProps {
  description?: ReactNode;
  external?: boolean;
  href: string;
  icon?: ReactNode;
  title: string;
}

/**
 * Pressable card with an icon square, a title, and a description.
 * Use it for a docs link or any other destination that needs a short explanation.
 */
export function LinkCard({ description, external = false, href, icon, title }: LinkCardProps) {
  return (
    <PressableCard external={external} href={href}>
      <Group align="center" gap="sm" wrap="nowrap">
        <ThemeIcon radius="md" size="xl" variant="light">
          {icon ?? <IconArrowRight size={18} />}
        </ThemeIcon>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text component="div" fw={600} lh={1.25}>
            {title}
          </Text>
          {description ? (
            <Text c="dimmed" component="div" lh={1.3} lineClamp={2} size="sm">
              {description}
            </Text>
          ) : null}
        </Stack>
      </Group>
    </PressableCard>
  );
}
