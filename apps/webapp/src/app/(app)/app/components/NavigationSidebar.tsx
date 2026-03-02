"use client";

import { Group, Stack, Box } from "@mantine/core";
import {
  IconHome,
  IconSettings,
  IconUsers,
  IconUsersGroup,
  IconMap2,
  IconMessageCircle,
  IconTimelineEventText,
  IconArrowMerge,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinkItem } from "./NavLinkItem";
import { AnchorLink, UserCard } from "@bondery/mantine-next";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding-src";

interface NavigationSidebarContentProps {
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  hasActiveMergeRecommendations: boolean;
}

const primaryLinks = [
  { href: WEBAPP_ROUTES.HOME, label: "Home", icon: IconHome },
  { href: WEBAPP_ROUTES.TIMELINE, label: "Timeline", icon: IconTimelineEventText },
  { href: WEBAPP_ROUTES.PEOPLE, label: "People", icon: IconUsers },
  { href: WEBAPP_ROUTES.GROUPS, label: "Groups", icon: IconUsersGroup },
  { href: WEBAPP_ROUTES.MAP, label: "Map", icon: IconMap2 },
];

const secondaryLinks = [
  { href: WEBAPP_ROUTES.FEEDBACK, label: "Feedback", icon: IconMessageCircle },
  { href: "/app/fix", label: "Fix & merge", icon: IconArrowMerge },
  { href: WEBAPP_ROUTES.SETTINGS, label: "Settings", icon: IconSettings },
];

export function NavigationSidebarContent({
  userName,
  userEmail,
  avatarUrl,
  hasActiveMergeRecommendations,
}: NavigationSidebarContentProps) {
  const pathname = usePathname();

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Group mb="md">
        <AnchorLink href={WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN} underline="never">
          <Box darkHidden>
            <BonderyLogotypeBlack width={140} height={36} />
          </Box>
          <Box lightHidden>
            <BonderyLogotypeWhite width={140} height={36} />
          </Box>
        </AnchorLink>
      </Group>

      <Stack gap="xs">
        {primaryLinks.map((link, index) => (
          <NavLinkItem key={`${link.href}-${index}`} {...link} active={pathname === link.href} />
        ))}
      </Stack>

      <Stack gap="xs" mt="auto">
        {secondaryLinks.map((link, index) => (
          <NavLinkItem
            key={`${link.href}-${index}`}
            {...link}
            active={pathname === link.href}
            showIndicator={link.href === "/app/fix" && hasActiveMergeRecommendations}
          />
        ))}
      </Stack>

      <Box mt="md">
        <Box
          component={Link}
          href={WEBAPP_ROUTES.SETTINGS}
          style={{ color: "inherit", textDecoration: "none", display: "block" }}
        >
          <UserCard name={userName} subtitle={userEmail} avatarUrl={avatarUrl} />
        </Box>
      </Box>
    </Box>
  );
}
