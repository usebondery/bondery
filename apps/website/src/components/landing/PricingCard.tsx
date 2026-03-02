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
      radius="lg"
      shadow="lg"
      miw={{ base: "100%", sm: 350 }}
      maw={380}
      h="100%"
      withBorder
      style={{
        backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex align="end" gap="xs" mb="sm">
        <Title order={2} fw="bold" fz="2rem">
          {title}
        </Title>
        {oldPrice && (
          <Text c="dimmed" fz="sm" td="line-through" mb={6}>
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
          <Group key={feature.title} gap="xs" align="start">
            <ThemeIcon variant="default" size="xl">
              {feature.icon}
            </ThemeIcon>
            <Stack gap={0} flex={1}>
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
