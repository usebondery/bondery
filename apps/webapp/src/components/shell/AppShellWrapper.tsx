"use client";

import { Kbd, parseShortcutKeys } from "@bondery/mantine-next";
import {
  ActionIcon,
  AppShell,
  AppShellMain,
  AppShellNavbar,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useState } from "react";
import { setClientCookie } from "@/lib/cookies/client";
import { SIDEBAR_COOKIE_NAME } from "@/lib/cookies/constants";
import { DocumentTitleProvider } from "@/lib/documentTitle";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { HOTKEYS } from "@/lib/platform/config";
import { CommandPalette } from "./CommandPalette";
import { NavigationSidebarContent } from "./NavigationSidebar";
import { PeopleSearchSpotlight } from "./PeopleSearchSpotlight";

export { SIDEBAR_COOKIE_NAME } from "@/lib/cookies/constants";

interface AppShellWrapperProps {
  avatarUrl: string | null;
  children: React.ReactNode;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  initialCollapsed: boolean;
  userName: string;
}

export const SIDEBAR_COLLAPSED_WIDTH = 80;
export const SIDEBAR_EXPANDED_WIDTH = 280;

export function AppShellWrapper({
  children,
  userName,
  avatarUrl,
  hasActiveMergeRecommendations,
  hasOverdueKeepInTouch,
  initialCollapsed,
}: AppShellWrapperProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const t = useWebTranslations("AppNavigation");

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev;
      void setClientCookie(SIDEBAR_COOKIE_NAME, String(next)).catch(() => {});
      return next;
    });
  }

  useHotkeys([[HOTKEYS.SIDEBAR_TOGGLE, handleToggle]]);

  return (
    <DocumentTitleProvider>
      <AppShell
        navbar={{
          breakpoint: "sm",
          collapsed: { mobile: true },
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        }}
        padding="md"
        transitionDuration={250}
        transitionTimingFunction="ease"
      >
        <AppShellNavbar p="md" style={{ overflow: "hidden" }}>
          <NavigationSidebarContent
            avatarUrl={avatarUrl}
            collapsed={collapsed}
            hasActiveMergeRecommendations={hasActiveMergeRecommendations}
            hasOverdueKeepInTouch={hasOverdueKeepInTouch}
            userName={userName}
          />
        </AppShellNavbar>{" "}
        <AppShellMain>{children}</AppShellMain>
      </AppShell>

      {/* Floating collapse toggle — centered on sidebar right edge, hidden on mobile */}
      <Tooltip
        label={
          <Group gap="xs" wrap="nowrap">
            <Text inherit size="xs">
              {collapsed ? t("ExpandSidebar") : t("CollapseSidebar")}
            </Text>
            <Kbd keys={parseShortcutKeys(HOTKEYS.SIDEBAR_TOGGLE)} size="xs" />
          </Group>
        }
        position="right"
        withArrow
      >
        <ActionIcon
          aria-label={collapsed ? t("ExpandSidebar") : t("CollapseSidebar")}
          onClick={handleToggle}
          radius="xl"
          size={"lg"}
          style={{
            left: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-expanded-width)",
            position: "fixed",
            top: "calc(var(--mantine-spacing-md) + 18px)",
            translate: "-50% -50%",
            zIndex: 150,
          }}
          variant="default"
          visibleFrom="sm"
        >
          {collapsed ? (
            <IconChevronsRight size={12} stroke={2} />
          ) : (
            <IconChevronsLeft size={12} stroke={2} />
          )}
        </ActionIcon>
      </Tooltip>

      <CommandPalette />
      <PeopleSearchSpotlight />
    </DocumentTitleProvider>
  );
}
