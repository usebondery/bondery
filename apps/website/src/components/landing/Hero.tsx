import { ButtonLink } from "@bondery/mantine-next";
import { Badge, Box, Container, Flex, Stack, Text, Title } from "@mantine/core";
import { IconArrowDown, IconTopologyStar } from "@tabler/icons-react";
import { WEBAPP_URL } from "@/lib/config";

export function Hero() {
  return (
    <Box className="min-h-[calc(100vh-60px)] flex items-center ">
      <Container
        size="md"
        py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 3)" }}
        mt={{ base: "md", md: 0 }}
      >
        <Stack gap="lg" align="center">
          <Badge variant="light" size="lg" w="fit-content">
            Open-source personal CRM
          </Badge>

          {/* Title */}
          <Title
            order={1}
            ta="center"
            className="text-5xl md:text-6xl font-extrabold leading-tight "
          >
            Better than a spreadsheet.
            <br />
            Simpler than a sales CRM.
          </Title>

          {/* Description */}
          <Text size="lg" c="var(--mantine-color-text)" maw={540} ta="center">
            A personal CRM for anyone who wants to stay genuinely connected with the people they
            care about.
          </Text>

          {/* CTA Buttons */}
          <Flex mt="md" gap="md" wrap="wrap" align="stretch" justify="center" w="100%">
            <ButtonLink
              href={`${WEBAPP_URL}/login`}
              size="lg"
              leftSection={<IconTopologyStar size={20} />}
              className="w-full! md:w-auto!"
            >
              Get started
            </ButtonLink>
            <ButtonLink
              href="#features"
              size="lg"
              variant="default"
              leftSection={<IconArrowDown size={20} />}
              className="w-full! md:w-auto!"
            >
              Learn more
            </ButtonLink>
          </Flex>
        </Stack>
      </Container>
    </Box>
  );
}
