import { Box, Divider, Flex, Paper, Text, Title } from "@mantine/core";
import {
  IconBrandGithubFilled,
  IconBrandLinkedinFilled,
  IconBrandReddit,
  IconBrandX,
} from "@tabler/icons-react";
import { AnchorLink } from "@bondery/mantine-next";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { HELP_DOCS_URL, SOCIAL_LINKS, WEBSITE_ROUTES } from "@bondery/helpers";

type LinkItem = {
  key: string;
  title: ReactNode;
  href?: string;
  target?: string;
};

type LinkGroupItem = {
  title: string;
  links: LinkItem[];
};

function hasHref(link: LinkItem): link is LinkItem & { href: string } {
  return typeof link.href === "string" && link.href.length > 0;
}

const LinkGroup = ({ title, links }: LinkGroupItem) => (
  <Box>
    <Title fw="bold" mb="xs" order={3}>
      {title}
    </Title>
    {links.filter(hasHref).map((link) => (
      <AnchorLink
        c="dimmed"
        target={link.target}
        display="block"
        fz="sm"
        href={link.href}
        key={link.key}
        py={4}
      >
        {link.title}
      </AnchorLink>
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
              title="Product"
              links={[
                { key: "features", title: "Features", href: "/#features" },
                { key: "pricing", title: "Pricing", href: "/#pricing" },
                { key: "help-docs", title: "Help Docs", href: HELP_DOCS_URL, target: "_blank" },
              ]}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              title="Company"
              links={[
                { key: "contact", title: "Contact us", href: WEBSITE_ROUTES.CONTACT },
                { key: "status", title: "Status", href: "/status", target: "_blank" },
              ]}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              title="Legal"
              links={[
                { key: "privacy", title: "Privacy Policy", href: WEBSITE_ROUTES.PRIVACY },
                { key: "terms", title: "Terms of Service", href: WEBSITE_ROUTES.TERMS },
              ]}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              title="Connect with us"
              links={[
                {
                  key: "github",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandGithubFilled size={16} /> GitHub
                    </Flex>
                  ),
                  href: SOCIAL_LINKS.github,
                  target: "_blank",
                },
                {
                  key: "linkedin",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandLinkedinFilled size={16} /> LinkedIn
                    </Flex>
                  ),
                  href: SOCIAL_LINKS.linkedin,
                  target: "_blank",
                },
                {
                  key: "reddit",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandReddit size={16} /> Reddit
                    </Flex>
                  ),
                  href: SOCIAL_LINKS.reddit,
                  target: "_blank",
                },
                {
                  key: "x",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandX size={16} /> X
                    </Flex>
                  ),
                  href: SOCIAL_LINKS.x,
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
