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
  IconMessageChatbot,
  type Icon,
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
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

type NavigationLinkDef = {
  href: string;
  labelKey: string;
  icon: Icon;
};

export const primaryLinkDefs: NavigationLinkDef[] = [
  { href: WEBAPP_ROUTES.HOME, labelKey: "Home", icon: IconHome },
  {
    href: WEBAPP_ROUTES.INTERACTIONS,
    labelKey: "Interactions",
    icon: IconTimelineEventText,
  },
  { href: WEBAPP_ROUTES.PEOPLE, labelKey: "People", icon: IconUser },
  {
    href: WEBAPP_ROUTES.KEEP_IN_TOUCH,
    labelKey: "KeepInTouch",
    icon: IconHeartHandshake,
  },
  { href: WEBAPP_ROUTES.GROUPS, labelKey: "Groups", icon: IconUsersGroup },
  { href: WEBAPP_ROUTES.MAP, labelKey: "Map", icon: IconMap2 },
  { href: WEBAPP_ROUTES.CHAT, labelKey: "Chat", icon: IconMessageChatbot },
];

export const secondaryLinkDefs: NavigationLinkDef[] = [
  {
    href: WEBAPP_ROUTES.FIX_CONTACTS,
    labelKey: "FixAndMerge",
    icon: IconArrowMerge,
  },
  { href: WEBAPP_ROUTES.SETTINGS, labelKey: "Settings", icon: IconSettings },
];

export type ResolvedNavigationLink = NavigationLinkDef & { label: string };

export function useAppNavigationLinks(): {
  primaryLinks: ResolvedNavigationLink[];
  secondaryLinks: ResolvedNavigationLink[];
} {
  const t = useTranslations("AppNavigation");

  const resolve = (defs: NavigationLinkDef[]): ResolvedNavigationLink[] =>
    defs.map((link) => ({
      ...link,
      label: t(link.labelKey),
    }));

  return {
    primaryLinks: resolve(primaryLinkDefs),
    secondaryLinks: resolve(secondaryLinkDefs),
  };
}

interface NavigationSidebarContentProps {
  userName: string;
  avatarUrl: string | null;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  collapsed: boolean;
}

export function NavigationSidebarContent({
  userName,
  avatarUrl,
  hasActiveMergeRecommendations,
  hasOverdueKeepInTouch,
  collapsed,
}: NavigationSidebarContentProps) {
  const pathname = usePathname();
  const t = useTranslations("AppNavigation");
  const { primaryLinks, secondaryLinks } = useAppNavigationLinks();
  const isMyselfActive = pathname === WEBAPP_ROUTES.MYSELF;
  const { hovered: userCardHovered, ref: userCardRef } =
    useHover<HTMLAnchorElement>();

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Group mb="md" justify={collapsed ? "center" : "flex-start"}>
        <AnchorLink
          href={WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN}
          underline="never"
        >
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
          label={t("Search")}
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
            showIndicator={
              link.href === WEBAPP_ROUTES.KEEP_IN_TOUCH && hasOverdueKeepInTouch
            }
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
              link.href === WEBAPP_ROUTES.FIX_CONTACTS &&
              hasActiveMergeRecommendations
            }
            collapsed={collapsed}
          />
        ))}
      </Stack>

      {/* User card — mirrors NavLinkItem structure exactly: same ITEM_PADDING,
          same justify=flex-start, Avatar replaces the icon. */}
      <Box mb="xs">
        <Tooltip
          label={t("MyselfGreeting", { name: userName })}
          position="right"
          withArrow
          disabled={!collapsed}
        >
          <Group
            ref={userCardRef}
            component={Link as any}
            {...({ href: WEBAPP_ROUTES.MYSELF } as any)}
            // Same reasoning as NavLinkItem: active state = background color only.
            // button-scale-effect-active would apply brightness(0.9) permanently.
            className="button-scale-effect"
            wrap="nowrap"
            gap="sm"
            justify="flex-start"
            aria-current={isMyselfActive ? "page" : undefined}
            style={{
              width: "100%",
              borderRadius: "var(--mantine-radius-sm)",
              // No inline transition — the button-scale-effect CSS class already
              // defines transition for transform, filter, AND background-color.
              // An inline override here would cause transform/filter to snap
              // instantly (no animation) because inline styles beat CSS classes.
              backgroundColor: isMyselfActive
                ? "var(--mantine-primary-color-filled)"
                : userCardHovered
                  ? "var(--mantine-primary-color-light-hover)"
                  : "transparent",
              color: isMyselfActive ? "white" : "inherit",
              textDecoration: "none",
              paddingLeft: "var(--sidebar-icon-pl)",
              paddingRight: "var(--sidebar-icon-pl)",
              paddingTop: "var(--mantine-spacing-xs)",
              paddingBottom: "var(--mantine-spacing-xs)",
            }}
          >
            {/* Icon-slot wrapper: same 20px width as every NavLinkItem icon so the
                avatar is visually centred in collapsed state and column-aligned
                in expanded state. The avatar (sm = 26px) visually overflows
                by 3px per side, which is fine for a round avatar. */}
            <Box
              style={{
                width: "var(--sidebar-nav-icon-size)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
                overflow: "visible",
              }}
            >
              <Avatar
                src={avatarUrl ?? undefined}
                radius="xl"
                size="sm"
                name={userName}
              />
            </Box>
            {!collapsed && (
              <Text
                size="sm"
                fw={500}
                c={isMyselfActive ? "white" : undefined}
                style={{
                  flex: 1,
                  minWidth: 0,
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
