import { ButtonLink } from "@bondery/mantine-next";
import { Badge, Box, Container, Flex, Grid, GridCol, Stack, Text, Title } from "@mantine/core";
import { IconArrowDown, IconTopologyStar } from "@tabler/icons-react";
import { AnimatedPeople } from "@/components/landing/AnimatedPeople";
import { WEBAPP_URL } from "@/lib/config";

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
          <GridCol span={{ base: 12, md: 6 }}>
            <Stack gap="lg">
              <Badge variant="light" size="lg" w="fit-content">
                Open-source personal CRM
              </Badge>

              {/* Title */}
              <Title order={1} className="text-5xl md:text-6xl font-extrabold leading-tight ">
                Build a network that lasts
              </Title>

              {/* Description */}
              <Text size="lg" c="var(--mantine-color-text)" maw={500}>
                Capture the little things that make your connections feel personal in one place.
              </Text>

              {/* CTA Buttons */}
              <Flex mt="md" gap="md" wrap="wrap" align="stretch" w="100%">
                <ButtonLink
                  href={`${WEBAPP_URL}/login`}
                  size="lg"
                  leftSection={<IconTopologyStar size={20} />}
                  className="w-full sm:w-auto"
                >
                  Get started
                </ButtonLink>
                <ButtonLink
                  href="#features"
                  size="lg"
                  variant="default"
                  leftSection={<IconArrowDown size={20} />}
                  className="w-full sm:w-auto"
                >
                  Learn more
                </ButtonLink>
              </Flex>
            </Stack>
          </GridCol>

          {/* Right Content - Animated People Examples */}
          <GridCol span={{ base: 12, md: 6 }}>
            <AnimatedPeople />
          </GridCol>
        </Grid>
      </Container>
    </Box>
  );
}
