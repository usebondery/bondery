"use client";

import { BonderyDynamicLogotype } from "@bondery/branding/react";
import { WEBAPP_NAME, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { AnchorLink, Kbd, parseShortcutKeys } from "@bondery/mantine-next";
import { Avatar, Box, Group, SegmentedControl, Stack, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  type Icon,
  IconArrowMerge,
  IconCategory,
  IconHeartHandshake,
  IconHome,
  IconMap2,
  IconMessageCircle,
  IconSearch,
  IconSettings,
  IconTimelineEventText,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isChatRoute } from "@/lib/chat/isChatRoute";
import { readLastBrowsePath, rememberBrowsePath } from "@/lib/chat/lastBrowsePath";
import { useAppNavigationTranslations } from "@/lib/i18n/generated/hooks";
import {
  type AppNavLabelKey,
  type AppNavLinkDef,
  chatAppNavLink,
  primaryAppNavLinks,
  secondaryAppNavLinks,
} from "@/lib/navigation/appNavLinks";
import { HOTKEYS } from "@/lib/platform/config";
import { spotlight } from "./CommandPalette";
import {
  NAV_LINK_ITEM_BORDER_RADIUS,
  NavLinkItem,
  SIDEBAR_NAV_STACK_CLASSNAME,
} from "./NavLinkItem";
import { SidebarChatPanel } from "./SidebarChatPanel";

const navIcons: Record<AppNavLabelKey, Icon> = {
  Chat: IconMessageCircle,
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
export const chatLinkDef: NavigationLinkDef = {
  ...chatAppNavLink,
  icon: navIcons.Chat,
};

export type ResolvedNavigationLink = NavigationLinkDef & { label: string };

export function useAppNavigationLinks(): {
  chatLink: ResolvedNavigationLink;
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
    chatLink: { ...chatLinkDef, label: t(chatLinkDef.labelKey) },
    primaryLinks: resolve(primaryLinkDefs),
    secondaryLinks: resolve(secondaryLinkDefs),
  };
}

const SIDEBAR_MODE_BROWSE = "browse";
const SIDEBAR_MODE_CHAT = "chat";

interface NavigationSidebarContentProps {
  avatarUrl: string | null;
  collapsed: boolean;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  isMobileOverlay?: boolean;
  onExpandSidebar: () => void;
  onSearchActivate?: () => void;
  userName: string;
}

export function NavigationSidebarContent({
  userName,
  avatarUrl,
  hasActiveMergeRecommendations,
  hasOverdueKeepInTouch,
  collapsed,
  isMobileOverlay = false,
  onExpandSidebar,
  onSearchActivate,
}: NavigationSidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useAppNavigationTranslations();
  const { chatLink, primaryLinks, secondaryLinks } = useAppNavigationLinks();
  const isMyselfActive = pathname === WEBAPP_ROUTES.MYSELF;
  const [chatModePending, setChatModePending] = useState(false);
  const isChat = isChatRoute(pathname) || chatModePending;
  const sidebarScrollsWithChatList = !isMobileOverlay && !collapsed && isChat;
  const { hovered: userCardHovered, ref: userCardRef } = useHover<HTMLDivElement>();

  useEffect(() => {
    rememberBrowsePath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isChatRoute(pathname)) {
      setChatModePending(false);
    }
  }, [pathname]);

  function handleModeChange(value: string) {
    if (value === SIDEBAR_MODE_CHAT) {
      if (!isChatRoute(pathname)) {
        setChatModePending(true);
        router.push(WEBAPP_ROUTES.CHAT);
      }
      return;
    }

    setChatModePending(false);
    if (isChatRoute(pathname)) {
      router.push(readLastBrowsePath());
    }
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        // Browse/collapsed: fixed column height so `mt="auto"` footer pinning and nav `Stack` gap stay correct.
        // Expanded chat: grow with sessions; navbar scrolls (no nested ScrollArea — avoids hover scale clip).
        ...(sidebarScrollsWithChatList ? { minHeight: "100%" } : { height: "100%" }),
        ...(isMobileOverlay ? { paddingBottom: "env(safe-area-inset-bottom, 0px)" } : {}),
      }}
    >
      {/* Logo — SVG clip keeps the icon anchored when collapsing. Overlay chrome
          already has the logotype in AppShellHeader. */}
      {!isMobileOverlay && (
        <Group justify="flex-start" mb="md">
          <AnchorLink href={WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN} underline="never">
            <Box darkHidden>
              <BonderyDynamicLogotype
                height={36}
                text={collapsed ? undefined : WEBAPP_NAME}
                theme="light"
              />
            </Box>
            <Box lightHidden>
              <BonderyDynamicLogotype
                height={36}
                text={collapsed ? undefined : WEBAPP_NAME}
                theme="dark"
              />
            </Box>
          </AnchorLink>
        </Group>
      )}

      {/* Search / command palette trigger */}
      <Box mb="xs">
        <NavLinkItem
          bordered
          collapsed={collapsed}
          dimLabel
          icon={IconSearch}
          label={t("Search")}
          onClick={() => {
            if (onSearchActivate) {
              onSearchActivate();
              return;
            }
            spotlight.open();
          }}
          rightSection={
            isMobileOverlay ? undefined : (
              <Kbd keys={parseShortcutKeys(HOTKEYS.COMMAND_PALETTE)} size="xs" />
            )
          }
        />
      </Box>

      {!isMobileOverlay && !collapsed && (
        <Box mb="xs">
          <SegmentedControl
            data={[
              {
                label: (
                  <Group gap={4} justify="center" wrap="nowrap">
                    <IconCategory size={14} />
                    <span>{t("Browse")}</span>
                  </Group>
                ),
                value: SIDEBAR_MODE_BROWSE,
              },
              {
                label: (
                  <Group gap={4} justify="center" wrap="nowrap">
                    <IconMessageCircle size={14} />
                    <span>{t("ChatMode")}</span>
                  </Group>
                ),
                value: SIDEBAR_MODE_CHAT,
              },
            ]}
            fullWidth
            onChange={handleModeChange}
            size="sm"
            styles={{
              label: { overflow: "hidden" },
            }}
            value={isChat ? SIDEBAR_MODE_CHAT : SIDEBAR_MODE_BROWSE}
          />
        </Box>
      )}

      {isMobileOverlay ? (
        <Stack className={SIDEBAR_NAV_STACK_CLASSNAME}>
          <NavLinkItem
            active={isChatRoute(pathname)}
            collapsed={collapsed}
            href={chatLink.href}
            icon={chatLink.icon}
            label={chatLink.label}
          />
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
      ) : collapsed ? (
        <Stack className={SIDEBAR_NAV_STACK_CLASSNAME}>
          <NavLinkItem
            active={isChat}
            collapsed={collapsed}
            icon={chatLink.icon}
            label={chatLink.label}
            onClick={() => {
              onExpandSidebar();
              if (!isChatRoute(pathname)) {
                setChatModePending(true);
                router.push(chatLink.href);
              }
            }}
          />
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
      ) : isChat ? (
        <SidebarChatPanel />
      ) : (
        <Stack className={SIDEBAR_NAV_STACK_CLASSNAME}>
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
      )}

      {/* Secondary navigation links */}
      <Stack className={SIDEBAR_NAV_STACK_CLASSNAME} mb="xs" mt="auto" style={{ flexShrink: 0 }}>
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
              borderRadius: NAV_LINK_ITEM_BORDER_RADIUS,
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
