import { ButtonLink } from "@bondery/mantine-next";
import { Badge, Box, Container, Flex, Stack, Text, Title } from "@mantine/core";
import { IconArrowDown, IconTopologyStar } from "@tabler/icons-react";
import { WEBAPP_URL } from "@/lib/config";

export function Hero() {
  return (
    <Box className="min-h-[calc(100vh-60px)] flex items-center ">
      <Container
        mt={{ base: "md", md: 0 }}
        py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 3)" }}
        size="md"
      >
        <Stack align="center" gap="lg">
          <Badge size="lg" variant="light" w="fit-content">
            Open-source personal CRM
          </Badge>

          {/* Title */}
          <Title
            className="text-5xl md:text-6xl font-extrabold leading-tight "
            order={1}
            ta="center"
          >
            Better than a spreadsheet.
            <br />
            Simpler than a sales CRM.
          </Title>

          {/* Description */}
          <Text c="var(--mantine-color-text)" maw={540} size="lg" ta="center">
            A personal CRM for anyone who wants to stay genuinely connected with the people they
            care about.
          </Text>

          {/* CTA Buttons */}
          <Flex align="stretch" gap="md" justify="center" mt="md" w="100%" wrap="wrap">
            <ButtonLink
              className="w-full! md:w-auto!"
              href={`${WEBAPP_URL}/login`}
              leftSection={<IconTopologyStar size={20} />}
              size="lg"
            >
              Get started
            </ButtonLink>
            <ButtonLink
              className="w-full! md:w-auto!"
              href="#features"
              leftSection={<IconArrowDown size={20} />}
              size="lg"
              variant="default"
            >
              Learn more
            </ButtonLink>
          </Flex>
        </Stack>
      </Container>
    </Box>
  );
}
