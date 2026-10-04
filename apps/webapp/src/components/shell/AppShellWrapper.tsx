"use client";

import { BonderyDynamicLogotype } from "@bondery/branding/react";
import { WEBAPP_NAME, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ActionIconButton, AnchorLink } from "@bondery/mantine-next";
import {
  AppShell,
  AppShellHeader,
  AppShellMain,
  AppShellNavbar,
  Box,
  Group,
  Overlay,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useDrag, useHotkeys, useMediaQuery } from "@mantine/hooks";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChatSessionsProvider } from "@/lib/chat/ChatSessionsContext";
import { setClientCookie } from "@/lib/cookies/client";
import {
  SIDEBAR_LAST_EXPANDED_COOKIE_NAME,
  SIDEBAR_WIDTH_COOKIE_NAME,
} from "@/lib/cookies/constants";
import { DocumentTitleProvider } from "@/lib/documentTitle";
import { useAppNavigationTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import {
  clampSidebarDragWidth,
  getAppShellNavbarWidth,
  isSidebarCollapsed,
  resolveSidebarCollapsed,
  SIDEBAR_DEFAULT_EXPANDED_WIDTH,
  snapSidebarWidth,
} from "@/lib/shell/sidebarWidth";
import { AppShellMainScrollArea } from "./AppShellMainScrollArea";
import { CommandPalette, spotlight } from "./CommandPalette";
import { NavigationSidebarContent } from "./NavigationSidebar";
import { PeopleSearchSpotlight } from "./PeopleSearchSpotlight";
import { ShellMainFooterHost, ShellMainFooterProvider } from "./ShellMainFooter";

export { SIDEBAR_COOKIE_NAME } from "@/lib/cookies/constants";
export {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_EXPANDED_WIDTH as SIDEBAR_EXPANDED_WIDTH,
} from "@/lib/shell/sidebarWidth";

const APP_SHELL_NAVBAR_ID = "app-shell-navbar";
const APP_SHELL_MENU_BUTTON_ID = "app-shell-menu-button";
/** Header chrome (~xl ActionIcon) plus iOS/PWA safe-area inset. */
const MOBILE_HEADER_HEIGHT = "calc(3.5rem + env(safe-area-inset-top, 0px))";
/** Below AppShell header (100) and navbar (101) so dimmed main stays clickable. */
const MOBILE_NAV_OVERLAY_Z_INDEX = 99;

interface AppShellWrapperProps {
  avatarUrl: string | null;
  children: React.ReactNode;
  hasActiveMergeRecommendations: boolean;
  hasOverdueKeepInTouch: boolean;
  initialLastExpandedWidth: number;
  initialWidth: number;
  userName: string;
}

function persistSidebarWidths(width: number, lastExpandedWidth: number) {
  void setClientCookie(SIDEBAR_WIDTH_COOKIE_NAME, String(width)).catch(() => {});
  void setClientCookie(SIDEBAR_LAST_EXPANDED_COOKIE_NAME, String(lastExpandedWidth)).catch(
    () => {},
  );
}

function AppShellMobileHeader({
  menuOpened,
  onLogoClick,
  onToggleMenu,
}: {
  menuOpened: boolean;
  onLogoClick: () => void;
  onToggleMenu: () => void;
}) {
  const tCommon = useCommonTranslations();

  return (
    <AppShellHeader
      hiddenFrom="sm"
      px="md"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <Group align="center" h="3.5rem" justify="space-between" wrap="nowrap">
        <AnchorLink
          display="flex"
          h="100%"
          href={WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN}
          lh={0}
          onClick={onLogoClick}
          style={{ alignItems: "center" }}
          underline="never"
        >
          <Box darkHidden>
            <BonderyDynamicLogotype height={32} text={WEBAPP_NAME} theme="light" />
          </Box>
          <Box lightHidden>
            <BonderyDynamicLogotype height={32} text={WEBAPP_NAME} theme="dark" />
          </Box>
        </AnchorLink>
        <Box
          display="flex"
          h="100%"
          id={APP_SHELL_MENU_BUTTON_ID}
          style={{ alignItems: "center", flexShrink: 0 }}
        >
          <ActionIconButton
            aria-controls={APP_SHELL_NAVBAR_ID}
            aria-expanded={menuOpened}
            aria-label={menuOpened ? tCommon("a11y.closeMenu") : tCommon("a11y.openMenu")}
            icon={menuOpened ? <IconX /> : <IconMenu2 />}
            onClick={onToggleMenu}
            size="xl"
            variant="default"
          />
        </Box>
      </Group>
    </AppShellHeader>
  );
}

export function AppShellWrapper({
  children,
  userName,
  avatarUrl,
  hasActiveMergeRecommendations,
  hasOverdueKeepInTouch,
  initialLastExpandedWidth,
  initialWidth,
}: AppShellWrapperProps) {
  const t = useAppNavigationTranslations();
  const pathname = usePathname();
  const theme = useMantineTheme();
  const isBelowSm =
    useMediaQuery(`(max-width: calc(${theme.breakpoints.sm} - 0.1px))`, false) ?? false;
  const [mobileNavOpened, { close: closeMobileNav, toggle: toggleMobileNav }] =
    useDisclosure(false);
  const pendingSpotlightRef = useRef(false);
  const wasMobileNavOpenedRef = useRef(false);
  const closeMobileNavRef = useRef(closeMobileNav);
  closeMobileNavRef.current = closeMobileNav;
  const [width, setWidth] = useState(initialWidth);
  const [resizeChromeCollapsed, setResizeChromeCollapsed] = useState<boolean | null>(null);
  const widthRef = useRef(initialWidth);
  const lastExpandedRef = useRef(initialLastExpandedWidth);
  const startWidthRef = useRef(initialWidth);
  const collapsed = resolveSidebarCollapsed(
    isBelowSm,
    resizeChromeCollapsed ?? isSidebarCollapsed(width),
  );

  const expandSidebarIfCollapsed = useCallback(() => {
    if (!isSidebarCollapsed(widthRef.current)) {
      return;
    }
    const expandedWidth = lastExpandedRef.current;
    widthRef.current = expandedWidth;
    setWidth(expandedWidth);
    persistSidebarWidths(expandedWidth, expandedWidth);
  }, []);

  const { active: isResizing, ref: resizeHandleRef } = useDrag<HTMLDivElement>(
    (state) => {
      if (state.first) {
        startWidthRef.current = widthRef.current;
        setResizeChromeCollapsed(isSidebarCollapsed(startWidthRef.current));
      }

      const proposedWidth = startWidthRef.current + state.movement[0];

      if (state.last) {
        const snapped = snapSidebarWidth({
          lastExpandedWidth: lastExpandedRef.current,
          proposedWidth,
          startWidth: startWidthRef.current,
        });
        widthRef.current = snapped.width;
        lastExpandedRef.current = snapped.lastExpandedWidth;
        setResizeChromeCollapsed(null);
        setWidth(snapped.width);
        persistSidebarWidths(snapped.width, snapped.lastExpandedWidth);
        return;
      }

      const nextWidth = clampSidebarDragWidth(proposedWidth);
      widthRef.current = nextWidth;
      setWidth(nextWidth);
    },
    { axis: "x", threshold: 3 },
  );

  useEffect(() => {
    if (!pathname) {
      return;
    }
    closeMobileNavRef.current();
  }, [pathname]);

  useEffect(() => {
    if (!isBelowSm) {
      closeMobileNavRef.current();
    }
  }, [isBelowSm]);

  useEffect(() => {
    if (wasMobileNavOpenedRef.current && !mobileNavOpened) {
      if (pendingSpotlightRef.current) {
        pendingSpotlightRef.current = false;
        spotlight.open();
      } else {
        const menuButton = document
          .getElementById(APP_SHELL_MENU_BUTTON_ID)
          ?.querySelector("button");
        menuButton?.focus();
      }
    }
    wasMobileNavOpenedRef.current = mobileNavOpened;
  }, [mobileNavOpened]);

  useEffect(() => {
    const html = document.documentElement;
    const { overflow: htmlOverflow } = html.style;
    const { overflow: bodyOverflow } = document.body.style;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  useHotkeys(isBelowSm && mobileNavOpened ? [["Escape", closeMobileNav]] : []);

  function handleOverlaySearch() {
    pendingSpotlightRef.current = true;
    closeMobileNav();
  }

  function handleNavbarAnchorClick(event: MouseEvent<HTMLElement>) {
    if (!isBelowSm) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest("a[href]")) {
      closeMobileNav();
    }
  }

  const isMobileNavOpen = isBelowSm && mobileNavOpened;

  return (
    <DocumentTitleProvider>
      <ShellMainFooterProvider>
        <ChatSessionsProvider>
          <AppShell
            h="100dvh"
            header={{ height: { base: MOBILE_HEADER_HEIGHT, sm: 0 } }}
            navbar={{
              breakpoint: "sm",
              collapsed: { mobile: !mobileNavOpened },
              width: getAppShellNavbarWidth(width),
            }}
            padding={0}
            style={{ overflow: "hidden" }}
            transitionDuration={isResizing ? 0 : 250}
            transitionTimingFunction="ease"
          >
            <AppShellMobileHeader
              menuOpened={mobileNavOpened}
              onLogoClick={closeMobileNav}
              onToggleMenu={toggleMobileNav}
            />
            <AppShellNavbar
              id={APP_SHELL_NAVBAR_ID}
              onClick={handleNavbarAnchorClick}
              p="md"
              style={
                isBelowSm
                  ? ({
                      "--app-shell-navbar-transform": mobileNavOpened
                        ? "translateX(0)"
                        : "translateX(100%)",
                      borderInlineEnd: "none",
                      borderInlineStart: "1px solid var(--app-shell-border-color)",
                      insetInlineEnd: 0,
                      insetInlineStart: "auto",
                      left: "auto",
                      overflowX: "hidden",
                      overflowY: mobileNavOpened ? "auto" : "hidden",
                      right: 0,
                      top: "var(--app-shell-header-offset, 0px)",
                      transform: mobileNavOpened ? "translateX(0)" : "translateX(100%)",
                      width: SIDEBAR_DEFAULT_EXPANDED_WIDTH,
                    } as React.CSSProperties)
                  : { overflowX: "hidden", overflowY: "auto" }
              }
            >
              <NavigationSidebarContent
                avatarUrl={avatarUrl}
                collapsed={collapsed}
                hasActiveMergeRecommendations={hasActiveMergeRecommendations}
                hasOverdueKeepInTouch={hasOverdueKeepInTouch}
                isMobileOverlay={isBelowSm}
                onExpandSidebar={expandSidebarIfCollapsed}
                onSearchActivate={isBelowSm ? handleOverlaySearch : undefined}
                userName={userName}
              />
            </AppShellNavbar>
            <AppShellMain
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <AppShellMainScrollArea scrollLocked={isMobileNavOpen}>
                {children}
              </AppShellMainScrollArea>
              <ShellMainFooterHost />
            </AppShellMain>
          </AppShell>

          {isMobileNavOpen ? (
            <Overlay
              fixed
              hiddenFrom="sm"
              onClick={closeMobileNav}
              zIndex={MOBILE_NAV_OVERLAY_Z_INDEX}
            />
          ) : null}

          <Box
            aria-label={t("ResizeSidebar")}
            aria-orientation="vertical"
            ref={resizeHandleRef}
            role="separator"
            style={{
              cursor: isResizing ? "grabbing" : "col-resize",
              height: "100dvh",
              left: width,
              position: "fixed",
              top: 0,
              touchAction: "none",
              translate: "-50% 0",
              userSelect: "none",
              width: 6,
              zIndex: 150,
            }}
            visibleFrom="sm"
          />

          <CommandPalette />
          <PeopleSearchSpotlight />
        </ChatSessionsProvider>
      </ShellMainFooterProvider>
    </DocumentTitleProvider>
  );
}
