import { HELP_DOCS_URL, SOCIAL_LINKS, WEBSITE_ROUTES } from "@bondery/helpers";
import { AnchorLink, type AppHref, hrefAssert } from "@bondery/mantine-next";
import { Box, Divider, Flex, Paper, Title } from "@mantine/core";
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandLinkedinFilled,
  IconBrandReddit,
  IconBrandX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

type LinkItem = {
  key: string;
  title: ReactNode;
  href?: AppHref;
  target?: string;
};

type LinkGroupItem = {
  title: string;
  links: LinkItem[];
};

function hasHref(link: LinkItem): link is LinkItem & { href: AppHref } {
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
        display="block"
        fz="sm"
        href={link.href}
        key={link.key}
        py={4}
        target={link.target}
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
        mx="auto"
        p={"xl"}
        radius="md"
        shadow="md"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        }}
        w={{
          base: "calc(100% - var(--mantine-spacing-xs) * 2)",
          md: "calc(100% - var(--mantine-spacing-xl) * 2)",
        }}
        withBorder
      >
        <Flex gap={{ base: "lg" }} mb="xl" px="md" wrap="wrap">
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                { href: "/#features", key: "features", title: "Features" },
                { href: "/#pricing", key: "pricing", title: "Pricing" },
                {
                  href: hrefAssert(HELP_DOCS_URL),
                  key: "help-docs",
                  target: "_blank",
                  title: "Help Docs",
                },
                {
                  href: hrefAssert("/roadmap"),
                  key: "roadmap",
                  target: "_blank",
                  title: "Roadmap",
                },
              ]}
              title="Product"
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                { href: WEBSITE_ROUTES.BLOG, key: "blog", title: "Blog" },
                { href: WEBSITE_ROUTES.CONTACT, key: "contact", title: "Contact us" },
                { href: hrefAssert("/status"), key: "status", target: "_blank", title: "Status" },
              ]}
              title="Company"
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                { href: WEBSITE_ROUTES.PRIVACY, key: "privacy", title: "Privacy Policy" },
                { href: WEBSITE_ROUTES.TERMS, key: "terms", title: "Terms of Service" },
                { href: WEBSITE_ROUTES.SECURITY, key: "security", title: "Security" },
              ]}
              title="Legal"
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                {
                  href: SOCIAL_LINKS.discord,
                  key: "discord",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandDiscordFilled size={16} /> Discord
                    </Flex>
                  ),
                },

                {
                  href: SOCIAL_LINKS.reddit,
                  key: "reddit",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandReddit size={16} /> Reddit
                    </Flex>
                  ),
                },
                {
                  href: SOCIAL_LINKS.x,
                  key: "x",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandX size={16} /> X
                    </Flex>
                  ),
                },
                {
                  href: SOCIAL_LINKS.linkedin,
                  key: "linkedin",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandLinkedinFilled size={16} /> LinkedIn
                    </Flex>
                  ),
                },
                {
                  href: SOCIAL_LINKS.github,
                  key: "github",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandGithubFilled size={16} /> GitHub
                    </Flex>
                  ),
                },
              ]}
              title="Connect with us"
            />
          </Box>
        </Flex>
        <Divider my="xl" />
        <Flex px="md">
          <Logo iconSize={28} textSize="md" />
        </Flex>
      </Paper>
    </Box>
  );
}
