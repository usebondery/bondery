import { ButtonLink } from "@bondery/mantine-next";
import { Box, Container, Flex, Image, Stack, Text, Title } from "@mantine/core";
import { IconArrowDown, IconTopologyStar } from "@tabler/icons-react";
import NextImage from "next/image";
import { hrefWebappLogin } from "@/lib/navigation/href/webapp";

const HERO_DASHBOARD_ALT =
  "Bondery home dashboard with interactions timeline, contact stats, and reminders";

/** Source asset: 16:9 desktop capture at native resolution. */
const HERO_DASHBOARD_WIDTH = 2880;
const HERO_DASHBOARD_HEIGHT = 1620;

export function Hero() {
  return (
    <Box className="min-h-[calc(100vh-60px)] flex items-center overflow-x-clip">
      <Container
        className="overflow-visible"
        mt={{ base: "md", md: 0 }}
        py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 2)" }}
        size="xl"
      >
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-14">
          <Stack className="items-center lg:items-stretch" gap="lg">
            <Title
              className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl"
              order={1}
              ta={{ base: "center", lg: "left" }}
            >
              Build stronger bonds that grow your network
            </Title>

            <Text
              c="var(--mantine-color-text)"
              maw={540}
              size="lg"
              ta={{ base: "center", lg: "left" }}
            >
              Bondery is an open-source personal CRM that puts everyone you know in one place. Stay
              in touch on purpose: context, last conversation, reminders to reach out.
            </Text>

            <Flex
              align="stretch"
              gap="md"
              justify={{ base: "center", lg: "flex-start" }}
              mt="md"
              w="100%"
              wrap="wrap"
            >
              <ButtonLink
                className="w-full! md:w-auto!"
                href={hrefWebappLogin()}
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

          <Box className="w-full min-w-0">
            <Box
              className="w-full overflow-hidden rounded-xl border border-[var(--mantine-color-default-border)] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] lg:rounded-2xl lg:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.55)]"
              style={{ lineHeight: 0 }}
            >
              <Image
                alt={HERO_DASHBOARD_ALT}
                className="h-auto w-full object-contain object-left-top"
                component={NextImage}
                fetchPriority="high"
                height={HERO_DASHBOARD_HEIGHT}
                quality={92}
                sizes="(max-width: 992px) 100vw, 50vw"
                src="/images/hero-app-dashboard.png"
                width={HERO_DASHBOARD_WIDTH}
              />
            </Box>
          </Box>
        </div>
      </Container>
    </Box>
  );
}
