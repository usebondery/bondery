import { SOCIAL_LINKS, WEBSITE_ROUTES } from "@bondery/helpers";
import { AnchorLink, type AppHref, hrefAssert } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
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
import { siteFrameProps } from "@/components/site-shell";
import { routeAssert } from "@/lib/navigation/route/assert";
import { LANDING_SECTION_IDS } from "./sectionIds";

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

function LinkGroup({ title, links }: LinkGroupItem) {
  return (
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
}

/** Network names are brand names. They are not translated. */
const NETWORK_NAMES = {
  discord: "Discord",
  github: "GitHub",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  x: "X",
} as const;

export function Footer() {
  return (
    <Box component="footer" my="xl">
      <Paper
        {...siteFrameProps}
        p="xl"
        radius="md"
        shadow="md"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        }}
        withBorder
      >
        <Flex gap={{ base: "lg" }} mb="xl" px="md" wrap="wrap">
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                {
                  href: `/#${LANDING_SECTION_IDS.features}`,
                  key: "features",
                  title: landing.Footer.Links.Features,
                },
                {
                  href: `/#${LANDING_SECTION_IDS.pricing}`,
                  key: "pricing",
                  title: landing.Footer.Links.Pricing,
                },
                {
                  href: routeAssert(WEBSITE_ROUTES.DOCS),
                  key: "docs",
                  title: landing.Footer.Links.Docs,
                },
                {
                  href: hrefAssert("/roadmap"),
                  key: "roadmap",
                  target: "_blank",
                  title: landing.Footer.Links.Roadmap,
                },
              ]}
              title={landing.Footer.Groups.Product}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                { href: WEBSITE_ROUTES.BLOG, key: "blog", title: landing.Footer.Links.Blog },
                {
                  href: WEBSITE_ROUTES.CONTACT,
                  key: "contact",
                  title: landing.Footer.Links.Contact,
                },
                {
                  href: hrefAssert("/status"),
                  key: "status",
                  target: "_blank",
                  title: landing.Footer.Links.Status,
                },
              ]}
              title={landing.Footer.Groups.Company}
            />
          </Box>
          <Box style={{ minWidth: "200px" }}>
            <LinkGroup
              links={[
                {
                  href: WEBSITE_ROUTES.PRIVACY,
                  key: "privacy",
                  title: landing.Footer.Links.Privacy,
                },
                { href: WEBSITE_ROUTES.TERMS, key: "terms", title: landing.Footer.Links.Terms },
                {
                  href: WEBSITE_ROUTES.SECURITY,
                  key: "security",
                  title: landing.Footer.Links.Security,
                },
              ]}
              title={landing.Footer.Groups.Legal}
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
                      <IconBrandDiscordFilled size={16} /> {NETWORK_NAMES.discord}
                    </Flex>
                  ),
                },

                {
                  href: SOCIAL_LINKS.reddit,
                  key: "reddit",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandReddit size={16} /> {NETWORK_NAMES.reddit}
                    </Flex>
                  ),
                },
                {
                  href: SOCIAL_LINKS.x,
                  key: "x",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandX size={16} /> {NETWORK_NAMES.x}
                    </Flex>
                  ),
                },
                {
                  href: SOCIAL_LINKS.linkedin,
                  key: "linkedin",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandLinkedinFilled size={16} /> {NETWORK_NAMES.linkedin}
                    </Flex>
                  ),
                },
                {
                  href: SOCIAL_LINKS.github,
                  key: "github",
                  target: "_blank",
                  title: (
                    <Flex align="center" gap={4}>
                      <IconBrandGithubFilled size={16} /> {NETWORK_NAMES.github}
                    </Flex>
                  ),
                },
              ]}
              title={landing.Footer.Groups.Connect}
            />
          </Box>
        </Flex>
        <Divider my="xl" />
        <Flex justify="center" px="md">
          <Logo iconSize={28} textSize="md" />
        </Flex>
      </Paper>
    </Box>
  );
}
