import { ButtonLink } from "@bondery/mantine-next";
import { Container, Group, Stack, Text, Title } from "@mantine/core";
import {
  IconCalendar,
  IconMessageChatbot,
  IconNetwork,
  IconTimelineEvent,
  IconTopologyStar,
  IconUsers,
} from "@tabler/icons-react";
import { WEBAPP_URL } from "@/lib/config";
import { PricingCard } from "./PricingCard";

export function Pricing() {
  const freeFeatures = [
    {
      description: "Create unlimited amount of contacts",
      icon: <IconUsers />,
      title: "Contact management",
    },
    {
      description: "Track interactions with your contacts",
      icon: <IconTimelineEvent />,
      title: "Log activities",
    },
    {
      description: "Never miss birthdays or important dates",
      icon: <IconCalendar />,
      title: "Reminders",
    },
  ];

  const premiumFeatures = [
    {
      description: "Unlimited AI chat to search, write, and manage contacts",
      icon: <IconMessageChatbot />,
      title: "AI Assistant",
    },
    {
      description: "Find the right people with a text query",
      icon: <IconNetwork />,
      title: "Smart search",
    },
    {
      description: "Generate personalized outreach drafts",
      icon: <IconTopologyStar />,
      title: "Writing copilot",
    },
    {
      description: "Priority of feature requests and questions",
      icon: <IconUsers />,
      title: "Priority support",
    },
  ];

  return (
    <Container
      bg="var(--mantine-color-body)"
      fluid
      id="pricing"
      py={{
        base: "calc(var(--mantine-spacing-lg) * 1)",
        lg: "calc(var(--mantine-spacing-lg) * 3)",
        xs: "calc(var(--mantine-spacing-lg) * 2)",
      }}
    >
      <Container size="md">
        <Stack align="center" gap="xs" mb="xl">
          <Title className="text-5xl!" fw={"bold"} order={2} ta="center">
            Simple, Transparent Pricing
          </Title>
          <Text c="dimmed" size="xl" style={{ textWrap: "balance" }} ta="center">
            Start building your network today, completely free.
          </Text>
        </Stack>
      </Container>

      <Group
        align="stretch"
        gap="xl"
        justify="center"
        mt={{
          base: "calc(var(--mantine-spacing-lg) * 2)",
          lg: "calc(var(--mantine-spacing-lg) * 3)",
        }}
      >
        <PricingCard
          action={
            <ButtonLink
              fullWidth
              href={`${WEBAPP_URL}/login`}
              leftSection={<IconTopologyStar size={18} />}
              size="lg"
              variant="primary"
            >
              Get started
            </ButtonLink>
          }
          description="All the core features needed."
          features={freeFeatures}
          title="Free"
        />

        <PricingCard
          action={
            <ButtonLink
              fullWidth
              href={`${WEBAPP_URL}/login`}
              leftSection={<IconTopologyStar size={18} />}
              size="lg"
              variant="primary"
            >
              Get started
            </ButtonLink>
          }
          description="Advanced features for power users."
          features={premiumFeatures}
          oldPrice="$10 USD p.m."
        />
      </Group>
    </Container>
  );
}
