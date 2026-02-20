"use client";

import { Box, Flex, Group, Paper, ActionIcon, Drawer, Stack, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandGithub, IconTopologyStar, IconX } from "@tabler/icons-react";
import { AnchorLink, ButtonLink } from "@bondery/mantine-next";
import { Logo } from "@/components/Logo";
import { SOCIAL_LINKS } from "@bondery/helpers";
import { WEBAPP_URL } from "@/lib/config";


const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
];

type HeaderClientProps = {
  initialStars: number;
};

export function HeaderClient({ initialStars }: HeaderClientProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);

  return (
    <Box component="header" className="sticky top-6 z-50 ">
      <Paper maw={1440} mx={{ base: "xs", md: "xl" }} shadow="md" py={"md"} px={"xs"}>
        <Flex align="center" px="md" visibleFrom="sm">
          <Box style={{ flex: 1 }}>
            <Logo size={32} />
          </Box>

          <Group
            component="nav"
            aria-label="Primary navigation"
            gap="xl"
            style={{ flex: "0 0 auto" }}
          >
            {navLinks.map((link) => (
              <AnchorLink key={link.label} href={link.href} c="var(--mantine-color-default-color)">
                {link.label}
              </AnchorLink>
            ))}
          </Group>

          <Flex align="center" gap="md" justify="flex-end" style={{ flex: 1 }}>
            <ButtonLink
              href={SOCIAL_LINKS.github}
              target="_blank"
              variant="default"
              leftSection={<IconBrandGithub size={20} />}
            >
              {initialStars.toLocaleString()}
            </ButtonLink>

            <ButtonLink
              href={`${WEBAPP_URL}/login`}
              size="md"
              leftSection={<IconTopologyStar size={20} />}
            >
              Go to app
            </ButtonLink>
          </Flex>
        </Flex>

        <Flex justify="space-between" align="center" px="md" hiddenFrom="sm">
          <Logo size={32} />
          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            aria-label={drawerOpened ? "Close navigation menu" : "Open navigation menu"}
          />
        </Flex>
      </Paper>

      <Drawer.Root
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        hiddenFrom="sm"
        size="xs"
      >
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Navigation</Drawer.Title>
            <ActionIcon
              variant="default"
              size="xl"
              aria-label="Close menu"
              onClick={closeDrawer}
              mt={"md"}
            >
              <IconX size={24} />
            </ActionIcon>
          </Drawer.Header>
          <Drawer.Body>
            <Flex component="nav" aria-label="Mobile navigation" direction="column" gap="lg">
              {navLinks.map((link) => (
                <AnchorLink
                  key={link.label}
                  href={link.href}
                  c="var(--mantine-color-default-color)"
                  size="lg"
                  onClick={closeDrawer}
                >
                  {link.label}
                </AnchorLink>
              ))}

              <Stack gap="xs">
                <ButtonLink
                  href={SOCIAL_LINKS.github}
                  target="_blank"
                  variant="default"
                  leftSection={<IconBrandGithub size={20} />}
                  fullWidth
                >
                  {initialStars.toLocaleString()}
                </ButtonLink>

                <ButtonLink
                  href={`${WEBAPP_URL}/login`}
                  size="md"
                  leftSection={<IconTopologyStar size={20} />}
                  fullWidth
                >
                  Go to app
                </ButtonLink>
              </Stack>
            </Flex>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </Box>
  );
}
