"use client";

import {
  ActionIcon,
  AppShell,
  AppShellMain,
  AppShellNavbar,
  Group,
  Kbd,
  Text,
  Tooltip,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState } from "react";
import { IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { NavigationSidebarContent } from "./NavigationSidebar";
import { HOTKEYS } from "@/lib/config";
import { CommandPalette } from "./CommandPalette";
import { PeopleSearchSpotlight } from "./PeopleSearchSpotlight";

export const SIDEBAR_COOKIE_NAME = "bondery-sidebar-collapsed";

interface AppShellWrapperProps {
  children: React.ReactNode;
  userName: string;
  avatarUrl: string | null;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  initialCollapsed: boolean;
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
  const t = useTranslations("AppNavigation");

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  }

  useHotkeys([[HOTKEYS.SIDEBAR_TOGGLE, handleToggle]]);

  return (
    <>
      <AppShell
        padding="md"
        navbar={{
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
          breakpoint: "sm",
          collapsed: { mobile: true },
        }}
        transitionDuration={250}
        transitionTimingFunction="ease"
      >
        <AppShellNavbar p="md" style={{ overflow: "hidden" }}>
          <NavigationSidebarContent
            userName={userName}
            avatarUrl={avatarUrl}
            hasActiveMergeRecommendations={hasActiveMergeRecommendations}
            hasOverdueKeepInTouch={hasOverdueKeepInTouch}
            collapsed={collapsed}
          />
        </AppShellNavbar>{" "}
        <AppShellMain>{children}</AppShellMain>
      </AppShell>

      {/* Floating collapse toggle — centered on sidebar right edge, hidden on mobile */}
      <Tooltip
        label={
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" inherit>
              {collapsed ? t("ExpandSidebar") : t("CollapseSidebar")}
            </Text>
            <Kbd size="xs">Ctrl+B</Kbd>
          </Group>
        }
        position="right"
        withArrow
      >
        <ActionIcon
          visibleFrom="sm"
          radius="xl"
          size={"lg"}
          variant="default"
          onClick={handleToggle}
          aria-label={collapsed ? t("ExpandSidebar") : t("CollapseSidebar")}
          style={{
            position: "fixed",
            left: collapsed
              ? "var(--sidebar-collapsed-width)"
              : "var(--sidebar-expanded-width)",
            top: "calc(var(--mantine-spacing-md) + 18px)",
            translate: "-50% -50%",
            zIndex: 150,
          }}
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
    </>
  );
}
