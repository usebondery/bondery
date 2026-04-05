"use client";

import { Avatar, Box, Group, Kbd, Stack, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  IconSearch,
  IconHome,
  IconSettings,
  IconUser,
  IconUsersGroup,
  IconMap2,
  IconTimelineEventText,
  IconArrowMerge,
  IconHeartHandshake,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinkItem } from "./NavLinkItem";
import { spotlight } from "./CommandPalette";
import { AnchorLink } from "@bondery/mantine-next";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  BonderyLogotypeBlack,
  BonderyLogotypeWhite,
  BonderyIcon,
  BonderyIconWhite,
} from "@bondery/branding-src";

interface NavigationSidebarContentProps {
  userName: string;
  avatarUrl: string | null;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  collapsed: boolean;
}

export const primaryLinks = [
  { href: WEBAPP_ROUTES.HOME, label: "Home", icon: IconHome },
  { href: WEBAPP_ROUTES.INTERACTIONS, label: "Interactions", icon: IconTimelineEventText },
  { href: WEBAPP_ROUTES.PEOPLE, label: "People", icon: IconUser },
  { href: WEBAPP_ROUTES.KEEP_IN_TOUCH, label: "Keep in touch", icon: IconHeartHandshake },
  { href: WEBAPP_ROUTES.GROUPS, label: "Groups", icon: IconUsersGroup },
  { href: WEBAPP_ROUTES.MAP, label: "Map", icon: IconMap2 },
];

export const secondaryLinks = [
  { href: WEBAPP_ROUTES.FIX_CONTACTS, label: "Fix & merge", icon: IconArrowMerge },
  { href: WEBAPP_ROUTES.SETTINGS, label: "Settings", icon: IconSettings },
];

export function NavigationSidebarContent({
  userName,
  avatarUrl,
  hasActiveMergeRecommendations,
  hasOverdueKeepInTouch,
  collapsed,
}: NavigationSidebarContentProps) {
  const pathname = usePathname();
  const isMyselfActive = pathname === WEBAPP_ROUTES.MYSELF;
  const { hovered: userCardHovered, ref: userCardRef } = useHover<HTMLAnchorElement>();

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Group mb="md" justify={collapsed ? "center" : "flex-start"}>
        <AnchorLink href={WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN} underline="never">
          {collapsed ? (
            <>
              <Box darkHidden>
                <BonderyIcon width={36} height={36} />
              </Box>
              <Box lightHidden>
                <BonderyIconWhite width={36} height={36} />
              </Box>
            </>
          ) : (
            <>
              <Box darkHidden>
                <BonderyLogotypeBlack width={140} height={36} />
              </Box>
              <Box lightHidden>
                <BonderyLogotypeWhite width={140} height={36} />
              </Box>
            </>
          )}
        </AnchorLink>
      </Group>

      {/* Search / command palette trigger */}
      <Box mb="xs">
        <NavLinkItem
          label="Search..."
          icon={IconSearch}
          onClick={() => spotlight.open()}
          bordered
          dimLabel
          collapsed={collapsed}
          rightSection={
            <Group gap={4} wrap="nowrap">
              <Kbd size="xs">Ctrl</Kbd>
              <Kbd size="xs">K</Kbd>
            </Group>
          }
        />
      </Box>

      {/* Primary navigation links */}
      <Stack gap="xs">
        {primaryLinks.map((link) => (
          <NavLinkItem
            key={link.href}
            {...link}
            active={pathname === link.href}
            showIndicator={link.href === WEBAPP_ROUTES.KEEP_IN_TOUCH && hasOverdueKeepInTouch}
            collapsed={collapsed}
          />
        ))}
      </Stack>

      {/* Secondary navigation links */}
      <Stack gap="xs" mt="auto" mb="xs">
        {secondaryLinks.map((link) => (
          <NavLinkItem
            key={link.href}
            {...link}
            active={pathname === link.href}
            showIndicator={
              link.href === WEBAPP_ROUTES.FIX_CONTACTS && hasActiveMergeRecommendations
            }
            collapsed={collapsed}
          />
        ))}
      </Stack>

      {/* User card */}
      <Box mb="xs">
        <Tooltip label={`Ahoy, ${userName}! 😎`} position="right" withArrow disabled={!collapsed}>
          <Group
            ref={userCardRef}
            component={Link as any}
            {...({ href: WEBAPP_ROUTES.MYSELF } as any)}
            wrap="nowrap"
            gap="sm"
            justify={collapsed ? "center" : "flex-start"}
            p="xs"
            aria-current={isMyselfActive ? "page" : undefined}
            style={{
              width: "100%",
              borderRadius: "var(--mantine-radius-sm)",
              transition: "background-color var(--transition-time) var(--transition-ease)",
              backgroundColor: isMyselfActive
                ? "var(--mantine-primary-color-filled)"
                : userCardHovered
                  ? "var(--mantine-primary-color-light-hover)"
                  : "transparent",
              color: isMyselfActive ? "white" : "inherit",
              textDecoration: "none",
            }}
          >
            <Avatar src={avatarUrl ?? undefined} radius="xl" size="sm" name={userName} />
            {!collapsed && (
              <Text
                size="sm"
                fw={500}
                style={{
                  lineHeight: 1.2,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {userName}
              </Text>
            )}
          </Group>
        </Tooltip>
      </Box>
    </Box>
  );
}
