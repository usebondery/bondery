"use client";

import { ButtonLink } from "@bondery/mantine-next";
import { Container, Stack, Text, Title } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";

export default function Page() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" justify="center" gap="xl" style={{ minHeight: "60vh" }}>
        <Stack align="center" gap="md">
          <Title order={1} ta="center">
            Page Not Found
          </Title>
          <Text size="lg" c="dimmed" ta="center">
            The page you are looking for does not exist.
          </Text>
        </Stack>
        <ButtonLink href="/" size="lg" leftSection={<IconHome size={20} />}>
          Back to Home
        </ButtonLink>
      </Stack>
    </Container>
  );
}
