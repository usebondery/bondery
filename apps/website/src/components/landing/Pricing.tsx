import { Container, Group, Text, Title, Stack } from "@mantine/core";
import { ButtonLink } from "@bondery/mantine-next";
import {
  IconNetwork,
  IconCalendar,
  IconUsers,
  IconTopologyStar,
  IconHourglass,
  IconTimeline,
  IconTimelineEvent,
} from "@tabler/icons-react";
import { WEBAPP_URL } from "@/lib/config";
import { PricingCard } from "./PricingCard";

export function Pricing() {
  const freeFeatures = [
    {
      icon: <IconUsers />,
      title: "Contact management",
      description: "All your contacts organized in one place",
    },
    {
      icon: <IconTimelineEvent />,
      title: "Log activities",
      description: "Track interactions with your contacts",
    },
    {
      icon: <IconCalendar />,
      title: "Reminders",
      description: "Never miss birthdays and important dates",
    },
  ];

  const premiumFeatures = [
    {
      icon: <IconNetwork />,
      title: "Smart search",
      description: "Find the right people instantly with contextual search",
    },
    {
      icon: <IconTopologyStar />,
      title: "Writing copilot",
      description: "Generate tailored outreach drafts for every contact",
    },
    {
      icon: <IconUsers />,
      title: "Priority support",
      description: "We will prioritize your feature requests and questions",
    },
  ];

  return (
    <Container
      id="pricing"
      bg="var(--mantine-color-body)"
      py={{
        base: "calc(var(--mantine-spacing-lg) * 1)",
        xs: "calc(var(--mantine-spacing-lg) * 2)",
        lg: "calc(var(--mantine-spacing-lg) * 3)",
      }}
      fluid
    >
      <Container size="md">
        <Stack align="center" gap="xs" mb="xl">
          <Title order={2} ta="center" className="text-5xl!" fw={"bold"}>
            Simple, Transparent Pricing
          </Title>
          <Text c="dimmed" ta="center" size="xl" style={{ textWrap: "balance" }}>
            Start building your network today, completely free during our beta phase.
          </Text>
        </Stack>
      </Container>

      <Group
        mt={{
          base: "calc(var(--mantine-spacing-lg) * 2)",
          lg: "calc(var(--mantine-spacing-lg) * 3)",
        }}
        justify="center"
        align="stretch"
        gap="xl"
      >
        <PricingCard
          title="Free"
          description="All the core features needed."
          features={freeFeatures}
          action={
            <ButtonLink
              href={`${WEBAPP_URL}/login`}
              size="lg"
              fullWidth
              variant="primary"
              leftSection={<IconTopologyStar size={18} />}
            >
              Get started
            </ButtonLink>
          }
        />

        <PricingCard
          title="Premium"
          oldPrice="$10 USD p.m."
          description="Advanced features for power users."
          features={premiumFeatures}
          action={
            <ButtonLink
              href={`${WEBAPP_URL}/login`}
              disabled
              size="lg"
              fullWidth
              variant="outline"
              leftSection={<IconHourglass size={18} />}
            >
              Coming soon
            </ButtonLink>
          }
        />
      </Group>
    </Container>
  );
}
