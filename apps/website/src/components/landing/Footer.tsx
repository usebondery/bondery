"use client";

import { Anchor, Box, Divider, Flex, Paper, Text, Title } from "@mantine/core";
import { IconBrandGithubFilled, IconBrandLinkedinFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { SOCIAL_LINKS } from "@/lib/config";
import { WEBSITE_ROUTES } from "@bondery/helpers";

type LinkItem = {
  title: ReactNode;
  href: string;
  target?: string;
};

type LinkGroupItem = {
  title: string;
  links: LinkItem[];
};

const LinkGroup = ({ title, links }: LinkGroupItem) => (
  <Box>
    <Title fw="bold" mb="xs" order={3}>
      {title}
    </Title>
    {links.map((link) => (
      <Anchor
        c="dimmed"
        target={link.target}
        display="block"
        fz="sm"
        href={link.href}
        key={link.href}
        py={4}
      >
        {link.title}
      </Anchor>
    ))}
  </Box>
);

export function Footer() {
  return (
    <Box component="footer" my={"xl"}>
      <Paper
        maw={1440}
        mx={{ base: "xs", md: "xl" }}
        shadow="md"
        radius="md"
        withBorder
        p={"xl"}
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        }}
      >
        <Flex gap={{ base: "lg" }} mb="xl" wrap="wrap" px="md">
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              title="About app"
              links={[
                { title: "Features", href: "#features" },
                { title: "Pricing", href: "#pricing" },
              ]}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              title="About us"
              links={[
                { title: "Contact us", href: WEBSITE_ROUTES.CONTACT },
                { title: "Privacy Policy", href: WEBSITE_ROUTES.PRIVACY },
                { title: "Terms of Service", href: WEBSITE_ROUTES.TERMS },
              ]}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              title="Connect with us"
              links={[
                {
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandGithubFilled size={16} /> GitHub
                    </Flex>
                  ),
                  href: SOCIAL_LINKS.github,
                  target: "_blank",
                },
                {
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandLinkedinFilled size={16} /> LinkedIn
                    </Flex>
                  ),
                  href: SOCIAL_LINKS.linkedin,
                  target: "_blank",
                },
              ]}
            />
          </Box>
        </Flex>
        <Divider my="xl" />
        <Flex
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          px="md"
          direction={{ base: "column", md: "row" }}
          gap={{ base: "md" }}
        >
          <Logo iconSize={28} textSize="md" />
          <Text size="xs" c="dimmed" ta="right">
            Made with 💜 for meaningful connections
          </Text>
        </Flex>
      </Paper>
    </Box>
  );
}
