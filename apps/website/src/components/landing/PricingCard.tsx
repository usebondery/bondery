import { Card, Divider, Group, List, ListItem, Text, ThemeIcon } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";

type PricingCardProps = {
  name: string;
  tagline: string;
  price: string;
  /** Billing period shown next to the price, for example "/month". */
  period?: string;
  features: readonly string[];
  action: ReactNode;
  /** Solid primary-colour border. No badge, no glow. */
  featured?: boolean;
};

/**
 * One pricing plan: quiet plan name, large tabular price, divider, compact check list, CTA.
 */
export function PricingCard({
  name,
  tagline,
  price,
  period,
  features,
  action,
  featured = false,
}: PricingCardProps) {
  return (
    <div className="h-full rounded-2xl transition-shadow duration-300 hover:shadow-lg">
      <Card
        className="flex h-full flex-col"
        h="100%"
        p="xl"
        radius="lg"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
          ...(featured ? { border: "1px solid var(--mantine-primary-color-filled)" } : {}),
        }}
        withBorder
      >
        <Text c="dimmed" fw={500} size="sm">
          {name}
        </Text>

        <Group align="baseline" gap={6} mt="xs" wrap="nowrap">
          <Text
            c="light-dark(var(--mantine-color-black), var(--mantine-color-white))"
            fw={700}
            fz="3rem"
            lh={1}
            lts="-0.025em"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {price}
          </Text>
          {period ? (
            <Text c="dimmed" size="sm">
              {period}
            </Text>
          ) : null}
        </Group>

        <Text c="dimmed" mt="sm" size="sm">
          {tagline}
        </Text>

        <Divider my="xl" />

        <List
          center
          className="flex-1"
          icon={
            <ThemeIcon radius="xl" size={20} variant="light">
              <IconCheck size={12} stroke={2.5} />
            </ThemeIcon>
          }
          spacing="sm"
        >
          {features.map((feature) => (
            <ListItem key={feature}>{feature}</ListItem>
          ))}
        </List>

        <div className="mt-8">{action}</div>
      </Card>
    </div>
  );
}
