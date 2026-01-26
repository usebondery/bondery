"use client";

import {
  Anchor,
  Box,
  Button,
  Flex,
  Group,
  Paper,
  ActionIcon,
  Drawer,
  Stack,
  Burger,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandGithub, IconTopologyStar, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { SOCIAL_LINKS } from "@/lib/config";
import { GITHUB_REPO_URL, WEBSITE_ROUTES } from "@bondery/helpers";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
];

export function Header() {
  const [stars, setStars] = useState<number | null>(null);
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);

  useEffect(() => {
    fetch(GITHUB_REPO_URL)
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(() => setStars(null));
  }, []);

  return (
    <Box component="header" className="sticky top-6 z-50 ">
      <Paper maw={1440} mx={{ base: "xs", md: "xl" }} shadow="md" py={"md"} px={"xs"}>
        {/* Desktop Layout */}
        <Flex align="center" px="md" visibleFrom="sm">
          {/* Logo - Left */}
          <Box style={{ flex: 1 }}>
            <Logo size={32} />
          </Box>

          {/* Navigation Links - Center */}
          <Group gap="xl" style={{ flex: "0 0 auto" }}>
            {navLinks.map((link) => (
              <Anchor key={link.label} href={link.href} c="var(--mantine-color-default-color)">
                {link.label}
              </Anchor>
            ))}
          </Group>

          {/* Right section - Desktop */}
          <Flex align="center" gap="md" justify="flex-end" style={{ flex: 1 }}>
            {/* GitHub Stars */}
            <Button
              component={Link}
              href={SOCIAL_LINKS.github}
              target="_blank"
              variant="default"
              leftSection={<IconBrandGithub size={20} />}
              loading={stars === null}
            >
              {stars !== null ? stars.toLocaleString() : "Loading..."}
            </Button>

            {/* CTA Button */}
            <Button
              component={Link}
              href={WEBSITE_ROUTES.LOGIN}
              size="md"
              leftSection={<IconTopologyStar size={20} />}
            >
              Go to app
            </Button>
          </Flex>
        </Flex>

        {/* Mobile Layout */}
        <Flex justify="space-between" align="center" px="md" hiddenFrom="sm">
          <Logo size={32} />
          <Burger opened={drawerOpened} onClick={toggleDrawer} />
        </Flex>
      </Paper>

      {/* Mobile Drawer */}
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
            <Drawer.Title />
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
            <Flex direction="column" gap="lg">
              {/* Navigation Links */}
              {navLinks.map((link) => (
                <Anchor
                  key={link.label}
                  href={link.href}
                  c="var(--mantine-color-default-color)"
                  size="lg"
                  onClick={closeDrawer}
                >
                  {link.label}
                </Anchor>
              ))}

              {/* Buttons Stack */}
              <Stack gap="xs">
                {/* GitHub Stars */}
                <Button
                  component={Link}
                  href={SOCIAL_LINKS.github}
                  target="_blank"
                  variant="default"
                  leftSection={<IconBrandGithub size={20} />}
                  loading={stars === null}
                  fullWidth
                >
                  {stars !== null ? stars.toLocaleString() : "Loading..."}
                </Button>

                {/* CTA Button */}
                <Button
                  component={Link}
                  href={WEBSITE_ROUTES.LOGIN}
                  size="md"
                  leftSection={<IconTopologyStar size={20} />}
                  fullWidth
                >
                  Go to app
                </Button>
              </Stack>
            </Flex>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </Box>
  );
}
