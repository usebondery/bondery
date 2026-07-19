"use client";

import { SOCIAL_LINKS, WEBSITE_ROUTES } from "@bondery/helpers";
import { AnchorLink, ButtonLink } from "@bondery/mantine-next";
import { ActionIcon, Box, Burger, Drawer, Flex, Group, Paper, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandGithub, IconTopologyStar, IconX } from "@tabler/icons-react";
import { Logo } from "@/components/Logo";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: WEBSITE_ROUTES.BLOG, label: "Blog" },
  { href: WEBSITE_ROUTES.DOCS, label: "Docs" },
];

type HeaderClientProps = {
  initialStars: number;
  webappUrl: string;
};

export function HeaderClient({ initialStars, webappUrl }: HeaderClientProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const loginHref = `${webappUrl}/login`;

  return (
    <Box className="sticky top-6 z-50 " component="header">
      <Paper
        className="rounded-full!"
        maw={1440}
        mx="auto"
        px={"xs"}
        py={"md"}
        shadow="md"
        w={{
          base: "calc(100% - var(--mantine-spacing-xs) * 2)",
          md: "calc(100% - var(--mantine-spacing-xl) * 2)",
        }}
      >
        <Flex align="center" px="md" visibleFrom="sm">
          <Box style={{ flex: 1 }}>
            <Logo size={32} />
          </Box>

          <Group
            aria-label="Primary navigation"
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
              radius={"xl"}
              size="md"
            >
              Login or Sign up
            </ButtonLink>
          </Flex>
        </Flex>

        <Flex align="center" hiddenFrom="sm" justify="space-between" px="md">
          <Logo size={32} />
          <Burger
            aria-label={drawerOpened ? "Close navigation menu" : "Open navigation menu"}
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
            <Drawer.Title>Navigation</Drawer.Title>
            <ActionIcon
              aria-label="Close menu"
              mt={"md"}
              onClick={closeDrawer}
              size="xl"
              variant="default"
            >
              <IconX size={24} />
            </ActionIcon>
          </Drawer.Header>
          <Drawer.Body>
            <Flex aria-label="Mobile navigation" component="nav" direction="column" gap="lg">
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
                  Login or Sign up
                </ButtonLink>
              </Stack>
            </Flex>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </Box>
  );
}
