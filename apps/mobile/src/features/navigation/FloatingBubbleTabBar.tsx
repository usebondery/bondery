import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { ReactNode } from "react";
import { FloatingPillRail } from "../../components/chrome/FloatingPillRail";
import { getActionButtonIconSize } from "../../components/ui/actionButtonTokens";
import { useMobileNavigationTranslations } from "../../lib/i18n/generated/hooks";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { FloatingTabPill } from "./FloatingTabPill";
import { useTabSearchFocusCoordinator } from "./tabSearchFocusContext";

type RootTabRoute = "contacts" | "settings";

type FloatingBubbleTabBarProps = Pick<
  BottomTabBarProps,
  "descriptors" | "emitter" | "navigateToTab" | "state"
>;

interface RootTabBubbleProps {
  defaultLabel: string;
  descriptors: FloatingBubbleTabBarProps["descriptors"];
  emitter: FloatingBubbleTabBarProps["emitter"];
  icon: ReactNode;
  isFocused: boolean;
  navigateToTab: FloatingBubbleTabBarProps["navigateToTab"];
  route: { key: string; name: string };
  routeName: RootTabRoute;
  showSearchFocusHint: boolean;
}

function RootTabBubble({
  defaultLabel,
  descriptors,
  emitter,
  icon,
  isFocused,
  navigateToTab,
  route,
  routeName: _routeName,
  showSearchFocusHint,
}: RootTabBubbleProps) {
  const tMobileNavigation = useMobileNavigationTranslations();
  const { focusActiveTabSearch } = useTabSearchFocusCoordinator();
  const descriptor = descriptors[route.key];
  const options = descriptor.options;

  function emitTabPress() {
    return emitter.emit({
      canPreventDefault: true,
      target: route.key,
      type: "tabPress",
    });
  }

  function onPress() {
    const event = emitTabPress();

    if (!isFocused) {
      if (!event.defaultPrevented) {
        navigateToTab(route.key);
      }
      return;
    }

    if (showSearchFocusHint) {
      focusActiveTabSearch();
    }
  }

  function onLongPress() {
    emitter.emit({
      target: route.key,
      type: "tabLongPress",
    });
  }

  const accessibilityHint =
    showSearchFocusHint && isFocused ? tMobileNavigation("TabTapSearchHint") : undefined;

  return (
    <FloatingTabPill
      accessibilityHint={accessibilityHint}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? defaultLabel}
      accessibilityRole="tab"
      accessibilityState={isFocused ? { selected: true } : {}}
      isFocused={isFocused}
      onLongPress={onLongPress}
      onPress={onPress}
      testID={options.tabBarButtonTestID}
    >
      {icon}
    </FloatingTabPill>
  );
}

/**
 * Floating bubble tab bar used on root tab pages.
 */
export function FloatingBubbleTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: FloatingBubbleTabBarProps) {
  const tMobileNavigation = useMobileNavigationTranslations();
  const colors = useMobileThemeColors();
  const tabIconSize = getActionButtonIconSize("md");

  const renderTabBubble = (routeName: RootTabRoute) => {
    const routeIndex = state.routes.findIndex(
      (route: { name: string }) => route.name === routeName,
    );

    if (routeIndex < 0) {
      return null;
    }

    const route = state.routes[routeIndex];
    const descriptor = descriptors[route.key];
    const options = descriptor.options;
    const isFocused = state.index === routeIndex;
    const defaultLabel =
      routeName === "contacts" ? tMobileNavigation("Contacts") : tMobileNavigation("Settings");

    const icon = options.tabBarIcon
      ? options.tabBarIcon({
          color: isFocused ? colors.textOnPrimary : colors.iconSecondary,
          focused: isFocused,
          size: tabIconSize,
        })
      : null;

    return (
      <RootTabBubble
        defaultLabel={defaultLabel}
        descriptors={descriptors}
        emitter={emitter}
        icon={icon}
        isFocused={isFocused}
        key={route.key}
        navigateToTab={navigateToTab}
        route={route}
        routeName={routeName}
        showSearchFocusHint={routeName === "contacts"}
      />
    );
  };

  return (
    <FloatingPillRail>
      {renderTabBubble("contacts")}
      {renderTabBubble("settings")}
    </FloatingPillRail>
  );
}
