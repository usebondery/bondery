import { ButtonLink } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Box, Container, Flex, Image, Stack, Text, Title } from "@mantine/core";
import { IconArrowDown, IconTopologyStar } from "@tabler/icons-react";
import NextImage from "next/image";
import { PageTopSpacer } from "@/components/page-top-spacer";
import { hrefWebappLogin } from "@/lib/navigation/href/webapp";

const HERO_DASHBOARD_ALT = landing.Hero.ImageAlt;

/** Source asset: 16:9 desktop capture at native resolution. */
const HERO_DASHBOARD_WIDTH = 2880;
const HERO_DASHBOARD_HEIGHT = 1620;

export function Hero() {
  return (
    <>
      <PageTopSpacer />
      <Box
        className="flex items-center overflow-x-clip"
        style={{ minHeight: "calc(100dvh - var(--site-header-height) - var(--page-top-spacer))" }}
      >
        <Container
          className="overflow-visible"
          py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 2)" }}
          size="xl"
        >
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-14">
            <Stack className="items-center lg:items-stretch" gap="lg">
              <Title
                fw={800}
                fz={{ base: "2.25rem", lg: "3.75rem", md: "3rem" }}
                lh={1.25}
                order={1}
                ta={{ base: "center", lg: "left" }}
              >
                {landing.Hero.Title}
              </Title>

              <Text
                c="var(--mantine-color-text)"
                maw={540}
                mx={{ base: "auto", lg: 0 }}
                size="lg"
                ta={{ base: "center", lg: "left" }}
              >
                {landing.Hero.Subtitle}
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
                  {landing.GetStarted}
                </ButtonLink>
                <ButtonLink
                  className="w-full! md:w-auto!"
                  href="#features"
                  leftSection={<IconArrowDown size={20} />}
                  size="lg"
                  variant="default"
                >
                  {landing.Hero.LearnMore}
                </ButtonLink>
              </Flex>
            </Stack>

            <div className="w-full min-w-0">
              <div
                className="border-line shadow-hero lg:shadow-hero-lg w-full overflow-hidden rounded-xl border lg:rounded-2xl"
                style={{ lineHeight: 0 }}
              >
                <Image
                  alt={HERO_DASHBOARD_ALT}
                  className="h-auto w-full object-contain object-top-left"
                  component={NextImage}
                  fetchPriority="high"
                  height={HERO_DASHBOARD_HEIGHT}
                  quality={92}
                  sizes="(max-width: 992px) 100vw, 50vw"
                  src="/images/hero-app-dashboard.png"
                  width={HERO_DASHBOARD_WIDTH}
                />
              </div>
            </div>
          </div>
        </Container>
      </Box>
    </>
  );
}
