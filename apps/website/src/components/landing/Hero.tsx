import { ButtonLink } from "@bondery/mantine-next";
import { Box, Container, Flex, Grid, GridCol, Stack, Text, Title } from "@mantine/core";
import { IconTopologyStar } from "@tabler/icons-react";
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
                <ButtonLink
                  href={`${WEBAPP_URL}/login`}
                  size="lg"
                  leftSection={<IconTopologyStar size={20} />}
                >
                  Get started
                </ButtonLink>
                <ButtonLink href="#features" size="lg" variant="default">
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
