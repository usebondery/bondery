"use client";

import { Box, Button, Container, Flex, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { IconTopologyStar } from "@tabler/icons-react";
import Link from "next/link";
import { AnimatedPeople } from "@/components/landing/AnimatedPeople";
import { WEBSITE_ROUTES } from "@bondery/helpers";

export function Hero() {
  return (
    <Box className="min-h-[calc(100vh-60px)] flex items-center ">
      <Container
        size="xl"
        py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 3)" }}
        mt={{ base: "md", md: 0 }}
      >
        <Grid gutter={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 2)" }} align="center">
          {/* Left Content */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="lg">
              {/* Title */}
              <Title order={1} className="text-5xl md:text-6xl font-extrabold leading-tight ">
                Build meaningful bonds that last forever
              </Title>

              {/* Description */}
              <Text size="lg" c="dimmed" maw={500}>
                Build your network with ease. Bondery is an open-source personal relationship
                manager, that helps you remember the details, centralizes your connections, and
                nurtures your relationships.
              </Text>

              {/* CTA Buttons */}
              <Flex mt="md" gap="md" wrap="wrap">
                <Button
                  component={Link}
                  href={WEBSITE_ROUTES.LOGIN}
                  size="lg"
                  leftSection={<IconTopologyStar size={20} />}
                >
                  Get started
                </Button>
                <Button component="a" href="#features" size="lg" variant="default">
                  Learn more
                </Button>
              </Flex>
            </Stack>
          </Grid.Col>

          {/* Right Content - Animated People Examples */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <AnimatedPeople />
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}
