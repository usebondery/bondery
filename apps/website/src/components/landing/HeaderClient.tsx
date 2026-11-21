"use client";

import { SOCIAL_LINKS, WEBSITE_ROUTES } from "@bondery/helpers";
import {
  ActionIconButton,
  AnchorLink,
  type AppHref,
  ButtonLink,
  hrefAssert,
} from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Box, Burger, Drawer, Flex, Group, Paper, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandGithub, IconTopologyStar, IconX } from "@tabler/icons-react";
import { Logo } from "@/components/Logo";
import { siteFrameProps } from "@/components/site-shell";
import { routeAssert } from "@/lib/navigation/route/assert";

const navLinks: { href: AppHref; label: string }[] = [
  { href: "/#features", label: landing.Header.Nav.Features },
  { href: "/#pricing", label: landing.Header.Nav.Pricing },
  { href: WEBSITE_ROUTES.BLOG, label: landing.Header.Nav.Blog },
  { href: routeAssert(WEBSITE_ROUTES.DOCS), label: landing.Header.Nav.Docs },
];
type HeaderClientProps = {
  initialStars: number;
  webappUrl: string;
};

export function HeaderClient({ initialStars, webappUrl }: HeaderClientProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const loginHref = hrefAssert(`${webappUrl}/login`);

  return (
    <Box className="sticky top-6 z-50" component="header">
      <Paper {...siteFrameProps} px="xs" py="md" radius={9999} shadow="md">
        <Flex align="center" px="md" visibleFrom="sm">
          <Box style={{ flex: 1 }}>
            <Logo size={32} />
          </Box>

          <Group
            aria-label={landing.Header.Aria.PrimaryNavigation}
            component="nav"
            gap="xl"
            style={{ flex: "0 0 auto" }}
          >
            {navLinks.map((link) => (
              <AnchorLink c="var(--mantine-color-default-color)" href={link.href} key={link.label}>
                {link.label}
              </AnchorLink>
            ))}
          </Group>

          <Flex align="center" gap="md" justify="flex-end" style={{ flex: 1 }}>
            <ButtonLink
              href={SOCIAL_LINKS.github}
              leftSection={<IconBrandGithub size={20} />}
              target="_blank"
              variant="default"
            >
              {initialStars.toLocaleString()}
            </ButtonLink>

            <ButtonLink
              href={loginHref}
              leftSection={<IconTopologyStar size={20} />}
              radius="xl"
              size="md"
            >
              {landing.Header.LoginOrSignUp}
            </ButtonLink>
          </Flex>
        </Flex>

        <Flex align="center" hiddenFrom="sm" justify="space-between" px="md">
          <Logo size={32} />
          <Burger
            aria-label={
              drawerOpened
                ? landing.Header.Aria.CloseNavigationMenu
                : landing.Header.Aria.OpenNavigationMenu
            }
            onClick={toggleDrawer}
            opened={drawerOpened}
          />
        </Flex>
      </Paper>

      <Drawer.Root
        hiddenFrom="sm"
        onClose={closeDrawer}
        opened={drawerOpened}
        position="right"
        size="xs"
      >
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{landing.Header.NavigationTitle}</Drawer.Title>
            <ActionIconButton
              aria-label={landing.Header.Aria.CloseMenu}
              icon={<IconX />}
              mt="md"
              onClick={closeDrawer}
              size="xl"
              variant="default"
            />
          </Drawer.Header>
          <Drawer.Body>
            <Flex
              aria-label={landing.Header.Aria.MobileNavigation}
              component="nav"
              direction="column"
              gap="lg"
            >
              {navLinks.map((link) => (
                <AnchorLink
                  c="var(--mantine-color-default-color)"
                  href={link.href}
                  key={link.label}
                  onClick={closeDrawer}
                  size="lg"
                >
                  {link.label}
                </AnchorLink>
              ))}

              <Stack gap="xs">
                <ButtonLink
                  fullWidth
                  href={SOCIAL_LINKS.github}
                  leftSection={<IconBrandGithub size={20} />}
                  target="_blank"
                  variant="default"
                >
                  {initialStars.toLocaleString()}
                </ButtonLink>

                <ButtonLink
                  fullWidth
                  href={loginHref}
                  leftSection={<IconTopologyStar size={20} />}
                  size="md"
                >
                  {landing.Header.LoginOrSignUp}
                </ButtonLink>
              </Stack>
            </Flex>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </Box>
  );
}
