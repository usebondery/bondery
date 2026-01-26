"use client";

import {
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconNetwork, IconCalendar, IconUsers, IconTopologyStar } from "@tabler/icons-react";
import Link from "next/link";
import { WEBSITE_ROUTES } from "@bondery/helpers";

export function Pricing() {
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
        gap="xl"
      >
        <Card
          radius="lg"
          shadow="lg"
          miw={{ base: "100%", sm: 350 }}
          maw={380}
          withBorder
          style={{
            backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
          }}
        >
          <Text fz="xl" fw="bold">
            Beta Access
          </Text>
          <Text mb="md" c="dimmed">
            Get early access to all features
          </Text>
          <Flex align="end" gap="xs" mb="sm">
            <Title order={2} fw={"bold"} fz={"2rem"}>
              Free
            </Title>
          </Flex>

          <Card.Section my="lg">
            <Divider />
          </Card.Section>

          <Stack>
            <Group gap="xs" align="start">
              <ThemeIcon variant="default" size={"xl"}>
                <IconUsers />
              </ThemeIcon>
              <Stack gap={0} flex={1}>
                <Text fw={500}>Contact management</Text>
                <Text c="dimmed" fz="sm">
                  All your contacts organized in one place
                </Text>
              </Stack>
            </Group>
            <Group gap="xs" align="start">
              <ThemeIcon variant="default" size={"xl"}>
                <IconCalendar />
              </ThemeIcon>
              <Stack gap={0} flex={1}>
                <Text fw={500}>Smart reminders</Text>
                <Text c="dimmed" fz="sm">
                  Never miss birthdays and important dates
                </Text>
              </Stack>
            </Group>
            <Group gap="xs" align="start">
              <ThemeIcon variant="default" size={"xl"}>
                <IconNetwork />
              </ThemeIcon>
              <Stack gap={0} flex={1}>
                <Text fw={500}>Network visualization</Text>
                <Text c="dimmed" fz="sm">
                  See your connections in an interactive graph
                </Text>
              </Stack>
            </Group>
          </Stack>

          <Card.Section my="lg">
            <Divider />
          </Card.Section>

          <Box>
            <Button
              component={Link}
              href={WEBSITE_ROUTES.LOGIN}
              size="lg"
              fullWidth
              variant="primary"
              leftSection={<IconTopologyStar size={18} />}
            >
              Get started
            </Button>
          </Box>
        </Card>
      </Group>
    </Container>
  );
}
