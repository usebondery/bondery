"use client";

import {
  BonderyIcon,
  BonderyIconWhite,
  BonderyLogotypeBlack,
  BonderyLogotypeWhite,
} from "@bondery/branding/react";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { AnchorLink, Kbd, parseShortcutKeys } from "@bondery/mantine-next";
import { Avatar, Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  type Icon,
  IconArrowMerge,
  IconHeartHandshake,
  IconHome,
  IconMap2,
  IconMessageChatbot,
  IconSearch,
  IconSettings,
  IconTimelineEventText,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppNavigationTranslations } from "@/lib/i18n/generated/hooks";
import {
  type AppNavLabelKey,
  type AppNavLinkDef,
  primaryAppNavLinks,
  secondaryAppNavLinks,
} from "@/lib/navigation/appNavLinks";
import { HOTKEYS } from "@/lib/platform/config";
import { spotlight } from "./CommandPalette";
import { NavLinkItem } from "./NavLinkItem";

const navIcons: Record<AppNavLabelKey, Icon> = {
  Chat: IconMessageChatbot,
  FixAndMerge: IconArrowMerge,
  Groups: IconUsersGroup,
  Home: IconHome,
  Interactions: IconTimelineEventText,
  KeepInTouch: IconHeartHandshake,
  Map: IconMap2,
  People: IconUser,
  Settings: IconSettings,
};

type NavigationLinkDef = AppNavLinkDef & { icon: Icon };

function withIcons(links: AppNavLinkDef[]): NavigationLinkDef[] {
  return links.map((link) => ({ ...link, icon: navIcons[link.labelKey] }));
}

export const primaryLinkDefs = withIcons(primaryAppNavLinks);
export const secondaryLinkDefs = withIcons(secondaryAppNavLinks);

export type ResolvedNavigationLink = NavigationLinkDef & { label: string };

export function useAppNavigationLinks(): {
  primaryLinks: ResolvedNavigationLink[];
  secondaryLinks: ResolvedNavigationLink[];
} {
  const t = useAppNavigationTranslations();

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
  avatarUrl: string | null;
  collapsed: boolean;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  userName: string;
}

export function NavigationSidebarContent({
  userName,
  avatarUrl,
  hasActiveMergeRecommendations,
  hasOverdueKeepInTouch,
  collapsed,
}: NavigationSidebarContentProps) {
  const pathname = usePathname();
  const t = useAppNavigationTranslations();
  const { primaryLinks, secondaryLinks } = useAppNavigationLinks();
  const isMyselfActive = pathname === WEBAPP_ROUTES.MYSELF;
  const { hovered: userCardHovered, ref: userCardRef } = useHover<HTMLDivElement>();

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Group justify={collapsed ? "center" : "flex-start"} mb="md">
        <AnchorLink href={WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN} underline="never">
          {collapsed ? (
            <>
              <Box darkHidden>
                <BonderyIcon height={36} width={36} />
              </Box>
              <Box lightHidden>
                <BonderyIconWhite height={36} width={36} />
              </Box>
            </>
          ) : (
            <>
              <Box darkHidden>
                <BonderyLogotypeBlack height={36} width={140} />
              </Box>
              <Box lightHidden>
                <BonderyLogotypeWhite height={36} width={140} />
              </Box>
            </>
          )}
        </AnchorLink>
      </Group>

      {/* Search / command palette trigger */}
      <Box mb="xs">
        <NavLinkItem
          bordered
          collapsed={collapsed}
          dimLabel
          icon={IconSearch}
          label={t("Search")}
          onClick={() => spotlight.open()}
          rightSection={<Kbd keys={parseShortcutKeys(HOTKEYS.COMMAND_PALETTE)} size="xs" />}
        />
      </Box>

      {/* Primary navigation links */}
      <Stack gap="xs">
        {primaryLinks.map((link) => (
          <NavLinkItem
            active={pathname === link.href}
            collapsed={collapsed}
            href={link.href}
            icon={link.icon}
            key={link.href}
            label={link.label}
            showIndicator={link.href === WEBAPP_ROUTES.KEEP_IN_TOUCH && hasOverdueKeepInTouch}
          />
        ))}
      </Stack>

      {/* Secondary navigation links */}
      <Stack gap="xs" mb="xs" mt="auto">
        {secondaryLinks.map((link) => (
          <NavLinkItem
            active={pathname === link.href}
            collapsed={collapsed}
            href={link.href}
            icon={link.icon}
            key={link.href}
            label={link.label}
            showIndicator={
              link.href === WEBAPP_ROUTES.FIX_CONTACTS && hasActiveMergeRecommendations
            }
          />
        ))}
      </Stack>

      {/* User card — mirrors NavLinkItem structure exactly: same ITEM_PADDING,
          same justify=flex-start, Avatar replaces the icon. */}
      <Box mb="xs">
        <Tooltip
          disabled={!collapsed}
          label={t("MyselfGreeting", { name: userName })}
          position="right"
          withArrow
        >
          <Group
            aria-current={isMyselfActive ? "page" : undefined}
            // Same reasoning as NavLinkItem: active state = background color only.
            // button-scale-effect-active would apply brightness(0.9) permanently.
            className="button-scale-effect"
            gap="sm"
            justify="flex-start"
            ref={userCardRef}
            renderRoot={(props) => <Link href={WEBAPP_ROUTES.MYSELF} {...props} />}
            style={{
              // No inline transition — the button-scale-effect CSS class already
              // defines transition for transform, filter, AND background-color.
              // An inline override here would cause transform/filter to snap
              // instantly (no animation) because inline styles beat CSS classes.
              backgroundColor: isMyselfActive
                ? "var(--mantine-primary-color-filled)"
                : userCardHovered
                  ? "var(--mantine-primary-color-light-hover)"
                  : "transparent",
              borderRadius: "var(--mantine-radius-sm)",
              color: isMyselfActive ? "white" : "inherit",
              paddingBottom: "var(--mantine-spacing-xs)",
              paddingLeft: "var(--sidebar-icon-pl)",
              paddingRight: "var(--sidebar-icon-pl)",
              paddingTop: "var(--mantine-spacing-xs)",
              textDecoration: "none",
              width: "100%",
            }}
            wrap="nowrap"
          >
            {/* Icon-slot wrapper: same 20px width as every NavLinkItem icon so the
                avatar is visually centred in collapsed state and column-aligned
                in expanded state. The avatar (sm = 26px) visually overflows
                by 3px per side, which is fine for a round avatar. */}
            <Box
              style={{
                alignItems: "center",
                display: "flex",
                flexShrink: 0,
                justifyContent: "center",
                overflow: "visible",
                width: "var(--sidebar-nav-icon-size)",
              }}
            >
              <Avatar name={userName} radius="xl" size="sm" src={avatarUrl ?? undefined} />
            </Box>
            {!collapsed && (
              <Text
                c={isMyselfActive ? "white" : undefined}
                fw={500}
                size="sm"
                style={{
                  flex: 1,
                  lineHeight: 1.2,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
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
