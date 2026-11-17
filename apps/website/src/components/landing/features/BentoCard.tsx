import { Badge, Card, Group, Text, ThemeIcon, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type BentoCardProps = {
  icon: Icon;
  title: string;
  description: string;
  visual: ReactNode;
  badge?: string;
  /**
   * Real, interactive content shown below the decorative visual (links, buttons).
   * Rendered outside the `aria-hidden` wrapper so it stays reachable.
   */
  aside?: ReactNode;
};

/**
 * One feature tile: icon, benefit headline, short description, and a decorative
 * product visual pinned to the bottom.
 */
export function BentoCard({
  icon: TileIcon,
  title,
  description,
  visual,
  badge,
  aside,
}: BentoCardProps) {
  return (
    <Card
      className="h-full transition-shadow duration-300 hover:shadow-lg"
      padding={0}
      radius="lg"
      style={{
        backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
      }}
      withBorder
    >
      <div className="flex flex-col gap-3 p-6 md:p-7">
        <Group gap="sm" justify="space-between" wrap="nowrap">
          <ThemeIcon radius="md" size={36} variant="light">
            <TileIcon size={20} stroke={1.75} />
          </ThemeIcon>
          {badge ? (
            <Badge radius="xl" size="sm" tt="none" variant="outline">
              {badge}
            </Badge>
          ) : null}
        </Group>
        <Title className="text-xl! leading-snug! font-bold" order={3}>
          {title}
        </Title>
        <Text c="dimmed" size="sm" style={{ textWrap: "pretty" }}>
          {description}
        </Text>
      </div>

      <div
        className="relative flex min-h-56 flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6 pb-6"
        style={{
          background:
            "linear-gradient(180deg, transparent, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8)))",
        }}
      >
        <div aria-hidden="true" className="flex w-full items-center justify-center">
          {visual}
        </div>
        {aside}
      </div>
    </Card>
  );
}
