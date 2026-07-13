import {
  Box,
  Card,
  CardSection,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import type { ReactNode } from "react";

type PricingFeature = {
  icon: ReactNode;
  title: string;
  description: string;
};

type PricingCardProps = {
  title: string;
  description: string;
  features: PricingFeature[];
  action: ReactNode;
  oldPrice?: string;
};

export function PricingCard({ title, description, features, action, oldPrice }: PricingCardProps) {
  return (
    <Card
      h="100%"
      maw={380}
      miw={{ base: "100%", sm: 350 }}
      radius="lg"
      shadow="lg"
      style={{
        backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        display: "flex",
        flexDirection: "column",
      }}
      withBorder
    >
      <Flex align="end" gap="xs" mb="sm">
        <Title fw="bold" fz="2rem" order={2}>
          {title}
        </Title>
        {oldPrice && (
          <Text c="dimmed" fz="sm" mb={6} td="line-through">
            {oldPrice}
          </Text>
        )}
      </Flex>
      <Text c="dimmed">{description}</Text>

      <CardSection my="lg">
        <Divider />
      </CardSection>

      <Stack style={{ flex: 1 }}>
        {features.map((feature) => (
          <Group align="start" gap="xs" key={feature.title}>
            <ThemeIcon size="xl" variant="default">
              {feature.icon}
            </ThemeIcon>
            <Stack flex={1} gap={0}>
              <Text fw={500}>{feature.title}</Text>
              <Text c="dimmed" fz="sm">
                {feature.description}
              </Text>
            </Stack>
          </Group>
        ))}
      </Stack>

      <CardSection my="lg">
        <Divider />
      </CardSection>

      <Box mt="auto">{action}</Box>
    </Card>
  );
}
